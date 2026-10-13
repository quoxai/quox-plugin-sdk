/**
 * Dev preview server wiring: serves the parent page, the sandbox frame
 * document, the window.quox RPC endpoint and an SSE reload channel.
 *
 * The plugin is NOT served as ES modules: the sandbox CSP (default-src 'none',
 * opaque origin) cannot load any URL, exactly like production. So the dev
 * server runs a watch-mode build of the plugin (same build config as
 * `vite build`, minus code-splitting) and inlines the result into the frame.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { FRAME_CSP, buildFrameSrcdoc } = require('./frame.js');
const { buildFrameDeps, escapeForInlineScript } = require('./frame-deps.js');
const { createDevRpc } = require('./rpc.js');
const { buildPreviewPage } = require('./page.js');

const BASE = '/__quox-dev';
const PARENT_CLIENT_PATH = path.join(__dirname, 'parent-client.js');
const CHANNEL_RE = /^[0-9a-f]{32}$/;

function readBody(req, limit = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (c) => {
            size += c.length;
            if (size > limit) { reject(new Error('body_too_large')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function sendJson(res, status, obj) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
}

/** A cross-site page must not be able to drive the mock / dev backend forwarder. */
function sameOrigin(req) {
    const origin = req.headers && req.headers.origin;
    if (!origin) return true;
    return origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`;
}

/**
 * @param {{
 *   getMeta: () => object,
 *   rpc: {handle: Function},
 *   buildFrame: (channel: string) => Promise<string>,
 *   addEventClient: (res: any) => void,
 * }} ctx
 */
function createPreviewRouter(ctx) {
    return function previewRouter(req, res, next) {
        const url = (req.url || '').split('?')[0];
        const method = req.method || 'GET';

        if ((url === '/' || url === '/index.html') && method === 'GET') {
            const meta = ctx.getMeta();
            res.setHeader('Content-Type', 'text/html');
            res.end(buildPreviewPage({ title: meta.name || meta.pluginId, agent: meta.agent || null }));
            return;
        }
        if (!url.startsWith(BASE + '/')) { next(); return; }
        const route = url.slice(BASE.length);

        if (route === '/parent.js' && method === 'GET') {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(fs.readFileSync(PARENT_CLIENT_PATH, 'utf8'));
            return;
        }
        if (route === '/meta.json' && method === 'GET') {
            sendJson(res, 200, ctx.getMeta());
            return;
        }
        if (route === '/events' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
            res.write(': connected\n\n');
            ctx.addEventClient(res);
            return;
        }
        if (route === '/frame' && method === 'GET') {
            const q = new URL(req.url, 'http://x').searchParams.get('channel') || '';
            if (!CHANNEL_RE.test(q)) { sendJson(res, 400, { error: 'bad_channel' }); return; }
            ctx.buildFrame(q).then(
                (html) => { res.setHeader('Content-Type', 'text/html'); res.setHeader('Cache-Control', 'no-store'); res.end(html); },
                (err) => sendJson(res, 503, { error: String((err && err.message) || err) }),
            );
            return;
        }
        if (route === '/rpc' && method === 'POST') {
            if (!sameOrigin(req)) { sendJson(res, 403, { ok: false, error: 'cross_origin_forbidden' }); return; }
            readBody(req).then(async (raw) => {
                let msg;
                try { msg = JSON.parse(raw); } catch { sendJson(res, 400, { ok: false, error: 'bad_json' }); return; }
                try {
                    sendJson(res, 200, { ok: true, value: await ctx.rpc.handle(msg.method, msg.args) });
                } catch (err) {
                    sendJson(res, 200, { ok: false, error: String((err && err.message) || err) });
                }
            }).catch((err) => sendJson(res, 413, { ok: false, error: String(err.message) }));
            return;
        }
        next();
    };
}

function readManifest(root) {
    try { return JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')); } catch { return {}; }
}

/**
 * Wire the preview into a Vite dev server.
 * @param {import('vite').ViteDevServer} server
 * @param {{pluginId?: string, devBackendUrl?: string, user?: object}} options
 */
function attachDevPreview(server, options = {}) {
    const root = server.config.root;
    const manifest = readManifest(root);
    const pluginId = options.pluginId || manifest.id || 'dev-plugin';
    const rpc = createDevRpc({
        pluginId,
        backendUrl: options.devBackendUrl || process.env.QUOX_DEV_BACKEND_URL || '',
        user: options.user,
        permissions: manifest.permissions,
    });

    const state = { bundle: null, css: '', error: null, deps: null };
    const clients = new Set();
    const broadcast = (data) => { for (const c of clients) { try { c.write(`data: ${data}\n\n`); } catch { clients.delete(c); } } };

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-plugin-dev-'));
    let watcher = null;
    let resolveFirst;
    const first = new Promise((r) => { resolveFirst = r; });

    function harvest() {
        try {
            state.bundle = fs.readFileSync(path.join(outDir, 'plugin.esm.js'), 'utf8');
            const cssPath = path.join(outDir, 'plugin.css');
            state.css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
            state.error = null;
        } catch (e) {
            state.error = `build output unreadable: ${e.message}`;
        }
    }

    // Builds run one after the other: Vite's esbuild service is process-wide and a
    // finishing build stops it under a concurrent one (EPIPE).
    const depsPromise = buildFrameDeps(root).then((c) => { state.deps = c; }, (e) => { state.depsError = e.message; });

    async function start() {
        try {
            await depsPromise;
            const { build } = await import('vite');
            // Read by quoxPluginVite.config() in the nested build so it writes to a
            // temp dir (never the project's dist/) and keeps lazy chunks inline.
            globalThis.__quoxDevBuild = { outDir };
            // `vite` (dev) sets NODE_ENV=development; the nested build must resolve
            // as production so JSX compiles to jsx() not jsxDEV(). Restored below.
            const prevNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            try {
                watcher = await build({
                    configFile: server.config.configFile || false,
                    root,
                    // production mode on purpose: the preview must run the same JSX
                    // transform and NODE_ENV as the shipped bundle (a dev JSX transform
                    // emits jsxDEV, which the host's jsx-runtime does not export).
                    mode: 'production',
                    logLevel: 'warn',
                    build: { watch: {}, minify: false, sourcemap: false },
                });
            } finally {
                delete globalThis.__quoxDevBuild;
                if (prevNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prevNodeEnv;
            }
            let failed = false;
            watcher.on('event', (e) => {
                if (e.code === 'START') failed = false;
                if (e.code === 'ERROR') {
                    // Rollup emits END after ERROR; do not let it mask the failure.
                    failed = true;
                    state.error = (e.error && e.error.message) || 'build error';
                    server.config.logger.error(`[quox-plugin-vite] preview build failed: ${state.error}`);
                    resolveFirst(); broadcast('reload');
                } else if (e.code === 'END' && !failed) {
                    harvest(); resolveFirst(); broadcast('reload');
                }
                if (e.result && typeof e.result.close === 'function') e.result.close();
            });
        } catch (e) {
            state.error = `could not start preview build: ${e.message}`;
            resolveFirst();
        }
    }

    async function buildFrame(channel) {
        await Promise.all([first, depsPromise]);
        if (state.depsError) throw new Error(state.depsError);
        if (state.error) throw new Error(state.error);
        return buildFrameSrcdoc({
            pluginId,
            channel,
            bundleCode: escapeForInlineScript(state.bundle),
            cssCode: String(state.css).replace(/<\/(style)/gi, '<\\/$1'),
            frameDepsCode: escapeForInlineScript(state.deps),
        });
    }

    server.middlewares.use(createPreviewRouter({
        getMeta: () => {
            const manifest = readManifest(root);
            const ad = manifest.agentDefinition;
            const agent = ad && typeof ad === 'object' && manifest.agentSidebar !== false
                ? { name: String(ad.name || ad.id || pluginId), role: String(ad.role || ''), color: String(ad.color || '#a78bfa') }
                : null;
            return { pluginId, name: manifest.name || pluginId, csp: FRAME_CSP, agent };
        },
        rpc,
        buildFrame,
        addEventClient: (res) => { clients.add(res); res.on('close', () => clients.delete(res)); },
    }));

    start();
    const cleanup = () => {
        if (watcher && watcher.close) watcher.close();
        for (const c of clients) { try { c.end(); } catch { /* closed */ } }
        fs.rmSync(outDir, { recursive: true, force: true });
    };
    if (server.httpServer) server.httpServer.once('close', cleanup);
    return { rpc, cleanup };
}

module.exports = { attachDevPreview, createPreviewRouter, BASE };

import { describe, it, expect, afterEach } from 'vitest';
import http from 'http';

const quoxPluginVite = require('../index.js');
const { FRAME_SANDBOX, FRAME_CSP, buildFrameSrcdoc } = require('../dev-host/frame.js');
const { frameDepsEntry, escapeForInlineScript } = require('../dev-host/frame-deps.js');
const { createPreviewRouter } = require('../dev-host/server.js');
const { createDevRpc } = require('../dev-host/rpc.js');

describe('sandbox parity with the QuoxCORE host', () => {
    it('uses the host sandbox tokens and CSP verbatim', () => {
        // Pinned from quox-dashboard src/services/pluginFrameHost.js @ 17684609a4fb
        expect(FRAME_SANDBOX).toBe('allow-scripts');
        expect(FRAME_CSP).toBe([
            "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'",
            'img-src data: blob:', 'font-src data:', "connect-src 'none'", "form-action 'none'", "base-uri 'none'",
        ].join('; '));
        expect(FRAME_SANDBOX).not.toContain('allow-same-origin');
    });

    it('frame document carries the CSP meta, plugin css, deps, shim and the bundle in order', () => {
        const html = buildFrameSrcdoc({ pluginId: 'my-plugin', channel: 'c'.repeat(32), bundleCode: 'BUNDLE();', cssCode: '.x{}', frameDepsCode: 'DEPS();' });
        expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`);
        expect(html).toContain('<style data-plugin-css="my-plugin">.x{}</style>');
        const iDeps = html.indexOf('<script>DEPS();</script>');
        const iShim = html.indexOf('window.__quoxPluginRegister');
        const iBundle = html.indexOf('<script type="module">BUNDLE();</script>');
        expect(iDeps).toBeGreaterThan(-1);
        expect(iDeps).toBeLessThan(iShim);
        expect(iShim).toBeLessThan(iBundle);
        expect(html).toContain('window.quox = api');
    });

    it('frame deps: only React family is real, the rest throw, glass is a stub', () => {
        const src = frameDepsEntry({ hasRouter: true });
        for (const stub of ['CapabilityPanels', 'WorkspaceContext', 'AuthContext', 'LicenseValidator', 'ServerSyncQueue', 'OrgScopedStorage']) {
            expect(src).toContain(`${stub}: hostOnlyStub('${stub}')`);
        }
        expect(src).toContain("window.__quoxGlass = hostOnlyStub('@quox/glass')");
        expect(src).toContain('is not available in isolated plugins; use window.quox RPC instead');
        expect(frameDepsEntry({ hasRouter: false })).toContain('const ReactRouterDOM = {};');
    });

    it('stubs throw when used (evaluate the entry body without React)', () => {
        const body = frameDepsEntry({ hasRouter: false })
            .split('\n').filter((l) => !/^import /.test(l)).join('\n')
            .replace('const ReactDOM = Object.assign({}, ReactDOMBase, ReactDOMClient);', 'const ReactDOM = {};');
        const win = {};
        // eslint-disable-next-line no-new-func
        new Function('window', 'React', 'ReactJSXRuntime', body)(win, {}, {});
        expect(() => win.__quoxGlass.GlassPanel()).toThrow(/not available in isolated plugins/);
        expect(() => win.__quoxSharedDeps.AuthContext.Provider()).toThrow(/AuthContext is not available/);
        expect(win.__quoxGlass.then).toBeUndefined();
        expect(win.__quoxSharedDeps.React).toBeDefined();
    });

    it('escapeForInlineScript stops a bundle terminating its script element', () => {
        expect(escapeForInlineScript('a</script><b>')).toBe('a<\\/script><b>');
    });
});

describe('plugin wiring', () => {
    it('no dev middleware when devHost:false', () => {
        const uses = [];
        quoxPluginVite({ pluginId: 'p', devHost: false }).configureServer({ middlewares: { use: (...a) => uses.push(a) }, config: { root: '/nonexistent' } });
        expect(uses).toHaveLength(0);
    });

    it('build config is identical with or without devHost, and writes dist/ by default', () => {
        const a = quoxPluginVite({ pluginId: 'p' }).config({}, { command: 'build' });
        const b = quoxPluginVite({ pluginId: 'p', devHost: false }).config({}, { command: 'build' });
        expect(a.build).toEqual(b.build);
        expect(a.build.outDir).toBe('dist');
        expect(a.build.rollupOptions.output.inlineDynamicImports).toBe(false);
    });

    it('the nested preview build redirects output away from dist/', () => {
        globalThis.__quoxDevBuild = { outDir: '/tmp/x-preview' };
        try {
            const c = quoxPluginVite({ pluginId: 'p' }).config({}, { command: 'build' });
            expect(c.build.outDir).toBe('/tmp/x-preview');
            expect(c.build.rollupOptions.output.inlineDynamicImports).toBe(true);
        } finally { delete globalThis.__quoxDevBuild; }
    });
});

describe('preview router', () => {
    let srv;
    afterEach(() => new Promise((r) => (srv ? srv.close(r) : r())));

    async function boot(overrides = {}) {
        const rpc = createDevRpc({ pluginId: 'my-plugin' });
        const frames = [];
        const router = createPreviewRouter({
            getMeta: () => ({ pluginId: 'my-plugin', name: 'My Plugin' }),
            rpc,
            buildFrame: async (ch) => { frames.push(ch); if (overrides.fail) throw new Error('boom'); return `<html>frame ${ch}</html>`; },
            addEventClient: () => {},
        });
        srv = http.createServer((req, res) => router(req, res, () => { res.statusCode = 418; res.end('next'); }));
        await new Promise((r) => srv.listen(0, '127.0.0.1', r));
        const base = `http://127.0.0.1:${srv.address().port}`;
        return { base, frames };
    }

    it('serves the parent page that creates a sandboxed iframe', async () => {
        const { base } = await boot();
        const html = await (await fetch(`${base}/`)).text();
        expect(html).toContain('My Plugin');
        expect(html).toContain('/__quox-dev/parent.js');
        const js = await (await fetch(`${base}/__quox-dev/parent.js`)).text();
        expect(js).toContain("setAttribute('sandbox', 'allow-scripts')");
        expect(js).not.toMatch(/allow-same-origin['"]/);
    });

    it('serves the frame for a valid channel only', async () => {
        const { base } = await boot();
        const ch = 'a'.repeat(32);
        expect(await (await fetch(`${base}/__quox-dev/frame?channel=${ch}`)).text()).toContain(`frame ${ch}`);
        expect((await fetch(`${base}/__quox-dev/frame?channel=bad`)).status).toBe(400);
    });

    it('reports a failed build as 503 json', async () => {
        const { base } = await boot({ fail: true });
        const r = await fetch(`${base}/__quox-dev/frame?channel=${'b'.repeat(32)}`);
        expect(r.status).toBe(503);
        expect((await r.json()).error).toBe('boom');
    });

    it('answers rpc through the mock and refuses cross-origin posts', async () => {
        const { base } = await boot();
        const post = (body, headers = {}) => fetch(`${base}/__quox-dev/rpc`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
        expect(await (await post({ method: 'getUser', args: {} })).json()).toEqual({ ok: true, value: { userId: 'dev-user', orgId: 'dev-org', role: 'admin', tier: 'pro' } });
        const fr = await (await post({ method: 'fetch', args: { path: '/x' } })).json();
        expect(fr.value.status).toBe(404);
        expect(await (await post({ method: 'nope' })).json()).toEqual({ ok: false, error: 'unknown_method:nope' });
        const cross = await post({ method: 'getUser' }, { Origin: 'https://evil.example' });
        expect(cross.status).toBe(403);
    });

    it('passes unrelated urls to next()', async () => {
        const { base } = await boot();
        expect((await fetch(`${base}/src/main.js`)).status).toBe(418);
    });
});

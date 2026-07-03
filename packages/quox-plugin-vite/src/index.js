/**
 * quox-plugin-vite — Vite plugin for building QuoxCORE third-party plugins.
 *
 * Features:
 *   - Externalises react, react-dom, react-router-dom (provided by QuoxCORE)
 *   - Rewrites imports to read from window.__quoxSharedDeps
 *   - Outputs single plugin.esm.js + plugin.css
 *   - On build, packages into .quoxplugin ZIP (manifest + JS + CSS + assets)
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const DEV_HOST_CLIENT_PATH = path.join(__dirname, 'dev-host', 'client.js');
const DEV_HOST_CSS_PATH = path.join(PACKAGE_ROOT, 'assets', 'qx-components.css');
const ENTRY_CANDIDATES = ['src/index.jsx', 'src/index.js', 'src/main.jsx', 'src/main.tsx'];
// Virtual bootstrap module id. The bootstrap imports react/react-dom/
// react-router-dom as bare specifiers — ONLY a virtual module resolves those
// from the plugin project's root (a real /@fs module outside the root
// resolves them against the SDK repo: 404 or a second React instance). It
// then hands the deps to the real client.js (served via /@fs, which is fine
// for its RELATIVE imports) through installDevHost().
const DEV_HOST_VIRTUAL_ID = 'virtual:quox-dev-host';

const DEV_HOST_ENTRYPOINTS = {
    css: '/__quox-dev/qx.css',
    client: `/@id/${DEV_HOST_VIRTUAL_ID}`,
    manifest: '/__quox-dev/manifest.js',
};

/**
 * Source of the virtual bootstrap module (dev only). react-router-dom is a
 * host-provided dep that plugins only install if they import it themselves
 * (star-alignment doesn't — it hand-rolls hash routing), so it's imported
 * conditionally; the client falls back to its router shim when null.
 * @param {string} projectRoot
 */
function devHostBootstrapSource(projectRoot) {
    let hasRouter = false;
    try {
        require.resolve('react-router-dom', { paths: [projectRoot] });
        hasRouter = true;
    } catch {
        // not installed in the plugin project — shim it client-side
    }
    return [
        `import React from 'react';`,
        `import ReactDOM from 'react-dom/client';`,
        hasRouter
            ? `import * as ReactRouterDOM from 'react-router-dom';`
            : `const ReactRouterDOM = null;`,
        `import { installDevHost } from ${JSON.stringify(`/@fs${DEV_HOST_CLIENT_PATH}`)};`,
        `installDevHost({ React, ReactDOM, ReactRouterDOM });`,
        '',
    ].join('\n');
}

/**
 * Detects the plugin's entry module relative to the project root, falling
 * back to the create-quox-plugin convention (src/index.jsx) if none of the
 * known candidates exist yet (e.g. a not-quite-scaffolded project).
 * @param {string} root
 * @returns {string} entry path, always leading with '/'
 */
function detectEntry(root) {
    for (const candidate of ENTRY_CANDIDATES) {
        if (fs.existsSync(path.join(root, candidate))) {
            return `/${candidate}`;
        }
    }
    return `/${ENTRY_CANDIDATES[0]}`;
}

/**
 * Reads and parses the project's manifest.json, if present. Never throws —
 * dev host manifest exposure degrades to `{}` rather than crashing the dev
 * server middleware chain.
 * @param {string} root
 * @returns {object}
 */
function readManifest(root) {
    try {
        return JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    } catch {
        return {};
    }
}

/**
 * Head markup injected before the plugin entry module — real glass CSS,
 * the parsed manifest as window.__quoxDevManifest, then the dev-host client
 * that installs window.__quoxSharedDeps/__quoxGlass/__quoxPluginApi/
 * __quoxPluginRegister. Order relative to the plugin's own body entry
 * script doesn't need special handling beyond "head before body" — both are
 * `type="module"` so the HTML spec runs them in document order.
 * @returns {string}
 */
function devHostHeadTags() {
    return [
        `    <link rel="stylesheet" href="${DEV_HOST_ENTRYPOINTS.css}">`,
        `    <script type="module" src="${DEV_HOST_ENTRYPOINTS.manifest}"></script>`,
        `    <script type="module" src="${DEV_HOST_ENTRYPOINTS.client}"></script>`,
    ].join('\n');
}

/**
 * Prepends devHostHeadTags() right after the opening <head> tag. Falls back
 * to prepending at the very start of the document if no <head> tag is found
 * (defensive — real vite index.html templates always have one).
 * @param {string} html
 * @returns {string}
 */
function injectDevHostHead(html) {
    const headOpenTag = /<head[^>]*>/i;
    if (headOpenTag.test(html)) {
        return html.replace(headOpenTag, (match) => `${match}\n${devHostHeadTags()}`);
    }
    return `${devHostHeadTags()}\n${html}`;
}

/**
 * Full default index.html for scaffolded projects that don't ship their
 * own (the create-quox-plugin templates today have no index.html at all —
 * see plan-sdk-dx.md P1 finding #1). Deliberately BARE — the middleware
 * passes it through server.transformIndexHtml() so every plugin's html hook
 * runs: @vitejs/plugin-react's refresh preamble (JSX modules throw
 * "can't detect preamble" without it) and our own injectDevHostHead.
 * @param {string} entry entry path, e.g. '/src/index.jsx'
 * @returns {string}
 */
function buildDefaultHtml(entry) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>quox-dev-host</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`;
}

/**
 * @param {{pluginId: string, devHost?: boolean}} options
 * @returns {import('vite').Plugin}
 */
function quoxPluginVite(options = {}) {
    const { pluginId, quoxCoreUrl } = options;
    const coreUrl = quoxCoreUrl || process.env.QUOX_CORE_URL || 'https://localhost:3000';
    const devHostEnabled = options.devHost !== false;
    // Set in configResolved; guards build-only behaviour (externals) so the
    // same plugin instance is safe in `vite` dev and `vite build`.
    let isServe = false;
    let resolvedRoot = process.cwd();

    return {
        name: 'quox-plugin',
        enforce: 'pre',

        config(config, env = {}) {
            // Vite merges the values RETURNED here over the user's config, so
            // default proxies must yield to routes the plugin project already
            // defines (e.g. star-alignment proxies /api to its own backend on
            // :3300 — clobbering that 500s every data call in dev).
            const userProxy = (config.server && config.server.proxy) || {};
            const proxy = {};
            if (!userProxy['/collector']) {
                proxy['/collector'] = { target: coreUrl, changeOrigin: true, secure: false };
            }
            if (!userProxy['/api']) {
                proxy['/api'] = { target: coreUrl, changeOrigin: true, secure: false };
            }
            const serverConfig = { proxy };
            // Same yield-to-user rule as the proxies: hook results override
            // user/CLI config in Vite's merge, so only default the port when
            // nothing else set one (5174 is just the SDK convention).
            if (!(config.server && config.server.port)) {
                serverConfig.port = 5174;
            }

            // P1 (SDK-DX): allow the dev server to read outside the plugin
            // project root so a symlinked/monorepo-linked quox-plugin-vite
            // package can still be served (dev-host client.js + vendored
            // qx-components.css both live in this package, not the plugin's).
            // Setting fs.allow REPLACES Vite's default (the workspace root),
            // so the plugin project root MUST be re-included explicitly or the
            // project's own index.html becomes unservable.
            if (devHostEnabled) {
                const projectRoot = config.root
                    ? path.resolve(config.root)
                    : process.cwd();
                serverConfig.fs = { allow: [projectRoot, PACKAGE_ROOT] };
            }

            // P1 (SDK-DX): the dev-host client lives in THIS package (often
            // symlinked from outside the project), so its bare react/router
            // imports would otherwise resolve against the SDK repo — a 404 or,
            // worse, a SECOND React instance that breaks hooks. dedupe forces
            // resolution to the plugin project's own copies; include makes the
            // optimizer pre-bundle them (react is CJS and unservable raw).
            let devResolve = {};
            if (devHostEnabled && env.command === 'serve') {
                const rootForResolve = config.root ? path.resolve(config.root) : process.cwd();
                let hasRouter = false;
                try {
                    require.resolve('react-router-dom', { paths: [rootForResolve] });
                    hasRouter = true;
                } catch {
                    // plugin project doesn't ship a router — bootstrap shims it
                }
                devResolve = {
                    resolve: { dedupe: ['react', 'react-dom', ...(hasRouter ? ['react-router-dom'] : [])] },
                    optimizeDeps: { include: ['react', 'react-dom/client', ...(hasRouter ? ['react-router-dom'] : [])] },
                };
            }

            return {
                ...devResolve,
                // PSDK-7: Dev server config — proxy to live QuoxCORE
                server: serverConfig,
                build: {
                    lib: {
                        entry: 'src/index.jsx',
                        formats: ['es'],
                        fileName: () => 'plugin.esm.js',
                    },
                    rollupOptions: {
                        external: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', '@quox/glass'],
                        output: {
                            globals: {
                                react: 'window.__quoxSharedDeps.React',
                                'react-dom': 'window.__quoxSharedDeps.ReactDOM',
                                'react-dom/client': 'window.__quoxSharedDeps.ReactDOM',
                                'react-router-dom': 'window.__quoxSharedDeps.ReactRouterDOM',
                                '@quox/glass': 'window.__quoxGlass',
                            },
                            assetFileNames: 'plugin.[ext]',
                        },
                    },
                    cssCodeSplit: false,
                    outDir: 'dist',
                    emptyOutDir: true,
                },
            };
        },

        // Rewrite bare React imports to use shared deps
        configResolved(resolvedConfig) {
            isServe = resolvedConfig.command === 'serve';
            resolvedRoot = resolvedConfig.root || process.cwd();
        },

        // Externalise the host-shared deps at BUILD time only. In dev the
        // plugin (and the dev-host client) must resolve react etc. from the
        // project's node_modules — marking them external in serve mode makes
        // Vite emit unservable /@id/react URLs and blanks the whole page.
        resolveId(source) {
            if (isServe) {
                // Dev: resolve only our virtual bootstrap; leave react etc.
                // to Vite so they come from the project's node_modules.
                if (devHostEnabled && source === DEV_HOST_VIRTUAL_ID) {
                    return DEV_HOST_VIRTUAL_ID;
                }
                return null;
            }
            if (source === 'react' || source === 'react-dom' || source === 'react-dom/client' || source === 'react-router-dom') {
                return { id: source, external: true };
            }
            return null;
        },

        load(id) {
            if (isServe && devHostEnabled && id === DEV_HOST_VIRTUAL_ID) {
                return devHostBootstrapSource(resolvedRoot);
            }
            return null;
        },

        // P1 (SDK-DX): dev host harness — serves the vendored glass CSS,
        // dev-host client, and parsed manifest under /__quox-dev/*, plus a
        // default index.html for projects that don't ship their own
        // (create-quox-plugin scaffolds currently have none). Only wired
        // when `devHost !== false`; Vite only calls this hook in serve mode.
        configureServer(server) {
            if (!devHostEnabled) return;

            const root = server.config.root;

            server.middlewares.use(DEV_HOST_ENTRYPOINTS.css, (req, res) => {
                res.setHeader('Content-Type', 'text/css');
                res.end(fs.readFileSync(DEV_HOST_CSS_PATH, 'utf8'));
            });

            server.middlewares.use(DEV_HOST_ENTRYPOINTS.manifest, (req, res) => {
                res.setHeader('Content-Type', 'application/javascript');
                res.end(`window.__quoxDevManifest = ${JSON.stringify(readManifest(root))};\n`);
            });

            // Default index.html — only fires for '/' and '/index.html' AND
            // only when the project has no index.html of its own (star-
            // alignment style projects keep their real one; Vite serves
            // that natively and runs it through transformIndexHtml below).
            // MUST go through server.transformIndexHtml so every plugin's
            // html hook runs — @vitejs/plugin-react's refresh preamble in
            // particular, without which every JSX module throws.
            server.middlewares.use((req, res, next) => {
                const url = (req.url || '').split('?')[0];
                if (url !== '/' && url !== '/index.html') {
                    next();
                    return;
                }
                if (fs.existsSync(path.join(root, 'index.html'))) {
                    next();
                    return;
                }
                server.transformIndexHtml(req.originalUrl || req.url || '/', buildDefaultHtml(detectEntry(root)))
                    .then((html) => {
                        res.setHeader('Content-Type', 'text/html');
                        res.end(html);
                    })
                    .catch(next);
            });
        },

        // P1 (SDK-DX): head-prepend the dev-host asset tags into any
        // index.html Vite processes — both project-shipped ones (star-
        // alignment) and the generated default (the middleware above pipes
        // it through server.transformIndexHtml, which lands here too).
        transformIndexHtml(html) {
            if (!devHostEnabled) return html;
            return injectDevHostHead(html);
        },

        // After build, package into .quoxplugin ZIP
        async closeBundle() {
            const distDir = path.resolve('dist');
            const manifestPath = path.resolve('manifest.json');

            if (!fs.existsSync(manifestPath)) {
                console.warn('[quox-plugin-vite] No manifest.json found, skipping ZIP packaging');
                return;
            }

            if (!fs.existsSync(path.join(distDir, 'plugin.esm.js'))) {
                return; // Build didn't produce output (e.g. dev mode)
            }

            try {
                // Dynamic import for archiver/JSZip — try what's available
                let zipCreated = false;

                try {
                    const AdmZip = require('adm-zip');
                    const zip = new AdmZip();

                    // Add manifest
                    zip.addLocalFile(manifestPath);

                    // Add JS bundle
                    zip.addLocalFile(path.join(distDir, 'plugin.esm.js'));

                    // Add CSS if exists
                    const cssPath = path.join(distDir, 'plugin.css');
                    if (fs.existsSync(cssPath)) {
                        zip.addLocalFile(cssPath);
                    }

                    // Add assets directory if exists
                    const assetsDir = path.join(distDir, 'assets');
                    if (fs.existsSync(assetsDir)) {
                        zip.addLocalFolder(assetsDir, 'assets');
                    }

                    const outputName = `${pluginId || 'plugin'}.quoxplugin`;
                    zip.writeZip(path.resolve(outputName));
                    console.log(`\n[quox-plugin-vite] Packaged: ${outputName}`);
                    zipCreated = true;
                } catch {
                    // adm-zip not available
                }

                if (!zipCreated) {
                    console.log('\n[quox-plugin-vite] Install adm-zip to auto-package: npm i -D adm-zip');
                    console.log('[quox-plugin-vite] Build output is in dist/ — manually ZIP to create .quoxplugin');
                }

            } catch (err) {
                console.error('[quox-plugin-vite] Packaging error:', err.message);
            }
        },
    };
}

module.exports = quoxPluginVite;
module.exports.default = quoxPluginVite;

// Exposed for unit testing (P1 SDK-DX dev host — pure helpers).
module.exports.__testables = {
    detectEntry,
    readManifest,
    devHostHeadTags,
    injectDevHostHead,
    buildDefaultHtml,
    DEV_HOST_ENTRYPOINTS,
};

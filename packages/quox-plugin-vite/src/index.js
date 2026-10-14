/**
 * @quoxai/quox-plugin-vite — Vite plugin for building QuoxCORE third-party plugins.
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

// Host-provided globals for the externalized shared deps. Rollup's
// output.globals cannot express this for ESM output (it is only honored for
// iife/umd), so rewriteExternalImportsToGlobals() applies the mapping as a
// renderChunk transform instead.
const EXTERNAL_GLOBALS = {
    'react': 'window.__quoxSharedDeps.React',
    // JSX runtime MUST come from the host, not the plugin's bundled React:
    // a bundled react-jsx-runtime reads the internals of the React version
    // the PLUGIN was built against (18's ReactCurrentOwner no longer exists
    // in 19) and crashes on activation inside a host running another major.
    // Host exposes it since quox-dashboard SDK-DX (thirdPartyPluginHost.js).
    'react/jsx-runtime': 'window.__quoxSharedDeps.ReactJSXRuntime',
    'react/jsx-dev-runtime': 'window.__quoxSharedDeps.ReactJSXRuntime',
    'react-dom': 'window.__quoxSharedDeps.ReactDOM',
    'react-dom/client': 'window.__quoxSharedDeps.ReactDOM',
    'react-router-dom': 'window.__quoxSharedDeps.ReactRouterDOM',
    '@quox/glass': 'window.__quoxGlass',
};

/**
 * Rewrites `import ... from "<external>"` statements in an emitted ES chunk
 * into const-reads of the host globals. Handles default, named (with `as`
 * renames), namespace, combined default+named, and bare side-effect imports,
 * in both pretty and minified (space-free) emissions.
 */
function rewriteExternalImportsToGlobals(code) {
    for (const [spec, globalExpr] of Object.entries(EXTERNAL_GLOBALS)) {
        const specPattern = spec.replace(/[/@.]/g, (m) => '\\' + m);
        const re = new RegExp(
            'import\\s*(?:([A-Za-z_$][\\w$]*)\\s*,\\s*)?' + // default before named/namespace
            '(?:' +
                '\\{([^}]*)\\}' +                            // named specifiers
                '|\\*\\s*as\\s+([A-Za-z_$][\\w$]*)' +        // namespace
                '|([A-Za-z_$][\\w$]*)' +                     // default only
            ')?\\s*(?:from\\s*)?["\']' + specPattern + '["\'];?',
            'g'
        );
        code = code.replace(re, (_m, defBeforeNamed, named, ns, defOnly) => {
            const parts = [];
            const def = defBeforeNamed || defOnly;
            if (def) parts.push(`const ${def} = ${globalExpr};`);
            if (ns) parts.push(`const ${ns} = ${globalExpr};`);
            if (named) {
                const destructure = named
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => s.replace(/\s+as\s+/, ': '))
                    .join(', ');
                if (destructure) parts.push(`const { ${destructure} } = ${globalExpr};`);
            }
            return parts.join(' ');
        });
    }
    return code;
}
const QX_CSS_PATH = path.join(PACKAGE_ROOT, 'assets', 'qx-components.css');
const { attachDevPreview } = require('./dev-host/server.js');

/**
 * @param {{pluginId: string, devHost?: boolean, qxCss?: boolean, devBackendUrl?: string, quoxCoreUrl?: string}} options
 *   devHost       false disables the sandbox dev preview (plain vite dev server).
 *   qxCss         false skips bundling the vendored qx-* component css into plugin.css.
 *   devBackendUrl optional backend that window.quox.fetch is forwarded to in the preview
 *                 (default: none, fetch answers 404). Also QUOX_DEV_BACKEND_URL.
 * @returns {import('vite').Plugin}
 */
function quoxPluginVite(options = {}) {
    const { pluginId, quoxCoreUrl } = options;
    const coreUrl = quoxCoreUrl || process.env.QUOX_CORE_URL || 'https://localhost:3000';
    const devHostEnabled = options.devHost !== false;
    // Community plugins get NO host CSS inside the sandbox frame, so the build
    // bundles the vendored qx component css into plugin.css unless opted out.
    const qxCssEnabled = options.qxCss !== false;
    // Set by the dev preview (dev-host/server.js) around its nested watch build,
    // which loads the user's config (and so constructs this plugin) inside that
    // window. Captured at construction because the flag is gone by the time
    // watch rebuilds fire. Effect: write to a temp dir instead of dist/, keep
    // lazy chunks inline (the sandbox frame cannot load any URL), skip packaging.
    const devBuild = globalThis.__quoxDevBuild;
    // Set in configResolved; guards build-only behaviour (externals) so the
    // same plugin instance is safe in `vite` dev and `vite build`.
    let isServe = false;

    return {
        name: 'quox-plugin',
        enforce: 'pre',

        config(config, env = {}) {
            // Vite merges the values RETURNED here over the user's config, so
            // default proxies must yield to routes the plugin project already
            // defines (e.g. star-alignment proxies /api to its own backend on
            // :3300 - clobbering that 500s every data call in dev).
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

            return {
                // PSDK-7: Dev server config - proxy to live QuoxCORE
                server: serverConfig,
                // Plugins ship straight to the browser - there is no downstream
                // bundler to substitute process.env.NODE_ENV (lib mode leaves it
                // in), and `process` doesn't exist in the page. Pin it at build
                // time or any dependency with a dev/prod switch (react/jsx-runtime)
                // throws "process is not defined" at activation. Dev keeps
                // Vite's own handling so React stays in dev mode.
                ...(env.command === 'build' ? {
                    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
                } : {}),
                build: {
                    // NOTE: intentionally NOT using `build.lib` - lib mode with a
                    // single entry forces `inlineDynamicImports:true`, collapsing
                    // every dynamic import() back into plugin.esm.js. To let a
                    // plugin code-split heavy views into lazily-loaded chunks
                    // (e.g. Quoxel's globe mode) we drive rollup directly. The
                    // entry is still emitted as plugin.esm.js and CSS as
                    // plugin.css; extra chunks land in dist/assets/ and the host
                    // resolves them via an import map (see SDK code-splitting).
                    rollupOptions: {
                        input: 'src/index.jsx',
                        external: Object.keys(EXTERNAL_GLOBALS),
                        output: {
                            format: 'es',
                            entryFileNames: 'plugin.esm.js',
                            chunkFileNames: 'assets/[name]-[hash].js',
                            assetFileNames: 'plugin.[ext]',
                            inlineDynamicImports: !!devBuild,
                            globals: {
                                react: 'window.__quoxSharedDeps.React',
                                'react-dom': 'window.__quoxSharedDeps.ReactDOM',
                                'react-dom/client': 'window.__quoxSharedDeps.ReactDOM',
                                'react-router-dom': 'window.__quoxSharedDeps.ReactRouterDOM',
                                '@quox/glass': 'window.__quoxGlass',
                            },
                        },
                    },
                    cssCodeSplit: false,
                    outDir: devBuild ? devBuild.outDir : 'dist',
                    emptyOutDir: true,
                },
            };
        },

        // Bundle the vendored qx-* component css (and its tokens) in front of the
        // plugin's own css. order:'post' so Vite's css plugin has already emitted
        // plugin.css into the bundle.
        generateBundle: {
            order: 'post',
            handler(_outputOptions, bundle) {
                if (isServe || !qxCssEnabled) return;
                const qx = fs.readFileSync(QX_CSS_PATH, 'utf8');
                const existing = bundle['plugin.css'];
                if (existing && existing.type === 'asset') {
                    existing.source = `${qx}\n${String(existing.source)}`;
                } else if (!existing) {
                    this.emitFile({ type: 'asset', fileName: 'plugin.css', source: qx });
                }
            },
        },

        configResolved(resolvedConfig) {
            isServe = resolvedConfig.command === 'serve';
        },

        // Rollup's output.globals is IGNORED for format:'es' - it only applies
        // to iife/umd. Left alone, the emitted plugin.esm.js keeps bare
        // `import ... from "react"` statements, which the dashboard host cannot
        // resolve (no import map), so activation fails with "Failed to resolve
        // module specifier". Rewrite external imports into reads of the
        // host-provided globals.
        renderChunk(code) {
            if (isServe) return null;
            return { code: rewriteExternalImportsToGlobals(code), map: null };
        },

        // Externalise the host-shared deps at BUILD time only. (In `vite` dev the
        // plugin is built by a nested watch build, see dev-host/server.js; the dev
        // server itself never serves plugin modules.)
        resolveId(source) {
            if (isServe) return null;
            if (Object.prototype.hasOwnProperty.call(EXTERNAL_GLOBALS, source)) {
                return { id: source, external: true };
            }
            return null;
        },

        // Dev preview: a faithful simulation of the community-plugin SANDBOX
        // (opaque-origin iframe, same CSP, throwing stubs, postMessage RPC with
        // an in-memory window.quox mock), NOT the dashboard. Vite only calls
        // this hook in serve mode.
        configureServer(server) {
            if (!devHostEnabled) return;
            attachDevPreview(server, { pluginId, devBackendUrl: options.devBackendUrl, user: options.devUser });
        },

                // After build, package into .quoxplugin ZIP
        async closeBundle() {
            if (devBuild) return; // preview build: no packaging
            const distDir = path.resolve('dist');
            const manifestPath = path.resolve('manifest.json');

            if (!fs.existsSync(manifestPath)) {
                console.warn('[@quoxai/quox-plugin-vite] No manifest.json found, skipping ZIP packaging');
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
                    console.log(`\n[@quoxai/quox-plugin-vite] Packaged: ${outputName}`);
                    zipCreated = true;
                } catch {
                    // adm-zip not available
                }

                if (!zipCreated) {
                    console.log('\n[@quoxai/quox-plugin-vite] Install adm-zip to auto-package: npm i -D adm-zip');
                    console.log('[@quoxai/quox-plugin-vite] Build output is in dist/ — manually ZIP to create .quoxplugin');
                }

            } catch (err) {
                console.error('[@quoxai/quox-plugin-vite] Packaging error:', err.message);
            }
        },
    };
}

module.exports = quoxPluginVite;
module.exports.default = quoxPluginVite;

// Exposed for unit testing.
module.exports.__testables = {
    rewriteExternalImportsToGlobals,
};

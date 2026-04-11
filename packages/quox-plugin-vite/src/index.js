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

/**
 * @param {{pluginId: string}} options
 * @returns {import('vite').Plugin}
 */
function quoxPluginVite(options = {}) {
    const { pluginId } = options;

    return {
        name: 'quox-plugin',
        enforce: 'pre',

        config(config) {
            return {
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
        resolveId(source) {
            if (source === 'react' || source === 'react-dom' || source === 'react-dom/client' || source === 'react-router-dom') {
                return { id: source, external: true };
            }
            return null;
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const quoxPluginVite = require('../index.js');
const { detectEntry, buildDefaultHtml, injectDevHostHead, DEV_HOST_ENTRYPOINTS } = quoxPluginVite.__testables;

/** Minimal connect-style middleware stack mock, mirroring Vite's server.middlewares. */
function createMockServer(root, htmlTransformPlugin) {
    const uses = [];
    return {
        config: { root },
        middlewares: {
            use(pathOrFn, handler) {
                uses.push(handler ? [pathOrFn, handler] : [null, pathOrFn]);
            },
        },
        // Mirrors ViteDevServer.transformIndexHtml: runs the given plugin's
        // transformIndexHtml hook (the real server runs ALL plugins' hooks —
        // ours is the one under test here).
        async transformIndexHtml(url, html) {
            if (htmlTransformPlugin && typeof htmlTransformPlugin.transformIndexHtml === 'function') {
                return htmlTransformPlugin.transformIndexHtml(html);
            }
            return html;
        },
        __uses: uses,
        findHandler(routePath) {
            const entry = uses.find(([p]) => p === routePath);
            return entry ? entry[1] : undefined;
        },
        catchAllHandlers() {
            return uses.filter(([p]) => p === null).map(([, h]) => h);
        },
    };
}

function mockRes() {
    return {
        headers: {},
        body: undefined,
        setHeader(name, value) { this.headers[name] = value; },
        end(body) { this.body = body; },
    };
}

describe('quox-plugin-vite dev host (P1 SDK-DX)', () => {
    let tmpRoot;

    beforeEach(() => {
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-dev-host-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    // (a) dev options gating ------------------------------------------------
    describe('devHost option gating', () => {
        it('devHost defaults to enabled (undefined !== false)', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const html = plugin.transformIndexHtml('<html><head></head><body></body></html>');
            expect(html).toContain(DEV_HOST_ENTRYPOINTS.client);
        });

        it('transformIndexHtml is a no-op when devHost:false', () => {
            const plugin = quoxPluginVite({ pluginId: 'p', devHost: false });
            const html = '<html><head></head><body></body></html>';
            expect(plugin.transformIndexHtml(html)).toBe(html);
        });

        it('configureServer registers no middleware when devHost:false', () => {
            const plugin = quoxPluginVite({ pluginId: 'p', devHost: false });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);
            expect(server.__uses.length).toBe(0);
        });

        it('config() only adds server.fs.allow when devHost is enabled', () => {
            const enabled = quoxPluginVite({ pluginId: 'p' }).config({});
            const disabled = quoxPluginVite({ pluginId: 'p', devHost: false }).config({});
            expect(enabled.server.fs).toBeDefined();
            expect(enabled.server.fs.allow.length).toBeGreaterThan(0);
            expect(disabled.server.fs).toBeUndefined();
        });

        it('does not change build mode config (rollupOptions untouched) regardless of devHost', () => {
            const withDevHost = quoxPluginVite({ pluginId: 'p' }).config({});
            const withoutDevHost = quoxPluginVite({ pluginId: 'p', devHost: false }).config({});
            expect(withDevHost.build).toEqual(withoutDevHost.build);
            expect(withDevHost.build.rollupOptions.input).toBe('src/index.jsx');
            expect(withDevHost.build.rollupOptions.output.entryFileNames).toBe('plugin.esm.js');
        });
    });

    // (b) transformIndexHtml injection order --------------------------------
    describe('transformIndexHtml head-prepend injection', () => {
        it('injects link + manifest script + client script right after <head>, in that order', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const raw = '<!doctype html>\n<html><head><title>Star Alignment</title></head><body><div id="root"></div><script type="module" src="/src/index.jsx"></script></body></html>';
            const out = plugin.transformIndexHtml(raw);

            const linkIdx = out.indexOf(DEV_HOST_ENTRYPOINTS.css);
            const manifestIdx = out.indexOf(DEV_HOST_ENTRYPOINTS.manifest);
            const clientIdx = out.indexOf(DEV_HOST_ENTRYPOINTS.client);
            const bodyEntryIdx = out.indexOf('/src/index.jsx');

            expect(linkIdx).toBeGreaterThan(-1);
            expect(manifestIdx).toBeGreaterThan(-1);
            expect(clientIdx).toBeGreaterThan(-1);
            expect(linkIdx).toBeLessThan(manifestIdx);
            expect(manifestIdx).toBeLessThan(clientIdx);
            expect(clientIdx).toBeLessThan(bodyEntryIdx);
        });

        it('preserves the original head and body content', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const raw = '<html><head><title>Star Alignment</title></head><body><script type="module" src="/src/index.jsx"></script></body></html>';
            const out = plugin.transformIndexHtml(raw);
            expect(out).toContain('<title>Star Alignment</title>');
            expect(out).toContain('<script type="module" src="/src/index.jsx"></script>');
        });

        it('falls back to prepending when there is no <head> tag', () => {
            const html = injectDevHostHead('<body>no head here</body>');
            expect(html.indexOf(DEV_HOST_ENTRYPOINTS.client)).toBeGreaterThan(-1);
            expect(html.indexOf(DEV_HOST_ENTRYPOINTS.client)).toBeLessThan(html.indexOf('no head here'));
        });
    });

    // (c) default-html middleware --------------------------------------------
    describe('default index.html middleware', () => {
        it('fires for "/" when the project root has no index.html', async () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot, plugin);
            plugin.configureServer(server);

            const handler = server.catchAllHandlers()[0];
            const req = { url: '/' };
            const res = mockRes();
            let nextCalled = false;
            // The middleware responds asynchronously (it awaits
            // server.transformIndexHtml so the react-refresh preamble and the
            // dev-host head tags are both injected) — wait for res.end.
            await new Promise((resolve, reject) => {
                res.end = (body) => { res.body = body; resolve(); };
                handler(req, res, (err) => { nextCalled = true; err ? reject(err) : resolve(); });
            });

            expect(nextCalled).toBe(false);
            expect(res.headers['Content-Type']).toBe('text/html');
            expect(res.body).toContain('<div id="root"></div>');
            expect(res.body).toContain(DEV_HOST_ENTRYPOINTS.client);
        });

        it('calls next() and does not respond when the project already has an index.html', () => {
            fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<html><body>real</body></html>');
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);

            const handler = server.catchAllHandlers()[0];
            const req = { url: '/' };
            const res = mockRes();
            let nextCalled = false;
            handler(req, res, () => { nextCalled = true; });

            expect(nextCalled).toBe(true);
            expect(res.body).toBeUndefined();
        });

        it('calls next() for unrelated URLs', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);

            const handler = server.catchAllHandlers()[0];
            const req = { url: '/src/index.jsx' };
            const res = mockRes();
            let nextCalled = false;
            handler(req, res, () => { nextCalled = true; });

            expect(nextCalled).toBe(true);
            expect(res.body).toBeUndefined();
        });

        it('embeds the detected entry script (src/index.jsx present)', () => {
            fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tmpRoot, 'src', 'index.jsx'), '// entry');
            const entry = detectEntry(tmpRoot);
            expect(entry).toBe('/src/index.jsx');
            expect(buildDefaultHtml(entry)).toContain('<script type="module" src="/src/index.jsx"></script>');
        });

        it('falls back to /src/index.jsx when no known entry candidate exists on disk', () => {
            expect(detectEntry(tmpRoot)).toBe('/src/index.jsx');
        });
    });

    // (d) manifest exposure ---------------------------------------------------
    describe('manifest exposure', () => {
        it('serves window.__quoxDevManifest with the parsed manifest.json', () => {
            fs.writeFileSync(path.join(tmpRoot, 'manifest.json'), JSON.stringify({ id: 'star-alignment', name: 'Star Alignment' }));
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);

            const handler = server.findHandler(DEV_HOST_ENTRYPOINTS.manifest);
            const res = mockRes();
            handler({}, res);

            expect(res.headers['Content-Type']).toBe('application/javascript');
            expect(res.body).toContain('window.__quoxDevManifest');
            expect(res.body).toContain('"star-alignment"');
        });

        it('degrades to an empty object when manifest.json is missing', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);

            const handler = server.findHandler(DEV_HOST_ENTRYPOINTS.manifest);
            const res = mockRes();
            handler({}, res);

            expect(res.body).toBe('window.__quoxDevManifest = {};\n');
        });
    });

    // Asset-serving middlewares -----------------------------------------------
    describe('/__quox-dev/* asset middlewares', () => {
        it('serves vendored qx-components.css with correct content-type', () => {
            const plugin = quoxPluginVite({ pluginId: 'p' });
            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);

            const handler = server.findHandler(DEV_HOST_ENTRYPOINTS.css);
            const res = mockRes();
            handler({}, res);

            expect(res.headers['Content-Type']).toBe('text/css');
            expect(res.body).toContain('VENDORED FILE');
            expect(res.body).toContain('.qx-pill');
        });

        it('exposes the dev-host client via the virtual bootstrap module (Vite pipeline, NOT raw middleware)', () => {
            // Bare react/react-router-dom imports only resolve from the plugin
            // project's root when the importer is a VIRTUAL module; the real
            // client.js (outside the root) receives the deps via
            // installDevHost() instead of importing them itself.
            expect(DEV_HOST_ENTRYPOINTS.client).toBe('/@id/virtual:quox-dev-host');

            const plugin = quoxPluginVite({ pluginId: 'p' });
            plugin.configResolved({ command: 'serve' });
            expect(plugin.resolveId('virtual:quox-dev-host')).toBe('virtual:quox-dev-host');
            const bootstrap = plugin.load('virtual:quox-dev-host');
            expect(bootstrap).toContain("import React from 'react'");
            expect(bootstrap).toContain('installDevHost({ React, ReactDOM, ReactRouterDOM })');
            expect(bootstrap).toContain('/@fs');

            // Build mode must NOT leak the virtual module or lose externals.
            const buildPlugin = quoxPluginVite({ pluginId: 'p' });
            buildPlugin.configResolved({ command: 'build' });
            expect(buildPlugin.load('virtual:quox-dev-host')).toBeNull();
            expect(buildPlugin.resolveId('react')).toEqual({ id: 'react', external: true });

            const server = createMockServer(tmpRoot);
            plugin.configureServer(server);
            expect(server.findHandler(DEV_HOST_ENTRYPOINTS.client)).toBeUndefined();
        });
    });
});

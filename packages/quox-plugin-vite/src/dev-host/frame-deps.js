/**
 * Builds the frame-local shared-deps IIFE for the dev preview sandbox.
 *
 * Mirrors the host's frame deps (quox-dashboard src/services/frameDeps/entry.js
 * @ 17684609a4fba813966445926541e4390e16fda2): only React, ReactDOM (with
 * createRoot), ReactRouterDOM and ReactJSXRuntime are real; CapabilityPanels,
 * WorkspaceContext, AuthContext, LicenseValidator, ServerSyncQueue,
 * OrgScopedStorage and __quoxGlass are THROWING stubs (same messages).
 * Unlike the host, the runtime comes from the plugin project's own node_modules,
 * so the React major in the preview is whatever the plugin was built against.
 */
const path = require('path');

const VIRTUAL_ID = 'virtual:quox-frame-deps';

function frameDepsEntry({ hasRouter }) {
    return `
import * as React from 'react';
import * as ReactDOMBase from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXRuntime from 'react/jsx-runtime';
${hasRouter ? "import * as ReactRouterDOM from 'react-router-dom';" : 'const ReactRouterDOM = {};'}

const ReactDOM = Object.assign({}, ReactDOMBase, ReactDOMClient);

function hostOnlyStub(name) {
    const msg = '[quox-plugin] ' + name + ' is not available in isolated plugins; use window.quox RPC instead';
    const thrower = () => { throw new Error(msg); };
    return new Proxy(Object.create(null), {
        get(_t, prop) {
            if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined;
            return thrower;
        },
        has: () => true,
    });
}

window.__quoxSharedDeps = {
    React,
    ReactDOM,
    ReactRouterDOM,
    ReactJSXRuntime,
    CapabilityPanels: hostOnlyStub('CapabilityPanels'),
    WorkspaceContext: hostOnlyStub('WorkspaceContext'),
    AuthContext: hostOnlyStub('AuthContext'),
    LicenseValidator: hostOnlyStub('LicenseValidator'),
    ServerSyncQueue: hostOnlyStub('ServerSyncQueue'),
    OrgScopedStorage: hostOnlyStub('OrgScopedStorage'),
};
window.__quoxGlass = hostOnlyStub('@quox/glass');
`;
}

function canResolve(id, root) {
    try { require.resolve(id, { paths: [root] }); return true; } catch { return false; }
}

/** @returns {Promise<string>} classic-script IIFE source */
async function buildFrameDeps(projectRoot) {
    const root = path.resolve(projectRoot);
    for (const dep of ['react', 'react-dom']) {
        if (!canResolve(dep, root)) {
            throw new Error(`cannot resolve "${dep}" from ${root}; install it in the plugin project for the dev preview`);
        }
    }
    const entry = frameDepsEntry({ hasRouter: canResolve('react-router-dom', root) });
    const { build } = await import('vite');
    const result = await build({
        configFile: false,
        root,
        logLevel: 'silent',
        mode: 'development',
        define: { 'process.env.NODE_ENV': JSON.stringify('development') },
        plugins: [{
            name: 'quox-frame-deps-entry',
            resolveId(id) { return id === VIRTUAL_ID ? id : null; },
            load(id) { return id === VIRTUAL_ID ? entry : null; },
        }],
        build: {
            write: false,
            minify: false,
            rollupOptions: {
                input: VIRTUAL_ID,
                output: { format: 'iife', name: '__QuoxFrameDeps', inlineDynamicImports: true },
            },
        },
    });
    const out = Array.isArray(result) ? result[0] : result;
    const chunk = out.output.find((o) => o.type === 'chunk');
    if (!chunk) throw new Error('frame deps build produced no chunk');
    return chunk.code;
}

/** Escape so inlined code cannot terminate its own <script> element. */
function escapeForInlineScript(code) {
    return String(code).replace(/<\/(script)/gi, '<\\/$1');
}

module.exports = { buildFrameDeps, frameDepsEntry, escapeForInlineScript, VIRTUAL_ID };

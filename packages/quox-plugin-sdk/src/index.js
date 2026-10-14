/**
 * @quoxai/quox-plugin-sdk runtime helpers.
 *
 * Community (third-party) Quox plugins run inside a sandboxed iframe. The only
 * host surface they get is `window.quox` (RPC over postMessage), the shared
 * React deps, and `window.__quoxPluginRegister`. These helpers wrap exactly
 * that, with clear errors when used outside a Quox host.
 */

/** Plugin id rule enforced by the Quox host (install time). */
export const MANIFEST_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** Plugin ids may not start with these (reserved for Quox itself). */
export const RESERVED_ID_PREFIXES = ['core-', 'system-', 'quox-', 'admin-'];

/**
 * Check a plugin id against the host rules.
 * @param {unknown} id
 * @returns {string|null} a problem description, or null when the id is valid
 */
export function validateManifestId(id) {
    if (typeof id !== 'string' || !id) return 'plugin id is required';
    if (!MANIFEST_ID_PATTERN.test(id)) {
        return 'plugin id must be lowercase alphanumeric with dashes, 3-64 chars, not starting or ending with a dash';
    }
    const prefix = RESERVED_ID_PREFIXES.find((p) => id.startsWith(p));
    if (prefix) return `plugin id cannot start with reserved prefix "${prefix}" (reserved: ${RESERVED_ID_PREFIXES.join(', ')})`;
    return null;
}

/**
 * Which manifest.permissions entry the Quox host requires for each window.quox
 * RPC method in the community sandbox. Enforced fail-closed: an absent or
 * non-array manifest.permissions grants nothing. A refused call rejects with
 * Error('permission_denied: <perm>'). navigate, getUser and onEvent need no
 * permission.
 */
export const COMMUNITY_PERMISSION_FOR_METHOD = Object.freeze({
    'storage.get': 'storage',
    'storage.set': 'storage',
    'storage.remove': 'storage',
    'storage.keys': 'storage',
    'storage.getAll': 'storage',
    fetch: 'network',
    'memory.save': 'memory',
    'memory.search': 'memory',
    'aee.emit': 'aee',
    notify: 'notifications',
});

/**
 * window.quox methods the host exposes but does NOT serve to community plugins
 * yet (the collector has no route behind them). After the permission gate
 * passes they reject with Error('not_available: <name>') and send nothing.
 * Value is the name used in the error text.
 */
export const NOT_AVAILABLE_METHODS = Object.freeze({
    'memory.save': 'memory',
    'memory.search': 'memory',
    'aee.emit': 'aee',
});

function hostWindow() {
    return typeof window !== 'undefined' ? window : undefined;
}

/**
 * Get the plugin API (`window.quox`). All methods return Promises.
 * @returns {import('./types').QuoxPluginApi}
 */
export function getQuox() {
    const w = hostWindow();
    if (!w || !w.quox) {
        throw new Error(
            'window.quox is not available. This code must run inside a Quox host (the plugin sandbox frame). ' +
            'In unit tests, call installMockQuox() from "@quoxai/quox-plugin-sdk/testing" first.'
        );
    }
    return w.quox;
}

/**
 * Same object as getQuox(). Safe to call during render (no hooks, no React).
 * @returns {import('./types').QuoxPluginApi}
 */
export function usePluginApi() {
    return getQuox();
}

/**
 * Get the shared dependencies provided by the host.
 * @returns {import('./types').SharedDeps}
 */
export function getSharedDeps() {
    const w = hostWindow();
    if (!w || !w.__quoxSharedDeps) {
        throw new Error('Quox shared deps not available (window.__quoxSharedDeps). Is the plugin running inside a Quox host?');
    }
    return w.__quoxSharedDeps;
}

/**
 * Register a plugin's routes and sidebar items with the host.
 * Components stay inside the sandbox frame; the host sends route events.
 * @param {string} pluginId
 * @param {import('./types').PluginExports} exports
 */
export function registerPlugin(pluginId, exports) {
    if (typeof pluginId !== 'string' || !pluginId) {
        throw new Error('registerPlugin: pluginId must be a non-empty string (the manifest id).');
    }
    if (!exports || typeof exports !== 'object') {
        throw new Error('registerPlugin: second argument must be { routes, sidebar }, e.g. { routes: { "/plugins/<id>": Component } }.');
    }
    const w = hostWindow();
    if (!w || typeof w.__quoxPluginRegister !== 'function') {
        throw new Error(
            'window.__quoxPluginRegister is not available. Is the plugin running inside a Quox host? ' +
            'In unit tests, call installMockQuox() from "@quoxai/quox-plugin-sdk/testing" first.'
        );
    }
    w.__quoxPluginRegister(pluginId, exports);
}

/**
 * @deprecated Removed. window.__quoxGlass does not exist in the community
 * sandbox. Ship your own styles in plugin.css (host stylesheets are not injected).
 */
export function getGlassComponents() {
    throw new Error(
        'getGlassComponents() was removed: window.__quoxGlass is not available to community plugins ' +
        '(the sandbox frame has no host components or host CSS). Build your UI with React and put ' +
        'its styles in plugin.css, the only stylesheet injected into the frame.'
    );
}

/**
 * QuoxCORE Plugin SDK — Runtime helpers
 */

/**
 * Get the shared dependencies provided by QuoxCORE.
 * @returns {{React, ReactDOM, ReactRouterDOM}}
 */
export function getSharedDeps() {
    if (!window.__quoxSharedDeps) {
        throw new Error('QuoxCORE shared deps not available. Is the plugin running inside QuoxCORE?');
    }
    return window.__quoxSharedDeps;
}

/**
 * Register a plugin with QuoxCORE.
 * @param {string} pluginId
 * @param {import('./types').PluginExports} exports
 */
export function registerPlugin(pluginId, exports) {
    if (!window.__quoxPluginRegister) {
        throw new Error('QuoxCORE plugin registration not available. Is the plugin running inside QuoxCORE?');
    }
    window.__quoxPluginRegister(pluginId, exports);
}

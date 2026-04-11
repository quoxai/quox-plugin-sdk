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

/**
 * PSDK-2: Get the @quox/glass component library.
 * @returns {{ AgentChatSidebar, AgentChatPanel, GlassPanel, GlassPill, ... }}
 */
export function getGlassComponents() {
    if (!window.__quoxGlass) {
        throw new Error('@quox/glass not available. Is the plugin running inside QuoxCORE v1.1+?');
    }
    return window.__quoxGlass;
}

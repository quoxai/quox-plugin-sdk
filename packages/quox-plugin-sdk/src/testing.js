/**
 * QuoxCORE Plugin SDK — Testing utilities
 *
 * Provides mocks for the plugin API and helpers for rendering
 * plugin components in a test environment.
 */

/**
 * Create a mock PluginAPI for testing.
 * @param {string} pluginId
 * @returns {import('./types').PluginAPI}
 */
export function createMockPluginApi(pluginId = 'test-plugin') {
    const storage = new Map();

    return {
        pluginId,
        storage: {
            get(key) { return storage.get(key) ?? null; },
            set(key, value) { storage.set(key, value); },
            remove(key) { storage.delete(key); },
            keys() { return [...storage.keys()]; },
        },
        config: {
            get() { return {}; },
            save() {},
        },
        async fetch() { return new Response('{}', { status: 200 }); },
        notify() {},
        memory: {
            async save() { return { success: true }; },
            async search() { return { results: [] }; },
        },
        aee: {
            async emit() { return { success: true }; },
        },
    };
}

/**
 * Set up the global window mocks for plugin testing.
 * Call in beforeEach/beforeAll.
 */
export function setupPluginTestEnv() {
    // Mock shared deps
    if (typeof window !== 'undefined') {
        window.__quoxSharedDeps = {
            React: require('react'),
            ReactDOM: require('react-dom/client'),
            ReactRouterDOM: require('react-router-dom'),
        };

        const registered = {};
        window.__quoxPluginRegister = (pluginId, exports) => {
            registered[pluginId] = exports;
        };
        window.__quoxRegisteredPlugins = registered;
    }
}

/**
 * Clean up global window mocks.
 * Call in afterEach/afterAll.
 */
export function teardownPluginTestEnv() {
    if (typeof window !== 'undefined') {
        delete window.__quoxSharedDeps;
        delete window.__quoxPluginRegister;
        delete window.__quoxRegisteredPlugins;
    }
}

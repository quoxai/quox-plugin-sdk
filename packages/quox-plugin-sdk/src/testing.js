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
    const cacheStore = new Map();
    const durableStore = new Map(); // key includes scope
    const secretsStore = new Map();

    function durableKey(scope, key) { return `${scope}:${key}`; }

    const cache = {
        get(key) { return cacheStore.get(key) ?? null; },
        set(key, value) { cacheStore.set(key, value); },
        remove(key) { cacheStore.delete(key); },
        keys() { return [...cacheStore.keys()]; },
    };

    return {
        pluginId,
        cache,
        // Deprecated alias kept for plugins not yet migrated.
        storage: cache,
        durable: {
            async get(key, opts = {}) {
                return durableStore.get(durableKey(opts.scope || 'org', key)) ?? null;
            },
            async set(key, value, opts = {}) {
                durableStore.set(durableKey(opts.scope || 'org', key), value);
            },
            async remove(key, opts = {}) {
                durableStore.delete(durableKey(opts.scope || 'org', key));
            },
            async keys(opts = {}) {
                const prefix = `${opts.scope || 'org'}:`;
                return [...durableStore.keys()]
                    .filter(k => k.startsWith(prefix))
                    .map(k => k.slice(prefix.length));
            },
        },
        secrets: {
            async list() { return [...secretsStore.keys()]; },
            async get(name) { return secretsStore.has(name) ? secretsStore.get(name) : null; },
            async set(name, value) { secretsStore.set(name, value); },
            async remove(name) { secretsStore.delete(name); },
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
        delete window.__quoxGlass;
        delete window.__quoxPluginRegister;
        delete window.__quoxRegisteredPlugins;
    }
}

/**
 * PSDK-7: Mock @quox/glass components for testing.
 * Call in setupPluginTestEnv or beforeEach.
 */
export function setupGlassMocks() {
    if (typeof window !== 'undefined') {
        const React = require('react');
        const h = React.createElement;

        // Minimal mock components that render their children
        const mockComponent = (name) => (props) => h('div', { 'data-testid': name, ...props }, props.children);

        window.__quoxGlass = {
            AgentChatSidebar: mockComponent('AgentChatSidebar'),
            AgentChatPanel: mockComponent('AgentChatPanel'),
            GlassPanel: mockComponent('GlassPanel'),
            GlassPill: mockComponent('GlassPill'),
            GlassTabBar: mockComponent('GlassTabBar'),
            SectionHeader: mockComponent('SectionHeader'),
            ProgressRing: mockComponent('ProgressRing'),
            Sparkline: mockComponent('Sparkline'),
            GlassSkeleton: mockComponent('GlassSkeleton'),
            GlassError: mockComponent('GlassError'),
            MarkdownContent: mockComponent('MarkdownContent'),
            COLORS: { purple: '#a855f7', cyan: '#38bdf8', green: '#30ff90', amber: '#f59e0b', red: '#ef4444', white: '#fff' },
            STATUS_COLORS: { compliant: '#30ff90', partial: '#f59e0b', 'non-compliant': '#ef4444' },
            PROTOCOL_COLORS: { AEE: '#38bdf8', AOCL: '#a855f7', VOLT: '#30ff90', WARD: '#06b6d4' },
            M: "'JetBrains Mono',monospace",
            F: "'Inter',sans-serif",
        };
    }
}

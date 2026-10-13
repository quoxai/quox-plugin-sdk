/**
 * eslint-plugin-quox-plugin
 *
 * Rules for Quox community plugin authors:
 *   - no-cache-as-primary-storage: flag browser-only storage writes when the
 *     module never persists through window.quox.storage / memory.save.
 *   - no-host-only-globals: flag window.__quoxGlass, the throwing
 *     __quoxSharedDeps stubs, and direct fetch/XHR/WebSocket/EventSource
 *     (none of which work inside the sandbox).
 */
import noCacheAsPrimaryStorage from './rules/no-cache-as-primary-storage.js';
import noHostOnlyGlobals from './rules/no-host-only-globals.js';

const plugin = {
    meta: {
        name: 'eslint-plugin-quox-plugin',
        version: '0.2.0',
    },
    rules: {
        'no-cache-as-primary-storage': noCacheAsPrimaryStorage,
        'no-host-only-globals': noHostOnlyGlobals,
    },
    configs: {},
};

const recommendedRules = {
    'quox-plugin/no-cache-as-primary-storage': 'warn',
    'quox-plugin/no-host-only-globals': 'error',
};

// Legacy (eslintrc) shape.
plugin.configs.recommended = {
    plugins: ['quox-plugin'],
    rules: recommendedRules,
};

// Flat config shape: `...quoxPlugin.configs['flat/recommended']`.
plugin.configs['flat/recommended'] = {
    plugins: { 'quox-plugin': plugin },
    rules: recommendedRules,
};

export default plugin;

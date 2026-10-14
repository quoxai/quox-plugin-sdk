/**
 * @quoxai/eslint-plugin
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
        name: '@quoxai/eslint-plugin',
        version: '0.4.0',
    },
    rules: {
        'no-cache-as-primary-storage': noCacheAsPrimaryStorage,
        'no-host-only-globals': noHostOnlyGlobals,
    },
    configs: {},
};

const recommendedRules = {
    '@quoxai/no-cache-as-primary-storage': 'warn',
    '@quoxai/no-host-only-globals': 'error',
};

// Legacy (eslintrc) shape. ESLint resolves plugin '@quoxai' to the package
// @quoxai/eslint-plugin, so rules are namespaced '@quoxai/<rule>'.
plugin.configs.recommended = {
    plugins: ['@quoxai'],
    rules: recommendedRules,
};

// Flat config shape: `quoxai.configs['flat/recommended']` after
// `import quoxai from '@quoxai/eslint-plugin'`.
plugin.configs['flat/recommended'] = {
    plugins: { '@quoxai': plugin },
    rules: recommendedRules,
};

// Named exports too: ESLint 8 (eslintrc) loads plugins with require(). On
// Node 22+ require() of this ESM file returns the module namespace, so the
// plugin's fields must be visible there, not only on the default export.
export const { meta, rules, configs } = plugin;
export default plugin;

/**
 * eslint-plugin-quox-plugin
 *
 * Rules for QuoxCORE plugin authors. Currently ships:
 *   - no-cache-as-primary-storage: flag api.cache.set when the same module
 *     never persists to api.durable or api.memory. Browser-only stores are
 *     allowed for transient UI state, but a plugin that ONLY uses cache will
 *     lose user data on every browser reset.
 */
import noCacheAsPrimaryStorage from './rules/no-cache-as-primary-storage.js';

export default {
    meta: {
        name: 'eslint-plugin-quox-plugin',
        version: '0.1.0',
    },
    rules: {
        'no-cache-as-primary-storage': noCacheAsPrimaryStorage,
    },
    configs: {
        recommended: {
            plugins: ['quox-plugin'],
            rules: {
                'quox-plugin/no-cache-as-primary-storage': 'warn',
            },
        },
    },
};

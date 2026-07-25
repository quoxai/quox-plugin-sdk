/**
 * Lexical AST tests for no-cache-as-primary-storage. We use ESLint's RuleTester
 * with `espree` (the default parser) so the package has zero runtime deps.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../rules/no-cache-as-primary-storage.js';

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-cache-as-primary-storage', () => {
    it('valid + invalid samples', () => {
        ruleTester.run('no-cache-as-primary-storage', rule, {
            valid: [
                // cache + durable in same module → fine
                { code: `function go(api) { api.cache.set('k', 1); api.durable.set('k', 1); }` },
                // cache + memory.save in same module → fine
                { code: `function go(api) { api.cache.set('k', 1); api.memory.save({}); }` },
                // only durable, no cache → fine
                { code: `function go(api) { api.durable.set('k', 1); }` },
                // cache reads only (no writes) → fine
                { code: `function go(api) { const v = api.cache.get('k'); }` },
                // nested member path
                { code: `function go(api) { api.cache.set('k', 1); api.x.durable.set('k', 1); }` },
            ],
            invalid: [
                // cache as the only persistence
                {
                    code: `function go(api) { api.cache.set('k', 1); api.cache.set('m', 2); }`,
                    errors: [
                        { messageId: 'noCacheAsPrimary' },
                        { messageId: 'noCacheAsPrimary' },
                    ],
                },
                // legacy api.storage flagged with the deprecation message
                {
                    code: `function go(api) { api.storage.set('k', 1); api.durable.set('k', 1); }`,
                    errors: [{ messageId: 'useCacheNotStorage' }],
                },
                // both: storage deprecated AND only-cache complaint
                {
                    code: `function go(api) { api.storage.set('k', 1); api.cache.set('m', 2); }`,
                    errors: [
                        { messageId: 'useCacheNotStorage' },
                        { messageId: 'noCacheAsPrimary' },
                    ],
                },
            ],
        });
    });
});

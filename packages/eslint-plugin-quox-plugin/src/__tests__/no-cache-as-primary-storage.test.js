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
                { code: `async function go(q) { localStorage.setItem('k', '1'); await q.storage.set('k', 1); }` },
                { code: `async function go() { sessionStorage.setItem('k', '1'); await window.quox.memory.save({}); }` },
                { code: `async function go() { await getQuox().storage.set('k', 1); }` },
                { code: `function go() { const v = localStorage.getItem('k'); }` },
                { code: `function go(api) { api.cache.set('k', 1); api.x.storage.set('k', 1); }` },
            ],
            invalid: [
                {
                    code: `function go() { localStorage.setItem('k', '1'); sessionStorage.setItem('m', '2'); }`,
                    errors: [{ messageId: 'noCacheAsPrimary' }, { messageId: 'noCacheAsPrimary' }],
                },
                {
                    code: `function go(api) { api.cache.set('k', 1); }`,
                    errors: [{ messageId: 'noCacheAsPrimary' }],
                },
                {
                    code: `function go() { window.localStorage.setItem('k', '1'); }`,
                    errors: [{ messageId: 'noCacheAsPrimary' }],
                },
            ],
        });
    });

    it('advice points at window.quox.storage, never api.durable', async () => {
        const { expect } = await import('vitest');
        expect(rule.meta.messages.noCacheAsPrimary).toContain('window.quox.storage');
        expect(JSON.stringify(rule.meta.messages)).not.toContain('durable');
    });
});

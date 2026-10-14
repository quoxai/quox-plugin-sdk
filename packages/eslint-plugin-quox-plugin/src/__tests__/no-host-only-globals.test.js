import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../rules/no-host-only-globals.js';
import plugin from '../index.js';

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-host-only-globals', () => {
    it('valid + invalid samples', () => {
        ruleTester.run('no-host-only-globals', rule, {
            valid: [
                { code: `const { React } = window.__quoxSharedDeps;` },
                { code: `const r = await window.quox.fetch('items');` },
                { code: `const q = getQuox(); await q.fetch('items');` },
                { code: `const u = await q.getUser();` },
                { code: `obj.fetch('x');` },
            ],
            invalid: [
                { code: `const g = window.__quoxGlass;`, errors: [{ messageId: 'glass' }] },
                { code: `const { GlassPanel } = window['__quoxGlass'];`, errors: [{ messageId: 'glass' }] },
                { code: `const c = window.__quoxSharedDeps.CapabilityPanels;`, errors: [{ messageId: 'stub' }] },
                { code: `const a = window.__quoxSharedDeps.AuthContext;`, errors: [{ messageId: 'stub' }] },
                { code: `const { WorkspaceContext, React } = window.__quoxSharedDeps;`, errors: [{ messageId: 'stub' }] },
                { code: `window.__quoxSharedDeps.LicenseValidator;`, errors: [{ messageId: 'stub' }] },
                { code: `window.__quoxSharedDeps.ServerSyncQueue;`, errors: [{ messageId: 'stub' }] },
                { code: `window.__quoxSharedDeps.OrgScopedStorage;`, errors: [{ messageId: 'stub' }] },
                { code: `fetch('/api/x');`, errors: [{ messageId: 'network' }] },
                { code: `window.fetch('/api/x');`, errors: [{ messageId: 'network' }] },
                { code: `new XMLHttpRequest();`, errors: [{ messageId: 'network' }] },
                { code: `new WebSocket('wss://x');`, errors: [{ messageId: 'network' }] },
                { code: `new EventSource('/events');`, errors: [{ messageId: 'network' }] },
                { code: `new window.WebSocket('wss://x');`, errors: [{ messageId: 'network' }] },
            ],
        });
    });

    it('recommended configs enable both rules', () => {
        for (const cfg of [plugin.configs.recommended, plugin.configs['flat/recommended']]) {
            expect(cfg.rules['@quoxai/no-host-only-globals']).toBeTruthy();
            expect(cfg.rules['@quoxai/no-cache-as-primary-storage']).toBeTruthy();
        }
        expect(plugin.rules['no-host-only-globals']).toBe(rule);
    });
});

// The package is @quoxai/eslint-plugin, so ESLint's naming convention makes
// its namespace '@quoxai': users write plugin '@quoxai' (eslintrc) or
// plugins: { '@quoxai': plugin } (flat), and rules '@quoxai/<rule>'.
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from '../index.js';
import pkg from '../../package.json' with { type: 'json' };

describe('@quoxai/eslint-plugin namespace', () => {
    it('package name and meta name agree', () => {
        expect(pkg.name).toBe('@quoxai/eslint-plugin');
        expect(plugin.meta.name).toBe('@quoxai/eslint-plugin');
        expect(plugin.meta.version).toBe(pkg.version);
    });

    it('flat/recommended reports under @quoxai/* in a real ESLint run', () => {
        const linter = new Linter({ configType: 'flat' });
        const messages = linter.verify("fetch('/api/x');", [
            { languageOptions: { ecmaVersion: 2022, sourceType: 'module' } },
            plugin.configs['flat/recommended'],
        ]);
        expect(messages.map((m) => m.ruleId)).toContain('@quoxai/no-host-only-globals');
    });

    it('legacy recommended names the @quoxai plugin', () => {
        expect(plugin.configs.recommended.plugins).toEqual(['@quoxai']);
        for (const r of Object.keys(plugin.configs.recommended.rules)) expect(r.startsWith('@quoxai/')).toBe(true);
    });
});

describe('eslintrc (ESLint 8) loads the plugin through require(esm)', () => {
    it('exposes rules and configs as named exports, so the module namespace is a valid plugin', async () => {
        const ns = await import('../index.js');
        expect(ns.rules).toBe(plugin.rules);
        expect(ns.configs).toBe(plugin.configs);
        expect(ns.configs.recommended.plugins).toEqual(['@quoxai']);
    });
});

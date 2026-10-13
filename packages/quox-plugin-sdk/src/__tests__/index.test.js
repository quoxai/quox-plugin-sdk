import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getQuox, usePluginApi, registerPlugin, getSharedDeps, getGlassComponents,
    MANIFEST_ID_PATTERN, RESERVED_ID_PREFIXES, validateManifestId,
} from '../index.js';

describe('quox-plugin-sdk runtime', () => {
    beforeEach(() => { globalThis.window = {}; });
    afterEach(() => { delete globalThis.window; });

    describe('getQuox / usePluginApi', () => {
        it('throws an actionable error outside a Quox host', () => {
            expect(() => getQuox()).toThrow(/window\.quox is not available/);
            expect(() => getQuox()).toThrow(/Quox host|createMockQuox/);
        });

        it('throws when there is no window at all (SSR / node)', () => {
            delete globalThis.window;
            expect(() => getQuox()).toThrow(/window\.quox is not available/);
        });

        it('returns window.quox', () => {
            const q = { pluginId: 'x' };
            window.quox = q;
            expect(getQuox()).toBe(q);
            expect(usePluginApi()).toBe(q);
        });
    });

    describe('getSharedDeps', () => {
        it('throws when not in a host', () => {
            expect(() => getSharedDeps()).toThrow('shared deps not available');
        });
        it('returns deps', () => {
            const d = { React: {}, ReactDOM: {}, ReactRouterDOM: {} };
            window.__quoxSharedDeps = d;
            expect(getSharedDeps()).toBe(d);
        });
    });

    describe('registerPlugin', () => {
        it('throws when not in a host', () => {
            expect(() => registerPlugin('my-plugin', {})).toThrow(/__quoxPluginRegister is not available/);
        });
        it('calls __quoxPluginRegister', () => {
            const reg = vi.fn();
            window.__quoxPluginRegister = reg;
            const exp = { routes: { '/plugins/my-plugin': () => null }, sidebar: [] };
            registerPlugin('my-plugin', exp);
            expect(reg).toHaveBeenCalledWith('my-plugin', exp);
        });
        it('rejects a non-string pluginId', () => {
            window.__quoxPluginRegister = vi.fn();
            expect(() => registerPlugin(undefined, {})).toThrow(/pluginId/);
        });
        it('rejects missing exports object', () => {
            window.__quoxPluginRegister = vi.fn();
            expect(() => registerPlugin('my-plugin')).toThrow(/routes/);
        });
    });

    describe('deprecated helpers', () => {
        it('getGlassComponents throws naming the replacement', () => {
            window.__quoxGlass = {};
            expect(() => getGlassComponents()).toThrow(/plugin\.css/);
        });
    });

    describe('manifest id constants', () => {
        it('exports the host id pattern and reserved prefixes', () => {
            expect(MANIFEST_ID_PATTERN.test('my-plugin')).toBe(true);
            expect(MANIFEST_ID_PATTERN.test('ab')).toBe(false);
            expect(MANIFEST_ID_PATTERN.test('My-Plugin')).toBe(false);
            expect(MANIFEST_ID_PATTERN.test('-abc')).toBe(false);
            expect(RESERVED_ID_PREFIXES).toEqual(['core-', 'system-', 'quox-', 'admin-']);
        });
        it('validateManifestId reports problems', () => {
            expect(validateManifestId('my-plugin')).toBeNull();
            expect(validateManifestId('quox-thing')).toMatch(/reserved prefix/);
            expect(validateManifestId('Bad_ID')).toMatch(/lowercase/);
            expect(validateManifestId('')).toMatch(/required/);
        });
    });
});

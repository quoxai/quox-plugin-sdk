import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('quox-plugin-sdk', () => {
    beforeEach(() => {
        // Reset window globals
        delete globalThis.window;
        globalThis.window = {};
    });

    afterEach(() => {
        delete globalThis.window;
    });

    describe('getSharedDeps', () => {
        it('throws when __quoxSharedDeps is not available', async () => {
            const { getSharedDeps } = await import('../index.js');
            expect(() => getSharedDeps()).toThrow('QuoxCORE shared deps not available');
        });

        it('returns shared deps when available', async () => {
            const mockDeps = { React: {}, ReactDOM: {}, ReactRouterDOM: {} };
            window.__quoxSharedDeps = mockDeps;

            // Re-import to get fresh module
            const mod = await import('../index.js?t=1');
            expect(mod.getSharedDeps()).toBe(mockDeps);
        });
    });

    describe('registerPlugin', () => {
        it('throws when __quoxPluginRegister is not available', async () => {
            const { registerPlugin } = await import('../index.js?t=2');
            expect(() => registerPlugin('test', {})).toThrow('QuoxCORE plugin registration not available');
        });

        it('calls __quoxPluginRegister with correct args', async () => {
            const mockRegister = vi.fn();
            window.__quoxPluginRegister = mockRegister;

            const { registerPlugin } = await import('../index.js?t=3');
            const exports = { routes: {} };
            registerPlugin('my-plugin', exports);

            expect(mockRegister).toHaveBeenCalledWith('my-plugin', exports);
        });
    });
});

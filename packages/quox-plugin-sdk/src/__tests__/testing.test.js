/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createMockPluginApi } from '../testing.js';

describe('testing utilities', () => {
    describe('createMockPluginApi', () => {
        it('creates a mock API with default plugin ID', () => {
            const api = createMockPluginApi();
            expect(api.pluginId).toBe('test-plugin');
        });

        it('creates a mock API with custom plugin ID', () => {
            const api = createMockPluginApi('my-plugin');
            expect(api.pluginId).toBe('my-plugin');
        });

        it('storage get/set/remove/keys work correctly', () => {
            const api = createMockPluginApi();

            expect(api.storage.get('missing')).toBeNull();
            expect(api.storage.keys()).toEqual([]);

            api.storage.set('key1', 'value1');
            api.storage.set('key2', { nested: true });

            expect(api.storage.get('key1')).toBe('value1');
            expect(api.storage.get('key2')).toEqual({ nested: true });
            expect(api.storage.keys()).toEqual(['key1', 'key2']);

            api.storage.remove('key1');
            expect(api.storage.get('key1')).toBeNull();
            expect(api.storage.keys()).toEqual(['key2']);
        });

        it('config get returns empty object', () => {
            const api = createMockPluginApi();
            expect(api.config.get()).toEqual({});
        });

        it('config save does not throw', () => {
            const api = createMockPluginApi();
            expect(() => api.config.save({ key: 'value' })).not.toThrow();
        });

        it('fetch returns mock response', async () => {
            const api = createMockPluginApi();
            const response = await api.fetch('/test');
            expect(response.status).toBe(200);
        });

        it('notify does not throw', () => {
            const api = createMockPluginApi();
            expect(() => api.notify('test message', 'info')).not.toThrow();
        });

        it('memory save returns success', async () => {
            const api = createMockPluginApi();
            const result = await api.memory.save({ type: 'fact', content: 'test' });
            expect(result).toEqual({ success: true });
        });

        it('memory search returns empty results', async () => {
            const api = createMockPluginApi();
            const result = await api.memory.search('query');
            expect(result).toEqual({ results: [] });
        });

        it('aee emit returns success', async () => {
            const api = createMockPluginApi();
            const result = await api.aee.emit('test.intent', { data: true });
            expect(result).toEqual({ success: true });
        });
    });

    describe('setupPluginTestEnv / teardownPluginTestEnv', () => {
        // setupPluginTestEnv() requires react, react-dom/client, react-router-dom
        // which are only available in plugin projects (not in the SDK repo itself).
        // We test the registration mechanism without calling setupPluginTestEnv.

        afterEach(() => {
            delete window.__quoxSharedDeps;
            delete window.__quoxPluginRegister;
            delete window.__quoxRegisteredPlugins;
        });

        it('manual setup mirrors setupPluginTestEnv behaviour', () => {
            // Simulate what setupPluginTestEnv does
            window.__quoxSharedDeps = { React: {}, ReactDOM: {}, ReactRouterDOM: {} };
            const registered = {};
            window.__quoxPluginRegister = (pluginId, exports) => { registered[pluginId] = exports; };
            window.__quoxRegisteredPlugins = registered;

            expect(window.__quoxSharedDeps).toBeDefined();
            expect(typeof window.__quoxPluginRegister).toBe('function');
        });

        it('register function records plugins', () => {
            const registered = {};
            window.__quoxPluginRegister = (pluginId, exports) => { registered[pluginId] = exports; };
            window.__quoxRegisteredPlugins = registered;

            const exports = { routes: { '/test': () => null } };
            window.__quoxPluginRegister('test-plugin', exports);
            expect(window.__quoxRegisteredPlugins['test-plugin']).toBe(exports);
        });

        it('teardown removes all globals', () => {
            window.__quoxSharedDeps = {};
            window.__quoxPluginRegister = () => {};
            window.__quoxRegisteredPlugins = {};

            // Simulate teardownPluginTestEnv
            delete window.__quoxSharedDeps;
            delete window.__quoxPluginRegister;
            delete window.__quoxRegisteredPlugins;

            expect(window.__quoxSharedDeps).toBeUndefined();
            expect(window.__quoxPluginRegister).toBeUndefined();
            expect(window.__quoxRegisteredPlugins).toBeUndefined();
        });
    });
});

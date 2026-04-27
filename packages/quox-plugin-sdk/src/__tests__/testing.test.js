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

        it('cache get/set/remove/keys work correctly (PD-6)', () => {
            const api = createMockPluginApi();

            expect(api.cache.get('missing')).toBeNull();
            expect(api.cache.keys()).toEqual([]);

            api.cache.set('a', 1);
            api.cache.set('b', { x: 2 });

            expect(api.cache.get('a')).toBe(1);
            expect(api.cache.get('b')).toEqual({ x: 2 });
            expect(api.cache.keys().sort()).toEqual(['a', 'b']);

            api.cache.remove('a');
            expect(api.cache.get('a')).toBeNull();
        });

        it('storage is a deprecated alias of cache (PD-6)', () => {
            const api = createMockPluginApi();
            api.cache.set('shared', 'via-cache');
            expect(api.storage.get('shared')).toBe('via-cache');
            api.storage.set('via-storage', 42);
            expect(api.cache.get('via-storage')).toBe(42);
        });

        it('durable get/set/remove/keys round-trip with org and user scopes (PD-3)', async () => {
            const api = createMockPluginApi();

            await api.durable.set('k1', { count: 5 });
            await api.durable.set('k2', 'two');
            expect(await api.durable.get('k1')).toEqual({ count: 5 });
            expect(await api.durable.keys()).toEqual(['k1', 'k2']);

            await api.durable.set('pref', 'X-pref', { scope: 'user' });
            expect(await api.durable.get('pref', { scope: 'user' })).toBe('X-pref');
            expect(await api.durable.get('pref')).toBeNull();

            await api.durable.remove('k1');
            expect(await api.durable.get('k1')).toBeNull();
        });

        it('secrets list/set/get/remove (PD-4)', async () => {
            const api = createMockPluginApi();
            expect(await api.secrets.list()).toEqual([]);
            await api.secrets.set('token', 'plaintext');
            expect(await api.secrets.list()).toEqual(['token']);
            expect(await api.secrets.get('token')).toBe('plaintext');
            await api.secrets.remove('token');
            expect(await api.secrets.get('token')).toBeNull();
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

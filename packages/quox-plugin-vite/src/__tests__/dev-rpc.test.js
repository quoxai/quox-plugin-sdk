import { describe, it, expect } from 'vitest';

const { createDevRpc } = require('../dev-host/rpc.js');

describe('dev rpc mock (answers window.quox calls)', () => {
    const make = (extra = {}) => createDevRpc({ pluginId: 'my-plugin', ...extra });

    it('storage round-trips and lists', async () => {
        const rpc = make();
        expect(await rpc.handle('storage.get', { key: 'a' })).toBeNull();
        await rpc.handle('storage.set', { key: 'a', value: { n: 1 } });
        await rpc.handle('storage.set', { key: 'b', value: 2 });
        expect(await rpc.handle('storage.get', { key: 'a' })).toEqual({ n: 1 });
        expect(await rpc.handle('storage.keys', {})).toEqual(['a', 'b']);
        expect(await rpc.handle('storage.getAll', {})).toEqual({ a: { n: 1 }, b: 2 });
        await rpc.handle('storage.remove', { key: 'a' });
        expect(await rpc.handle('storage.keys', {})).toEqual(['b']);
    });

    it('memory.save then memory.search honours limit', async () => {
        const rpc = make();
        for (let i = 0; i < 3; i++) await rpc.handle('memory.save', { entry: { content: `note ${i} alpha` } });
        const r = await rpc.handle('memory.search', { query: 'alpha', limit: 2 });
        expect(r.results).toHaveLength(2);
        expect((await rpc.handle('memory.search', { query: 'zzz' })).results).toEqual([]);
    });

    it('aee.emit records the envelope and acks', async () => {
        const rpc = make();
        expect(await rpc.handle('aee.emit', { intent: 'x.y', payload: { a: 1 } })).toEqual({ success: true });
        expect(rpc.state.aee).toEqual([{ intent: 'x.y', payload: { a: 1 } }]);
    });

    it('getUser returns the dev user and is overridable', async () => {
        expect(await make().handle('getUser', {})).toEqual({ userId: 'dev-user', orgId: 'dev-org', role: 'admin', tier: 'pro' });
        expect((await make({ user: { role: 'viewer' } }).handle('getUser', {})).role).toBe('viewer');
    });

    it('notify and navigate ack', async () => {
        const rpc = make();
        expect(await rpc.handle('notify', { message: 'hi', type: 'info' })).toBe(true);
        expect(await rpc.handle('navigate', { path: '/plugins/my-plugin' })).toBe(true);
    });

    it('unknown method throws like the host', async () => {
        await expect(make().handle('nope', {})).rejects.toThrow('unknown_method:nope');
    });

    describe('fetch', () => {
        it('defaults to a 404 when no dev backend is configured', async () => {
            const r = await make().handle('fetch', { path: '/things', options: {} });
            expect(r.status).toBe(404);
            expect(r.ok).toBe(false);
            expect(JSON.parse(r.body).error).toBe('dev_backend_not_configured');
        });

        it('forwards to the configured backend under the plugin namespace', async () => {
            const calls = [];
            const rpc = make({
                backendUrl: 'http://localhost:9999',
                doFetch: async (url, init) => { calls.push([url, init]); return { status: 200, ok: true, text: async () => '{"x":1}' }; },
            });
            const r = await rpc.handle('fetch', { path: '/things?a=1', options: { method: 'post', body: '{}', headers: { 'Content-Type': 'application/json', Authorization: 'secret' } } });
            expect(r).toEqual({ status: 200, ok: true, body: '{"x":1}' });
            expect(calls[0][0]).toBe('http://localhost:9999/collector/api/v1/plugins/my-plugin/things?a=1');
            expect(calls[0][1].method).toBe('POST');
            expect(calls[0][1].headers.Authorization).toBeUndefined();
        });

        it.each([
            'https://evil.example/x', '//evil.example/x', '/../other-plugin/x', '/a/%2e%2e/b', '/a/..%2fb', '\\evil', '/a;b',
        ])('refuses %s like the host', async (p) => {
            const rpc = make({ backendUrl: 'http://localhost:9999', doFetch: async () => { throw new Error('should not be called'); } });
            await expect(rpc.handle('fetch', { path: p, options: {} })).rejects.toThrow(/absolute_url_forbidden|path_forbidden/);
        });

        it('refuses non-allowlisted methods', async () => {
            const rpc = make({ backendUrl: 'http://localhost:9999', doFetch: async () => ({}) });
            await expect(rpc.handle('fetch', { path: '/x', options: { method: 'TRACE' } })).rejects.toThrow('method_forbidden');
        });
    });

    it('rejects invalid plugin ids', () => {
        expect(() => createDevRpc({ pluginId: '../x' })).toThrow('invalid_plugin_id');
    });
});

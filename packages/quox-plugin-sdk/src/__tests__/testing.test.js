import { describe, it, expect, afterEach } from 'vitest';
import {
    createMockQuox, installMockQuox, uninstallMockQuox,
    createMockPluginApi, setupPluginTestEnv, teardownPluginTestEnv, setupGlassMocks,
} from '../testing.js';
import { getQuox } from '../index.js';

describe('createMockQuox', () => {
    it('has pluginId and default user', async () => {
        const q = createMockQuox({ pluginId: 'p-one' });
        expect(q.pluginId).toBe('p-one');
        expect(await q.getUser()).toEqual({ userId: 'user_test', orgId: 'org_test', role: 'admin', tier: 'free' });
    });

    it('user can be overridden', async () => {
        const q = createMockQuox({ user: { role: 'viewer' } });
        expect((await q.getUser()).role).toBe('viewer');
        expect((await q.getUser()).userId).toBe('user_test');
    });

    it('storage get/set/remove/keys/getAll', async () => {
        const q = createMockQuox();
        expect(await q.storage.get('a')).toBeNull();
        await q.storage.set('a', 1);
        await q.storage.set('b', { x: 2 });
        expect(await q.storage.get('b')).toEqual({ x: 2 });
        expect((await q.storage.keys()).sort()).toEqual(['a', 'b']);
        expect(await q.storage.getAll()).toEqual({ a: 1, b: { x: 2 } });
        await q.storage.remove('a');
        expect(await q.storage.get('a')).toBeNull();
    });

    it('storage values are cloned', async () => {
        const q = createMockQuox();
        const v = { n: 1 };
        await q.storage.set('k', v);
        v.n = 2;
        expect(await q.storage.get('k')).toEqual({ n: 1 });
    });

    it('fetch defaults to 404', async () => {
        const q = createMockQuox();
        expect(await q.fetch('items')).toEqual({ status: 404, ok: false, body: '' });
    });

    it('fetch uses injected handler and derives ok / stringifies body', async () => {
        const q = createMockQuox({ fetch: (path, o) => ({ status: 200, body: { path, m: o.method } }) });
        const r = await q.fetch('items', { method: 'POST' });
        expect(r.ok).toBe(true);
        expect(JSON.parse(r.body)).toEqual({ path: 'items', m: 'POST' });
    });

    it('fetch refuses absolute URLs and traversal like the host', async () => {
        const q = createMockQuox();
        await expect(q.fetch('https://evil.example/x')).rejects.toThrow(/relative/);
        await expect(q.fetch('../other/x')).rejects.toThrow(/relative/);
    });

    it('memory save/search', async () => {
        const q = createMockQuox();
        await q.memory.save({ type: 'fact', content: 'the sky is blue' });
        await q.memory.save({ type: 'fact', content: 'grass is green' });
        const r = await q.memory.search('sky');
        expect(r.results).toHaveLength(1);
        expect(q.memoryStore).toHaveLength(2);
    });

    it('logs aee, notify, navigate', async () => {
        const q = createMockQuox();
        await q.aee.emit('x.y', { a: 1 });
        await q.notify('hi');
        await q.notify('bad', 'error');
        await q.navigate('/plugins/p');
        expect(q.aeeLog).toEqual([{ intent: 'x.y', payload: { a: 1 } }]);
        expect(q.notifyLog).toEqual([{ message: 'hi', type: 'info' }, { message: 'bad', type: 'error' }]);
        expect(q.navigateLog).toEqual(['/plugins/p']);
    });

    it('onEvent sets a handler that emitEvent drives', () => {
        const q = createMockQuox();
        const seen = [];
        q.onEvent((m, a) => seen.push([m, a]));
        q.emitEvent('route', ['/plugins/p']);
        expect(seen).toEqual([['route', ['/plugins/p']]]);
    });

    it('does not expose host-only surfaces', () => {
        const q = createMockQuox();
        for (const k of ['durable', 'secrets', 'config', 'cache', 'chat']) expect(q[k]).toBeUndefined();
    });
});

describe('installMockQuox', () => {
    afterEach(() => { uninstallMockQuox(); delete globalThis.window; });

    it('installs window.quox, usePluginApi and a register recorder, then uninstalls', () => {
        globalThis.window = {};
        const q = installMockQuox({ pluginId: 'inst' });
        expect(window.quox).toBe(q);
        expect(getQuox()).toBe(q);
        expect(window.usePluginApi()).toBe(q);
        window.__quoxPluginRegister('inst', { routes: {} });
        expect(q.registered.inst).toEqual({ routes: {} });
        uninstallMockQuox();
        expect(window.quox).toBeUndefined();
        expect(window.__quoxPluginRegister).toBeUndefined();
    });

    it('works when window is undefined and restores that', () => {
        delete globalThis.window;
        const q = installMockQuox();
        expect(globalThis.window.quox).toBe(q);
        q.uninstall();
        expect(globalThis.window).toBeUndefined();
    });
});

describe('deprecated helpers', () => {
    it('throw actionable errors naming the replacement', () => {
        expect(() => createMockPluginApi()).toThrow(/createMockQuox/);
        expect(() => setupPluginTestEnv()).toThrow(/installMockQuox/);
        expect(() => teardownPluginTestEnv()).toThrow(/uninstallMockQuox/);
        expect(() => setupGlassMocks()).toThrow(/plugin\.css/);
    });
});

describe('createMockQuox permission gate', () => {
    it('grants everything by default', async () => {
        const q = createMockQuox();
        await q.storage.set('a', 1);
        expect(await q.storage.get('a')).toBe(1);
        await q.notify('hi');
    });
    it('rejects with permission_denied for every gated method when nothing is granted', async () => {
        const q = createMockQuox({ strictPermissions: true });
        const calls = {
            storage: [() => q.storage.get('k'), () => q.storage.set('k', 1), () => q.storage.remove('k'), () => q.storage.keys(), () => q.storage.getAll()],
            network: [() => q.fetch('x')],
            memory: [() => q.memory.save({}), () => q.memory.search('x')],
            aee: [() => q.aee.emit('i', {})],
            notifications: [() => q.notify('m')],
        };
        for (const [perm, fns] of Object.entries(calls)) {
            for (const fn of fns) await expect(fn()).rejects.toThrow(`permission_denied: ${perm}`);
        }
        await expect(q.getUser()).resolves.toBeTruthy();
        await expect(q.navigate('/x')).resolves.toBeUndefined();
        expect(() => q.onEvent(() => {})).not.toThrow();
    });
    it('honours an explicit permissions list', async () => {
        const q = createMockQuox({ permissions: ['storage'] });
        await q.storage.set('k', 1);
        await expect(q.fetch('x')).rejects.toThrow('permission_denied: network');
    });
    it('reads permissions from a manifest, fail-closed when absent', async () => {
        const ok = createMockQuox({ manifest: { permissions: ['network'] } });
        expect((await ok.fetch('x')).status).toBe(404);
        const none = createMockQuox({ manifest: { id: 'p' } });
        await expect(none.fetch('x')).rejects.toThrow('permission_denied: network');
    });
    it('installMockQuox passes the gate options through', async () => {
        const q = installMockQuox({ manifest: { permissions: [] } });
        await expect(window.quox.storage.get('k')).rejects.toThrow('permission_denied: storage');
        q.uninstall();
    });
    it('exports the same map the gate uses', async () => {
        const { COMMUNITY_PERMISSION_FOR_METHOD: m } = await import('../index.js');
        expect(m.fetch).toBe('network');
        expect(m['aee.emit']).toBe('aee');
        expect(Object.keys(m)).toHaveLength(10);
    });
});

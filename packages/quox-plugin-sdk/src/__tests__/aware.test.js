import { describe, it, expect, vi } from 'vitest';
import { createAware, startHeartbeat, validateEvent } from '../aware.js';

const base = { feed: 'myplug', orgId: 'org1', collectorUrl: 'http://c:9848/', serviceKey: 'k' };
const ok = () => Promise.resolve({ ok: true, status: 200, text: async () => '' });
const ev = { ledger: 'operational', kind: 'state', subject: 'myplug:job:1', summary: 'x' };

describe('aware', () => {
    it('requires feed, orgId, collectorUrl', () => {
        expect(() => createAware({ ...base, feed: '' })).toThrow();
        expect(() => createAware({ ...base, orgId: '' })).toThrow();
        expect(() => createAware({ ...base, collectorUrl: '' })).toThrow();
    });

    it('validates shape', () => {
        expect(validateEvent(ev)).toBeNull();
        expect(validateEvent({ ...ev, ledger: 'nope' })).toMatch(/ledger/);
        expect(validateEvent({ ...ev, kind: 'x' })).toMatch(/kind/);
        expect(validateEvent({ ...ev, subject: '' })).toMatch(/subject/);
        expect(validateEvent({ ...ev, salience: { needs: 'y' } })).toMatch(/salience/);
        expect(validateEvent({ ...ev, state: { actor: { type: 'bot' } } })).toMatch(/actor/);
        expect(validateEvent({ ...ev, ttl_s: -1 })).toMatch(/ttl_s/);
    });

    it('stamps feed, posts to internal route with key, returns invalid without fetching', async () => {
        const f = vi.fn(ok);
        const a = createAware({ ...base, surface: 'plug', fetchImpl: f });
        const bad = await a.emit({ ...ev, kind: 'zzz' });
        expect(bad.ok).toBe(false);
        expect(f).not.toHaveBeenCalled();
        const r = await a.emit({ ...ev, source: { feed: 'spoof' } });
        expect(r).toEqual({ ok: true, status: 200 });
        const [url, init] = f.mock.calls[0];
        expect(url).toBe('http://c:9848/api/internal/lucid/events');
        expect(init.headers['x-service-key']).toBe('k');
        const body = JSON.parse(init.body);
        expect(body.org_id).toBe('org1');
        expect(body.events[0].source).toMatchObject({ feed: 'myplug', surface: 'plug' });
    });

    it('snapshot and expect bodies', async () => {
        const f = vi.fn(ok);
        const a = createAware({ ...base, fetchImpl: f });
        await a.snapshot('myplug:job:', [ev], { asOf: 5 });
        const s = JSON.parse(f.mock.calls[0][1].body).snapshots[0];
        expect(s).toMatchObject({ feed: 'myplug', prefix: 'myplug:job:', as_of: 5 });
        expect(s.events[0].source.feed).toBe('myplug');
        await a.expect(['hitl']);
        expect(JSON.parse(f.mock.calls[1][1].body).expected_feeds).toEqual(['hitl']);
        expect((await a.snapshot('', [])).ok).toBe(false);
    });

    it('handles HTTP errors and network errors without throwing', async () => {
        const a = createAware({ ...base, fetchImpl: () => Promise.resolve({ ok: false, status: 401, text: async () => 'denied' }) });
        const r = await a.emit(ev);
        expect(r).toMatchObject({ ok: false, status: 401 });
        expect(r.error).toContain('denied');
        const b = createAware({ ...base, fetchImpl: () => Promise.reject(new Error('boom')) });
        expect(await b.emit(ev)).toMatchObject({ ok: false, status: 0, error: 'boom' });
    });

    it('times out via AbortController', async () => {
        const f = (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
        const a = createAware({ ...base, fetchImpl: f, timeoutMs: 20 });
        const r = await a.emit(ev);
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/timeout/);
    });

    it('coalesces heartbeats: one in flight, latest pending', async () => {
        let release; let calls = 0;
        const f = vi.fn(() => { calls++; return new Promise((r) => { release = () => r({ ok: true, status: 200 }); }); });
        const a = createAware({ ...base, fetchImpl: f });
        const p1 = a.heartbeat({ ttlS: 1 });
        const p2 = a.heartbeat({ ttlS: 2 });
        const p3 = a.heartbeat({ ttlS: 3, error: 'sad' });
        await new Promise((r) => setTimeout(r, 5));
        expect(calls).toBe(1);
        release();
        await p1;
        await new Promise((r) => setTimeout(r, 5));
        expect(calls).toBe(2);
        release();
        await Promise.all([p2, p3]);
        const last = JSON.parse(f.mock.calls[1][1].body).events[0];
        expect(last.ttl_s).toBe(3);
        expect(last.summary).toBe('sad');
        expect(last.kind).toBe('heartbeat');
    });

    it('startHeartbeat backs off on failure, caps, resets, stops', async () => {
        const results = [{ ok: false }, { ok: false }, { ok: false }, { ok: true }];
        let i = 0;
        const aware = { heartbeat: vi.fn(async () => results[Math.min(i++, 3)]) };
        const h = startHeartbeat(aware, 10, () => ({ error: 'db down' }), { maxBackoffFactor: 4 });
        await new Promise((r) => setTimeout(r, 25));
        expect(aware.heartbeat.mock.calls[0][0].error).toBe('db down');
        expect(h.stats().failures).toBeGreaterThan(0);
        expect(h.stats().nextDelayMs).toBeLessThanOrEqual(40);
        await new Promise((r) => setTimeout(r, 200));
        expect(h.stats().failures).toBe(0);
        h.stop();
        const n = aware.heartbeat.mock.calls.length;
        await new Promise((r) => setTimeout(r, 50));
        expect(aware.heartbeat.mock.calls.length).toBe(n);
    });
});

describe('salience shape matches the collector', () => {
  it('needs is a role string and gates a string array', async () => {
    const { validateEvent } = await import('../aware.js');
    const base = { ledger: 'social', kind: 'ask', subject: 'x:1' };
    expect(validateEvent({ ...base, salience: { needs: 'owner', gates: ['deploy:a'] } })).toBeNull();
    expect(validateEvent({ ...base, salience: { needs: true } })).toMatch(/needs must be one of/);
    expect(validateEvent({ ...base, salience: { gates: 'x' } })).toMatch(/gates must be an array/);
  });
});

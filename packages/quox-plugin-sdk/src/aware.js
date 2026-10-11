/**
 * @quox/plugin-sdk/aware: let a BACKEND plugin report to LUCID.
 * Node only, zero dependencies, uses global fetch. Never throws into the plugin.
 * The helper reads no env: pass collectorUrl and serviceKey explicitly
 * (plugins pass their existing collector URL and INTERNAL_SERVICE_KEY).
 */

export const LEDGERS = ['vital', 'operational', 'intentional', 'social', 'security'];
export const KINDS = ['state', 'delta', 'ask', 'heartbeat', 'retract'];
const ACTOR_TYPES = ['agent', 'session', 'human', 'system'];
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Returns an error string, or null when the event is well formed. */
export function validateEvent(ev) {
    if (!isObj(ev)) return 'event must be an object';
    if (!LEDGERS.includes(ev.ledger)) return `ledger must be one of ${LEDGERS.join('|')}`;
    if (!KINDS.includes(ev.kind)) return `kind must be one of ${KINDS.join('|')}`;
    if (typeof ev.subject !== 'string' || !ev.subject) return 'subject must be a non-empty string';
    if (ev.summary !== undefined && typeof ev.summary !== 'string') return 'summary must be a string';
    if (ev.ttl_s !== undefined && !(typeof ev.ttl_s === 'number' && ev.ttl_s > 0)) return 'ttl_s must be a positive number';
    if (ev.causes !== undefined && !Array.isArray(ev.causes)) return 'causes must be an array';
    if (ev.salience !== undefined) {
        if (!isObj(ev.salience)) return 'salience must be an object';
        for (const k of ['needs', 'gates']) {
            if (ev.salience[k] !== undefined && typeof ev.salience[k] !== 'boolean') return `salience.${k} must be boolean`;
        }
    }
    if (ev.state !== undefined) {
        if (!isObj(ev.state)) return 'state must be an object';
        const s = ev.state;
        if (s.layers !== undefined && !isObj(s.layers)) return 'state.layers must be an object';
        if (s.affects !== undefined && !Array.isArray(s.affects)) return 'state.affects must be an array';
        if (s.actor !== undefined) {
            if (!isObj(s.actor) || !ACTOR_TYPES.includes(s.actor.type)) return `state.actor.type must be one of ${ACTOR_TYPES.join('|')}`;
        }
    }
    return null;
}

/**
 * @param {{feed:string, orgId:string, collectorUrl:string, serviceKey:string,
 *   surface?:string, fetchImpl?:Function, timeoutMs?:number}} opts
 */
export function createAware({ feed, orgId, collectorUrl, serviceKey, surface, fetchImpl, timeoutMs = 5000 } = {}) {
    if (!feed || typeof feed !== 'string') throw new TypeError('createAware: feed is required');
    if (!orgId || typeof orgId !== 'string') throw new TypeError('createAware: orgId is required');
    if (!collectorUrl || typeof collectorUrl !== 'string') throw new TypeError('createAware: collectorUrl is required');
    const doFetch = fetchImpl || globalThis.fetch;
    const url = `${collectorUrl.replace(/\/+$/, '')}/api/internal/lucid/events`;
    const src = surface ? { feed, writer: feed, surface } : { feed, writer: feed };

    const stamp = (ev) => ({ ...ev, source: { ...(isObj(ev.source) ? ev.source : {}), ...src } });

    async function post(body) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await doFetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-service-key': serviceKey || '' },
                body: JSON.stringify({ org_id: orgId, ...body }),
                signal: ctrl.signal,
            });
            if (!res.ok) {
                let detail = '';
                try { detail = (await res.text()).slice(0, 200); } catch { /* ignore */ }
                return { ok: false, status: res.status, error: `HTTP ${res.status}${detail ? `: ${detail}` : ''}` };
            }
            return { ok: true, status: res.status };
        } catch (e) {
            const aborted = e && e.name === 'AbortError';
            return { ok: false, status: 0, error: aborted ? `timeout after ${timeoutMs}ms` : String((e && e.message) || e) };
        } finally {
            clearTimeout(timer);
        }
    }

    // Small queue: sequential, bounded; heartbeats coalesce (one in flight, one pending).
    const MAX_QUEUE = 100;
    let chain = Promise.resolve();
    let queued = 0;
    const enqueue = (fn) => {
        if (queued >= MAX_QUEUE) return Promise.resolve({ ok: false, status: 0, error: 'queue full' });
        queued++;
        const run = chain.then(fn, fn).finally(() => { queued--; });
        chain = run.catch(() => {});
        return run;
    };

    let hbInFlight = null;
    let hbPending = null; // { args, waiters }

    function heartbeatNow({ ttlS, error } = {}) {
        const ev = {
            ledger: 'vital', kind: 'heartbeat', subject: `feed:${feed}`, ts: Date.now(),
            ...(ttlS ? { ttl_s: ttlS } : {}),
            ...(error ? { summary: String(error), state: { error: String(error) } } : {}),
        };
        return post({ events: [stamp(ev)] });
    }

    return {
        feed,
        async emit(event) {
            try {
                const bad = validateEvent(event);
                if (bad) return { ok: false, status: 0, error: bad };
                return await enqueue(() => post({ events: [stamp(event)] }));
            } catch (e) { return { ok: false, status: 0, error: String((e && e.message) || e) }; }
        },
        heartbeat(opts = {}) {
            try {
                if (hbInFlight) {
                    if (!hbPending) {
                        let resolve; const p = new Promise((r) => { resolve = r; });
                        hbPending = { opts, p, resolve };
                    } else hbPending.opts = opts; // latest wins
                    return hbPending.p;
                }
                const go = (o) => {
                    hbInFlight = enqueue(() => heartbeatNow(o)).then((r) => {
                        hbInFlight = null;
                        const next = hbPending; hbPending = null;
                        if (next) go(next.opts).then(next.resolve);
                        return r;
                    });
                    return hbInFlight;
                };
                return go(opts);
            } catch (e) { return Promise.resolve({ ok: false, status: 0, error: String((e && e.message) || e) }); }
        },
        async snapshot(prefix, events, { asOf } = {}) {
            try {
                if (typeof prefix !== 'string' || !prefix) return { ok: false, status: 0, error: 'prefix must be a non-empty string' };
                if (!Array.isArray(events)) return { ok: false, status: 0, error: 'events must be an array' };
                for (const ev of events) {
                    const bad = validateEvent(ev);
                    if (bad) return { ok: false, status: 0, error: bad };
                }
                const snap = { feed, prefix, as_of: asOf || Date.now(), events: events.map(stamp) };
                return await enqueue(() => post({ snapshots: [snap] }));
            } catch (e) { return { ok: false, status: 0, error: String((e && e.message) || e) }; }
        },
        async expect(feeds) {
            try {
                if (!Array.isArray(feeds) || feeds.some((f) => typeof f !== 'string')) return { ok: false, status: 0, error: 'feeds must be an array of strings' };
                return await enqueue(() => post({ expected_feeds: feeds }));
            } catch (e) { return { ok: false, status: 0, error: String((e && e.message) || e) }; }
        },
    };
}

/**
 * Periodic heartbeat. healthFn may return {error} / a string / throw to report unhealthy.
 * Backs off (x2, capped at 10x everyMs) while posts fail; resets on success.
 * Returns { stop(), stats() }. The timer is unref'd.
 */
export function startHeartbeat(aware, everyMs, healthFn, { maxBackoffFactor = 10, onTick } = {}) {
    let failures = 0, total = 0, stopped = false, timer = null;
    const delay = () => everyMs * Math.min(2 ** failures, maxBackoffFactor);
    const tick = async () => {
        if (stopped) return;
        let error;
        try {
            const h = healthFn ? await healthFn() : undefined;
            if (typeof h === 'string') error = h;
            else if (h && h.error) error = h.error;
        } catch (e) { error = String((e && e.message) || e); }
        const r = await aware.heartbeat({ ttlS: Math.ceil((everyMs * 3) / 1000), error });
        total++;
        if (r.ok) failures = 0; else failures++;
        if (onTick) { try { onTick(r, failures); } catch { /* ignore */ } }
        if (!stopped) { timer = setTimeout(tick, delay()); timer.unref?.(); }
    };
    timer = setTimeout(tick, 0); timer.unref?.();
    return {
        stop() { stopped = true; clearTimeout(timer); },
        stats: () => ({ failures, total, nextDelayMs: delay() }),
    };
}

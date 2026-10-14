/**
 * Dev-server side of the window.quox RPC: an in-memory stand-in for the host
 * mediator (quox-dashboard src/services/pluginFrameHost.js createHostMediator).
 * State lives for the life of the dev server, so it survives frame reloads.
 *
 * fetch() mirrors the host's path confinement (copied logic) and forwards to an
 * OPTIONAL dev backend; with none configured it answers 404, which is what a
 * plugin without a server component should see.
 */

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_HEADERS = new Set(['content-type', 'accept']);

// Same map as COMMUNITY_PERMISSION_FOR_METHOD in @quoxai/quox-plugin-sdk (this package is
// CommonJS and cannot import the ESM sdk, so it is mirrored; a test pins it).
const PERMISSION_FOR_METHOD = Object.freeze({
    'storage.get': 'storage',
    'storage.set': 'storage',
    'storage.remove': 'storage',
    'storage.keys': 'storage',
    'storage.getAll': 'storage',
    fetch: 'network',
    'memory.save': 'memory',
    'memory.search': 'memory',
    'aee.emit': 'aee',
    notify: 'notifications',
});

// Mirrors NOT_AVAILABLE_METHODS in @quoxai/quox-plugin-sdk: the host exposes these but
// the collector has no route, so they reject after the permission gate.
const NOT_AVAILABLE = Object.freeze({ 'memory.save': 'memory', 'memory.search': 'memory', 'aee.emit': 'aee' });

function createDevRpc({ pluginId, backendUrl = '', doFetch, user = {}, permissions } = {}) {
    // manifest.permissions, fail-closed like the host. `permissions: undefined`
    // (no manifest passed at all) grants nothing, exactly as a missing field does in prod.
    const granted = new Set(Array.isArray(permissions) ? permissions : []);
    if (typeof pluginId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pluginId) || pluginId.includes('..')) {
        throw new Error('invalid_plugin_id');
    }
    const fetchImpl = doFetch || ((...a) => fetch(...a));
    const prefix = `/collector/api/v1/plugins/${pluginId}`;
    const state = { storage: new Map(), memory: [], aee: [], notifications: [] };
    const devUser = { userId: 'dev-user', orgId: 'dev-org', role: 'admin', tier: 'pro', ...user };

    // Port of the host's confine(): plugin-influenced paths stay under the namespace.
    function confine(raw) {
        const p = String(raw == null ? '' : raw);
        if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(p) || p.startsWith('//') || p.startsWith('\\')) {
            throw new Error('absolute_url_forbidden');
        }
        const pathOnly = p.split(/[?#]/, 1)[0];
        let dec = pathOnly;
        for (let i = 0; i < 4; i++) {
            let next;
            try { next = decodeURIComponent(dec); } catch { throw new Error('path_forbidden'); }
            if (next === dec) break;
            dec = next;
        }
        // eslint-disable-next-line no-control-regex
        if (/[\;\u0000-\u001f\u007f]/.test(dec) || /[\;\u0000-\u001f\u007f]/.test(pathOnly)) throw new Error('path_forbidden');
        if (dec.startsWith('//')) throw new Error('absolute_url_forbidden');
        if (dec.split('/').some((seg) => seg === '.' || seg === '..')) throw new Error('path_forbidden');
        const rel = p.startsWith('/') ? p : '/' + p;
        const resolved = new URL(prefix + rel, 'http://host.invalid');
        if (resolved.pathname !== prefix && !resolved.pathname.startsWith(prefix + '/')) throw new Error('path_forbidden');
        return resolved.pathname + resolved.search;
    }

    function safeHeaders(h) {
        const out = { 'Content-Type': 'application/json' };
        if (h && typeof h === 'object') {
            for (const [k, v] of Object.entries(h)) {
                const lk = String(k).toLowerCase();
                if (!ALLOWED_HEADERS.has(lk) || typeof v !== 'string' || /[\r\n]/.test(v)) continue;
                if (lk === 'content-type') out['Content-Type'] = v; else out.Accept = v;
            }
        }
        return out;
    }

    const handlers = {
        async 'storage.get'({ key }) { return state.storage.has(String(key)) ? state.storage.get(String(key)) : null; },
        async 'storage.set'({ key, value }) { state.storage.set(String(key), value); return true; },
        async 'storage.remove'({ key }) { state.storage.delete(String(key)); return true; },
        async 'storage.keys'() { return [...state.storage.keys()]; },
        async 'storage.getAll'() { return Object.fromEntries(state.storage); },
        async fetch({ path, options }) {
            const target = confine(path);
            const opts = options || {};
            const method = String(opts.method || 'GET').toUpperCase();
            if (!ALLOWED_METHODS.has(method)) throw new Error('method_forbidden');
            if (!backendUrl) {
                return {
                    status: 404,
                    ok: false,
                    body: JSON.stringify({
                        error: 'dev_backend_not_configured',
                        message: `No dev backend. Set devBackendUrl (or QUOX_DEV_BACKEND_URL) to forward ${method} ${target} to your plugin server.`,
                    }),
                };
            }
            const res = await fetchImpl(backendUrl.replace(/\/+$/, '') + target, {
                method,
                headers: safeHeaders(opts.headers),
                body: method === 'GET' ? undefined : opts.body,
            });
            return { status: res.status, ok: res.ok, body: await res.text() };
        },
        async 'memory.save'() { throw new Error(`not_available: ${NOT_AVAILABLE['memory.save']}`); },
        async 'memory.search'() { throw new Error(`not_available: ${NOT_AVAILABLE['memory.search']}`); },
        async 'aee.emit'() { throw new Error(`not_available: ${NOT_AVAILABLE['aee.emit']}`); },
        async navigate() { return true; },
        async notify({ message, type }) { state.notifications.push({ message, type }); return true; },
        async getUser() { return { ...devUser }; },
    };

    return {
        state,
        // The method set this stand-in serves; @quoxai/quox-plugin-sdk's frame contract
        // test pins it to the typed window.quox surface.
        methods: Object.freeze(Object.keys(handlers)),
        async handle(method, args) {
            const h = handlers[method];
            if (!h) throw new Error(`unknown_method:${method}`);
            const perm = PERMISSION_FOR_METHOD[method];
            if (perm && !granted.has(perm)) throw new Error(`permission_denied: ${perm}`);
            return h(args || {});
        },
    };
}

module.exports = { createDevRpc, PERMISSION_FOR_METHOD, NOT_AVAILABLE };

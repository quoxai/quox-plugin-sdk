/**
 * quox-plugin-sdk testing utilities.
 *
 * createMockQuox() is an in-memory stand-in for `window.quox`, matching the
 * surface a community plugin gets inside the Quox sandbox frame.
 */

import { COMMUNITY_PERMISSION_FOR_METHOD, NOT_AVAILABLE_METHODS } from './index.js';

const DEFAULT_USER = { userId: 'user_test', orgId: 'org_test', role: 'admin', tier: 'free' };

function clone(v) {
    return v === undefined ? undefined : structuredClone(v);
}

/**
 * Create an in-memory mock of window.quox.
 *
 * @param {object} [opts]
 * @param {string} [opts.pluginId]
 * @param {Partial<{userId:string,orgId:string,role:string,tier:string}>} [opts.user]
 * @param {(path: string, options: object) => ({status:number, ok?:boolean, body?:any}|Promise<any>)} [opts.fetch]
 *        handler for window.quox.fetch; defaults to 404.
 * @param {string[]} [opts.permissions] granted permissions, enforced exactly like the
 *        host (storage, network, memory, aee, notifications; memory and aee then reject not_available). A refused call rejects
 *        with Error('permission_denied: <perm>'). Default when neither this nor
 *        `manifest` is given: ALL granted (convenient for unit tests).
 * @param {{permissions?: string[]}} [opts.manifest] your manifest.json object; its
 *        `permissions` are used, fail-closed (absent = nothing granted), as in prod.
 * @param {boolean} [opts.strictPermissions] with no `permissions`/`manifest`, grant
 *        nothing instead of everything.
 * @param {boolean} [opts.simulateUnavailable=true] memory.* and aee.emit reject with
 *        Error('not_available: <name>') (after the permission check), exactly like the
 *        host today. Pass false ONLY to test future behaviour; do not ship code that relies on it.
 */
export function createMockQuox(opts = {}) {
    const pluginId = opts.pluginId || 'test-plugin';
    const user = { ...DEFAULT_USER, ...(opts.user || {}) };
    const fetchHandler = opts.fetch || (() => ({ status: 404, ok: false, body: '' }));

    const storageMap = new Map();
    const memoryStore = [];
    const aeeLog = [];
    const notifyLog = [];
    const navigateLog = [];
    let eventHandler = null;

    const simulateUnavailable = opts.simulateUnavailable !== false;
    const unavailable = (method) => {
        if (simulateUnavailable) throw new Error(`not_available: ${NOT_AVAILABLE_METHODS[method]}`);
    };

    const quox = {
        pluginId,

        storage: {
            async get(key) { return storageMap.has(key) ? clone(storageMap.get(key)) : null; },
            async set(key, value) { storageMap.set(key, clone(value)); },
            async remove(key) { storageMap.delete(key); },
            async keys() { return [...storageMap.keys()]; },
            async getAll() { return Object.fromEntries([...storageMap].map(([k, v]) => [k, clone(v)])); },
        },

        async fetch(path, options = {}) {
            if (typeof path !== 'string' || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.split('/').includes('..')) {
                throw new Error(`quox.fetch: path must be relative to the plugin namespace (got ${JSON.stringify(path)}); absolute URLs and ".." are refused`);
            }
            const r = (await fetchHandler(path, options)) || {};
            const status = typeof r.status === 'number' ? r.status : 200;
            const body = r.body === undefined || r.body === null ? ''
                : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
            return { status, ok: typeof r.ok === 'boolean' ? r.ok : status >= 200 && status < 300, body };
        },

        memory: {
            async save(entry) { unavailable('memory.save'); memoryStore.push(clone(entry)); return { success: true }; },
            async search(query, limit = 10) {
                unavailable('memory.search');
                const q = String(query || '').toLowerCase();
                const results = memoryStore
                    .filter((e) => JSON.stringify(e).toLowerCase().includes(q))
                    .slice(0, limit)
                    .map(clone);
                return { results };
            },
        },

        aee: {
            async emit(intent, payload) { unavailable('aee.emit'); aeeLog.push({ intent, payload: clone(payload) }); return { success: true }; },
        },

        async navigate(path) { navigateLog.push(path); },
        async notify(message, type = 'info') { notifyLog.push({ message, type }); },
        async getUser() { return { ...user }; },
        onEvent(fn) { eventHandler = typeof fn === 'function' ? fn : null; },

        // Test helpers (not part of the real window.quox surface).
        storageMap,
        memoryStore,
        aeeLog,
        notifyLog,
        navigateLog,
        registered: {},
        emitEvent(method, args = []) { if (eventHandler) eventHandler(method, args); },
        uninstall() { uninstallMockQuox(); },
    };

    // Permission gate: same map, same error text as the host mediator.
    let granted = null; // null = everything granted
    if (Array.isArray(opts.permissions)) granted = new Set(opts.permissions);
    else if (opts.manifest) granted = new Set(Array.isArray(opts.manifest.permissions) ? opts.manifest.permissions : []);
    else if (opts.strictPermissions) granted = new Set();
    if (granted) {
        for (const [method, perm] of Object.entries(COMMUNITY_PERMISSION_FOR_METHOD)) {
            const [head, sub] = method.split('.');
            const holder = sub ? quox[head] : quox;
            const key = sub || head;
            const orig = holder[key];
            holder[key] = async (...args) => {
                if (!granted.has(perm)) throw new Error(`permission_denied: ${perm}`);
                return orig.apply(holder, args);
            };
        }
    }
    return quox;
}

let installed = null;

/**
 * Install a mock as window.quox (plus window.usePluginApi and a recording
 * window.__quoxPluginRegister). Creates globalThis.window when absent.
 * Returns the mock; call mock.uninstall() or uninstallMockQuox() to clean up.
 */
export function installMockQuox(opts = {}) {
    if (installed) uninstallMockQuox();
    const createdWindow = typeof globalThis.window === 'undefined';
    if (createdWindow) globalThis.window = {};
    const w = globalThis.window;
    const previous = {
        quox: w.quox,
        usePluginApi: w.usePluginApi,
        register: w.__quoxPluginRegister,
        deps: w.__quoxSharedDeps,
    };
    const mock = createMockQuox(opts);
    w.quox = mock;
    w.usePluginApi = () => mock;
    w.__quoxPluginRegister = (id, exports) => { mock.registered[id] = exports; };
    if (opts.sharedDeps) w.__quoxSharedDeps = opts.sharedDeps;
    installed = { createdWindow, previous, setDeps: !!opts.sharedDeps };
    return mock;
}

/** Remove what installMockQuox() installed and restore prior values. */
export function uninstallMockQuox() {
    if (!installed) return;
    const { createdWindow, previous, setDeps } = installed;
    installed = null;
    const w = globalThis.window;
    if (!w) return;
    const restore = (key, val) => { if (val === undefined) delete w[key]; else w[key] = val; };
    restore('quox', previous.quox);
    restore('usePluginApi', previous.usePluginApi);
    restore('__quoxPluginRegister', previous.register);
    if (setDeps) restore('__quoxSharedDeps', previous.deps);
    if (createdWindow) delete globalThis.window;
}

/** @deprecated Use createMockQuox(). */
export function createMockPluginApi() {
    throw new Error(
        'createMockPluginApi() was removed: its api.cache/durable/secrets/config/chat surface does not exist in the ' +
        'community sandbox. Use createMockQuox() (window.quox: storage, fetch, navigate, notify, getUser, onEvent).'
    );
}

/** @deprecated Use installMockQuox(). */
export function setupPluginTestEnv() {
    throw new Error('setupPluginTestEnv() was removed. Use installMockQuox() from "quox-plugin-sdk/testing".');
}

/** @deprecated Use uninstallMockQuox(). */
export function teardownPluginTestEnv() {
    throw new Error('teardownPluginTestEnv() was removed. Use uninstallMockQuox() from "quox-plugin-sdk/testing".');
}

/** @deprecated Glass components do not exist in the sandbox. */
export function setupGlassMocks() {
    throw new Error(
        'setupGlassMocks() was removed: window.__quoxGlass does not exist for community plugins. ' +
        'Style your UI with plugin.css, the only stylesheet injected into the sandbox frame.'
    );
}

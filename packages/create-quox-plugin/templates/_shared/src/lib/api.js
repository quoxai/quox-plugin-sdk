/**
 * Thin helpers over window.quox (via getQuox from quox-plugin-sdk).
 *
 * A community plugin runs in a sandboxed frame with no network access of its own.
 * Everything goes through the Quox host over RPC:
 *   - getQuox().fetch(path)   calls YOUR plugin's backend (path is relative to
 *                             /collector/api/v1/plugins/<id>/, nothing else is reachable)
 *   - getQuox().storage       per-org key/value storage for this plugin
 * Every call can fail (backend not running, 404, host refuses). Callers must show
 * the error, never a blank screen.
 */

import { getQuox } from 'quox-plugin-sdk';

/** Call your plugin backend. Resolves to parsed JSON, throws Error on any failure. */
export async function api(path, { method = 'GET', body } = {}) {
    const init = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await getQuox().fetch(path, init);
    if (!res || !res.ok) {
        throw new Error(method + ' ' + path + ' failed (' + (res ? res.status : 'no response') + ')');
    }
    if (!res.body) return null;
    try {
        return JSON.parse(res.body);
    } catch (e) {
        throw new Error(method + ' ' + path + ' returned invalid JSON');
    }
}

/** Read a JSON value from plugin storage, or `fallback` when the key is unset. */
export async function loadValue(key, fallback) {
    const value = await getQuox().storage.get(key);
    return value === null || value === undefined ? fallback : value;
}

/** Write a JSON value to plugin storage. */
export async function saveValue(key, value) {
    await getQuox().storage.set(key, value);
}

/** Show a toast in the host. Never throws. */
export function toast(message, type = 'info') {
    try {
        getQuox().notify(message, type);
    } catch (e) {
        // outside a Quox host (unit tests): nothing to notify
    }
}

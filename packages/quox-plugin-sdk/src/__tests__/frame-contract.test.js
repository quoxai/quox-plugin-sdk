/**
 * Frame contract drift test (SDK-TEAM W5, 2026-10-14).
 *
 * The community plugin API is one RPC surface implemented in four places:
 * the types plugin authors compile against (types.d.ts QuoxPluginApi), the
 * runtime permission map (COMMUNITY_PERMISSION_FOR_METHOD), the dev-preview
 * host (quox-plugin-vite dev-host/rpc.js) and the test mock (testing.js).
 * The production host (quox-dashboard src/services/pluginFrameHost.js) pins
 * itself to the published quox-plugin-vite map from its own test suite.
 * A method present in one place and missing in another is drift: a typed
 * method that the host refuses, or a host method nobody can type against.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { COMMUNITY_PERMISSION_FOR_METHOD, NOT_AVAILABLE_METHODS } from '../index.js';
import { createMockQuox } from '../testing.js';

const require = createRequire(import.meta.url);
const { createDevRpc, PERMISSION_FOR_METHOD, NOT_AVAILABLE } = require('../../../quox-plugin-vite/src/dev-host/rpc.js');

// RPC methods that need no permission declaration (host answers them for every plugin).
const UNGATED_RPC = ['navigate', 'getUser'];
// Frame-local (not an RPC): registers a handler for host events.
const FRAME_LOCAL = ['onEvent'];

const RPC_METHODS = [...Object.keys(COMMUNITY_PERMISSION_FOR_METHOD), ...UNGATED_RPC].sort();

/** Method names declared on `interface QuoxPluginApi` in types.d.ts, dotted for groups. */
function typedMethods() {
    const src = fs.readFileSync(path.resolve(__dirname, '../types.d.ts'), 'utf8');
    const start = src.indexOf('export interface QuoxPluginApi {');
    expect(start).toBeGreaterThan(-1);
    // Walk braces to the end of the interface.
    let depth = 0;
    let end = start;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(src.indexOf('{', start) + 1, end).replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    let group = null;
    let groupDepth = 0;
    for (const line of body.split('\n')) {
        const open = line.match(/^\s{4}([a-zA-Z]+):\s*\{\s*$/);
        if (!group && open) { group = open[1]; groupDepth = 1; continue; }
        if (group) {
            groupDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            const m = line.match(/^\s{8}([a-zA-Z]+)\(/);
            if (m) out.push(`${group}.${m[1]}`);
            if (groupDepth <= 0) group = null;
            continue;
        }
        const top = line.match(/^\s{4}([a-zA-Z]+)\(/);
        if (top) out.push(top[1]);
    }
    return out.sort();
}

/** Method names on a window.quox-shaped object, dotted for groups. */
function objectMethods(api) {
    const out = [];
    for (const [k, v] of Object.entries(api)) {
        if (typeof v === 'function') out.push(k);
        else if (v && typeof v === 'object') {
            for (const [k2, v2] of Object.entries(v)) if (typeof v2 === 'function') out.push(`${k}.${k2}`);
        }
    }
    return out.sort();
}

describe('frame contract: one method set everywhere', () => {
    it('types.d.ts QuoxPluginApi declares exactly the RPC methods plus onEvent', () => {
        expect(typedMethods()).toEqual([...RPC_METHODS, ...FRAME_LOCAL].sort());
    });

    it('the dev preview host serves exactly the RPC methods', () => {
        const rpc = createDevRpc({ pluginId: 'contract-probe', permissions: [] });
        expect([...rpc.methods].sort()).toEqual(RPC_METHODS);
    });

    it('the dev preview host mirrors the permission and not-available maps', () => {
        expect({ ...PERMISSION_FOR_METHOD }).toEqual({ ...COMMUNITY_PERMISSION_FOR_METHOD });
        expect({ ...NOT_AVAILABLE }).toEqual({ ...NOT_AVAILABLE_METHODS });
    });

    it('the test mock exposes exactly the typed surface (plus its two test-only helpers)', () => {
        const TEST_HELPERS = ['emitEvent', 'uninstall'];
        const api = objectMethods(createMockQuox()).filter((m) => !TEST_HELPERS.includes(m));
        expect(api).toEqual([...RPC_METHODS, ...FRAME_LOCAL].sort());
    });

    it('every not-available method is a gated RPC method', () => {
        for (const m of Object.keys(NOT_AVAILABLE_METHODS)) expect(COMMUNITY_PERMISSION_FOR_METHOD[m]).toBeTruthy();
    });
});

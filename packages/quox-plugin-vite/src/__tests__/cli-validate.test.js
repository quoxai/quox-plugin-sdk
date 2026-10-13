import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { validate, validateManifest, scanBundle } = require('../cli/validate.js');

describe('validateManifest (host parity)', () => {
    it('requires id, name, version', () => {
        expect(validateManifest(null).ok).toBe(false);
        expect(validateManifest({ id: 'abc-plugin', name: 'x' }).ok).toBe(false);
    });
    it('id must be lowercase alnum with dashes, 3-64 chars', () => {
        for (const id of ['ab', 'Abc-def', '-abc', 'abc-', 'a_b_c', 'a'.repeat(65)]) {
            expect(validateManifest({ id, name: 'n', version: '1.0.0' }).ok).toBe(false);
        }
        expect(validateManifest({ id: 'abc', name: 'n', version: '1.0.0' }).ok).toBe(true);
    });
    it('rejects reserved prefixes', () => {
        for (const p of ['core-', 'system-', 'quox-', 'admin-']) {
            const r = validateManifest({ id: `${p}thing`, name: 'n', version: '1.0.0' });
            expect(r.ok).toBe(false);
            expect(r.message).toMatch(/reserved/);
        }
    });
    it('version must be semver', () => {
        expect(validateManifest({ id: 'abc-d', name: 'n', version: 'one' }).ok).toBe(false);
        expect(validateManifest({ id: 'abc-d', name: 'n', version: '1.2.3-beta.1' }).ok).toBe(true);
    });
});

describe('scanBundle', () => {
    it('flags __quoxGlass', () => {
        const f = scanBundle('const {GlassPanel}=window.__quoxGlass;');
        expect(f.some((x) => /__quoxGlass/.test(x.message))).toBe(true);
    });
    it('flags throwing stub deps', () => {
        const f = scanBundle('const {AuthContext}=window.__quoxSharedDeps;');
        expect(f.some((x) => /AuthContext/.test(x.message))).toBe(true);
        expect(scanBundle('window.__quoxSharedDeps.WorkspaceContext').length).toBeGreaterThan(0);
    });
    it('allows React deps', () => {
        expect(scanBundle('const R=window.__quoxSharedDeps.React;const {jsx}=window.__quoxSharedDeps.ReactJSXRuntime;')).toEqual([]);
    });
    it('flags raw network APIs but not window.quox.fetch', () => {
        expect(scanBundle('fetch("/x")').length).toBe(1);
        expect(scanBundle('window.fetch("/x")').length).toBe(1);
        expect(scanBundle('new XMLHttpRequest()').length).toBe(1);
        expect(scanBundle('new WebSocket("ws://x")').length).toBe(1);
        expect(scanBundle('new EventSource("/s")').length).toBe(1);
        expect(scanBundle('window.quox.fetch("/x");api.fetch("/y");const refetch=1;prefetch(2)')).toEqual([]);
    });
});

describe('validate(dir)', () => {
    let tmp;
    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpv-val-'));
        fs.mkdirSync(path.join(tmp, 'dist'));
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'my-plugin', name: 'My', version: '1.0.0' }));
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), 'const R=window.__quoxSharedDeps.React;');
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.css'), '.a{}');
    });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    it('passes a clean project', () => {
        const r = validate({ dir: tmp });
        expect(r.errors).toEqual([]);
        expect(r.ok).toBe(true);
    });
    it('errors when manifest.json is missing', () => {
        fs.rmSync(path.join(tmp, 'manifest.json'));
        expect(validate({ dir: tmp }).ok).toBe(false);
    });
    it('errors when the bundle is missing', () => {
        fs.rmSync(path.join(tmp, 'dist', 'plugin.esm.js'));
        const r = validate({ dir: tmp });
        expect(r.ok).toBe(false);
        expect(r.errors.join('\n')).toMatch(/npm run build/);
    });
    it('warns (not errors) when plugin.css is missing', () => {
        fs.rmSync(path.join(tmp, 'dist', 'plugin.css'));
        const r = validate({ dir: tmp });
        expect(r.ok).toBe(true);
        expect(r.warnings.join('\n')).toMatch(/plugin\.css/);
    });
    it('errors on a sandbox-incompatible bundle', () => {
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), 'fetch("/api/x");window.__quoxGlass.x;');
        const r = validate({ dir: tmp });
        expect(r.ok).toBe(false);
        expect(r.errors.length).toBe(2);
    });
    it('errors when the install body would exceed the host 5 MB limit', () => {
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), Buffer.alloc(4 * 1024 * 1024, 97));
        const r = validate({ dir: tmp });
        expect(r.ok).toBe(false);
        expect(r.errors.join('\n')).toMatch(/5 MB/);
    });
});

describe('cli main', () => {
    const { run } = require('../cli/main.js');
    it('exit codes: unknown command 1, no args 0, validate on empty dir 1', () => {
        const io = { log() {}, error() {} };
        expect(run(['bogus'], io)).toBe(1);
        expect(run([], io)).toBe(0);
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpv-cli-'));
        expect(run(['validate', '--dir', tmp], io)).toBe(1);
        fs.rmSync(tmp, { recursive: true, force: true });
    });
});

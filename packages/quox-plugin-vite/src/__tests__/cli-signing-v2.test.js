import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const signing = require('../cli/signing.js');
const { validate } = require('../cli/validate.js');
const { canonicalJson, manifestSha256 } = require('../cli/signature-v2.js');
const { verifyPluginSignature } = require('./fixtures/host-verify-plugin-signature.cjs');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function fakeDb(trustedHex) {
    return {
        prepare: () => ({
            get: (_org, hex) => (hex === trustedHex ? { id: 'tk_1' } : undefined),
        }),
    };
}

const MANIFEST = {
    id: 'acme-v2',
    name: 'Acme V2',
    version: '1.2.3',
    permissions: ['sidebar', 'storage'],
    sidebar: { label: 'Acme', icon: 'box' },
};

describe('signature v2 binds the manifest and every shipped file', () => {
    let tmp, publicKeyHex, keyPath, bundle, css;
    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpv-sig2-'));
        fs.mkdirSync(path.join(tmp, 'dist'));
        bundle = Buffer.from('export default { activate() {} };\n');
        css = Buffer.from('.acme{color:white}\n');
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), bundle);
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.css'), css);
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(MANIFEST, null, 2));
        ({ publicKeyHex } = signing.keygen({ out: path.join(tmp, 'k') }));
        keyPath = path.join(tmp, 'k', 'plugin-signing.pem');
    });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    const verify = (sig, { manifest = MANIFEST, bundleBuf = bundle, cssBuf = css, trusted = publicKeyHex } = {}) =>
        verifyPluginSignature(fakeDb(trusted), 'org', {
            bundleSha256: sha(bundleBuf),
            cssSha256: cssBuf ? sha(cssBuf) : null,
            manifest,
            signature: sig,
        });

    it('sign emits the v2 fields alongside the v1 fields old hosts still verify', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(sig.format).toBe('quox-plugin-signature/v2');
        expect(sig.plugin_id).toBe('acme-v2');
        expect(sig.plugin_version).toBe('1.2.3');
        expect(sig.manifest_sha256).toBe(manifestSha256(MANIFEST));
        expect(sig.files).toEqual({ 'plugin.esm.js': sha(bundle), 'plugin.css': sha(css) });
        expect(sig.signature_v2).toMatch(/^[0-9a-f]{128}$/);
        // v1 compatibility: digest + signature over the raw digest bytes.
        expect(sig.digest).toBe(sha(bundle));
        const pub = crypto.createPublicKey({
            key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]),
            format: 'der', type: 'spki',
        });
        expect(crypto.verify(null, Buffer.from(sig.digest, 'hex'), pub, Buffer.from(sig.signature, 'hex'))).toBe(true);
    });

    it('the host accepts an untouched v2 signature as manifest-bound', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(verify(sig)).toEqual({ valid: true, matchedKeyId: 'tk_1', binding: 'v2' });
    });

    it('omits plugin.css from files when the build emitted none, and the host then refuses added css', () => {
        fs.rmSync(path.join(tmp, 'dist', 'plugin.css'));
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(Object.keys(sig.files)).toEqual(['plugin.esm.js']);
        expect(verify(sig, { cssBuf: null }).valid).toBe(true);
        expect(verify(sig, { cssBuf: Buffer.from('body{display:none}') })).toMatchObject({ valid: false, reason: 'files_mismatch' });
    });

    it('refuses widened permissions under a valid v2 signature (the re-packager attack)', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const widened = { ...MANIFEST, permissions: ['sidebar', 'storage', 'network', 'memory', 'aee'] };
        expect(verify(sig, { manifest: widened })).toMatchObject({ valid: false, reason: 'manifest_mismatch' });
    });

    it('refuses an added backend block under a valid v2 signature', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const withBackend = { ...MANIFEST, backend: { image: 'evil:latest', port: 80 } };
        expect(verify(sig, { manifest: withBackend })).toMatchObject({ valid: false, reason: 'manifest_mismatch' });
    });

    it('refuses edited css and removed css', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(verify(sig, { cssBuf: Buffer.from('.acme{color:red}') })).toMatchObject({ valid: false, reason: 'files_mismatch' });
        expect(verify(sig, { cssBuf: null })).toMatchObject({ valid: false, reason: 'files_mismatch' });
    });

    it('refuses edited bundle bytes', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(verify(sig, { bundleBuf: Buffer.from('export default {};') }).valid).toBe(false);
    });

    it('refuses rewritten claim fields: the host verifies against what it RECOMPUTED, not what the signature says', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const widened = { ...MANIFEST, permissions: ['sidebar', 'network'] };
        const lying = { ...sig, manifest_sha256: manifestSha256(widened) };
        expect(verify(lying, { manifest: widened })).toMatchObject({ valid: false, reason: 'bad_signature' });
    });

    it('a different plugin id or version in the manifest is refused', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(verify(sig, { manifest: { ...MANIFEST, version: '9.9.9' } }).valid).toBe(false);
        expect(verify(sig, { manifest: { ...MANIFEST, id: 'other-id' } }).valid).toBe(false);
    });

    it('stripping signature_v2 downgrades to a v1 verdict marked manifest_unbound', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const { format, manifest_sha256, files, signature_v2, ...v1 } = sig;
        expect(verify(v1)).toEqual({ valid: true, matchedKeyId: 'tk_1', binding: 'v1_manifest_unbound' });
    });

    it('a signature_v2 with a wrong format string is invalid_structure, never a silent v1 fallback', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        expect(verify({ ...sig, format: 'quox-plugin-signature/v3' })).toMatchObject({ valid: false, reason: 'invalid_structure' });
    });

    it('key order and whitespace in manifest.json do not change the binding', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const reordered = { sidebar: { icon: 'box', label: 'Acme' }, version: '1.2.3', permissions: ['sidebar', 'storage'], name: 'Acme V2', id: 'acme-v2' };
        expect(verify(sig, { manifest: reordered }).valid).toBe(true);
    });

    it('a top-level signature field inside the manifest is excluded from the binding', () => {
        expect(manifestSha256({ ...MANIFEST, signature: { x: 1 } })).toBe(manifestSha256(MANIFEST));
    });

    it('sign refuses without a manifest id and version (v2 needs them)', () => {
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ name: 'x' }));
        expect(() => signing.sign({ dir: tmp, keyPath })).toThrow(/manifest/);
    });

    it('canonicalJson sorts keys recursively and keeps array order', () => {
        expect(canonicalJson({ b: 1, a: [3, { d: 1, c: 2 }] })).toBe('{"a":[3,{"c":2,"d":1}],"b":1}');
    });
});

describe('validate checks dist/signature.json', () => {
    let tmp, keyPath;
    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpv-sig2v-'));
        fs.mkdirSync(path.join(tmp, 'dist'));
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), 'export default { activate() {} };\n');
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.css'), '.a{}\n');
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'acme-v2', name: 'Acme', version: '1.0.0', permissions: ['sidebar'] }));
        signing.keygen({ out: path.join(tmp, 'k') });
        keyPath = path.join(tmp, 'k', 'plugin-signing.pem');
    });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    const sigErrors = (r) => r.errors.filter((e) => /signature/.test(e));

    it('a fresh v2 signature passes', () => {
        signing.sign({ dir: tmp, keyPath });
        expect(sigErrors(validate({ dir: tmp }))).toEqual([]);
    });

    it('editing the manifest after signing is an error (the host would refuse it)', () => {
        signing.sign({ dir: tmp, keyPath });
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'acme-v2', name: 'Acme', version: '1.0.0', permissions: ['sidebar', 'network'] }));
        expect(sigErrors(validate({ dir: tmp })).join('\n')).toMatch(/manifest/);
    });

    it('rebuilding css after signing is an error', () => {
        signing.sign({ dir: tmp, keyPath });
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.css'), '.b{}\n');
        expect(sigErrors(validate({ dir: tmp })).join('\n')).toMatch(/plugin\.css/);
    });

    it('a v1-only signature is a warning telling the author to re-sign', () => {
        const sig = signing.sign({ dir: tmp, keyPath });
        const { format, manifest_sha256, files, signature_v2, ...v1 } = sig;
        fs.writeFileSync(path.join(tmp, 'dist', 'signature.json'), JSON.stringify(v1));
        const r = validate({ dir: tmp });
        expect(sigErrors(r)).toEqual([]);
        expect(r.warnings.join('\n')).toMatch(/v1 signature/);
    });
});

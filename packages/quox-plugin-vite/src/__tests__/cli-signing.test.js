import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const signing = require('../cli/signing.js');
const { verifyPluginSignature } = require('./fixtures/host-verify-plugin-signature.cjs');

function fakeDb(trustedHex) {
    return {
        prepare: () => ({
            get: (_org, hex) => (hex === trustedHex ? { id: 'tk_1' } : undefined),
        }),
    };
}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

describe('quox-plugin keygen / sign', () => {
    let tmp;
    beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qpv-sign-')); });
    afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

    it('keygen writes a 0600 private PEM and a 64-hex public key', () => {
        const out = path.join(tmp, '.keys');
        const r = signing.keygen({ out });
        expect(r.publicKeyHex).toMatch(/^[0-9a-f]{64}$/);
        const st = fs.statSync(path.join(out, 'plugin-signing.pem'));
        expect(st.mode & 0o777).toBe(0o600);
        expect(fs.readFileSync(path.join(out, 'plugin-signing.pub'), 'utf8').trim()).toBe(r.publicKeyHex);
    });

    it('keygen refuses to overwrite an existing key without force', () => {
        const out = path.join(tmp, 'k');
        signing.keygen({ out });
        expect(() => signing.keygen({ out })).toThrow(/already exists/);
        expect(() => signing.keygen({ out, force: true })).not.toThrow();
    });

    it('sign writes dist/signature.json that the HOST verifier accepts', () => {
        const dist = path.join(tmp, 'dist');
        fs.mkdirSync(dist);
        const bundle = Buffer.from('export default 1;\n');
        fs.writeFileSync(path.join(dist, 'plugin.esm.js'), bundle);
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'my-plugin', name: 'My', version: '1.0.0' }));
        const { publicKeyHex } = signing.keygen({ out: path.join(tmp, 'k') });
        const sig = signing.sign({ dir: tmp, keyPath: path.join(tmp, 'k', 'plugin-signing.pem') });
        const onDisk = JSON.parse(fs.readFileSync(path.join(dist, 'signature.json'), 'utf8'));
        expect(onDisk).toEqual(sig);
        expect(onDisk.algorithm).toBe('Ed25519');
        expect(onDisk.public_key_hex).toBe(publicKeyHex);
        expect(onDisk.digest).toBe(sha(bundle));

        const manifest = JSON.parse(fs.readFileSync(path.join(tmp, 'manifest.json'), 'utf8'));
        const verdict = verifyPluginSignature(fakeDb(publicKeyHex), 'org', { bundleSha256: sha(bundle), manifest, signature: onDisk });
        expect(verdict).toEqual({ valid: true, matchedKeyId: 'tk_1', binding: 'v2' });
    });

    it('host rejects the signature if the bundle bytes change after signing', () => {
        const dist = path.join(tmp, 'dist');
        fs.mkdirSync(dist);
        fs.writeFileSync(path.join(dist, 'plugin.esm.js'), 'a');
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'my-plugin', name: 'My', version: '1.0.0' }));
        const { publicKeyHex } = signing.keygen({ out: path.join(tmp, 'k') });
        const sig = signing.sign({ dir: tmp, keyPath: path.join(tmp, 'k', 'plugin-signing.pem') });
        const manifest = { id: 'my-plugin', name: 'My', version: '1.0.0' };
        const v = verifyPluginSignature(fakeDb(publicKeyHex), 'org', { bundleSha256: sha('b'), manifest, signature: sig });
        expect(v.valid).toBe(false);
        expect(v.reason).toBe('files_mismatch');
    });

    it('host rejects a key that is not trusted', () => {
        const dist = path.join(tmp, 'dist');
        fs.mkdirSync(dist);
        fs.writeFileSync(path.join(dist, 'plugin.esm.js'), 'a');
        fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ id: 'my-plugin', name: 'My', version: '1.0.0' }));
        signing.keygen({ out: path.join(tmp, 'k') });
        const sig = signing.sign({ dir: tmp, keyPath: path.join(tmp, 'k', 'plugin-signing.pem') });
        const manifest = { id: 'my-plugin', name: 'My', version: '1.0.0' };
        const v = verifyPluginSignature(fakeDb('00'.repeat(32)), 'org', { bundleSha256: sha('a'), manifest, signature: sig });
        expect(v.reason).toBe('no_matching_key');
    });

    it('sign errors clearly when dist/plugin.esm.js is missing', () => {
        signing.keygen({ out: path.join(tmp, 'k') });
        expect(() => signing.sign({ dir: tmp, keyPath: path.join(tmp, 'k', 'plugin-signing.pem') })).toThrow(/plugin\.esm\.js/);
    });

    it('sign rejects a non-Ed25519 key', () => {
        fs.mkdirSync(path.join(tmp, 'dist'));
        fs.writeFileSync(path.join(tmp, 'dist', 'plugin.esm.js'), 'a');
        const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const p = path.join(tmp, 'rsa.pem');
        fs.writeFileSync(p, privateKey.export({ type: 'pkcs8', format: 'pem' }));
        expect(() => signing.sign({ dir: tmp, keyPath: p })).toThrow(/Ed25519/);
    });
});

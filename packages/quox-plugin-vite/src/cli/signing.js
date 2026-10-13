/**
 * Community plugin signing, in the exact format the QuoxCORE host verifies
 * (services/auth/utils/plugins.js verifyPluginSignature):
 *
 *   { algorithm: 'Ed25519',
 *     digest: <sha256 hex of the exact dist/plugin.esm.js bytes>,
 *     signature: <hex Ed25519 signature over the 32 raw digest bytes>,
 *     public_key_hex: <64 hex chars, the raw Ed25519 public key> }
 *
 * The org admin trusts public_key_hex via `quox plugin trusted-keys add`.
 * Only plugin.esm.js is bound by the host check (css and manifest are not).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_FILE = 'plugin-signing.pem';
const PUB_FILE = 'plugin-signing.pub';

function rawPublicHex(publicKey) {
    const der = publicKey.export({ type: 'spki', format: 'der' });
    return der.subarray(der.length - 32).toString('hex');
}

function keygen({ out, force = false } = {}) {
    if (!out) throw new Error('keygen requires --out <dir>');
    const dir = path.resolve(out);
    const keyPath = path.join(dir, KEY_FILE);
    const pubPath = path.join(dir, PUB_FILE);
    if (fs.existsSync(keyPath) && !force) {
        throw new Error(`${keyPath} already exists; refusing to overwrite a signing key (use --force to replace it)`);
    }
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicKeyHex = rawPublicHex(publicKey);
    fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.chmodSync(keyPath, 0o600);
    fs.writeFileSync(pubPath, publicKeyHex + '\n');
    return { keyPath, pubPath, publicKeyHex };
}

function sign({ dir = '.', keyPath } = {}) {
    if (!keyPath) throw new Error('sign requires --key <private.pem>');
    const root = path.resolve(dir);
    const bundlePath = path.join(root, 'dist', 'plugin.esm.js');
    if (!fs.existsSync(bundlePath)) {
        throw new Error(`${bundlePath} not found; run \`npm run build\` first`);
    }
    let privateKey;
    try {
        privateKey = crypto.createPrivateKey(fs.readFileSync(path.resolve(keyPath), 'utf8'));
    } catch (e) {
        throw new Error(`could not read private key ${keyPath}: ${e.message}`);
    }
    if (privateKey.asymmetricKeyType !== 'ed25519') {
        throw new Error('signing key must be Ed25519 (generate one with `quox-plugin keygen`)');
    }
    const digest = crypto.createHash('sha256').update(fs.readFileSync(bundlePath)).digest('hex');
    const signature = crypto.sign(null, Buffer.from(digest, 'hex'), privateKey).toString('hex');
    const out = {
        algorithm: 'Ed25519',
        digest,
        signature,
        public_key_hex: rawPublicHex(crypto.createPublicKey(privateKey)),
    };
    try {
        const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
        if (m.id) out.plugin_id = m.id;
        if (m.version) out.plugin_version = m.version;
    } catch { /* manifest optional for signing */ }
    out.signed_at = new Date().toISOString();
    fs.writeFileSync(path.join(root, 'dist', 'signature.json'), JSON.stringify(out, null, 2) + '\n');
    return out;
}

module.exports = { keygen, sign, rawPublicHex, KEY_FILE, PUB_FILE };

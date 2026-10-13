/**
 * Community plugin signing, in the format the QuoxCORE host verifies
 * (services/auth/utils/plugins.js verifyPluginSignature).
 *
 * dist/signature.json carries TWO signatures by the same key:
 *
 *   v2 (binds everything that ships; see signature-v2.js):
 *     format: 'quox-plugin-signature/v2', plugin_id, plugin_version,
 *     manifest_sha256, files: { 'plugin.esm.js', 'plugin.css'? },
 *     signature_v2: <hex Ed25519 over canonicalJson(v2 payload)>
 *
 *   v1 (kept so hosts that predate v2 still install the plugin):
 *     digest: <sha256 of dist/plugin.esm.js>,
 *     signature: <hex Ed25519 over the 32 raw digest bytes>
 *
 * A v2-aware host verifies v2 and refuses any change to the manifest, the
 * bundle or the CSS. Stripping the v2 fields does not help an attacker: the
 * host then treats the plugin as v1 (manifest unbound) and refuses any
 * manifest that asks for more than sidebar, storage and notifications.
 *
 * The org admin trusts public_key_hex via `quox plugin trusted-keys add`.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v2Payload, v2Message, sha256Hex } = require('./signature-v2.js');

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
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    } catch (e) {
        throw new Error(`could not read manifest.json in ${root}: ${e.message} (the signature binds the manifest)`);
    }
    if (!manifest || typeof manifest.id !== 'string' || typeof manifest.version !== 'string') {
        throw new Error('manifest.json needs a string id and version: the signature binds them');
    }
    const digest = sha256Hex(fs.readFileSync(bundlePath));
    const cssPath = path.join(root, 'dist', 'plugin.css');
    const cssSha256 = fs.existsSync(cssPath) ? sha256Hex(fs.readFileSync(cssPath)) : null;
    const payload = v2Payload({ manifest, bundleSha256: digest, cssSha256 });
    const out = {
        algorithm: 'Ed25519',
        public_key_hex: rawPublicHex(crypto.createPublicKey(privateKey)),
        ...payload,
        signature_v2: crypto.sign(null, v2Message(payload), privateKey).toString('hex'),
        // v1, for hosts that predate v2.
        digest,
        signature: crypto.sign(null, Buffer.from(digest, 'hex'), privateKey).toString('hex'),
    };
    out.signed_at = new Date().toISOString();
    fs.writeFileSync(path.join(root, 'dist', 'signature.json'), JSON.stringify(out, null, 2) + '\n');
    return out;
}

module.exports = { keygen, sign, rawPublicHex, KEY_FILE, PUB_FILE };

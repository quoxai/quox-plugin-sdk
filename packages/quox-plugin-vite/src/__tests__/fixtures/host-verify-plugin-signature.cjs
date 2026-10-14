/**
 * FAITHFUL COPY of the host verifier, for compatibility tests only.
 *
 * Source: quox-dashboard services/auth/utils/plugins.js, from
 *   `const ED25519_DER_PREFIX` through verifyV2 (SDK-TEAM W5, signature v2).
 * Changes from the host: CommonJS wrapper; the canonical helpers come from
 * this package's src/cli/signature-v2.js, which is the line-for-line twin of
 * the host's utils/pluginSignatureV2.js; `db` is any object exposing
 * prepare(sql).get(orgId, pubHex). The verification logic is the host's.
 */
const { createPublicKey, verify: cryptoVerify } = require('crypto');
const { FORMAT_V2, canonicalJson, filesMap, v2Payload, v2Message } = require('../../cli/signature-v2.js');

const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function ed25519Verify(pubHex, message, sigHex) {
    const pubKey = createPublicKey({
        key: Buffer.concat([ED25519_DER_PREFIX, Buffer.from(pubHex, 'hex')]),
        format: 'der',
        type: 'spki',
    });
    return cryptoVerify(null, message, pubKey, Buffer.from(sigHex, 'hex'));
}

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;

/**
 * Verify a plugin signature against the org's trusted keys.
 *
 * Two formats (SDK-TEAM W5, 2026-10-13):
 *   v2 (quox-plugin-vite >= 0.3.0, now @quoxai/quox-plugin-vite): `signature_v2` over canonicalJson of
 *      { files, format, manifest_sha256, plugin_id, plugin_version }; binds the
 *      manifest, the bundle and the css (see pluginSignatureV2.js). The host
 *      RECOMPUTES every bound value from what was posted and verifies against
 *      that, never against the claims inside the signature object.
 *   v1 (0.2.0): `signature` over the 32 raw bytes of the bundle sha256. Binds
 *      the bundle only; returned with binding 'v1_manifest_unbound' so the
 *      caller can apply its v1 manifest policy.
 * A v2 signature object also carries the v1 fields so pre-v2 hosts keep
 * installing it; a v2-aware host ignores them when v2 is present.
 *
 * @returns {{ valid: boolean, reason?: string, matchedKeyId?: string, binding?: 'v2'|'v1_manifest_unbound' }}
 *   reasons: unsigned, invalid_structure, manifest_required, digest_mismatch,
 *   manifest_mismatch, files_mismatch, no_matching_key, bad_signature, verify_error
 *
 * Policy is the caller's choice; this function only computes the verdict.
 */
function verifyPluginSignature(db, orgId, { bundleSha256, cssSha256 = null, manifest = null, signature }) {
    if (!signature || typeof signature !== 'object') {
        return { valid: false, reason: 'unsigned' };
    }
    const isV2 = 'format' in signature || 'signature_v2' in signature;
    if (isV2) return verifyV2(db, orgId, { bundleSha256, cssSha256, manifest, signature });

    const { algorithm, digest, signature: sigHex, public_key_hex } = signature;
    if (algorithm !== 'Ed25519' || !digest || !sigHex || !public_key_hex) {
        return { valid: false, reason: 'invalid_structure' };
    }
    if (digest !== bundleSha256) {
        return { valid: false, reason: 'digest_mismatch' };
    }
    const pubHex = String(public_key_hex).toLowerCase();
    const trustedRow = db.prepare(
        `SELECT id FROM org_trusted_keys WHERE org_id = ? AND public_key_hex = ?`
    ).get(orgId, pubHex);
    if (!trustedRow) {
        return { valid: false, reason: 'no_matching_key' };
    }
    try {
        return ed25519Verify(pubHex, Buffer.from(digest, 'hex'), sigHex)
            ? { valid: true, matchedKeyId: trustedRow.id, binding: 'v1_manifest_unbound' }
            : { valid: false, reason: 'bad_signature' };
    } catch (err) {
        return { valid: false, reason: 'verify_error', error: err.message };
    }
}

function verifyV2(db, orgId, { bundleSha256, cssSha256, manifest, signature }) {
    const { algorithm, format, signature_v2: sigHex, public_key_hex } = signature;
    if (algorithm !== 'Ed25519' || format !== FORMAT_V2 || typeof sigHex !== 'string' || !HEX128.test(sigHex)
        || typeof public_key_hex !== 'string' || !HEX64.test(public_key_hex.toLowerCase())) {
        return { valid: false, reason: 'invalid_structure' };
    }
    if (!manifest || typeof manifest !== 'object') {
        return { valid: false, reason: 'manifest_required' };
    }
    if (!bundleSha256) return { valid: false, reason: 'digest_mismatch' };

    // Recompute everything the signature binds from the posted bytes.
    const payload = v2Payload({ manifest, bundleSha256, cssSha256 });
    if (signature.plugin_id !== payload.plugin_id || signature.plugin_version !== payload.plugin_version
        || signature.manifest_sha256 !== payload.manifest_sha256) {
        return { valid: false, reason: 'manifest_mismatch' };
    }
    if (canonicalJson(signature.files ?? null) !== canonicalJson(filesMap(bundleSha256, cssSha256))) {
        return { valid: false, reason: 'files_mismatch' };
    }
    const pubHex = public_key_hex.toLowerCase();
    const trustedRow = db.prepare(
        `SELECT id FROM org_trusted_keys WHERE org_id = ? AND public_key_hex = ?`
    ).get(orgId, pubHex);
    if (!trustedRow) {
        return { valid: false, reason: 'no_matching_key' };
    }
    try {
        return ed25519Verify(pubHex, v2Message(payload), sigHex)
            ? { valid: true, matchedKeyId: trustedRow.id, binding: 'v2' }
            : { valid: false, reason: 'bad_signature' };
    } catch (err) {
        return { valid: false, reason: 'verify_error', error: err.message };
    }
}

module.exports = { verifyPluginSignature };

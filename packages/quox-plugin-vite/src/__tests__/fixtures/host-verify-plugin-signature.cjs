/**
 * FAITHFUL COPY of the host verifier, for compatibility tests only.
 *
 * Source: services/auth/utils/plugins.js, function verifyPluginSignature
 * Repo:   quox-dashboard, origin/main @ 17684609a4fba813966445926541e4390e16fda2
 * Changes from the host: CommonJS wrapper; `db` is any object exposing
 * prepare(sql).get(orgId, pubHex) (the host passes better-sqlite3). The
 * verification logic itself is byte-for-byte the host's.
 */
const { createPublicKey, verify: cryptoVerify } = require('crypto');

function verifyPluginSignature(db, orgId, { bundleSha256, signature }) {
    if (!signature || typeof signature !== 'object') {
        return { valid: false, reason: 'unsigned' };
    }
    const { algorithm, digest, signature: sigHex, public_key_hex } = signature;
    if (algorithm !== 'Ed25519' || !digest || !sigHex || !public_key_hex) {
        return { valid: false, reason: 'invalid_structure' };
    }
    if (digest !== bundleSha256) {
        return { valid: false, reason: 'digest_mismatch' };
    }
    const pubHex = public_key_hex.toLowerCase();
    const trustedRow = db.prepare(
        `SELECT id FROM org_trusted_keys WHERE org_id = ? AND public_key_hex = ?`
    ).get(orgId, pubHex);
    if (!trustedRow) {
        return { valid: false, reason: 'no_matching_key' };
    }

    try {
        const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
        const pubKey = createPublicKey({
            key: Buffer.concat([ED25519_DER_PREFIX, Buffer.from(pubHex, 'hex')]),
            format: 'der',
            type: 'spki',
        });
        const ok = cryptoVerify(
            null,
            Buffer.from(digest, 'hex'),
            pubKey,
            Buffer.from(sigHex, 'hex'),
        );
        return ok
            ? { valid: true, matchedKeyId: trustedRow.id }
            : { valid: false, reason: 'bad_signature' };
    } catch (err) {
        return { valid: false, reason: 'verify_error', error: err.message };
    }
}

module.exports = { verifyPluginSignature };

# Plugin Signing & Licensing

## Signing

Plugin signing uses Ed25519 digital signatures to verify authenticity and integrity. Signed plugins show a "Signed" badge in the QuoxCORE plugin manager. Unsigned plugins show a warning.

### Generate a Signing Key Pair

Run this once:

```bash
node scripts/generate-signing-key.js
```

This produces:
- `quox-signing.key` — Private key (keep secret, never commit)
- `quox-signing.pub` — Public key (PEM format)
- Console output: Base64 public key for embedding

**Add `quox-signing.key` to your `.gitignore` immediately.**

### Sign a Plugin

After building your `.quoxplugin`:

```bash
node scripts/sign-plugin.js \
  --plugin ./my-plugin.quoxplugin \
  --key ./quox-signing.key
```

This:
1. Opens the ZIP
2. Reads `manifest.json`
3. Computes a SHA-256 digest of the canonical (sorted, signature-stripped) manifest
4. Signs the digest with your Ed25519 private key
5. Writes `signature.json` into the ZIP

### Signature Format

The `signature.json` file contains:

```json
{
    "keyId": "base64-encoded-public-key",
    "digest": "base64-encoded-sha256-digest",
    "signature": "base64-encoded-ed25519-signature",
    "algorithm": "Ed25519",
    "hashAlgorithm": "SHA-256",
    "timestamp": "2026-03-20T12:00:00.000Z",
    "pluginId": "my-plugin",
    "pluginVersion": "1.0.0"
}
```

### Verification in QuoxCORE

When a user uploads a signed plugin:
1. QuoxCORE extracts `signature.json`
2. Checks the signing key is trusted
3. Recomputes the manifest digest
4. Verifies the Ed25519 signature
5. Shows "Signed" or "Invalid Signature" accordingly

### Distributing Your Public Key

For your plugins to verify as "Signed", the QuoxCORE instance must trust your public key. Currently this requires the QuoxCORE admin to add your key. Phase 2 (marketplace) will automate this.

## Per-Plugin Licensing

Plugin developers can generate license keys for paid plugins.

### Generate a License

```bash
node scripts/generate-license.js \
  --plugin my-monitor \
  --customer "Acme Corp" \
  --expires 2027-12-31 \
  --key ./quox-signing.key
```

Output:

```
Plugin license generated:
  Plugin:   my-monitor
  Customer: Acme Corp
  Expires:  2027-12-31
  Key:      QXP-A1B2-C3D4-E5F6-G7H8

Full license JSON (give to customer):
{
    "id": "QXP-A1B2-C3D4-E5F6-G7H8",
    "customer_id": "uuid",
    "customer_name": "Acme Corp",
    "scope": "plugin:my-monitor",
    "plugin_id": "my-monitor",
    "expires_at": "2027-12-31T23:59:59.999Z",
    "signature": "base64-encoded-signature"
}
```

### License Activation Flow

In the QuoxCORE plugin manager:
1. User uploads a plugin with `"license": "paid"` in manifest
2. After permissions approval, a license key input appears
3. User pastes the JSON license key
4. QuoxCORE validates: scope matches plugin, signature valid, not expired
5. License stored locally for offline validation

### Free Plugins

Set `"license": "free"` in your manifest (or omit the field). Free plugins skip the license step entirely.

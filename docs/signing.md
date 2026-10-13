# Plugin Signing & Licensing

## Signing community plugins

Community (third-party) plugins run in a sandboxed frame. An org admin decides which
authors are trusted by registering their Ed25519 public key. Once an org has at least one
trusted key, QuoxCORE accepts only bundles carrying a valid signature from one of them.
An org with no trusted keys accepts unsigned installs.

`quox-plugin-vite` ships a `quox-plugin` CLI that produces exactly the signature the host
verifies. No extra scripts are needed.

### 1. Generate a key pair (once)

```bash
npx quox-plugin keygen --out ./.keys
```

This writes:

- `.keys/plugin-signing.pem`: the private key (mode 0600). Keep it secret. Never commit it.
  New projects ignore `.keys/` in git; add it to `.gitignore` if yours does not.
- `.keys/plugin-signing.pub`: the public key as 64 hex characters.

It refuses to overwrite an existing key unless you pass `--force`.

### 2. Build, validate, sign

```bash
npm run build
npx quox-plugin validate
npx quox-plugin sign --key ./.keys/plugin-signing.pem
```

`sign` writes `dist/signature.json`. Re-sign after every build and after any edit to
`manifest.json`: the signature (v2, quox-plugin-vite 0.3.0 and later) binds the manifest
and every file that ships.

```json
{
  "algorithm": "Ed25519",
  "public_key_hex": "<64 hex chars, the raw public key>",
  "files": {
    "plugin.esm.js": "<sha256 hex of dist/plugin.esm.js>",
    "plugin.css": "<sha256 hex of dist/plugin.css, when the build emits one>"
  },
  "format": "quox-plugin-signature/v2",
  "manifest_sha256": "<sha256 hex of the canonical manifest.json>",
  "plugin_id": "my-plugin",
  "plugin_version": "1.0.0",
  "signature_v2": "<hex Ed25519 signature over the canonical v2 payload>",
  "digest": "<sha256 hex of dist/plugin.esm.js>",
  "signature": "<hex Ed25519 signature over the 32 digest bytes>",
  "signed_at": "2026-10-13T12:00:00.000Z"
}
```

**What v2 binds.** The signed message is the canonical JSON of
`{ files, format, manifest_sha256, plugin_id, plugin_version }` (object keys sorted
recursively, no whitespace). `manifest_sha256` is the sha256 of the canonical form of
`manifest.json` with any top-level `signature` field removed, so key order and formatting
in your manifest do not matter, but any change to its content (permissions, backend,
sidebar, version) does. The host recomputes every one of those values from what you
install and verifies against that, so a changed manifest, bundle or stylesheet is refused.

**v1 compatibility.** `digest` and `signature` are the v1 signature (bundle bytes only),
kept so hosts that predate v2 still install your plugin. A v2-aware host ignores them when
`signature_v2` is present. A plugin signed only with v1 (quox-plugin-vite 0.2.0) still
installs on a v2-aware host, but because a v1 signature vouches for none of the manifest,
the host then accepts it only if the manifest asks for nothing beyond `sidebar`, `storage`
and `notifications` and declares no `backend`. Re-sign with 0.3.0 to lift that.

`quox-plugin validate` checks `dist/signature.json` against the current files and tells you
if anything changed after signing.

### 3. The org admin trusts your public key

Send the admin the contents of `.keys/plugin-signing.pub` (it is public). They run:

```bash
quox plugin trusted-keys add --label "Acme plugin signing" --public-key <64-hex-public-key>
quox plugin trusted-keys list
```

Removing a trusted key (`quox plugin trusted-keys remove <keyId>`) stops NEW installs signed
by it. Removing the LAST trusted key reopens the org to unsigned bundles, so the CLI requires
`--confirm-unsigned` for that case.

### Revocation (org admin)

To stop a key or one specific build from running at all, revoke it:

```bash
quox plugin revocations add --signer-key <64-hex-public-key> --reason "key leaked"
quox plugin revocations add --bundle-digest <sha256 of plugin.esm.js> --reason "bad build"
quox plugin revocations list
quox plugin revocations remove <revocationId>
```

A revocation is per org and wins over trust. Revoked bytes cannot be installed, upgraded to
or migrated in, whether or not the org has trusted keys. An install that is already in place
stops being served: its bundle and stylesheet answer `403 revoked`, it drops out of the list
the dashboard activates from, and each browser removes its cached copy on the next page load.
It stays visible to admins (flagged `revoked`) so it can be uninstalled. There is no
cross-org or global revocation list yet: each org revokes for itself.

### 4. Install

```bash
quox plugin install \
  --manifest manifest.json \
  --bundle dist/plugin.esm.js \
  --css dist/plugin.css \
  --signature dist/signature.json
```

The same `--signature dist/signature.json` is required for `quox plugin update` when the
org has trusted keys.

### Failure reasons

| Host reason | Meaning |
|-------------|---------|
| `unsigned` | no `--signature` was sent |
| `invalid_structure` | `signature.json` is malformed, uses an unknown `format`, or algorithm is not `Ed25519` |
| `manifest_mismatch` | `manifest.json` changed after signing (v2): sign again |
| `files_mismatch` | `dist/plugin.esm.js` or `dist/plugin.css` changed, was added or was removed after signing (v2): rebuild, then sign again |
| `digest_mismatch` | `dist/plugin.esm.js` changed after signing (v1) |
| `manifest_unbound_permissions` | a v1 signature with a manifest asking for more than `sidebar`, `storage`, `notifications` or declaring a `backend`: re-sign with quox-plugin-vite 0.3.0 or later |
| `no_matching_key` | the org has not trusted this public key (step 3) |
| `bad_signature` | the signature does not verify |
| `revoked` (error) | the org revoked this signer key or this exact bundle |

### Official plugins are different

Quox first-party plugins are signed with a manifest digest and an `integrity` block by Quox's
own release tooling and run in the dashboard rather than the sandbox. That path is not
available to community authors and `quox-plugin sign` does not produce it.

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

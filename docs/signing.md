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

`sign` writes `dist/signature.json`. Re-sign after every build: the signature is bound to
the exact bytes of `dist/plugin.esm.js`.

```json
{
  "algorithm": "Ed25519",
  "digest": "<sha256 hex of dist/plugin.esm.js>",
  "signature": "<hex Ed25519 signature over the 32 digest bytes>",
  "public_key_hex": "<64 hex chars, the raw public key>",
  "plugin_id": "my-plugin",
  "plugin_version": "1.0.0",
  "signed_at": "2026-10-13T12:00:00.000Z"
}
```

The host reads `algorithm`, `digest`, `signature` and `public_key_hex`; the other fields are
informational. Only `plugin.esm.js` is covered by the signature, so keep `plugin.css` and
`manifest.json` under your normal release controls.

### 3. The org admin trusts your public key

Send the admin the contents of `.keys/plugin-signing.pub` (it is public). They run:

```bash
quox plugin trusted-keys add --label "Acme plugin signing" --public-key <64-hex-public-key>
quox plugin trusted-keys list
```

To revoke a key: `quox plugin trusted-keys remove <keyId>`. Removing the LAST trusted key
reopens the org to unsigned bundles, so the CLI requires `--confirm-unsigned` for that case.

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
| `invalid_structure` | `signature.json` is missing `algorithm`, `digest`, `signature` or `public_key_hex`, or algorithm is not `Ed25519` |
| `digest_mismatch` | `dist/plugin.esm.js` changed after signing: rebuild, then sign again |
| `no_matching_key` | the org has not trusted this public key (step 3) |
| `bad_signature` | the signature does not verify against the digest |

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

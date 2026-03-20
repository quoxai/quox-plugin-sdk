#!/usr/bin/env node
/**
 * Sign a .quoxplugin package with an Ed25519 private key.
 *
 * Usage:
 *   node scripts/sign-plugin.js --plugin my-plugin.quoxplugin --key quox-signing.key
 *
 * Steps:
 *   1. Read .quoxplugin ZIP
 *   2. Extract manifest.json
 *   3. Compute SHA-256 digest of canonical manifest JSON
 *   4. Sign digest with Ed25519 private key
 *   5. Inject signature.json into ZIP
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const pluginPath = getArg('--plugin');
const keyPath = getArg('--key');

if (!pluginPath || !keyPath) {
  console.error('Usage: node scripts/sign-plugin.js --plugin <path.quoxplugin> --key <private-key.key>');
  process.exit(1);
}

if (!fs.existsSync(pluginPath)) {
  console.error(`Error: Plugin file not found: ${pluginPath}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Error: Key file not found: ${keyPath}`);
  process.exit(1);
}

/**
 * Recursively sort object keys for canonical JSON representation.
 * Strips any existing 'signature' field.
 */
function canonicalSort(obj) {
  if (Array.isArray(obj)) return obj.map(canonicalSort);
  if (obj !== null && typeof obj === 'object') {
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      if (key === 'signature') continue;
      sorted[key] = canonicalSort(obj[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Compute SHA-256 digest of the canonical manifest JSON.
 */
function computeDigest(manifest) {
  const canonical = canonicalSort(manifest);
  const json = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(json).digest('base64');
}

async function main() {
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch {
    console.error('adm-zip is not installed. Run: npm install --save-dev adm-zip');
    process.exit(1);
  }

  const zip = new AdmZip(path.resolve(pluginPath));

  // Read manifest.json from the ZIP
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    console.error('Error: manifest.json not found in plugin package');
    process.exit(1);
  }

  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  console.log(`Signing plugin: ${manifest.name} v${manifest.version} (${manifest.id})`);

  // Compute digest
  const digest = computeDigest(manifest);

  // Read private key
  const privateKeyPem = fs.readFileSync(path.resolve(keyPath), 'utf8');
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  // Extract public key ID (base64 of raw 32-byte Ed25519 public key)
  const publicKey = crypto.createPublicKey(privateKey);
  const rawPub = publicKey.export({ type: 'spki', format: 'der' });
  const rawBytes = rawPub.slice(rawPub.length - 32);
  const keyId = rawBytes.toString('base64');

  // Sign the digest
  const digestBytes = Buffer.from(digest, 'base64');
  const signature = crypto.sign(null, digestBytes, privateKey);
  const signatureBase64 = signature.toString('base64');

  // Build signature.json
  const sigData = {
    keyId,
    digest,
    signature: signatureBase64,
    algorithm: 'Ed25519',
    hashAlgorithm: 'SHA-256',
    timestamp: new Date().toISOString(),
    pluginId: manifest.id,
    pluginVersion: manifest.version,
  };

  // Inject signature.json into the ZIP
  zip.addFile('signature.json', Buffer.from(JSON.stringify(sigData, null, 2)));

  // Save back to the same file
  const outPath = path.resolve(pluginPath);
  zip.writeZip(outPath);

  console.log(`Signed successfully.`);
  console.log(`  Key ID:  ${keyId.slice(0, 16)}...`);
  console.log(`  Digest:  ${digest.slice(0, 16)}...`);
  console.log(`  Output:  ${outPath}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

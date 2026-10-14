#!/usr/bin/env node
// DEPRECATED: use the `quox-plugin` bin from @quoxai/quox-plugin-vite (`quox-plugin keygen` / `quox-plugin sign`) for community plugin signing. Kept for official/legacy signing flows.
/**
 * Generate an Ed25519 signing key pair for QuoxCORE plugin signing.
 *
 * Usage:
 *   node scripts/generate-signing-key.js
 *
 * Outputs:
 *   quox-signing.key  (private key, PEM)
 *   quox-signing.pub  (public key, PEM)
 *   Base64 public key printed to stdout
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function main() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

  const keyDir = process.cwd();
  const privateKeyPath = path.join(keyDir, 'quox-signing.key');
  const publicKeyPath = path.join(keyDir, 'quox-signing.pub');

  fs.writeFileSync(privateKeyPath, privatePem, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicPem, { mode: 0o644 });

  // Extract raw 32-byte public key for base64 output
  const rawDer = publicKey.export({ type: 'spki', format: 'der' });
  const rawBytes = rawDer.slice(rawDer.length - 32);
  const publicKeyBase64 = rawBytes.toString('base64');

  console.log(`Key pair generated successfully.`);
  console.log(`  Private key: ${privateKeyPath}`);
  console.log(`  Public key:  ${publicKeyPath}`);
  console.log('');
  console.log(`Base64 public key:`);
  console.log(publicKeyBase64);
  console.log('');
  console.log(`WARNING: Add quox-signing.key to your .gitignore to avoid committing your private key.`);
}

main();

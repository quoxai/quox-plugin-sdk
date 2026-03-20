#!/usr/bin/env node
/**
 * Generate a signed license for a QuoxCORE plugin.
 *
 * Usage:
 *   node scripts/generate-license.js --plugin my-plugin --customer "Acme Corp" --expires 2027-01-01 --key quox-signing.key
 *
 * Outputs:
 *   License JSON to stdout
 *   {plugin}-license.json file in current directory
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

const pluginId = getArg('--plugin');
const customerName = getArg('--customer');
const expiresAt = getArg('--expires');
const keyPath = getArg('--key');

if (!pluginId || !customerName || !expiresAt || !keyPath) {
  console.error('Usage: node scripts/generate-license.js --plugin <id> --customer <name> --expires <YYYY-MM-DD> --key <private-key.key>');
  process.exit(1);
}

// Validate expiry date
const expiryDate = new Date(expiresAt);
if (isNaN(expiryDate.getTime())) {
  console.error(`Error: Invalid date format for --expires: ${expiresAt}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Error: Key file not found: ${keyPath}`);
  process.exit(1);
}

/**
 * Generate a license key in QXP-XXXX-XXXX-XXXX-XXXX format (random hex).
 */
function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `QXP-${segments.join('-')}`;
}

function main() {
  // Read private key
  const privateKeyPem = fs.readFileSync(path.resolve(keyPath), 'utf8');
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  // Generate license ID and key
  const licenseId = crypto.randomUUID();
  const licenseKey = generateLicenseKey();

  // Hash customer name for customer_id
  const customerId = crypto.createHash('sha256').update(customerName).digest('hex').slice(0, 16);

  // Build the license payload (without signature)
  const payload = {
    id: licenseId,
    key: licenseKey,
    customer_id: customerId,
    customer_name: customerName,
    scope: {
      plugin_id: pluginId,
    },
    expires_at: expiryDate.toISOString(),
  };

  // Sign the payload with Ed25519
  const payloadJson = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadJson), privateKey);
  const signatureBase64 = signature.toString('base64');

  // Build final license object
  const license = {
    ...payload,
    signature: signatureBase64,
  };

  const licenseJson = JSON.stringify(license, null, 2);

  // Write to file
  const outFile = path.join(process.cwd(), `${pluginId}-license.json`);
  fs.writeFileSync(outFile, licenseJson + '\n');

  // Print to stdout
  console.log(licenseJson);
  console.log('');
  console.log(`License written to: ${outFile}`);
}

main();

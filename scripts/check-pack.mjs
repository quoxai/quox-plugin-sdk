#!/usr/bin/env node
// Assert every publishable workspace tarball contains only files covered by its
// package.json "files" allowlist (plus npm's always-included files) and no
// secret-looking files. Run: npm run check:pack
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALWAYS = /^(package\.json|README(\.[a-z]+)?|LICEN[CS]E(\.[a-z]+)?|CHANGELOG(\.[a-z]+)?)$/i;
const SECRET = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa.*|.*\.p12|.*\.pfx|\.npmrc)$/i;

// @quox/glyph is not in the publish set yet.
const NOT_PUBLISHED = new Set(['@quox/glyph']);
let failures = 0;
for (const dir of readdirSync(join(root, 'packages'))) {
  const pkgDir = join(root, 'packages', dir);
  let pkg;
  try { pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')); } catch { continue; }
  if (pkg.private || NOT_PUBLISHED.has(pkg.name)) { console.log(`skip ${pkg.name} (not published)`); continue; }
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    console.error(`FAIL ${pkg.name}: no "files" allowlist in package.json`);
    failures++;
    continue;
  }
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: pkgDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const listing = JSON.parse(out)[0].files.map((f) => f.path);
  const allow = pkg.files.map((f) => f.replace(/^\.\//, '').replace(/\/$/, '').replace(/\/\*\*$/, ''));
  const bad = [];
  for (const f of listing) {
    if (SECRET.test(f)) bad.push(`${f} (secret-looking)`);
    else if (!ALWAYS.test(f) && !allow.some((a) => f === a || f.startsWith(a + '/'))) bad.push(`${f} (outside files allowlist)`);
  }
  if (bad.length) {
    failures++;
    console.error(`FAIL ${pkg.name}:\n  ${bad.join('\n  ')}`);
  } else {
    console.log(`ok   ${pkg.name}@${pkg.version}: ${listing.length} files`);
  }
}
process.exit(failures ? 1 : 0);

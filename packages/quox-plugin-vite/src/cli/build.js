/**
 * quox-plugin build: run the PROJECT's own vite (`vite build`) in --dir.
 * The plugin's vite.config.js wires quoxPlugin(), so the output is the same as
 * `npm run build`; this verb exists so build, sign and validate live in one CLI.
 * vite is resolved from the project, never from this package, so the version
 * the author pinned is the one that runs.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// vite's package `exports` hides bin/vite.js from require.resolve, so resolve
// the (exported) package.json and follow its `bin` field instead.
function resolveProjectVite(from) {
    let pkgPath;
    try {
        pkgPath = require.resolve('vite/package.json', { paths: [from] });
    } catch {
        return null;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin && pkg.bin.vite;
    return rel ? path.join(path.dirname(pkgPath), rel) : null;
}

function defaultSpawn(cmd, args, opts) {
    return spawnSync(cmd, args, opts);
}

function build({ dir = '.', resolveVite = resolveProjectVite, spawn = defaultSpawn } = {}) {
    const root = path.resolve(dir);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`${root} is not a directory`);
    const vite = resolveVite(root);
    if (!vite) throw new Error(`vite is not installed in ${root}: run npm install there first`);
    const r = spawn(process.execPath, [vite, 'build'], { cwd: root, stdio: 'inherit' });
    if (r.error) throw r.error;
    return typeof r.status === 'number' ? r.status : 1;
}

module.exports = { build, resolveProjectVite };

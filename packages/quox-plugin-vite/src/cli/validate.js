/**
 * quox-plugin validate: pre-flight checks for a community plugin.
 *
 * Manifest rules mirror the host (services/auth/routes/plugins.js
 * validateManifest) plus semver. The bundle scan enforces the sandbox contract:
 * community plugins run in an opaque-origin iframe with connect-src 'none',
 * so raw network APIs, window.__quoxGlass and the throwing-stub deps can
 * never work there.
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const RESERVED_PREFIXES = ['core-', 'system-', 'quox-', 'admin-'];
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// Host install route: express json limit 5mb on a body carrying base64 bundle + css.
const HOST_BODY_LIMIT = 5 * 1024 * 1024;
const STUB_DEPS = ['CapabilityPanels', 'WorkspaceContext', 'AuthContext', 'LicenseValidator', 'ServerSyncQueue', 'OrgScopedStorage'];

function validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        return { ok: false, error: 'manifest_required', message: 'manifest.json must be a JSON object' };
    }
    if (!manifest.id || !manifest.name || !manifest.version) {
        return { ok: false, error: 'manifest_invalid', message: 'id, name, and version are required' };
    }
    if (!PLUGIN_ID_RE.test(manifest.id)) {
        return { ok: false, error: 'manifest_invalid', message: 'plugin id must be lowercase alphanumeric with dashes, 3-64 chars' };
    }
    if (RESERVED_PREFIXES.some((p) => manifest.id.startsWith(p))) {
        return { ok: false, error: 'manifest_invalid', message: `plugin id cannot start with reserved prefix: ${RESERVED_PREFIXES.join(', ')}` };
    }
    if (typeof manifest.version !== 'string' || !SEMVER_RE.test(manifest.version)) {
        return { ok: false, error: 'manifest_invalid', message: `version "${manifest.version}" is not semver (expected e.g. 1.0.0)` };
    }
    return { ok: true };
}

function scanBundle(code) {
    const findings = [];
    const add = (message) => findings.push({ level: 'error', message });
    if (/__quoxGlass/.test(code)) {
        add('bundle uses window.__quoxGlass (@quox/glass). It is a throwing stub in the community sandbox: build your own UI, or use the qx-* classes shipped in plugin.css.');
    }
    for (const dep of STUB_DEPS) {
        const re = new RegExp(`\\{[^{}]*\\b${dep}\\b[^{}]*\\}\\s*=\\s*(?:window\\.)?__quoxSharedDeps|__quoxSharedDeps\\s*\\.\\s*${dep}\\b`);
        if (re.test(code)) {
            add(`bundle reads ${dep} from __quoxSharedDeps. It is a throwing stub in the community sandbox; use window.quox (getUser, storage, fetch) instead.`);
        }
    }
    const net = [
        [/(?<![\w$.])fetch\s*\(|\b(?:window|globalThis|self)\.fetch\b/, 'raw fetch()', 'use window.quox.fetch(path), which is relative to /collector/api/v1/plugins/<id>/'],
        [/\bnew\s+XMLHttpRequest\b/, 'XMLHttpRequest', 'use window.quox.fetch(path)'],
        [/\bnew\s+WebSocket\b/, 'WebSocket', 'there is no socket channel in the sandbox; poll through window.quox.fetch or use window.quox.onEvent'],
        [/\bnew\s+EventSource\b/, 'EventSource', 'poll through window.quox.fetch instead'],
        [/\bsendBeacon\b/, 'navigator.sendBeacon', 'use window.quox.fetch(path)'],
    ];
    for (const [re, name, fix] of net) {
        if (re.test(code)) {
            add(`bundle uses ${name}. The sandbox CSP is connect-src 'none', so it is blocked at runtime: ${fix}.`);
        }
    }
    return findings;
}

// Static permission scan. Pragmatic: a regex over member names on any object,
// so it can over-report if unrelated code has a `.fetch(` / `.notify(` method.
const USAGE_PATTERNS = [
    ['storage', /\.\s*storage\s*\.\s*(?:get|set|remove|keys|getAll)\b/],
    ['network', /\.\s*fetch\s*\(/],
    ['memory', /\.\s*memory\s*\.\s*(?:save|search)\b/],
    ['aee', /\.\s*aee\s*\.\s*emit\b/],
    ['notifications', /\.\s*notify\s*\(/],
];

/** Permissions a built bundle appears to need (sandbox-enforced ones only). */
function usedPermissions(code) {
    return USAGE_PATTERNS.filter(([, re]) => re.test(code)).map(([perm]) => perm);
}

function checkPermissions(code, manifest) {
    const errors = [];
    const warnings = [];
    const declared = new Set(Array.isArray(manifest && manifest.permissions) ? manifest.permissions : []);
    const used = usedPermissions(code);
    for (const perm of used) {
        if (!declared.has(perm)) {
            errors.push(`bundle calls a window.quox method that needs the "${perm}" permission, but manifest.json permissions does not declare it. Add "${perm}" to permissions, or the host refuses the call with permission_denied: ${perm}.`);
        }
    }
    for (const perm of ['storage', 'network', 'memory', 'aee', 'notifications']) {
        if (declared.has(perm) && !used.includes(perm)) {
            warnings.push(`manifest.json declares the "${perm}" permission but the bundle does not appear to use it. Remove it for least privilege.`);
        }
    }
    if (used.includes('memory') || used.includes('aee')) {
        warnings.push('memory/aee are not available to community plugins yet; calls will reject with not_available');
    }
    return { errors, warnings };
}

function validate({ dir = '.' } = {}) {
    const root = path.resolve(dir);
    const errors = [];
    const warnings = [];

    let manifest = null;
    const manifestPath = path.join(root, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        errors.push(`manifest.json not found in ${root}`);
    } else {
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const v = validateManifest(manifest);
            if (!v.ok) errors.push(`manifest.json: ${v.message}`);
        } catch (e) {
            errors.push(`manifest.json is not valid JSON: ${e.message}`);
        }
    }

    const bundlePath = path.join(root, 'dist', 'plugin.esm.js');
    const cssPath = path.join(root, 'dist', 'plugin.css');
    let bundleBytes = 0;
    let cssBytes = 0;
    if (!fs.existsSync(bundlePath)) {
        errors.push('dist/plugin.esm.js not found: run `npm run build` first');
    } else {
        const code = fs.readFileSync(bundlePath, 'utf8');
        bundleBytes = Buffer.byteLength(code);
        for (const f of scanBundle(code)) errors.push(f.message);
        if (manifest) {
            const p = checkPermissions(code, manifest);
            errors.push(...p.errors);
            warnings.push(...p.warnings);
        }
    }
    if (!fs.existsSync(cssPath)) {
        warnings.push('dist/plugin.css not found: the sandbox gets no host styles, so an unstyled plugin will render bare (the quox-plugin-vite build emits it unless qxCss:false and no CSS is imported)');
    } else {
        cssBytes = fs.statSync(cssPath).size;
    }

    // Estimated install request body: base64 inflates 4/3.
    const b64 = (n) => 4 * Math.ceil(n / 3);
    const body = b64(bundleBytes) + b64(cssBytes) + (manifest ? Buffer.byteLength(JSON.stringify(manifest)) : 0) + 1024;
    if (body > HOST_BODY_LIMIT) {
        errors.push(`install body would be about ${(body / 1048576).toFixed(1)} MB, over the host 5 MB request limit (bundle ${(bundleBytes / 1048576).toFixed(2)} MB + css ${(cssBytes / 1048576).toFixed(2)} MB, base64-encoded). Reduce the bundle size.`);
    } else if (body > HOST_BODY_LIMIT * 0.8) {
        warnings.push(`install body is about ${(body / 1048576).toFixed(1)} MB, close to the host 5 MB request limit`);
    }

    return { ok: errors.length === 0, errors, warnings, manifest };
}

module.exports = { validate, validateManifest, scanBundle, usedPermissions, checkPermissions, PLUGIN_ID_RE, RESERVED_PREFIXES };

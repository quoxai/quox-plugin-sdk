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
const crypto = require('crypto');
const { validateStatusRowDecls } = require('./status-rows.js');
const { FORMAT_V2, sha256Hex, v2Payload, v2Message } = require('./signature-v2.js');

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
    if (manifest.statusRows !== undefined) {
        const sr = validateStatusRowDecls(manifest.statusRows);
        if (!sr.ok) return { ok: false, error: 'manifest_invalid', message: sr.errors.join('; ') };
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

/**
 * Self-check dist/signature.json against the files as they are NOW, the way
 * the host will (minus the org trust lookup). Catches the common mistake of
 * editing manifest.json or rebuilding after signing.
 */
function checkSignature(root, manifest) {
    const errors = [];
    const warnings = [];
    const sigPath = path.join(root, 'dist', 'signature.json');
    if (!fs.existsSync(sigPath)) return { errors, warnings };
    let sig;
    try { sig = JSON.parse(fs.readFileSync(sigPath, 'utf8')); } catch (e) {
        errors.push(`dist/signature.json is not valid JSON: ${e.message}`);
        return { errors, warnings };
    }
    if (!('format' in sig) && !('signature_v2' in sig)) {
        warnings.push('dist/signature.json is a v1 signature: it binds dist/plugin.esm.js only, not the manifest or css. Hosts with signature v2 refuse a v1 plugin that asks for more than sidebar, storage and notifications. Re-sign with `quox-plugin sign` (@quoxai/quox-plugin-vite, or the old quox-plugin-vite 0.3.x).');
        return { errors, warnings };
    }
    if (sig.format !== FORMAT_V2 || typeof sig.signature_v2 !== 'string' || typeof sig.public_key_hex !== 'string') {
        errors.push('dist/signature.json: unknown or incomplete signature format; re-sign with `quox-plugin sign`');
        return { errors, warnings };
    }
    if (!manifest) return { errors, warnings };
    const bundlePath = path.join(root, 'dist', 'plugin.esm.js');
    const cssPath = path.join(root, 'dist', 'plugin.css');
    if (!fs.existsSync(bundlePath)) return { errors, warnings };
    const payload = v2Payload({
        manifest,
        bundleSha256: sha256Hex(fs.readFileSync(bundlePath)),
        cssSha256: fs.existsSync(cssPath) ? sha256Hex(fs.readFileSync(cssPath)) : null,
    });
    const stale = [];
    if (sig.plugin_id !== payload.plugin_id || sig.plugin_version !== payload.plugin_version || sig.manifest_sha256 !== payload.manifest_sha256) {
        stale.push('manifest.json');
    }
    const files = new Set([...Object.keys(sig.files || {}), ...Object.keys(payload.files)]);
    for (const f of [...files].sort()) {
        if ((sig.files || {})[f] !== payload.files[f]) stale.push(`dist/${f}`);
    }
    if (stale.length) {
        errors.push(`dist/signature.json no longer matches ${stale.join(', ')} (changed after signing). The host refuses this install; re-run \`quox-plugin sign\`.`);
        return { errors, warnings };
    }
    try {
        const pub = crypto.createPublicKey({
            key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(sig.public_key_hex, 'hex')]),
            format: 'der', type: 'spki',
        });
        if (!crypto.verify(null, v2Message(payload), pub, Buffer.from(sig.signature_v2, 'hex'))) {
            errors.push('dist/signature.json: signature_v2 does not verify; re-sign with `quox-plugin sign`');
        }
    } catch (e) {
        errors.push(`dist/signature.json: could not verify signature_v2 (${e.message})`);
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
            const image = manifest && manifest.backend && manifest.backend.image;
            if (typeof image === 'string' && !/@sha256:[0-9a-f]{64}$/.test(image)) {
                warnings.push(`manifest.json backend.image "${image}" is not digest-pinned. Hosts refuse to start a community backend unless the image is pinned as <image>@sha256:<digest>, so the signature fixes what runs. Push the image, put the digest in backend.image, then re-sign.`);
            }
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
        warnings.push('dist/plugin.css not found: the sandbox gets no host styles, so an unstyled plugin will render bare (the @quoxai/quox-plugin-vite build emits it unless qxCss:false and no CSS is imported)');
    } else {
        cssBytes = fs.statSync(cssPath).size;
    }

    const sc = checkSignature(root, manifest);
    errors.push(...sc.errors);
    warnings.push(...sc.warnings);

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

module.exports = { validate, checkSignature, validateManifest, scanBundle, usedPermissions, checkPermissions, PLUGIN_ID_RE, RESERVED_PREFIXES };

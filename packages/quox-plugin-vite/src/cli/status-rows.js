/**
 * Status-row manifest declaration rules. DUPLICATED from
 * @quoxai/quox-plugin-sdk src/statusRow.js (validateStatusRowDecls) because this
 * package is CommonJS and the SDK is ESM. A test in __tests__/cli-validate.test.js
 * keeps the two in sync on a fixture set; change both together.
 */
const MAX_DECLS = 3;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;
const EVERY_RE = /^(\d+)(s|m|h)$/;
const PATH_CHARS_RE = /^[A-Za-z0-9._~\-/?=&%:,+]+$/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function pathError(p) {
    if (typeof p !== 'string' || p.length === 0) return 'path must be a non-empty string';
    if (p.length > 300) return 'path must be at most 300 characters';
    if (p.startsWith('/')) return 'path must be relative (no leading "/")';
    if (SCHEME_RE.test(p)) return 'path must not contain a scheme';
    if (/[\s#\\]/.test(p)) return 'path must not contain whitespace, "#" or backslash';
    if (!PATH_CHARS_RE.test(p)) return 'path contains characters outside [A-Za-z0-9._~-/?=&%:,+]';
    if (/%2e|%2f/i.test(p)) return 'path must not contain encoded dots or slashes (%2e, %2f)';
    const segs = p.split(/[/?]/);
    if (segs.some((s) => s === '..' || s === '.')) return 'path must not contain "." or ".." segments';
    return null;
}

/** Validate the manifest `statusRows` array. Returns { ok, errors[] }. */
function validateStatusRowDecls(decls) {
    const errors = [];
    if (!Array.isArray(decls)) return { ok: false, errors: ['statusRows must be an array'] };
    if (decls.length > MAX_DECLS) errors.push(`statusRows allows at most ${MAX_DECLS} entries`);
    const seen = new Set();
    decls.forEach((d, i) => {
        const at = `statusRows[${i}]`;
        if (!isObj(d)) { errors.push(`${at} must be an object`); return; }
        if (typeof d.id !== 'string' || !ID_RE.test(d.id)) errors.push(`${at}.id must match ${ID_RE}`);
        else if (seen.has(d.id)) errors.push(`${at}.id "${d.id}" is a duplicate`);
        else seen.add(d.id);
        if (typeof d.label !== 'string' || d.label.length < 1 || d.label.length > 24) errors.push(`${at}.label must be a string of 1 to 24 characters`);
        const pe = pathError(d.path);
        if (pe) errors.push(`${at}.${pe}`);
        if (d.every !== undefined) {
            const m = typeof d.every === 'string' ? EVERY_RE.exec(d.every) : null;
            if (!m) errors.push(`${at}.every must look like 30s, 5m or 1h`);
            else {
                const secs = Number(m[1]) * { s: 1, m: 60, h: 3600 }[m[2]];
                if (secs < 5 || secs > 86400) errors.push(`${at}.every must be between 5s and 1 day`);
            }
        }
        if (d.description !== undefined && (typeof d.description !== 'string' || d.description.length > 200)) {
            errors.push(`${at}.description must be a string of at most 200 characters`);
        }
    });
    return { ok: errors.length === 0, errors };
}

module.exports = { validateStatusRowDecls };

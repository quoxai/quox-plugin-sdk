/**
 * @quox/plugin-sdk/status-row: the contract for one-line terminal status rows
 * shown in the quox CLI window. Zero dependencies, pure functions.
 *
 * A plugin declares rows in manifest.json (`statusRows`, max 3) and serves each
 * from its own backend route. The route returns a status-row payload as JSON:
 *
 * @example
 * // express-style handler
 * app.get('/rows/backups', (req, res) => {
 *   res.json(statusRow({ label: 'Backups', value: 3, text: 'failed overnight', tone: 'error', trend: 2 }));
 * });
 */

export const STATUS_ROW_TONES = ['ok', 'warn', 'error', 'info', 'neutral'];
const TRENDS = ['up', 'down', 'flat'];
const MAX_DECLS = 3;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;
const EVERY_RE = /^(\d+)(s|m|h)$/;
const PATH_CHARS_RE = /^[A-Za-z0-9._~\-/?=&%:,+]+$/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function validLink(link) {
    if (typeof link !== 'string' || link.length === 0 || link.length > 500) return false;
    let u;
    try { u = new URL(link); } catch { return false; }
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
}

/** Validate a status-row payload. Returns { ok, errors[] }. */
export function validateStatusRowPayload(obj) {
    const errors = [];
    if (!isObj(obj)) return { ok: false, errors: ['payload must be an object'] };
    const hasValue = obj.value !== undefined && obj.value !== null && obj.value !== '';
    const hasText = obj.text !== undefined && obj.text !== null;
    if (hasText) {
        if (typeof obj.text !== 'string') errors.push('text must be a string');
        else if (obj.text.length > 160) errors.push('text must be at most 160 characters');
    }
    if (!hasValue && !(hasText && typeof obj.text === 'string' && obj.text.length > 0)) {
        errors.push('text is required unless value is given');
    }
    if (obj.label !== undefined && obj.label !== null) {
        if (typeof obj.label !== 'string') errors.push('label must be a string');
        else if (obj.label.length > 16) errors.push('label must be at most 16 characters');
    }
    if (hasValue) {
        if (typeof obj.value === 'number') {
            if (!Number.isFinite(obj.value)) errors.push('value must be a finite number');
        } else if (typeof obj.value === 'string') {
            if (obj.value.length > 24) errors.push('value must be at most 24 characters');
        } else errors.push('value must be a finite number or a string');
    }
    if (obj.tone !== undefined && obj.tone !== null && !STATUS_ROW_TONES.includes(obj.tone)) {
        errors.push(`tone must be one of ${STATUS_ROW_TONES.join('|')}`);
    }
    if (obj.trend !== undefined && obj.trend !== null) {
        const ok = TRENDS.includes(obj.trend) || (typeof obj.trend === 'number' && Number.isFinite(obj.trend));
        if (!ok) errors.push('trend must be up|down|flat or a finite number');
    }
    if (obj.link !== undefined && obj.link !== null && !validLink(obj.link)) {
        errors.push('link must be an http(s) URL without credentials, at most 500 characters');
    }
    return { ok: errors.length === 0, errors };
}

/**
 * Build a clean status-row payload. Trims strings, drops unknown keys and
 * empty fields. Throws a TypeError listing every problem on bad input.
 */
export function statusRow(fields) {
    if (!isObj(fields)) throw new TypeError('statusRow: fields must be an object');
    const out = {};
    for (const k of ['text', 'label', 'value', 'tone', 'trend', 'link']) {
        let v = fields[k];
        if (v === undefined || v === null) continue;
        if (typeof v === 'string') {
            v = v.trim();
            if (v === '' && k !== 'text') continue;
        }
        out[k] = v;
    }
    if (out.text === '' && out.value === undefined) delete out.text;
    const r = validateStatusRowPayload(out);
    if (!r.ok) throw new TypeError(`statusRow: ${r.errors.join('; ')}`);
    return out;
}

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
export function validateStatusRowDecls(decls) {
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

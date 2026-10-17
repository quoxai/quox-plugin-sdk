import { describe, it, expect } from 'vitest';
import { STATUS_ROW_TONES, statusRow, validateStatusRowPayload, validateStatusRowDecls } from '../statusRow.js';

const decl = (o = {}) => ({ id: 'backups', label: 'Backups', path: 'rows/backups', ...o });

describe('validateStatusRowPayload', () => {
    it('accepts good payloads', () => {
        expect(validateStatusRowPayload({ text: 'ok' }).ok).toBe(true);
        expect(validateStatusRowPayload({ value: 0 }).ok).toBe(true);
        expect(validateStatusRowPayload({ label: 'B', value: '3 fail', text: 'x', tone: 'warn', trend: -2, link: 'https://quox.example/x' }).ok).toBe(true);
        for (const tone of STATUS_ROW_TONES) expect(validateStatusRowPayload({ text: 't', tone }).ok).toBe(true);
        for (const trend of ['up', 'down', 'flat', 0, 1.5]) expect(validateStatusRowPayload({ text: 't', trend }).ok).toBe(true);
    });
    it('rejects bad payloads, one rule each', () => {
        const bad = [
            null, [], 'x', {},
            { text: 'a'.repeat(161) }, { text: 5 },
            { text: 't', label: 'a'.repeat(17) },
            { text: 't', value: NaN }, { text: 't', value: Infinity }, { text: 't', value: 'a'.repeat(25) }, { text: 't', value: {} },
            { text: 't', tone: 'red' },
            { text: 't', trend: 'sideways' }, { text: 't', trend: NaN },
            { text: 't', link: 'ftp://quox.example/x' }, { text: 't', link: 'javascript:alert(1)' }, { text: 't', link: 'not a url' },
            { text: 't', link: 'https://user:pw@quox.example/' }, { text: 't', link: 'https://quox.example/' + 'a'.repeat(500) },
        ];
        for (const b of bad) expect(validateStatusRowPayload(b).ok, JSON.stringify(b)).toBe(false);
    });
});

describe('statusRow()', () => {
    it('returns a clean trimmed object and drops unknown keys', () => {
        const r = statusRow({ label: ' Backups ', value: 3, text: ' failed ', tone: 'error', trend: 2, evil: 'x', __proto__x: 1 });
        expect(r).toEqual({ label: 'Backups', value: 3, text: 'failed', tone: 'error', trend: 2 });
        expect(Object.keys(r)).not.toContain('evil');
    });
    it('throws TypeError with a clear message', () => {
        expect(() => statusRow({})).toThrow(TypeError);
        expect(() => statusRow({ text: 't', tone: 'red' })).toThrow(/tone must be one of/);
        expect(() => statusRow(null)).toThrow(/fields must be an object/);
        expect(() => statusRow({ text: '   ' })).toThrow(/text is required/);
    });
});

describe('validateStatusRowDecls', () => {
    it('accepts good decls', () => {
        expect(validateStatusRowDecls([]).ok).toBe(true);
        expect(validateStatusRowDecls([decl(), decl({ id: 'b2', every: '5s', description: 'd', path: 'r?x=1&y=a:b,c+d' })]).ok).toBe(true);
        expect(validateStatusRowDecls([decl({ every: '24h' })]).ok).toBe(true);
    });
    it('rejects more than 3', () => {
        const four = ['a', 'b', 'c', 'd'].map((id) => decl({ id }));
        expect(validateStatusRowDecls(four.slice(0, 3)).ok).toBe(true);
        expect(validateStatusRowDecls(four).ok).toBe(false);
    });
    it('rejects duplicate ids', () => {
        const r = validateStatusRowDecls([decl(), decl()]);
        expect(r.ok).toBe(false);
        expect(r.errors.join()).toMatch(/duplicate/);
    });
    it('rejects non-arrays and non-objects', () => {
        expect(validateStatusRowDecls({}).ok).toBe(false);
        expect(validateStatusRowDecls(['x']).ok).toBe(false);
    });
    it('rejects bad ids, labels, descriptions', () => {
        for (const id of ['', '-a', '_a', 'a b', 'a'.repeat(25), 5, undefined]) expect(validateStatusRowDecls([decl({ id })]).ok, String(id)).toBe(false);
        for (const label of ['', 'a'.repeat(25), 5]) expect(validateStatusRowDecls([decl({ label })]).ok).toBe(false);
        expect(validateStatusRowDecls([decl({ description: 'a'.repeat(201) })]).ok).toBe(false);
    });
    it('rejects bad paths', () => {
        const bad = ['', '/abs', '//host/x', 'http://x', 'javascript:x', 'a b', 'a#b', 'a\\b', '../x', 'a/../b', './x', 'a/./b', 'a?x=/../y',
            'a/%2e%2e/b', 'a%2Fb', 'a'.repeat(301), 'a<b', 'a"b', 5];
        for (const path of bad) expect(validateStatusRowDecls([decl({ path })]).ok, String(path)).toBe(false);
    });
    it('rejects bad every', () => {
        for (const every of ['4s', '1d', '25h', '90000s', '0m', '5', 'abc', '-5s', 30]) expect(validateStatusRowDecls([decl({ every })]).ok, String(every)).toBe(false);
    });
});

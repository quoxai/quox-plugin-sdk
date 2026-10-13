import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ASSET = path.resolve(__dirname, '../../assets/qx-components.css');

async function load() {
    return import('../../scripts/sync-glass-css.mjs');
}

describe('vendored qx css', () => {
    it('header Body-SHA256 matches the vendored body (drift detector)', async () => {
        const { parseVendoredCss, sha256 } = await load();
        const parsed = parseVendoredCss(fs.readFileSync(ASSET, 'utf8'));
        expect(parsed).not.toBeNull();
        expect(parsed.declared).toMatch(/^[0-9a-f]{64}$/);
        expect(sha256(parsed.body)).toBe(parsed.declared);
    });

    it('header records a source commit and ships no absolute home paths', async () => {
        const text = fs.readFileSync(ASSET, 'utf8');
        expect(text).toMatch(/Source-Commit: [0-9a-f]{40}/);
        expect(text).not.toContain('/home/control');
    });

    it('defines the tokens the components use (--m-bg-base)', () => {
        expect(fs.readFileSync(ASSET, 'utf8')).toMatch(/--m-bg-base:/);
    });

    it('extractRootTokenBlocks keeps depth-0 :root only', async () => {
        const { extractRootTokenBlocks } = await load();
        const css = ':root { --a: 1; }\n@media (max-width: 480px) {\n  :root { --a: 2; }\n}\n/* :root { --c: 3 } */';
        const out = extractRootTokenBlocks(css);
        expect(out).toContain('--a: 1');
        expect(out).not.toContain('--a: 2');
        expect(out).not.toContain('--c');
    });

    it('sync requires an explicit dashboard dir', async () => {
        const { syncGlassCss } = await load();
        expect(() => syncGlassCss([], {})).toThrow(/dashboard repo dir/);
    });
});

/**
 * Since 0.4.0 the packages are scoped under @quoxai (CHANGELOG 0.4.0). The
 * plain names are deprecated, so no template, doc or bundled skill may tell a
 * user to install or import them. Allowed: the repo/directory name
 * quox-plugin-sdk (paths, URLs, "checkout", "cd"), and lines that explicitly
 * talk about the old names.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(__dirname, '../../..');
const ROOTS = ['README.md', 'docs', '.claude/skills', 'packages/create-quox-plugin/templates',
    'packages/create-quox-plugin/skill', 'packages/create-quox-plugin/bin',
    'packages/quox-plugin-sdk/src', 'packages/quox-plugin-vite/src', 'packages/eslint-plugin-quox-plugin/src'];
const SKIP_FILES = new Set(['docs/plan-sdk-dx.md']); // historical plan, not user guidance
const OLD = /(?<![\w/@.-])(quox-plugin-sdk|quox-plugin-vite|eslint-plugin-quox-plugin|create-quox-plugin)(?![\w-])/;
const ALLOWED_LINE = /\bold\b|deprecated|plain names|checkout|monorepo director|\bcd quox-plugin-sdk|quox-plugin-sdk repo/i;

function walk(rel, out) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) return out;
    if (fs.statSync(abs).isDirectory()) {
        for (const e of fs.readdirSync(abs)) if (e !== 'node_modules' && e !== '__tests__') walk(path.join(rel, e), out);
    } else if (/\.(md|js|jsx|mjs|cjs|ts|json)$/.test(rel) && !SKIP_FILES.has(rel)) out.push(rel);
    return out;
}

describe('no user-facing reference to the deprecated unscoped package names', () => {
    it('templates, docs and skills use @quoxai/* names', () => {
        const hits = [];
        for (const f of ROOTS.flatMap((r) => walk(r, []))) {
            fs.readFileSync(path.join(REPO, f), 'utf8').split('\n').forEach((line, i) => {
                if (OLD.test(line) && !ALLOWED_LINE.test(line)) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
            });
        }
        expect(hits).toEqual([]);
    });
});

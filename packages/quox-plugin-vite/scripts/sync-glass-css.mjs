#!/usr/bin/env node
/**
 * sync-glass-css.mjs
 *
 * Vendors a snapshot of the QuoxCORE dashboard's qx component stylesheet
 * (src/styles/qx-components.css) plus the top-level design-token :root blocks
 * from src/index.css into assets/qx-components.css. Community plugins run in a
 * sandboxed frame with NO host stylesheets, so the build and the dev preview
 * inject this file; the variables (--m-*, --qx-*) must be defined here or every
 * var() resolves to nothing.
 *
 * Usage:
 *   node scripts/sync-glass-css.mjs <dashboardDir> [--commit <sha>]
 *   QUOX_DASHBOARD_DIR=<dashboardDir> node scripts/sync-glass-css.mjs
 *
 * <dashboardDir> is a checkout (or export) of the dashboard repo root. There is
 * no default location. The header records the source commit (from --commit, or
 * `git rev-parse HEAD` inside <dashboardDir>) and the sha256 of the sources and
 * of the vendored body, so drift is detectable (see the header test).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(packageRoot, 'assets', 'qx-components.css');

export const HEADER_END = ' * ==== END VENDORED HEADER ====\n */\n';

export function sha256(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Extracts every DEPTH-0 `:root { ... }` block (balanced braces). Blocks
 * nested in @media rules are deliberately skipped: they are responsive
 * overrides of the dashboard chrome and would shrink a plugin's spacing.
 * @param {string} css
 * @returns {string}
 */
export function extractRootTokenBlocks(css) {
    const blocks = [];
    let depth = 0;
    let i = 0;
    while (i < css.length) {
        const ch = css[i];
        if (ch === '/' && css[i + 1] === '*') {
            const end = css.indexOf('*/', i + 2);
            i = end === -1 ? css.length : end + 2;
            continue;
        }
        if (depth === 0 && css.startsWith(':root', i) && /^:root\s*\{/.test(css.slice(i, i + 40))) {
            const start = css.indexOf('{', i);
            let d = 0;
            let end = start;
            for (let j = start; j < css.length; j++) {
                if (css[j] === '{') d++;
                else if (css[j] === '}') {
                    d--;
                    if (d === 0) { end = j; break; }
                }
            }
            blocks.push(css.slice(i, end + 1).trim());
            i = end + 1;
            continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
    }
    return blocks.join('\n\n');
}

/**
 * Builds the full vendored file: provenance header + body.
 * @param {{components: string, indexCss: string, commit: string}} src
 */
export function buildVendoredCss({ components, indexCss, commit }) {
    const tokens = extractRootTokenBlocks(indexCss);
    const body =
        '/* Design tokens: top-level :root blocks of src/index.css */\n' +
        `${tokens}\n\n` +
        '/* Components: src/styles/qx-components.css */\n' +
        components;
    const header = [
        '/**',
        ' * VENDORED FILE, do not edit directly.',
        ' * Regenerate: node scripts/sync-glass-css.mjs <dashboardDir> [--commit <sha>]',
        ` * Source-Commit: ${commit}`,
        ` * Source-Components-SHA256: ${sha256(components)}`,
        ` * Source-Index-SHA256: ${sha256(indexCss)}`,
        ` * Body-SHA256: ${sha256(body)}`,
        HEADER_END,
    ].join('\n');
    return header + body;
}

/** Splits a vendored file into { header, body } and reads Body-SHA256. */
export function parseVendoredCss(text) {
    const idx = text.indexOf(HEADER_END);
    if (idx === -1) return null;
    const header = text.slice(0, idx + HEADER_END.length);
    const body = text.slice(idx + HEADER_END.length);
    const m = header.match(/Body-SHA256: ([0-9a-f]{64})/);
    return { header, body, declared: m ? m[1] : null };
}

function resolveCommit(dir, explicit) {
    if (explicit) return explicit;
    try {
        return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

export function syncGlassCss(argv = process.argv.slice(2), env = process.env, outPath = OUTPUT_PATH) {
    let commit;
    const positional = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--commit') commit = argv[++i];
        else positional.push(argv[i]);
    }
    const dirArg = positional[0] || env.QUOX_DASHBOARD_DIR;
    if (!dirArg) {
        throw new Error('[sync-glass-css] pass the dashboard repo dir as an argument or set QUOX_DASHBOARD_DIR');
    }
    const dir = path.resolve(process.cwd(), dirArg);
    const compPath = path.join(dir, 'src', 'styles', 'qx-components.css');
    const indexPath = path.join(dir, 'src', 'index.css');
    for (const p of [compPath, indexPath]) {
        if (!fs.existsSync(p)) throw new Error(`[sync-glass-css] source not found: ${p}`);
    }
    const output = buildVendoredCss({
        components: fs.readFileSync(compPath, 'utf8'),
        indexCss: fs.readFileSync(indexPath, 'utf8'),
        commit: resolveCommit(dir, commit),
    });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf8');
    console.log(`[sync-glass-css] ${dir} -> ${outPath} (${output.length} bytes)`);
    return outPath;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
    try { syncGlassCss(); } catch (e) { console.error(e.message); process.exit(1); }
}

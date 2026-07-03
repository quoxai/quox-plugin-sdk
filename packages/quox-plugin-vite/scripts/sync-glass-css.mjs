#!/usr/bin/env node
/**
 * sync-glass-css.mjs
 *
 * Vendors a snapshot of quox-dashboard's src/styles/qx-components.css into
 * this package (assets/qx-components.css) so the SDK-DX dev host can serve
 * real glass-design-system classes (.qx-pill, .qx-tabs, .qx-skeleton, ...)
 * without the consuming plugin project needing quox-dashboard as a sibling
 * checkout at runtime.
 *
 * Usage:
 *   node scripts/sync-glass-css.mjs [sourcePath]
 *
 * sourcePath defaults to ../../../quox-dashboard/src/styles/qx-components.css
 * relative to this package's root (i.e. assumes quox-dashboard is cloned as
 * a sibling of quox-plugin-sdk under the same parent directory). Pass an
 * absolute or CWD-relative path to override.
 *
 * Re-run this whenever quox-dashboard's qx-components.css changes and the
 * dev host should pick up new/changed classes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

const DEFAULT_SOURCE = path.resolve(packageRoot, '../../../quox-dashboard/src/styles/qx-components.css');
// The qx-* classes are written against CSS custom properties (--m-*, --qx-*)
// that quox-dashboard defines in src/index.css :root blocks — without them
// every var() falls back to nothing and glass renders grey. Vendor them too.
const DEFAULT_TOKENS_SOURCE = path.resolve(packageRoot, '../../../quox-dashboard/src/index.css');
const OUTPUT_PATH = path.join(packageRoot, 'assets', 'qx-components.css');

function resolveSourcePath(argv) {
    const override = argv[2];
    if (!override) return DEFAULT_SOURCE;
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
}

/**
 * Extracts every top-level `:root { ... }` block (balanced braces) from a
 * stylesheet — the design-token custom-property definitions the qx classes
 * depend on. Media-query-nested :root blocks are captured too (wrapped in
 * their original @media rule would be ideal, but tokens in this codebase are
 * theme-stable, so top-level extraction of the first block is sufficient and
 * deliberately conservative).
 * @param {string} css
 * @returns {string}
 */
export function extractRootTokenBlocks(css) {
    const blocks = [];
    const re = /(^|\n)\s*:root\s*\{/g;
    let match;
    while ((match = re.exec(css)) !== null) {
        const start = css.indexOf('{', match.index);
        let depth = 0;
        let end = start;
        for (let i = start; i < css.length; i++) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') {
                depth--;
                if (depth === 0) { end = i; break; }
            }
        }
        blocks.push(css.slice(match.index, end + 1).trim());
    }
    return blocks.join('\n\n');
}

function buildProvenanceHeader(sourcePath) {
    const syncedAt = new Date().toISOString();
    return [
        '/**',
        ' * VENDORED FILE — do not edit directly.',
        ' *',
        ` * Source: ${sourcePath}`,
        ` * Synced: ${syncedAt}`,
        ' *',
        ' * Regenerate with: node scripts/sync-glass-css.mjs [sourcePath]',
        ' * (packages/quox-plugin-vite in quoxai/quox-plugin-sdk)',
        ' */',
        '',
    ].join('\n');
}

export function syncGlassCss(argv = process.argv) {
    const sourcePath = resolveSourcePath(argv);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`[sync-glass-css] source not found: ${sourcePath}`);
    }

    const original = fs.readFileSync(sourcePath, 'utf8');

    let tokens = '';
    if (fs.existsSync(DEFAULT_TOKENS_SOURCE)) {
        tokens = extractRootTokenBlocks(fs.readFileSync(DEFAULT_TOKENS_SOURCE, 'utf8'));
        if (tokens) {
            tokens = `/* Design tokens vendored from ${DEFAULT_TOKENS_SOURCE} */\n${tokens}\n\n`;
        }
    } else {
        console.warn(`[sync-glass-css] tokens source not found (${DEFAULT_TOKENS_SOURCE}) — vendoring components only`);
    }

    const output = buildProvenanceHeader(sourcePath) + tokens + original;

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output, 'utf8');

    console.log(`[sync-glass-css] ${sourcePath} -> ${OUTPUT_PATH} (${output.length} bytes)`);
    return OUTPUT_PATH;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
    syncGlassCss();
}

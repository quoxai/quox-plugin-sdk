#!/usr/bin/env node
/**
 * scaffold-snapshot.mjs — SDK-DX P3 verification harness.
 *
 * Runs @quoxai/create-quox-plugin's generator for EVERY template into a temp dir
 * and records a checksum manifest (relative path -> sha256) of every
 * generated file. Used to prove the P3 template-extraction refactor is a
 * byte-identical, mechanical change (Stage 1), and to make the Stage 2
 * chat-unification diff explicit and reviewable.
 *
 * Usage:
 *   node scripts/scaffold-snapshot.mjs snapshot <out.json>
 *       Scaffold every template (non-interactive) and write a checksum
 *       manifest to <out.json>.
 *
 *   node scripts/scaffold-snapshot.mjs compare <baseline.json> [--allow <template1,template2>]
 *       Re-scaffold every template and diff against <baseline.json>.
 *       Exits non-zero (and prints a report) if any file differs, UNLESS
 *       the differing template is listed in --allow (used for Stage 2,
 *       where service-bridge + agentic-team are expected to change).
 *
 * Example:
 *   node scripts/scaffold-snapshot.mjs snapshot /tmp/baseline.json
 *   ...make changes...
 *   node scripts/scaffold-snapshot.mjs compare /tmp/baseline.json
 *   node scripts/scaffold-snapshot.mjs compare /tmp/baseline.json --allow service-bridge,agentic-team
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREATE_SCRIPT = path.resolve(__dirname, '../bin/create.js');

const TEMPLATES = [
    'basic',
    'monitoring-dashboard',
    'fleet-management',
    'service-bridge',
    'ui-feature',
    'enterprise-extension',
    'specialist-agent',
    'agentic-team',
];

function listFiles(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            files = files.concat(listFiles(path.join(dir, entry.name), rel));
        } else {
            files.push(rel);
        }
    }
    return files.sort();
}

function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function scaffoldAll() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-scaffold-snapshot-'));
    const manifest = {};
    for (const template of TEMPLATES) {
        const pluginName = `snap-${template}`;
        execFileSync('node', [CREATE_SCRIPT, pluginName, '--template', template, '--non-interactive'], {
            cwd: tmpDir,
            stdio: ['ignore', 'ignore', 'inherit'],
        });
        const pluginDir = path.join(tmpDir, pluginName);
        const files = listFiles(pluginDir);
        manifest[template] = {};
        for (const rel of files) {
            const content = fs.readFileSync(path.join(pluginDir, rel));
            manifest[template][rel] = sha256(content);
        }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return manifest;
}

function main() {
    const [mode, ...rest] = process.argv.slice(2);

    if (mode === 'snapshot') {
        const outPath = rest[0];
        if (!outPath) {
            console.error('Usage: scaffold-snapshot.mjs snapshot <out.json>');
            process.exit(1);
        }
        const manifest = scaffoldAll();
        fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
        const totalFiles = Object.values(manifest).reduce((n, m) => n + Object.keys(m).length, 0);
        console.log(`Snapshot written to ${outPath} (${TEMPLATES.length} templates, ${totalFiles} files).`);
        return;
    }

    if (mode === 'compare') {
        const baselinePath = rest[0];
        if (!baselinePath) {
            console.error('Usage: scaffold-snapshot.mjs compare <baseline.json> [--allow t1,t2]');
            process.exit(1);
        }
        const allowIdx = rest.indexOf('--allow');
        const allowed = new Set(allowIdx !== -1 ? rest[allowIdx + 1].split(',') : []);

        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const current = scaffoldAll();

        let hasUnexpectedDiff = false;
        let hasExpectedDiff = false;

        for (const template of TEMPLATES) {
            const baseFiles = baseline[template] || {};
            const curFiles = current[template] || {};
            const allPaths = new Set([...Object.keys(baseFiles), ...Object.keys(curFiles)]);
            const diffs = [];
            for (const rel of [...allPaths].sort()) {
                if (baseFiles[rel] !== curFiles[rel]) {
                    diffs.push({
                        rel,
                        before: baseFiles[rel] || '(missing)',
                        after: curFiles[rel] || '(missing)',
                    });
                }
            }
            if (diffs.length === 0) continue;

            const expected = allowed.has(template);
            if (expected) hasExpectedDiff = true;
            else hasUnexpectedDiff = true;

            console.log(`\n[${expected ? 'EXPECTED' : 'UNEXPECTED'}] ${template}: ${diffs.length} file(s) differ`);
            for (const d of diffs) {
                console.log(`  ${d.rel}`);
                console.log(`    before: ${d.before}`);
                console.log(`    after:  ${d.after}`);
            }
        }

        if (hasUnexpectedDiff) {
            console.error('\nFAIL: unexpected output differences found (see UNEXPECTED entries above).');
            process.exit(1);
        }

        if (hasExpectedDiff) {
            console.log('\nOK: only explicitly-allowed templates differ from baseline.');
        } else {
            console.log('\nOK: output is byte-identical to baseline for all templates.');
        }
        return;
    }

    console.error('Usage: scaffold-snapshot.mjs <snapshot|compare> ...');
    process.exit(1);
}

main();

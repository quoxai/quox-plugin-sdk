import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { build, resolveProjectVite } = require('../cli/build.js');
const { run } = require('../cli/main.js');

describe('quox-plugin build', () => {
    let dir;
    beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qp-build-')); });
    afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    it("runs the PROJECT's own vite (resolved from --dir) with `build`, cwd = the project", () => {
        const calls = [];
        const status = build({
            dir,
            resolveVite: (from) => { calls.push(['resolve', from]); return '/proj/node_modules/vite/bin/vite.js'; },
            spawn: (cmd, args, opts) => { calls.push(['spawn', cmd, args, opts.cwd]); return { status: 0 }; },
        });
        expect(status).toBe(0);
        expect(calls[0]).toEqual(['resolve', path.resolve(dir)]);
        expect(calls[1][1]).toBe(process.execPath);
        expect(calls[1][2]).toEqual(['/proj/node_modules/vite/bin/vite.js', 'build']);
        expect(calls[1][3]).toBe(path.resolve(dir));
    });

    it('passes the vite exit status through', () => {
        expect(build({ dir, resolveVite: () => '/v.js', spawn: () => ({ status: 3 }) })).toBe(3);
    });

    it('refuses clearly when vite is not installed in the project', () => {
        expect(() => build({ dir, resolveVite: () => null, spawn: () => ({ status: 0 }) }))
            .toThrow(/vite is not installed in .*npm install/);
    });

    it('refuses a --dir that does not exist', () => {
        expect(() => build({ dir: path.join(dir, 'nope'), resolveVite: () => '/v.js', spawn: () => ({ status: 0 }) }))
            .toThrow(/not a directory/);
    });

    it('resolves vite through package.json + bin even when exports hide the bin path (real vite 7 shape)', () => {
        const pkg = path.join(dir, 'node_modules', 'vite');
        fs.mkdirSync(path.join(pkg, 'bin'), { recursive: true });
        fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({
            name: 'vite', version: '7.0.0', bin: { vite: 'bin/vite.js' },
            exports: { '.': './index.js', './package.json': './package.json' },
        }));
        fs.writeFileSync(path.join(pkg, 'bin', 'vite.js'), '');
        expect(resolveProjectVite(dir)).toBe(path.join(pkg, 'bin', 'vite.js'));
    });

    it('resolveProjectVite returns null when vite is absent', () => {
        expect(resolveProjectVite(dir)).toBeNull();
    });

    it('is wired into the CLI usage', () => {
        const out = [];
        run([], { log: (l) => out.push(l), error: (l) => out.push(l) });
        expect(out.join('\n')).toMatch(/quox-plugin build \[--dir \.\]/);
    });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CREATE_SCRIPT = path.resolve(__dirname, '../bin/create.js');
const { usedPermissions } = require('../../quox-plugin-vite/src/cli/validate.js');

// Which declared permission each shared helper in templates/_shared/src/lib needs.
const LIB_HELPER_PERMISSIONS = {
    api: ['network'],
    loadValue: ['storage'],
    saveValue: ['storage'],
    toast: ['notifications'],
    useConfig: ['storage', 'notifications', 'network'],
};
const ENFORCED = ['storage', 'network', 'memory', 'aee', 'notifications'];
const QX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/qx-classes.json'), 'utf8'));
const QX_SET = new Set(QX.classes);

const TEMPLATES = [
    'basic', 'monitoring-dashboard', 'fleet-management', 'service-bridge',
    'ui-feature', 'enterprise-extension', 'specialist-agent', 'agentic-team',
];

// Things that do not exist for a community (sandboxed) plugin, or that the sandbox forbids.
const FORBIDDEN = [
    /__quoxGlass/,
    /CapabilityPanels/,
    /WorkspaceContext/,
    /AuthContext/,
    /LicenseValidator/,
    /ServerSyncQueue/,
    /OrgScopedStorage/,
    /(^|[^.\w$])fetch\s*\(/,        // bare fetch( ; getQuox().fetch( is fine
    /XMLHttpRequest/,
    /\bnew\s+WebSocket\b/,
    /\bnew\s+EventSource\b/,
    /\bpluginApi\b/,                // components are mounted with no props; use getQuox()
];

function walk(dir, prefix = '') {
    let out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) {
            if (e.name === 'node_modules') continue;
            out = out.concat(walk(path.join(dir, e.name), rel));
        } else out.push(rel);
    }
    return out.sort();
}

function scaffold(root, name, template, extra = []) {
    const r = spawnSync('node', [CREATE_SCRIPT, name, '--template', template, '--non-interactive', ...extra], {
        cwd: root, encoding: 'utf8',
    });
    return { dir: path.join(root, name), status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('scaffolded templates follow the community sandbox model', () => {
    let root;
    const dirs = {};

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-sandbox-model-'));
        for (const t of TEMPLATES) {
            const res = scaffold(root, `t-${t}`, t);
            expect(res.status, res.stderr).toBe(0);
            dirs[t] = res.dir;
        }
    });
    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

    it('knows all 8 templates', () => {
        const src = fs.readFileSync(CREATE_SCRIPT, 'utf8');
        for (const t of TEMPLATES) expect(src).toContain(`name: '${t}'`);
    });

    for (const t of TEMPLATES) {
        describe(t, () => {
            it('contains no forbidden host-only or network APIs in any generated file', () => {
                const hits = [];
                for (const rel of walk(dirs[t])) {
                    // backend/ is the plugin's own server, it is allowed to be a normal node service
                    if (rel.startsWith('backend/') || rel === 'Dockerfile' || rel.startsWith('.claude/')) continue;
                    const text = fs.readFileSync(path.join(dirs[t], rel), 'utf8');
                    for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${rel}: ${re}`);
                }
                expect(hits).toEqual([]);
            });

            it('manifest declares exactly the sandbox permissions its source uses', () => {
                const manifest = JSON.parse(fs.readFileSync(path.join(dirs[t], 'manifest.json'), 'utf8'));
                // The shared src/lib helpers ship in every scaffold but are
                // tree-shaken out unless used, so count a helper's permissions
                // only when the template's own code imports it (the built
                // bundle, which validate checks, behaves the same way).
                const own = walk(dirs[t])
                    .filter(f => f.startsWith('src/') && !f.startsWith('src/lib/') && /\.(jsx|js)$/.test(f))
                    .map(f => fs.readFileSync(path.join(dirs[t], f), 'utf8')).join('\n');
                const used = new Set(usedPermissions(own));
                for (const [helper, perms] of Object.entries(LIB_HELPER_PERMISSIONS)) {
                    if (new RegExp(`import[^;]*\\b${helper}\\b[^;]*from '\\.\\./lib/`).test(own)) perms.forEach(p => used.add(p));
                }
                const declared = manifest.permissions.filter(p => ENFORCED.includes(p)).sort();
                expect(declared).toEqual([...used].sort());
            });

            it('no source or bundle input uses window.quox memory or aee (not available to community plugins yet)', () => {
                const hits = [];
                for (const rel of walk(dirs[t])) {
                    if (!/\.(jsx|js)$/.test(rel) || rel.startsWith('backend/')) continue;
                    const text = fs.readFileSync(path.join(dirs[t], rel), 'utf8');
                    if (/\.\s*memory\s*\.\s*(save|search)\b|\.\s*aee\s*\.\s*emit\b/.test(text)) hits.push(rel);
                }
                expect(hits).toEqual([]);
                const manifest = JSON.parse(fs.readFileSync(path.join(dirs[t], 'manifest.json'), 'utf8'));
                expect(manifest.permissions).not.toContain('memory');
                expect(manifest.permissions).not.toContain('aee');
            });

            it('registers through registerPlugin from quox-plugin-sdk', () => {
                const idx = fs.readFileSync(path.join(dirs[t], 'src/index.jsx'), 'utf8');
                expect(idx).toMatch(/import \{ registerPlugin \} from 'quox-plugin-sdk'/);
                expect(idx).toContain(`registerPlugin('t-${t}'`);
                expect(idx).not.toContain('__quoxPluginRegister');
            });

            it('every qx-* class used exists in the host qx-components.css snapshot', () => {
                const bad = [];
                for (const rel of walk(dirs[t])) {
                    if (!/\.(jsx|js)$/.test(rel) || rel.startsWith('backend/')) continue;
                    const text = fs.readFileSync(path.join(dirs[t], rel), 'utf8');
                    for (const m of text.matchAll(/\bqx-[A-Za-z0-9_-]+/g)) {
                        if (!QX_SET.has(m[0])) bad.push(`${rel}: ${m[0]}`);
                    }
                }
                expect(bad).toEqual([]);
            });

            it('views render an error state when the RPC fails', () => {
                const files = walk(dirs[t]).filter(f => f.startsWith('src/views/') || f.startsWith('src/components/') || f.startsWith('src/lib/'));
                const all = files.map(f => fs.readFileSync(path.join(dirs[t], f), 'utf8')).join('\n');
                expect(all).toMatch(/qx-banner--error/);
            });

            it('package.json uses registry deps ^0.3.0, with the contract scripts', () => {
                const pkg = JSON.parse(fs.readFileSync(path.join(dirs[t], 'package.json'), 'utf8'));
                const all = { ...pkg.dependencies, ...pkg.devDependencies };
                expect(all['quox-plugin-sdk']).toBe('^0.3.0');
                expect(all['quox-plugin-vite']).toBe('^0.3.0');
                expect(JSON.stringify(pkg)).not.toMatch(/file:/);
                expect(JSON.stringify(pkg)).not.toContain('/home/');
                expect(pkg.scripts.dev).toBe('vite');
                expect(pkg.scripts.build).toBe('vite build');
                expect(pkg.scripts.validate).toBe('quox-plugin validate');
                expect(pkg.scripts.sign).toBe('quox-plugin sign --key ./.keys/plugin-signing.pem');
            });

            it('ships .gitignore with .keys/ and dist/, and a README covering build/validate/sign/install', () => {
                const gi = fs.readFileSync(path.join(dirs[t], '.gitignore'), 'utf8');
                expect(gi).toMatch(/^\.keys\/$/m);
                expect(gi).toMatch(/^dist\/$/m);
                expect(fs.existsSync(path.join(dirs[t], '_gitignore'))).toBe(false);
                const readme = fs.readFileSync(path.join(dirs[t], 'README.md'), 'utf8');
                for (const w of ['npm run build', 'npm run validate', 'npm run sign', 'keygen', 'install']) {
                    expect(readme).toContain(w);
                }
                expect(readme).not.toContain('—');
            });
        });
    }

    it('writes the Claude skill into the project, and --no-skill opts out', () => {
        const skill = path.join(dirs.basic, '.claude/skills/quox-plugin/SKILL.md');
        expect(fs.existsSync(skill)).toBe(true);
        const text = fs.readFileSync(skill, 'utf8');
        expect(text).toContain('getQuox');
        expect(text).not.toMatch(/\/home\/|\u2014|pluginApi|__quoxGlass/);
        const res = scaffold(root, 'no-skill', 'basic', ['--no-skill']);
        expect(res.status, res.stderr).toBe(0);
        expect(fs.existsSync(path.join(res.dir, '.claude'))).toBe(false);
    });

    it('uses no private hostnames or LAN-looking addresses in generated files', () => {
        const hits = [];
        for (const t of TEMPLATES) for (const rel of walk(dirs[t])) {
            const text = fs.readFileSync(path.join(dirs[t], rel), 'utf8');
            if (/\bpve0\d|access01|qcore-dev|192\.168\.|\b10\.0\.0\./.test(text)) hits.push(`${t}/${rel}`);
        }
        expect(hits).toEqual([]);
    });

    it('--local-sdk writes file: deps only when explicitly passed', () => {
        const fakeSdk = path.join(root, 'sdk-checkout');
        for (const p of ['quox-plugin-sdk', 'quox-plugin-vite']) {
            fs.mkdirSync(path.join(fakeSdk, 'packages', p), { recursive: true });
            fs.writeFileSync(path.join(fakeSdk, 'packages', p, 'package.json'), '{}');
        }
        const res = scaffold(root, 'local-dev', 'basic', ['--local-sdk', fakeSdk]);
        expect(res.status, res.stderr).toBe(0);
        const pkg = JSON.parse(fs.readFileSync(path.join(res.dir, 'package.json'), 'utf8'));
        expect(pkg.dependencies['quox-plugin-sdk']).toBe(`file:${path.join(fakeSdk, 'packages/quox-plugin-sdk')}`);
        expect(pkg.devDependencies['quox-plugin-vite']).toBe(`file:${path.join(fakeSdk, 'packages/quox-plugin-vite')}`);
    });

    it('--local-sdk fails clearly when the path is not an SDK checkout', () => {
        const res = scaffold(root, 'bad-local', 'basic', ['--local-sdk', path.join(root, 'nope')]);
        expect(res.status).toBe(1);
        expect(res.stderr).toMatch(/--local-sdk/);
    });

    it('never auto-detects a local checkout (default deps are registry semvers even inside the monorepo)', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(dirs.basic, 'package.json'), 'utf8'));
        expect(pkg.dependencies['quox-plugin-sdk']).toBe('^0.3.0');
    });

    it('--from-mcp-json output follows the sandbox model too', () => {
        const toolsFile = path.join(root, 'tools.json');
        fs.writeFileSync(toolsFile, JSON.stringify({ tools: [{ name: 'list.items', description: 'List items', inputSchema: { type: 'object', properties: {} } }] }));
        const r = spawnSync('node', [CREATE_SCRIPT, 'from-mcp', '--from-mcp-json', toolsFile, '--non-interactive'], { cwd: root, encoding: 'utf8' });
        expect(r.status, r.stderr).toBe(0);
        const dir = path.join(root, 'from-mcp');
        for (const rel of walk(dir)) {
            if (rel.startsWith('.claude/')) continue;
            const text = fs.readFileSync(path.join(dir, rel), 'utf8');
            for (const re of FORBIDDEN) expect(text, `${rel} ${re}`).not.toMatch(re);
        }
        const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
        expect(readme).toContain('npm run sign');
        expect(readme).toContain('Provenance');
    });
});

describe('enterprise-extension backend', () => {
    let root, dir;
    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-ent-backend-'));
        const res = scaffold(root, 't-ent', 'enterprise-extension');
        expect(res.status, res.stderr).toBe(0);
        dir = res.dir;
    });
    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

    it('serves a route for every path the views fetch, plus /health', () => {
        const server = fs.readFileSync(path.join(dir, 'backend/server.js'), 'utf8');
        const routes = new Set([...server.matchAll(/app\.(get|post|put|delete)\(\s*'([^']+)'/g)].map(m => `${m[1].toUpperCase()} ${m[2]}`));
        const fetched = new Set();
        for (const rel of walk(path.join(dir, 'src'))) {
            if (!/^(views|components)\/.*\.(jsx|js)$/.test(rel)) continue;
            const text = fs.readFileSync(path.join(dir, 'src', rel), 'utf8');
            for (const m of text.matchAll(/\bapi\(\s*'(\/[^']*)'(?:\s*,\s*\{[^}]*method:\s*'([A-Z]+)')?/g)) fetched.add(`${m[2] || 'GET'} ${m[1]}`);
        }
        expect([...fetched].length).toBeGreaterThan(0);
        for (const f of fetched) expect(routes, f).toContain(f);
        expect(routes).toContain('GET /health');
    });

    it('manifest.backend port matches server.js, Dockerfile builds from emitted files', () => {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
        expect(manifest.backend).toEqual({ image: 't-ent-backend:latest', healthPath: '/health', port: 8080 });
        const server = fs.readFileSync(path.join(dir, 'backend/server.js'), 'utf8');
        expect(server).toMatch(/process\.env\.PORT \|\| 8080/);
        const docker = fs.readFileSync(path.join(dir, 'Dockerfile'), 'utf8');
        expect(docker).toContain('COPY backend/package.json');
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'backend/package.json'), 'utf8'));
        expect(pkg.dependencies.express).toBeTruthy();
        expect(pkg.scripts.start).toBe('node server.js');
    });
});

describe('create-quox-plugin package.json (publish fields)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    it('carries the contract fields', () => {
        expect(pkg.version).toBe('0.3.1');
        expect(pkg.license).toBe('Apache-2.0');
        expect(pkg.repository).toEqual({ type: 'git', url: 'git+https://github.com/quoxai/quox-plugin-sdk.git', directory: 'packages/create-quox-plugin' });
        expect(pkg.homepage).toBe('https://quox.ai/docs/plugin-sdk');
        expect(pkg.bugs).toEqual({ url: 'https://github.com/quoxai/quox-plugin-sdk/issues' });
        expect(pkg.engines).toEqual({ node: '>=20' });
        expect(pkg.publishConfig).toEqual({ access: 'public' });
        expect(pkg.author).toBe('Quox');
        expect(pkg.files).toEqual(expect.arrayContaining(['bin', 'lib', 'templates']));
        expect(pkg.keywords.length).toBeGreaterThan(2);
    });
    it('does not strip dotfiles: templates ship _gitignore, not .gitignore', () => {
        expect(fs.existsSync(path.resolve(__dirname, '../templates/_shared/_gitignore'))).toBe(true);
        expect(fs.existsSync(path.resolve(__dirname, '../templates/_shared/.gitignore'))).toBe(false);
    });
});

describe('shared lib helper permission map stays complete', () => {
    it('every export of _shared/src/lib/api.js is mapped', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'templates', '_shared', 'src', 'lib', 'api.js'), 'utf8');
        const exported = [...src.matchAll(/export (?:async )?function (\w+)/g)].map(m => m[1]);
        for (const name of exported) expect(Object.keys(LIB_HELPER_PERMISSIONS)).toContain(name);
    });
});

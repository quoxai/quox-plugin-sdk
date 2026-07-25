import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { introspectMcpStdioServer, loadMcpToolsFromJsonFile } from '../lib/mcp-introspect.js';

const CREATE_SCRIPT = path.resolve(__dirname, '../bin/create.js');
const FIXTURE_SERVER = path.resolve(__dirname, 'fixtures/fake-mcp-server.js');
const FIXTURE_COMMAND = `node ${FIXTURE_SERVER}`;

describe('mcp-introspect (protocol boundary, real fixture process)', () => {
    it('performs the initialize handshake and returns tools/list', async () => {
        const result = await introspectMcpStdioServer(FIXTURE_COMMAND);
        expect(result.serverInfo).toEqual({ name: 'fake-mcp-fixture', version: '0.0.1' });
        expect(result.tools).toHaveLength(3);
        const names = result.tools.map(t => t.name);
        expect(names).toContain('search.web');
        expect(names).toContain('read_file');
        expect(names).toContain('db-query');
        // Confirm the dotted-name tool really came back with its inputSchema intact.
        const search = result.tools.find(t => t.name === 'search.web');
        expect(search.inputSchema.required).toContain('query');
    });

    it('rejects with a clear error when the server never responds (timeout)', async () => {
        // A process that starts fine but never speaks JSON-RPC on stdout.
        const hangingCommand = `${JSON.stringify(process.execPath)} -e "setInterval(()=>{}, 1000)"`;
        await expect(introspectMcpStdioServer(hangingCommand, { timeoutMs: 300 }))
            .rejects.toThrow(/Timed out after 300ms/);
    });

    it('rejects when the command exits before completing the handshake', async () => {
        const exitingCommand = `${JSON.stringify(process.execPath)} -e "process.exit(1)"`;
        await expect(introspectMcpStdioServer(exitingCommand, { timeoutMs: 5000 }))
            .rejects.toThrow(/exited before completing the handshake/);
    });
});

describe('loadMcpToolsFromJsonFile', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-mcp-json-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function writeJson(name, data) {
        const file = path.join(tmpDir, name);
        fs.writeFileSync(file, JSON.stringify(data));
        return file;
    }

    it('reads a { tools, serverInfo } shaped file', () => {
        const file = writeJson('tools.json', {
            serverInfo: { name: 'saved-server' },
            tools: [{ name: 'a.b', description: 'x', inputSchema: { type: 'object', properties: {} } }],
        });
        const { tools, serverName } = loadMcpToolsFromJsonFile(file);
        expect(serverName).toBe('saved-server');
        expect(tools).toHaveLength(1);
    });

    it('reads a bare array of tools', () => {
        const file = writeJson('tools-array.json', [{ name: 'x', description: 'y' }]);
        const { tools, serverName } = loadMcpToolsFromJsonFile(file);
        expect(tools).toHaveLength(1);
        expect(serverName).toBeNull();
    });

    it('throws a clear error for a file that is not a tools/list result', () => {
        const file = writeJson('bad.json', { foo: 'bar' });
        expect(() => loadMcpToolsFromJsonFile(file)).toThrow(/does not look like a saved MCP tools\/list result/);
    });

    it('throws a clear error for invalid JSON', () => {
        const file = path.join(tmpDir, 'invalid.json');
        fs.writeFileSync(file, '{ not json');
        expect(() => loadMcpToolsFromJsonFile(file)).toThrow(/Could not parse/);
    });
});

describe('create-quox-plugin --from-mcp / --from-mcp-json (full scaffold)', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-mcp-cli-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function readManifest(pluginDir) {
        return JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf8'));
    }

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

    describe('--from-mcp (live stdio server)', () => {
        function scaffoldFromMcp(name) {
            const pluginDir = path.join(tmpDir, name);
            execSync(
                `node ${CREATE_SCRIPT} ${name} --from-mcp "${FIXTURE_COMMAND}"`,
                { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
            );
            return pluginDir;
        }

        it('generates the specialist-agent file set plus mcp-tools.js and README.md', () => {
            const dir = scaffoldFromMcp('test-mcp-live');
            const files = listFiles(dir);
            expect(files).toContain('manifest.json');
            expect(files).toContain('src/agent/agentDef.js');
            expect(files).toContain('src/agent/agentPersona.js');
            expect(files).toContain('src/agent/tools.js');
            expect(files).toContain('src/data/mcp-tools.js');
            expect(files).toContain('README.md');
        });

        it('has network permission and 3 normalized tool names', () => {
            const dir = scaffoldFromMcp('test-mcp-live2');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('network');
            expect(manifest.toolDefinitions).toHaveLength(3);

            const names = manifest.toolDefinitions.map(t => t.name);
            expect(names).toContain('plugin_test-mcp-live2_search_web');
            expect(names).toContain('plugin_test-mcp-live2_read_file');
            expect(names).toContain('plugin_test-mcp-live2_db_query');
            // No dots or dashes survive normalization inside the tool name itself.
            names.forEach(n => {
                const toolPart = n.replace(`plugin_test-mcp-live2_`, '');
                expect(toolPart).not.toMatch(/[.]/);
            });

            expect(manifest.agentDefinition.tools).toEqual(expect.arrayContaining(names));
        });

        it('keeps the original dotted MCP tool name as canonical metadata', () => {
            const dir = scaffoldFromMcp('test-mcp-live3');
            const manifest = readManifest(dir);
            const dotted = manifest.toolDefinitions.find(t => t.mcpToolName === 'search.web');
            expect(dotted).toBeDefined();
            expect(dotted.name).toBe('plugin_test-mcp-live3_search_web');
        });

        it('has an mcpProvenance block with source command, server name, and tool count', () => {
            const dir = scaffoldFromMcp('test-mcp-live4');
            const manifest = readManifest(dir);
            expect(manifest.mcpProvenance).toBeDefined();
            expect(manifest.mcpProvenance.sourceCommand).toBe(FIXTURE_COMMAND);
            expect(manifest.mcpProvenance.serverName).toBe('fake-mcp-fixture');
            expect(manifest.mcpProvenance.toolCount).toBe(3);
            expect(manifest.mcpProvenance.generatedAt).toBeDefined();
        });

        it('generates src/data/mcp-tools.js with name, canonicalName, description, inputSchema', () => {
            const dir = scaffoldFromMcp('test-mcp-live5');
            const content = fs.readFileSync(path.join(dir, 'src/data/mcp-tools.js'), 'utf8');
            expect(content).toContain('canonicalName');
            expect(content).toContain('search.web');
            expect(content).toContain('read_file');
            expect(content).toContain('db-query');
            expect(content).toContain('inputSchema');
        });

        it('generates a README with provenance and an honesty paragraph pointing to quox powers', () => {
            const dir = scaffoldFromMcp('test-mcp-live6');
            const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
            expect(readme).toContain('## Provenance');
            expect(readme).toContain(FIXTURE_COMMAND);
            expect(readme).toContain('fake-mcp-fixture');
            expect(readme).toContain('Tools imported');
            expect(readme).toContain('does **not** execute');
            expect(readme).toContain('quox powers');
        });

        it('seeds the agent persona from the MCP server name', () => {
            const dir = scaffoldFromMcp('test-mcp-live7');
            const manifest = readManifest(dir);
            expect(manifest.agentPersona.description).toContain('fake-mcp-fixture');
            expect(manifest.specialist.name).toContain('fake-mcp-fixture');
        });
    });

    describe('--from-mcp-json (offline)', () => {
        function scaffoldFromMcpJson(name, jsonData) {
            const jsonFile = path.join(tmpDir, `${name}-tools.json`);
            fs.writeFileSync(jsonFile, JSON.stringify(jsonData));
            const pluginDir = path.join(tmpDir, name);
            execSync(
                `node ${CREATE_SCRIPT} ${name} --from-mcp-json ${jsonFile}`,
                { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
            );
            return pluginDir;
        }

        const savedTools = {
            serverInfo: { name: 'offline-server' },
            tools: [
                { name: 'notes.create', description: 'Create a note', inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } },
                { name: 'notes-list', description: 'List notes', inputSchema: { type: 'object', properties: {} } },
            ],
        };

        it('scaffolds from a saved tools/list result without spawning a server', () => {
            const dir = scaffoldFromMcpJson('test-mcp-json', savedTools);
            const manifest = readManifest(dir);
            expect(manifest.toolDefinitions).toHaveLength(2);
            expect(manifest.mcpProvenance.serverName).toBe('offline-server');
            expect(manifest.mcpProvenance.toolCount).toBe(2);
            const names = manifest.toolDefinitions.map(t => t.name);
            expect(names).toContain('plugin_test-mcp-json_notes_create');
            expect(names).toContain('plugin_test-mcp-json_notes_list');
        });

        it('keeps the dotted canonical name for the mcp-tools.js descriptor', () => {
            const dir = scaffoldFromMcpJson('test-mcp-json2', savedTools);
            const content = fs.readFileSync(path.join(dir, 'src/data/mcp-tools.js'), 'utf8');
            expect(content).toContain('notes.create');
            expect(content).toContain('notes_create');
        });
    });

    describe('error paths', () => {
        it('exits non-zero when both --from-mcp and --from-mcp-json are passed', () => {
            expect(() => execSync(
                `node ${CREATE_SCRIPT} test-mcp-conflict --from-mcp "${FIXTURE_COMMAND}" --from-mcp-json ${path.join(tmpDir, 'x.json')}`,
                { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
            )).toThrow();
        });

        it('exits non-zero when --template conflicts with --from-mcp', () => {
            expect(() => execSync(
                `node ${CREATE_SCRIPT} test-mcp-badtemplate --template basic --from-mcp "${FIXTURE_COMMAND}"`,
                { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
            )).toThrow();
        });

        it('exits non-zero with a clear error when the MCP server errors during handshake', () => {
            // Reuses the fixture but corrupts the command so the process exits immediately
            // (fast path to a real failing handshake, rather than waiting out the full 15s CLI timeout).
            const badCommand = `${JSON.stringify(process.execPath)} -e "process.exit(3)"`;
            let stderr = '';
            try {
                execSync(
                    `node ${CREATE_SCRIPT} test-mcp-badserver --from-mcp '${badCommand}'`,
                    { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
                );
                throw new Error('expected execSync to throw');
            } catch (err) {
                stderr = (err.stderr || '').toString();
                expect(err.status).not.toBe(0);
            }
            expect(stderr).toMatch(/MCP introspection failed/);
            expect(stderr).toMatch(/exited before completing the handshake/);
        });
    });
});

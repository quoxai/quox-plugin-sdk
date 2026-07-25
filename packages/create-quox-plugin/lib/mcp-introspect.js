/**
 * MCP server introspection for the --from-mcp / --from-mcp-json migration mode.
 *
 * Two entry points:
 *   - introspectMcpStdioServer(command): spawn a stdio MCP server, perform the
 *     MCP initialize handshake, call tools/list, then close the process.
 *   - loadMcpToolsFromJsonFile(filePath): read a previously saved tools/list
 *     result from disk (offline path, no process spawned).
 *
 * Protocol notes: MCP over stdio is JSON-RPC 2.0, newline-delimited (one JSON
 * object per line, no Content-Length framing). The spec requires the client
 * to send `initialize`, wait for the result, then send the `notifications/initialized`
 * notification BEFORE issuing any other request. Calling tools/list before that
 * notification is a protocol violation that well-behaved servers will reject.
 */

const fs = require('fs');
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 15000;
const KILL_GRACE_MS = 2000;

function createLineReader(onLine) {
    let buffer = '';
    return chunk => {
        buffer += chunk.toString('utf8');
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line) onLine(line);
        }
    };
}

function closeChild(child) {
    try { child.stdin.end(); } catch (_) { /* already closed */ }
    try { child.kill('SIGTERM'); } catch (_) { /* already dead */ }
    const killTimer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (_) { /* already dead */ }
    }, KILL_GRACE_MS);
    killTimer.unref();
    child.once('exit', () => clearTimeout(killTimer));
}

/**
 * Spawn a stdio MCP server, run the initialize handshake, call tools/list,
 * then close the connection cleanly.
 *
 * @param {string} command - full shell command that starts the MCP server (e.g. "node server.js", "npx -y some-mcp-server")
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<{serverInfo: object|null, tools: Array}>}
 */
function introspectMcpStdioServer(command, options = {}) {
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
        let child;
        try {
            child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (err) {
            reject(new Error(`Could not start MCP server command "${command}": ${err.message}`));
            return;
        }

        let settled = false;
        let nextId = 1;
        const pending = new Map();
        let stderrBuf = '';

        const timer = setTimeout(() => {
            fail(new Error(
                `Timed out after ${timeoutMs}ms waiting for the MCP server to respond. ` +
                `Command: "${command}". Confirm the command starts an MCP stdio server that speaks ` +
                `JSON-RPC 2.0 (newline-delimited) over stdout, and that it doesn't require a TTY.`
            ));
        }, timeoutMs);
        timer.unref();

        function fail(err) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            closeChild(child);
            reject(err);
        }

        function succeed(result) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            closeChild(child);
            resolve(result);
        }

        function send(method, params, id) {
            const msg = { jsonrpc: '2.0', method, params };
            if (id !== undefined) msg.id = id;
            child.stdin.write(JSON.stringify(msg) + '\n');
        }

        function request(method, params) {
            const id = nextId++;
            return new Promise((res, rej) => {
                pending.set(id, { res, rej });
                send(method, params, id);
            });
        }

        const onLine = createLineReader(line => {
            let msg;
            try {
                msg = JSON.parse(line);
            } catch (_) {
                return; // ignore non-JSON noise a server might print to stdout
            }
            if (msg && msg.id !== undefined && pending.has(msg.id)) {
                const { res, rej } = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) {
                    rej(new Error(`MCP server returned an error for id ${msg.id}: ${msg.error.message || JSON.stringify(msg.error)}`));
                } else {
                    res(msg.result);
                }
            }
        });

        child.stdout.on('data', onLine);
        child.stderr.on('data', d => { stderrBuf += d.toString('utf8'); });
        child.on('error', err => fail(new Error(`Failed to start MCP server command "${command}": ${err.message}`)));
        child.on('exit', (code, signal) => {
            if (!settled) {
                fail(new Error(
                    `MCP server process exited before completing the handshake (code=${code}, signal=${signal}). ` +
                    `Command: "${command}".${stderrBuf ? ' stderr: ' + stderrBuf.trim() : ''}`
                ));
            }
        });

        (async () => {
            try {
                const initResult = await request('initialize', {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'create-quox-plugin', version: '0.1.0' },
                });
                // Handshake requires the initialized notification BEFORE any other request.
                send('notifications/initialized', {});
                const toolsResult = await request('tools/list', {});
                succeed({
                    serverInfo: (initResult && initResult.serverInfo) || null,
                    tools: (toolsResult && toolsResult.tools) || [],
                });
            } catch (err) {
                fail(err);
            }
        })();
    });
}

/**
 * Read a saved MCP tools/list result from disk for the offline --from-mcp-json path.
 * Accepts: { tools: [...], serverInfo: { name } }, { result: { tools: [...] } }, or a bare array of tools.
 *
 * @param {string} filePath
 * @returns {{tools: Array, serverName: string|null}}
 */
function loadMcpToolsFromJsonFile(filePath) {
    let raw;
    try {
        raw = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        throw new Error(`Could not read ${filePath}: ${err.message}`);
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Could not parse ${filePath} as JSON: ${err.message}`);
    }

    let tools = null;
    let serverName = null;

    if (Array.isArray(data)) {
        tools = data;
    } else if (data && Array.isArray(data.tools)) {
        tools = data.tools;
        serverName = (data.serverInfo && data.serverInfo.name) || data.serverName || null;
    } else if (data && data.result && Array.isArray(data.result.tools)) {
        tools = data.result.tools;
        serverName = (data.result.serverInfo && data.result.serverInfo.name) || null;
    }

    if (!tools) {
        throw new Error(
            `${filePath} does not look like a saved MCP tools/list result. Expected ` +
            `{ "tools": [...] } (optionally with "serverInfo": { "name": ... }), or a plain array of tool objects.`
        );
    }

    return { tools, serverName };
}

module.exports = { introspectMcpStdioServer, loadMcpToolsFromJsonFile };

#!/usr/bin/env node
/**
 * Fake MCP stdio server used by create-quox-plugin tests. Speaks real
 * JSON-RPC 2.0, newline-delimited, over stdin/stdout: initialize handshake,
 * the initialized notification, then tools/list with 3 sample tools (one
 * with a dotted name, matching real-world MCP tool naming).
 *
 * This is a protocol fixture, not a mock: create.js's mcp-introspect module
 * talks to this exact process over its real stdio pipes.
 */

const readline = require('readline');

const TOOLS = [
    {
        name: 'search.web',
        description: 'Search the web for a query',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
        },
    },
    {
        name: 'read_file',
        description: 'Read a file from disk',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to read' },
            },
            required: ['path'],
        },
    },
    {
        name: 'db-query',
        description: 'Run a read-only database query',
        inputSchema: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: 'SQL query to run' },
                limit: { type: 'number', description: 'Maximum rows to return' },
            },
            required: ['sql'],
        },
    },
];

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
}

let initialized = false;

rl.on('line', line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg;
    try {
        msg = JSON.parse(trimmed);
    } catch (_) {
        return;
    }

    if (msg.method === 'initialize') {
        send({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'fake-mcp-fixture', version: '0.0.1' },
            },
        });
        return;
    }

    if (msg.method === 'notifications/initialized') {
        initialized = true;
        return;
    }

    if (msg.method === 'tools/list') {
        if (!initialized) {
            send({
                jsonrpc: '2.0',
                id: msg.id,
                error: { code: -32002, message: 'Server not initialized: initialize handshake incomplete' },
            });
            return;
        }
        send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
        return;
    }
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

# Convert an MCP Server (draft)

> **Status: draft.** This walkthrough is a stub for the `--from-mcp` / `--from-mcp-json` migration mode. The showcase task will flesh this out with a real worked example (a concrete MCP server, its actual tool list, and screenshots of the generated dev host). Until then, this page just outlines the steps.

This tutorial will cover converting an existing MCP (Model Context Protocol) server into a QuoxCORE specialist-agent plugin, using the scaffolder's migration mode instead of hand-writing an agent definition.

## Prerequisites

- Node.js 20+
- An MCP server you can run locally as a stdio process, or a saved `tools/list` result if you don't want to run it live
- Familiarity with the [Specialist Agent tutorial](specialist-agent.md), migration mode reuses that template

## Step 1: Scaffold from a live MCP server

```bash
npx @quoxai/create-quox-plugin my-mcp-agent --from-mcp "node my-mcp-server.js"
```

The CLI spawns the given command, performs the MCP `initialize` handshake, sends `notifications/initialized`, calls `tools/list`, then closes the process. There is a 15 second timeout on the whole exchange.

## Step 2: Scaffold offline from a saved tools/list result

If you don't want to spawn the server (or can't, in CI), save its `tools/list` result to a file first:

```json
{
  "serverInfo": { "name": "my-mcp-server" },
  "tools": [
    { "name": "search.web", "description": "Search the web", "inputSchema": { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] } }
  ]
}
```

Then:

```bash
npx @quoxai/create-quox-plugin my-mcp-agent --from-mcp-json ./tools-list.json
```

## Step 3: Review the generated agent

Open `manifest.json` and check `agentDefinition.tools`, `toolDefinitions`, and the new `mcpProvenance` block. Open `src/data/mcp-tools.js` for the full descriptor list (normalized name, canonical MCP name, description, input schema). Open `README.md` for the provenance table and, importantly, the note on what this plugin does and does not do.

## Step 4: Understand the honesty boundary

<!-- TODO(showcase task): replace this section with a concrete before/after, screenshots
     of the generated tool cards, and a walked-through quox powers wiring example. -->

The generated plugin shows the imported tool list and routes chat to the specialist agent. It does not execute the MCP server's tools live from the browser: that requires `quox powers`, QuoxCORE's server-side tool execution layer. Wiring that up is out of scope for this stub; the showcase task will cover it end to end.

## Step 5: Build and install

```bash
cd my-mcp-agent
npm install
npm run build
npm run validate
npx quox-plugin keygen --out .keys   # one time
npm run sign
```

The generated plugin follows the community sandbox model: the tool list is display data, and execution goes through your backend.

<!-- TODO(showcase task): worked example with a real published MCP server, full tool
     table, and dev-host screenshots. -->

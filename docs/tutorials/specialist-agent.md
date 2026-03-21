# Building a Specialist Agent Plugin

This tutorial walks through building a plugin that registers a specialist agent with QuoxCORE. The agent has its own persona, tools, autonomy settings, and an inline chat interface.

## Prerequisites

- Node.js 18+
- Familiarity with [Getting Started](../getting-started.md) and the basic plugin lifecycle
- Understanding of QuoxCORE agents (see the dashboard's `agentRegistry.js` and `assistants.js`)

## Step 1: Scaffold

```bash
npx create-quox-plugin my-scanner --template specialist-agent
cd my-scanner
npm install
```

This generates 14 files:

```
my-scanner/
├── manifest.json
├── package.json
├── vite.config.js
├── .gitignore
└── src/
    ├── index.jsx
    ├── agent/
    │   ├── agentDef.js        # AgentDefinition (agentRegistry shape)
    │   ├── agentPersona.js    # AgentPersona (assistants.js shape)
    │   └── tools.js           # ToolDefinitions (Claude tool_use format)
    ├── views/
    │   ├── MainView.jsx       # Status card, tool cards, quick actions, chat
    │   └── SettingsPanel.jsx  # DEFCON, autonomy, budget, escalation
    ├── components/
    │   ├── AgentStatusCard.jsx
    │   ├── ToolCard.jsx
    │   └── AgentChat.jsx
    └── data/
        └── mock.js
```

## Step 2: Understand the Agent Definition

Open `src/agent/agentDef.js`. This matches the shape expected by `agentRegistry.js`:

```js
export const agentDefinition = {
    id: 'my-scanner-agent',
    name: 'My Scanner Agent',
    role: 'specialist',          // orchestrator | specialist | analyst
    level: 1,
    domain: 'security',
    ownership: { source: 'plugin', plugin: 'my-scanner' },
    // ...
    tools: ['plugin_my-scanner_run_scan', 'plugin_my-scanner_get_findings', 'plugin_my-scanner_generate_report'],
    defconLevel: 'AMBER',
    autonomy: {
        canRunAutonomously: true,
        defaultSchedule: '0 */4 * * *',
        budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 300000, maxDailyRuns: 6 },
        escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
    },
    suggestions: [
        'Scan the production subnet for vulnerabilities',
        // ...
    ],
};
```

Key fields:
- **role**: `specialist` means this agent focuses on a single domain
- **ownership.source**: `plugin` tells the platform this agent comes from a plugin
- **tools**: Array of tool names using the `plugin_{id}_{tool}` convention
- **autonomy**: Controls whether the agent can run unattended on a schedule

## Step 3: Understand the Persona

Open `src/agent/agentPersona.js`. This matches the `assistants.js` shape:

```js
export const agentPersona = {
    id: 'my-scanner-agent',
    name: 'My Scanner Agent',
    shortName: 'My',
    voice: 'analytical',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    specialty: 'Security scanning and vulnerability analysis',
    llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
    systemPrompt: '...',
};
```

The persona controls how the agent presents itself in the dashboard chat interface.

## Step 4: Define Tools

Open `src/agent/tools.js`. Each tool follows the Claude `tool_use` format:

```js
{
    name: 'plugin_my-scanner_run_scan',
    description: 'Run a security scan against a target',
    input_schema: {
        type: 'object',
        properties: {
            target: { type: 'string', description: 'Target host or subnet to scan' },
            depth: { type: 'string', enum: ['quick', 'standard', 'deep'] },
            categories: { type: 'array', items: { type: 'string' } },
        },
        required: ['target'],
    },
}
```

Tool naming convention: `plugin_{pluginId}_{tool_name}`. This ensures no collisions with built-in tools.

## Step 5: Customise the UI

The `MainView.jsx` includes:
- **AgentStatusCard** — shows running/idle state, DEFCON badge, and token budget bar
- **ToolCard** — one per tool, with expandable parameter form and Run button
- **Quick action chips** — clickable suggestions that open the chat
- **AgentChat** — inline chat panel for direct agent interaction

## Step 6: Configure Settings

The `SettingsPanel.jsx` provides:
- DEFCON level selector with colour indicator
- Autonomous mode toggle and cron schedule
- Budget controls (tokens, tool calls, daily runs)
- Escalation settings

## Step 7: Build and Install

```bash
npm run build
```

Upload the `.quoxplugin` file to QuoxCORE via **Settings > Plugins > Install Plugin**.

## Step 8: Connect to Real Backend

Replace the stub tool handlers in `ToolCard.jsx` with real API calls:

```js
// Instead of setTimeout simulation:
const result = await pluginApi.fetch('/api/scan', {
    method: 'POST',
    body: JSON.stringify(params),
});
```

Register tools with the collector backend:

```bash
POST /api/v1/admin/plugins/my-scanner/tools
Content-Type: application/json

{
    "tools": [
        { "name": "plugin_my-scanner_run_scan", "description": "...", "input_schema": { ... } }
    ]
}
```

## Next Steps

- Add more tools — follow the naming convention and add to both `tools.js` and the manifest
- Customise the persona — change voice, colour, and system prompt to match your domain
- Adjust autonomy — set budget limits appropriate for your workload
- Add memory integration — use `pluginApi.memory.save()` to persist findings
- Emit AEE events — use `pluginApi.aee.emit()` for audit trail

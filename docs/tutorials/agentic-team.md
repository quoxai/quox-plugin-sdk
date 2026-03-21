# Building an Agentic Team Plugin

This tutorial walks through building a plugin that provides a coordinated team of agents. The team has an orchestrator, specialist members, shared context, policies, and a task queue.

## Prerequisites

- Node.js 18+
- Familiarity with [Getting Started](../getting-started.md) and the [Specialist Agent](./specialist-agent.md) tutorial
- Understanding of QuoxCORE teams (see the dashboard's `teams/*.json` files like `secops.json`)

## Step 1: Scaffold

```bash
npx create-quox-plugin my-devops --template agentic-team
cd my-devops
npm install
```

This generates 17 files:

```
my-devops/
├── manifest.json
├── package.json
├── vite.config.js
├── .gitignore
└── src/
    ├── index.jsx
    ├── team/
    │   ├── teamDef.js         # TeamDefinition (teams/*.json shape)
    │   ├── agents.js          # 4 AgentDefinitions
    │   ├── personas.js        # 4 AgentPersonas with distinct colours
    │   ├── tools.js           # 8 ToolDefinitions (2 per agent)
    │   └── policies.js        # Policies + validation + merge helpers
    ├── views/
    │   ├── MainView.jsx       # Member cards, task queue, shared context
    │   └── SettingsPanel.jsx  # Budget, approval, VOLT, channels
    ├── components/
    │   ├── MemberCard.jsx     # Agent avatar, domain, DEFCON badge
    │   ├── TaskQueue.jsx      # Task list with priority/status badges
    │   ├── SharedContextPanel.jsx
    │   └── PolicyBadges.jsx   # VOLT, Approval, Parallel, Checkpoint pills
    └── data/
        └── mock.js
```

## Step 2: Understand the Team Definition

Open `src/team/teamDef.js`. This matches the `teams/*.json` shape used by `secops.json`:

```js
export const teamDefinition = {
    id: 'my-devops-team',
    type: 'team',
    version: '1.0.0',
    displayName: 'My Devops Team',
    orchestrator: {
        agentId: 'my-devops-lead',
        role: 'orchestrator',
        domains: ['devops', 'coordination'],
    },
    members: [
        { agentId: 'my-devops-lead', role: 'orchestrator', domains: ['devops', 'coordination'] },
        { agentId: 'my-devops-deployer', role: 'specialist', domains: ['deployment'] },
        { agentId: 'my-devops-monitor', role: 'specialist', domains: ['monitoring'] },
        { agentId: 'my-devops-responder', role: 'analyst', domains: ['incident-response'] },
    ],
    policies: { /* ... */ },
    sharedContext: '...',
};
```

## Step 3: Understand the 4 Agents

The template generates 4 agents with distinct roles:

| Agent | Role | DEFCON | Colour | Tools |
|-------|------|--------|--------|-------|
| Lead | orchestrator | GREEN | #38bdf8 (sky) | assign_task, get_team_status |
| Deployer | specialist | AMBER | #f59e0b (amber) | deploy_service, rollback_service |
| Monitor | specialist | GREEN | #10b981 (emerald) | check_health, query_metrics |
| Responder | analyst | ORANGE | #ef4444 (red) | create_incident, escalate_incident |

Each agent has its own persona in `src/team/personas.js` with a distinct colour for visual identification.

## Step 4: Understand Policies

Open `src/team/policies.js`. Policies control team behaviour:

```js
export const defaultPolicies = {
    maxBudgetTokens: 200000,        // Total token budget for the team
    maxBudgetToolCalls: 80,          // Max tool calls across all members
    maxDurationMs: 14400000,         // 4 hours max run time
    maxTaskDurationMs: 600000,       // 10 minutes per task
    heartbeatIntervalMs: 15000,      // 15 second heartbeats
    maxParallelTasks: 2,             // 2 tasks can run simultaneously
    requireApprovalBeforeStart: true, // Human must approve before team starts
    checkpointAfterEachTask: true,   // Save state after each task
    voltRequired: true,              // VOLT audit trail required
    allowedChannels: ['dashboard', 'aee', 'webhook'],
};
```

The file also exports `validatePolicies()` and `mergePolicies()` helpers for runtime use.

## Step 5: Customise the UI

The `MainView.jsx` includes:
- **PolicyBadges** — pills showing VOLT, Approval, Parallel, Checkpoint status
- **MemberCard** row — coloured avatar circles with domain, DEFCON badge, and activity status
- **TaskQueue** — list of tasks with assigned agent, priority, and status badges
- **SharedContextPanel** — collapsible viewer for team-wide context
- **Quick action buttons** — common team operations

## Step 6: Configure Settings

The `SettingsPanel.jsx` provides:
- Approval toggle (require human approval before task starts)
- VOLT audit trail toggle
- Checkpoint toggle
- Budget controls (tokens, tool calls, parallel tasks)
- Allowed channels

## Step 7: Build and Install

```bash
npm run build
```

Upload the `.quoxplugin` file to QuoxCORE.

## Step 8: Customise Your Team

### Change team composition

Edit `src/team/agents.js` to add, remove, or modify agents. Each agent needs:
- A unique `id` matching the pattern `{pluginId}-{role}`
- A corresponding entry in `personas.js`
- At least one tool in `tools.js`
- A member reference in `teamDef.js`

### Add more tools

Follow the naming convention `plugin_{pluginId}_{tool_name}` and add to `tools.js`. Update the corresponding agent's `tools` array in `agents.js`.

### Adjust policies

Modify `policies.js` defaults or use `mergePolicies()` to override at runtime:

```js
import { defaultPolicies, mergePolicies } from '../team/policies';

const customPolicies = mergePolicies(defaultPolicies, {
    maxParallelTasks: 4,
    requireApprovalBeforeStart: false,
});
```

### Connect to real orchestration

Replace mock data in `data/mock.js` with real API calls. The orchestrator agent coordinates work:

1. Lead receives a task via `assign_task`
2. Lead delegates to the appropriate specialist
3. Specialist uses their tools to complete the work
4. Results flow back through shared context
5. VOLT audit trail records every action

## Next Steps

- Add more team members — specialise for your domain
- Implement real task routing — connect the Lead's `assign_task` tool to your backend
- Add inter-agent communication — use shared context for message passing
- Enable autonomous scheduling — set `canRunAutonomously: true` on the orchestrator
- Integrate with AEE — emit events for cross-team coordination

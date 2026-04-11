<!-- Last verified: 2026-04-11 by /codebase-mirror -->

# Quox Plugin SDK — Codebase Map

## Metrics
| Metric | Count |
|--------|-------|
| Packages | 3 |
| Documentation Files | 6 (core) + 7 (tutorials) |
| Test Files | 5 |
| Signing Scripts | 3 |
| Plugin Templates | 8 |
| Type Definitions | 28 |

## Authoritative Files
| File | Purpose |
|------|---------|
| `packages/quox-plugin-sdk/src/index.js` | Runtime helpers (`getSharedDeps`, `registerPlugin`) |
| `packages/quox-plugin-sdk/src/types.d.ts` | Type definitions (PluginManifest, PluginAPI, AgentDefinition, TeamDefinition, etc.) |
| `packages/quox-plugin-sdk/src/testing.js` | Test utilities (`createMockPluginApi`, `setupPluginTestEnv`, `teardownPluginTestEnv`) |
| `packages/create-quox-plugin/bin/create.js` | Scaffolder CLI (8 templates, 7 categories) |
| `packages/quox-plugin-vite/src/index.js` | Vite build plugin (externals, ZIP packaging) |

## Packages (3)
| Package | Version | Purpose | Entry Points |
|---------|---------|---------|--------------|
| `quox-plugin-sdk` | 0.1.0 | Runtime SDK (helpers, types, testing) | `./src/index.js`, `./src/testing.js`, `./src/types.d.ts` |
| `create-quox-plugin` | 0.1.0 | CLI scaffolder (`npx create-quox-plugin`) | `./bin/create.js` |
| `quox-plugin-vite` | 0.1.0 | Vite build plugin (externals, ZIP) | `./src/index.js` |

## Signing & Licensing Scripts (3)
| Script | Purpose |
|--------|---------|
| `scripts/generate-signing-key.js` | Generate Ed25519 key pair (`quox-signing.key`, `quox-signing.pub`) |
| `scripts/sign-plugin.js` | Sign `.quoxplugin` ZIP with Ed25519 (injects `signature.json`) |
| `scripts/generate-license.js` | Generate signed license JSON for paid plugins |

## Plugin Templates (8)
| Template | Category | Description | Key Features |
|----------|----------|-------------|--------------|
| `basic` | Other | Minimal sidebar plugin (hello world) | sidebar, storage, notifications |
| `monitoring-dashboard` | Monitoring | Grafana-style status dashboard | network, configSchema, nocIntegration |
| `fleet-management` | Infrastructure | Host/container management | aee, tools, safety gates, kill switch |
| `service-bridge` | Communication | Third-party service integration | specialist agent, webhooks, memory |
| `ui-feature` | Productivity | Client-side feature (Action Tracker) | storage, config, comparison tiers |
| `enterprise-extension` | AI & Intelligence | Multi-tier with backend | memory, aocl, limits, backend container |
| `specialist-agent` | AI & Intelligence | Single specialist agent | agentDefinition, agentPersona, toolDefinitions, autonomy |
| `agentic-team` | Infrastructure | Multi-agent team | team orchestrator, members, policies, shared context |

### Generated Files Per Template
| Template | Files | Notable Generated Files |
|----------|-------|------------------------|
| `basic` | ~6 | `manifest.json`, `src/index.jsx`, `src/views/MainView.jsx` |
| `monitoring-dashboard` | ~9 | `src/hooks/usePolling.js`, `src/data/mock.js`, `src/views/SettingsPanel.jsx` |
| `fleet-management` | ~10 | `src/components/ConfirmModal.jsx`, safety gates |
| `service-bridge` | ~9 | `src/components/AgentSidebar.jsx` |
| `ui-feature` | ~9 | `src/components/EmptyState.jsx` |
| `enterprise-extension` | ~12 | `backend/server.js`, `Dockerfile`, `src/components/UsageMeter.jsx`, `UpgradeGate.jsx` |
| `specialist-agent` | 14 | `src/agent/agentDef.js`, `agentPersona.js`, `tools.js`, `src/components/AgentChat.jsx` |
| `agentic-team` | 17 | `src/team/teamDef.js`, `agents.js`, `personas.js`, `policies.js`, `MemberCard.jsx`, `TaskQueue.jsx` |

## Type Definitions (28 types in `types.d.ts`)

### Core Plugin Types (7)
| Type | Purpose |
|------|---------|
| `PluginManifest` | Main plugin manifest schema (id, name, version, permissions, routes, etc.) |
| `PluginExports` | Routes, sidebar, hooks exported by plugin at runtime |
| `PluginAPI` | Runtime API (storage, config, fetch, notify, memory, aee) |
| `PluginPermission` | `sidebar | storage | network | memory | notifications | aee | tools` |
| `SharedDeps` | React, ReactDOM, ReactRouterDOM provided by QuoxCORE |
| `SidebarItem` | Sidebar entry (path, label, icon, minRole, badge) |
| `ConfigSchemaField` | Config field spec (type, label, default, premium flags) |

### Agent Types (10)
| Type | Purpose |
|------|---------|
| `AgentDefinition` | Full agent spec (role, level, domain, systemPrompt, autonomy, tools) |
| `AgentPersona` | Agent identity (voice, color, LLM config, systemPrompt) |
| `AgentAutonomy` | Schedule, budget, escalation rules, allowed triggers |
| `AgentBudget` | Tokens, tool calls, duration, daily run limits |
| `AgentEscalation` | onHighRisk, onBudgetWarning, onFailure policies |
| `AgentPersonality` | Tone, verbosity, formality, traits |
| `LlmConfig` | Provider, model, temperature, maxTokens |
| `SpecialistAgent` | Lightweight agent ref (name, description, capabilities) |
| `ToolDefinition` | Agent tool schema (name, description, input_schema) |
| `SafetyConfig` | Destructive actions, approval requirements, kill switch |

### Team Types (4)
| Type | Purpose |
|------|---------|
| `TeamDefinition` | Multi-agent team (orchestrator, members, policies, sharedContext) |
| `TeamMemberRef` | Agent ref within team (agentId, role, domains) |
| `TeamPolicies` | Budget, approval, VOLT, parallelism, channels |
| `Capabilities` | AEE intents, tool access permissions |

### NOC & Tier Types (5)
| Type | Purpose |
|------|---------|
| `NocIntegration` | NOC dashboard tab and quick actions |
| `NocQuickAction` | Quick action (id, label, icon, severity, prompt) |
| `ComparisonTier` | Free/paid/enterprise feature comparison |
| `TierLimits` | Per-tier usage limits (queries, storage, retention) |
| `Testimonial` | Marketing testimonial (quote, author, role) |

### Global Declarations (2)
| Type | Purpose |
|------|---------|
| `Window.__quoxSharedDeps` | Global shared dependencies object |
| `Window.__quoxPluginRegister` | Global plugin registration function |

## Documentation (6 core + 7 tutorials)
| File | Purpose |
|------|---------|
| `docs/getting-started.md` | Quickstart guide |
| `docs/plugin-api.md` | Full PluginAPI reference |
| `docs/backend-plugins.md` | Backend container plugins (Tier 2) |
| `docs/signing.md` | Plugin signing & licensing workflow |
| `docs/templates.md` | Template selection guide |
| `docs/claude-skill.md` | `/quox-plugin` Claude skill usage |

**Tutorials (in `docs/tutorials/`):**
- `monitoring-dashboard.md`, `fleet-management.md`, `service-bridge.md`
- `ui-feature.md`, `enterprise-extension.md`, `specialist-agent.md`, `agentic-team.md`

## Test Files (5)
| File | Coverage |
|------|----------|
| `packages/quox-plugin-sdk/src/__tests__/index.test.js` | `getSharedDeps`, `registerPlugin` |
| `packages/quox-plugin-sdk/src/__tests__/testing.test.js` | Mock API, test env setup |
| `packages/quox-plugin-vite/src/__tests__/index.test.js` | Vite plugin config, externals |
| `packages/create-quox-plugin/__tests__/create.test.js` | Scaffolder templates (all 8) |
| `scripts/__tests__/sign-plugin.test.js` | `canonicalSort`, `computeDigest`, Ed25519 signing |

## Runtime Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│  Developer                                                          │
│  npx create-quox-plugin my-plugin --template specialist-agent      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  create-quox-plugin (scaffolder)                                    │
│  Generates: manifest.json, src/index.jsx, vite.config.js, etc.     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  vite build (with quox-plugin-vite)                                 │
│  → Externalizes React/ReactDOM/ReactRouterDOM                       │
│  → Outputs dist/plugin.esm.js + plugin.css                          │
│  → Packages into my-plugin.quoxplugin ZIP                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  sign-plugin.js                                                     │
│  → Signs manifest with Ed25519 key                                  │
│  → Injects signature.json into ZIP                                  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  QuoxCORE (dashboard)                                               │
│  → Verifies signature against trusted keys                          │
│  → Loads plugin.esm.js with shared deps                             │
│  → Registers routes, sidebar, agents                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Exports

### quox-plugin-sdk
```js
// Runtime helpers
import { getSharedDeps, registerPlugin } from 'quox-plugin-sdk';

// Testing utilities
import {
  createMockPluginApi,
  setupPluginTestEnv,
  teardownPluginTestEnv
} from 'quox-plugin-sdk/testing';

// Types (TypeScript)
import type { PluginManifest, PluginAPI, AgentDefinition } from 'quox-plugin-sdk/types';
```

### quox-plugin-vite
```js
import quoxPluginVite from 'quox-plugin-vite';

// vite.config.js
export default defineConfig({
  plugins: [quoxPluginVite({ pluginId: 'my-plugin' })]
});
```

## Plugin Package Format
```
my-plugin.quoxplugin (ZIP)
├── manifest.json       # Plugin metadata, permissions, routes
├── plugin.esm.js       # Compiled ESM bundle (React externalised)
├── plugin.css          # Optional scoped styles
├── assets/             # Optional static assets
└── signature.json      # Optional Ed25519 signature
```

## Size Limits
| Limit | Value |
|-------|-------|
| Plugin bundle (`plugin.esm.js`) | 100KB max |
| Total `.quoxplugin` package | 5MB max |
| Plugin ID length | 3-64 chars |
| Route namespace | `/plugins/{pluginId}/` |

## Categories (7)
- Monitoring
- Productivity
- Communication
- AI & Intelligence
- Infrastructure
- Compliance & Audit
- Other

## Invariants
| Check | Status | Details |
|-------|--------|---------|
| package-workspaces | ✓ pass | 3 packages (sdk, create, vite) |
| type-coverage | ✓ pass | 28 types in types.d.ts |
| signing-scripts | ✓ pass | 3 scripts (keygen, sign, license) |
| test-coverage | ✓ pass | 5 test files |
| template-count | ✓ pass | 8 templates |
| tutorial-count | ✓ pass | 7 tutorials |

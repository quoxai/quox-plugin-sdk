<!-- Last verified: 2026-03-27 by /codebase-mirror -->

# Quox Plugin SDK — Codebase Map

## Metrics
| Metric | Count |
|--------|-------|
| Workspace Packages | 3 |
| Documentation Files | 6 guides + 8 tutorials |
| Test Files | 0 |

## Packages (3)

### quox-plugin-sdk (Runtime)
| File | Purpose |
|------|---------|
| `src/index.js` | `getSharedDeps()`, `registerPlugin()` |
| `src/types.d.ts` | PluginManifest, PluginExports, PluginAPI, AgentDefinition, TeamDefinition, SafetyConfig (286 lines) |
| `src/testing.js` | `createMockPluginApi()`, `setupPluginTestEnv()`, `teardownPluginTestEnv()` |

### create-quox-plugin (Scaffolder CLI)
| File | Purpose |
|------|---------|
| `bin/create.js` | Interactive scaffolder with templates, categories, prompts |

### quox-plugin-vite (Build Plugin)
| File | Purpose |
|------|---------|
| `src/index.js` | Vite plugin: externals, ZIP packaging to `.quoxplugin` |

## Type System Highlights
- Plugin permissions: sidebar, storage, network, memory, notifications, aee, tools
- Agent types: AgentDefinition, SpecialistAgent, AgentPersonality, AgentBudget, AgentEscalation, AgentAutonomy
- Safety config: destructiveActions, requiresApproval, aeeRequired, killSwitchEnabled
- Tier/licensing: ComparisonTier, TierLimits, Capabilities

## Documentation
| File | Topic |
|------|-------|
| `docs/getting-started.md` | Plugin development walkthrough |
| `docs/backend-plugins.md` | Backend integration guide |
| `docs/plugin-api.md` | Complete API reference |
| `docs/claude-skill.md` | Claude skill integration |
| `docs/signing.md` | Plugin signing/publishing |
| `docs/templates.md` | Template variations |
| 8 tutorials | UI features, service bridges, enterprise, monitoring, fleet, agentic teams, specialist agents |

## Invariants
| Check | Status | Details |
|-------|--------|---------|
| package-workspaces | ✓ pass | 3 packages in workspaces |
| type-coverage | ✓ pass | PluginManifest, PluginAPI, PluginExports all defined |
| test-coverage | ⚠ warn | No test files found in repo |

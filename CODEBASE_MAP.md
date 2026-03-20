<!-- Last verified: 2026-03-20 -->

# Quox Plugin SDK — Codebase Map

## Metrics
| Metric | Count |
|--------|-------|
| Packages | 3 |
| Source Files | 5 |
| Doc Files | 8 |
| Test Files | 4 |
| Tutorial Files | 5 |
| Scripts (signing/licensing) | 3 |
| Templates | 6 |

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| quox-plugin-sdk | packages/quox-plugin-sdk/ | Runtime helpers + types + testing utils |
| create-quox-plugin | packages/create-quox-plugin/ | Interactive CLI scaffolder (6 templates) |
| quox-plugin-vite | packages/quox-plugin-vite/ | Vite build plugin + .quoxplugin ZIP |

## Authoritative Files
| File | Purpose |
|------|---------|
| packages/quox-plugin-sdk/src/types.d.ts | All type definitions (manifest, config, safety, NOC, agent, tiers) |
| packages/quox-plugin-sdk/src/index.js | getSharedDeps(), registerPlugin() runtime |
| packages/quox-plugin-sdk/src/testing.js | createMockPluginApi(), setupPluginTestEnv(), teardownPluginTestEnv() |
| packages/create-quox-plugin/bin/create.js | Scaffolder — 6 templates with full file generation |
| packages/quox-plugin-vite/src/index.js | Vite plugin — externals, globals rewrite, ZIP packaging |

## SDK Exports
| Export Path | Contents |
|-------------|----------|
| `quox-plugin-sdk` | getSharedDeps(), registerPlugin() |
| `quox-plugin-sdk/testing` | createMockPluginApi(), setupPluginTestEnv(), teardownPluginTestEnv() |
| `quox-plugin-sdk/types` | TypeScript definitions |

## Type Definitions
| Type | Fields |
|------|--------|
| PluginManifest | id, name, version, author, description, category, license, permissions, sidebar, routes, minQuoxVersion, backend, configSchema, safety, nocIntegration, specialist, comparison, limits, capabilities, heroGradient, accentColor, badge, testimonials, marketingPoints |
| ConfigSchemaField | type, label, description, default, options, premium, enterprise |
| SafetyConfig | destructiveActions, requiresApproval, aeeRequired, killSwitchEnabled |
| NocQuickAction | id, label, icon, description, severity, prompt |
| NocIntegration | tab (label, icon), quickActions[] |
| SpecialistAgent | name, description, capabilities[] |
| ComparisonTier | Record<string, Record<string, string\|boolean\|number>> |
| TierLimits | Record<string, Record<string, any>> |
| Capabilities | aeeIntents[], toolAccess? |
| PluginPermission | sidebar, storage, network, memory, notifications, aee, tools |
| SidebarItem | path, label, icon, minRole?, badge? |
| PluginExports | routes, sidebar, hooks (onActivate, onDeactivate) |
| PluginAPI | pluginId, storage, config, fetch, notify, memory, aee |

## Scaffolder Templates
| Template | Permissions | Key Features |
|----------|-------------|-------------|
| basic | sidebar, storage, notifications | Minimal hello world |
| monitoring-dashboard | + network | Vault config, NOC quick actions, polling, status badges |
| fleet-management | + network, aee, tools | Safety gates, AEE audit, agent tools, kill switch |
| service-bridge | + network, aee, tools, memory | OAuth, specialist agent, tiered features, marketing |
| ui-feature | sidebar, storage, notifications | Plugin storage, config panel, empty state |
| enterprise-extension | + network, memory, aee | Memory API, AOCL, Docker backend, usage meters, upgrade gates |

## Scripts
| Script | Purpose |
|--------|---------|
| scripts/generate-signing-key.js | Ed25519 key pair generation |
| scripts/sign-plugin.js | Sign .quoxplugin ZIP with signature.json |
| scripts/generate-license.js | Generate QXP license keys for paid plugins |

## Tests
| File | Coverage |
|------|----------|
| packages/quox-plugin-sdk/src/__tests__/index.test.js | getSharedDeps, registerPlugin |
| packages/quox-plugin-sdk/src/__tests__/testing.test.js | createMockPluginApi, setup/teardown |
| packages/quox-plugin-vite/src/__tests__/index.test.js | Vite config, externals, resolveId |
| packages/create-quox-plugin/__tests__/create.test.js | All 6 templates: files + manifest fields |

## Claude Skill
| Mode | Purpose |
|------|---------|
| scaffold | Guide template selection and scaffolding |
| manifest | Help edit manifest fields |
| debug | Diagnose common issues |
| extend | Add capabilities to existing plugin |
| review | Audit plugin for completeness |

## Documentation
| File | Topic |
|------|-------|
| README.md | Overview, quick start, manifest ref, security |
| docs/getting-started.md | First plugin tutorial |
| docs/templates.md | Template comparison and features matrix |
| docs/plugin-api.md | Full API reference |
| docs/backend-plugins.md | Tier 2 Docker guide |
| docs/signing.md | Ed25519 signing + licensing |
| docs/claude-skill.md | Claude skill installation and usage |
| docs/tutorials/*.md | 5 per-template end-to-end tutorials |
| CONTRIBUTING.md | Dev setup, adding templates, PR guidelines |

## Invariants
| Check | Status |
|-------|--------|
| Permission docs coverage | pass |
| All 6 templates scaffold correctly | pass |
| Referenced scripts exist | pass |
| Test coverage | pass (4 test files) |
| adm-zip in root devDependencies | pass |

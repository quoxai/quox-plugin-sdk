<!-- Last verified: 2026-04-07 by /codebase-mirror -->

# Quox Plugin SDK — Codebase Map

## Metrics
| Metric | Count |
|--------|-------|
| Packages | 3 |
| Documentation Files | 12 |
| Test Files | 5 |

## Authoritative Files
| File | Purpose |
|------|---------|
| `packages/quox-plugin-sdk/src/index.js` | Runtime helpers (getSharedDeps, registerPlugin) |
| `packages/quox-plugin-sdk/src/types.d.ts` | Type definitions (PluginManifest, PluginAPI, PluginExports) |
| `packages/quox-plugin-sdk/src/testing.js` | Test utilities (createMockPluginApi, setupPluginTestEnv) |
| `packages/create-quox-plugin/bin/create.js` | Scaffolder CLI (templates, categories) |
| `packages/quox-plugin-vite/src/index.js` | Vite build plugin (externals, ZIP packaging) |

## Invariants
| Check | Status | Details |
|-------|--------|---------|
| package-workspaces | ✓ pass | 3 packages (sdk, create, vite) |
| type-coverage | ✓ pass | 26 types in types.d.ts |
| signing-scripts | ✓ pass | 3 scripts |
| test-coverage | ✓ pass | 5 test files |

## Packages (3)
| Package | Purpose |
|---------|---------|
| quox-plugin-sdk | Runtime SDK (helpers, types, testing) |
| create-quox-plugin | CLI scaffolder (8 templates, 7 categories) |
| quox-plugin-vite | Vite build plugin (externals, ZIP) |

## Documentation (12)
getting-started, plugin-api, backend-plugins, signing, templates, claude-skill, + 6 tutorials (ui-feature, service-bridge, enterprise-extension, monitoring-dashboard, fleet-management, agentic-team, specialist-agent)

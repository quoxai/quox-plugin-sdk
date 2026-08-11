# CODEBASE_MAP.md — quox-plugin-sdk

<!-- Last verified: 2026-08-11 by /codebase-mirror -->

> Auto-generated structural map of the QuoxCORE Plugin SDK monorepo.

## Overview

The QuoxCORE Plugin SDK is a **npm workspace monorepo** containing tools for building, testing, signing, and distributing third-party plugins for the QuoxCORE platform.

```
quox-plugin-sdk/
├── packages/
│   ├── create-quox-plugin/    # Interactive scaffolder (npx create-quox-plugin)
│   ├── quox-plugin-sdk/       # Runtime helpers, types, testing utilities
│   ├── quox-plugin-vite/      # Vite build plugin for .quoxplugin output
│   └── eslint-plugin-quox-plugin/  # ESLint rules for plugin authors
├── scripts/                   # Signing and licensing utilities
├── docs/                      # Documentation and tutorials
└── .claude/                   # Claude Code skill for AI-assisted dev
```

All packages are version 0.1.0. Root scripts: `npm run build` (all workspaces), `npm test` (vitest run, whole repo).

## Metrics

| Metric | Count |
|--------|-------|
| Packages | 4 |
| Templates | 8 |
| Test Files | 10 |
| Docs | 16 (8 guides + 8 tutorials) |
| Scripts | 3 |
| ESLint Rules | 1 |

---

## Package: create-quox-plugin

**Purpose:** Interactive scaffolder for new plugins. Run `npx create-quox-plugin my-plugin`.

| File | Description |
|------|-------------|
| `bin/create.js` | CLI entry point (1142 lines). Parses args, prompts for template/metadata, writes project files. Supports `--from-mcp` and `--from-mcp-json` for MCP server migration. |
| `lib/mcp-introspect.js` | MCP server introspection (206 lines). Spawns stdio server, runs initialize handshake, calls tools/list. Also provides `loadMcpToolsFromJsonFile()` for offline mode. |
| `scripts/scaffold-snapshot.mjs` | Scaffold snapshot helper for tests. |
| `templates/` | Template source files (JSX, configs) for each plugin archetype. |
| `__tests__/create.test.js` | Scaffolder tests |
| `__tests__/mcp-migration.test.js` | MCP migration mode tests (uses `__tests__/fixtures/fake-mcp-server.js`) |

### Templates (8 total)

| Template | Description | Key Features |
|----------|-------------|--------------|
| `basic` | Minimal hello-world | Sidebar entry only |
| `monitoring-dashboard` | Grafana-style polling | configSchema, nocIntegration, usePolling hook |
| `fleet-management` | Host/container management | safety gates, AEE audit, ConfirmModal |
| `service-bridge` | Third-party integration | OAuth, specialist agent, AgentSidebar |
| `ui-feature` | Client-side productivity | storage, EmptyState, tier comparison |
| `enterprise-extension` | Multi-tier with backend | memory, AOCL, Dockerfile, UsageMeter, UpgradeGate |
| `specialist-agent` | Single specialist agent | agentDefinition, agentPersona, 3 tools, AgentChat, autonomy |
| `agentic-team` | Multi-agent team | teamDef, 4 agents, 8 tools, policies, TaskQueue, SharedContextPanel |

### Template Directory Structure

```
templates/
├── _shared/             # Common files: index.jsx, vite.config.js, .gitignore
├── basic/src/views/
├── monitoring-dashboard/src/{views,hooks,data}/
├── fleet-management/src/{views,components,data}/
├── service-bridge/src/{views,components,data}/
├── ui-feature/src/{views,components,data}/
├── enterprise-extension/src/{views,components,data}/ + backend/ + Dockerfile
├── specialist-agent/src/{views,components,agent,data}/
└── agentic-team/src/{views,components,team,data}/
```

### MCP Migration Mode

The scaffolder supports converting MCP servers into Quox plugins:

```bash
# Live introspection
npx create-quox-plugin my-plugin --from-mcp "npx -y @example/mcp-server"

# Offline from saved tools/list JSON
npx create-quox-plugin my-plugin --from-mcp-json tools-list.json
```

Key functions in `create.js`:
- `resolveMcpToolNameCollisions()` — handles normalized name collisions (e.g. `a.b` and `a-b` both become `a_b`)
- `buildMcpToolDefinitions()` — converts MCP tool schemas to Claude tool_use format
- `generateMcpToolsDataModule()` — generates `src/data/mcp-tools.js`

---

## Package: quox-plugin-sdk

**Purpose:** Core runtime helpers, TypeScript types, and testing utilities.

| File | Description |
|------|-------------|
| `src/index.js` | Runtime exports (37 lines): `getSharedDeps()`, `registerPlugin()`, `getGlassComponents()` |
| `src/types.d.ts` | Full TypeScript definitions (587 lines): Manifest, PluginAPI, Agent types, Team types, Glass components |
| `src/testing.js` | Test harness (145 lines): `createMockPluginApi()`, `setupPluginTestEnv()`, `teardownPluginTestEnv()`, `setupGlassMocks()` |
| `src/__tests__/index.test.js` | Runtime helper tests |
| `src/__tests__/testing.test.js` | Testing utility tests |

### Exported Functions

```js
// Runtime helpers (index.js)
getSharedDeps()       // → { React, ReactDOM, ReactRouterDOM }
registerPlugin(id, exports)
getGlassComponents()  // → { AgentChatSidebar, GlassPanel, GlassPill, ... }

// Testing utilities (testing.js)
createMockPluginApi(pluginId)   // Mock PluginAPI with in-memory storage
setupPluginTestEnv()            // Install window.__quoxSharedDeps mocks
teardownPluginTestEnv()
setupGlassMocks()               // Mock @quox/glass components
```

### Key Types (types.d.ts)

| Type | Purpose |
|------|---------|
| `PluginManifest` | manifest.json schema (35 fields) |
| `PluginAPI` | Runtime API: cache, durable, secrets, config, fetch, notify, memory, aee, navigate, getUser, chat |
| `PluginExports` | { routes, sidebar, hooks } — hooks incl. onActivate/onDeactivate + PD-5 install lifecycle (onInstall/onUpgrade/onUninstall, onRestore reserved) |
| `PluginPermission` | 9 values: sidebar, storage, durable, secrets, network, memory, notifications, aee, tools |
| `AgentDefinition` | Full agent spec: role, autonomy, tools, defconLevel |
| `AgentPersona` | UI persona: color, voice, LLM config |
| `TeamDefinition` | Multi-agent team: members, policies, sharedContext |
| `ToolDefinition` | Claude tool_use format |
| `SafetyConfig` | destructiveActions, requiresApproval, killSwitchEnabled |
| `QuoxGlassComponents` | Full interface for window.__quoxGlass |

### PluginAPI Persistence Model

```
api.cache    — browser-only, ephemeral (localStorage). Use for UI state only.
api.storage  — DEPRECATED alias of api.cache (removed in a future minor).
api.durable  — server-backed, org/user scoped. Survives browser resets.
api.secrets  — encrypted at rest server-side. Audit-logged reads.
api.memory   — long-form facts/observations into QuoxCORE memory service.
```

---

## Package: quox-plugin-vite

**Purpose:** Vite build plugin. Externalizes shared deps, outputs `.quoxplugin` ZIP.

| File | Description |
|------|-------------|
| `src/index.js` | Main Vite plugin (496 lines). Build config, import rewriting, dev host injection, ZIP packaging. |
| `src/dev-host/client.js` | Dev preview harness (448 lines). Mounts frame chrome, provides mock `__quoxGlass`, `__quoxPluginApi`. |
| `src/dev-host/frame-model.js` | Pure model builder (62 lines). Parses manifest + registered exports into frame model. |
| `src/dev-host/dev-host.css` | Glass design system CSS tokens for dev preview. |
| `assets/qx-components.css` | Vendored glass component styles. |
| `scripts/sync-glass-css.mjs` | Syncs CSS from quox-dashboard. |
| `src/__tests__/*.test.js` | Tests for index, dev-host, frame-model, external-globals |

### Build Pipeline

1. **config hook:** Sets rollup externals, proxy to live QuoxCORE, port 5174 default
2. **resolveId hook:** Externalizes `react`, `react-dom`, `react-router-dom`, `@quox/glass` at build time
3. **renderChunk hook:** Rewrites `import ... from "react"` → `const React = window.__quoxSharedDeps.React;`
4. **closeBundle hook:** Packages `dist/` + `manifest.json` → `{pluginId}.quoxplugin` ZIP

### External Globals Map

```js
'react'              → window.__quoxSharedDeps.React
'react/jsx-runtime'  → window.__quoxSharedDeps.ReactJSXRuntime
'react/jsx-dev-runtime' → window.__quoxSharedDeps.ReactJSXRuntime
'react-dom'          → window.__quoxSharedDeps.ReactDOM
'react-dom/client'   → window.__quoxSharedDeps.ReactDOM
'react-router-dom'   → window.__quoxSharedDeps.ReactRouterDOM
'@quox/glass'        → window.__quoxGlass
```

### Dev Host Features

- Injects `<link>` and `<script>` tags for dev-host chrome (CSS, manifest, client)
- Serves default `index.html` for scaffolds without one
- Virtual module `virtual:quox-dev-host` bootstraps deps from plugin project
- Mounts rail navigation, header, route switching
- Provides mock glass components: `AgentChatSidebar`, `AgentChatPanel`, `GlassPanel`, `GlassPill`, `GlassTabBar`, `SectionHeader`, `ProgressRing`, `Sparkline`, `GlassSkeleton`, `GlassError`, `MarkdownContent`
- Mock `pluginApi` with in-memory cache/durable/secrets (resets on reload — UI wiring only, not persistence)
- Injects the parsed manifest as dev-only `window.__quoxDevManifest`
- Hash-router shim for plugins without react-router-dom
- Escape hatch: `?bare=1` (or `devHost: false`) skips dev host entirely

---

## Package: eslint-plugin-quox-plugin

**Purpose:** ESLint rules to catch common plugin mistakes at build time.

| File | Description |
|------|-------------|
| `src/index.js` | Plugin entry (28 lines). Exports rules and recommended config. |
| `src/rules/no-cache-as-primary-storage.js` | Rule implementation (85 lines). Lexical member-expression text match. |
| `src/__tests__/no-cache-as-primary-storage.test.js` | Rule tests (vitest, converted from node:test) |

### Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `no-cache-as-primary-storage` | warn | Flags `api.cache.set` when `api.durable`/`api.memory` never used in same module. |

Also flags `api.storage.set` with a deprecation warning (use `api.cache` or `api.durable`).

---

## Scripts (root /scripts)

| Script | Purpose |
|--------|---------|
| `generate-signing-key.js` | Generate Ed25519 keypair for plugin signing (46 lines) |
| `sign-plugin.js` | Sign a `.quoxplugin` with private key, injects `signature.json` (138 lines) |
| `generate-license.js` | Generate license key for paid plugins (104 lines) |
| `__tests__/sign-plugin.test.js` | Signing flow tests |

### Signing Flow

1. `generate-signing-key.js` → `quox-signing.key` (private, mode 0600) + `quox-signing.pub` (public)
2. `sign-plugin.js --plugin x.quoxplugin --key quox-signing.key`
   - Extracts `manifest.json` from ZIP
   - Computes SHA-256 digest of canonical JSON (sorted keys, no existing signature)
   - Signs digest with Ed25519
   - Injects `signature.json` into ZIP with: keyId, digest, signature, algorithm, timestamp, pluginId, pluginVersion

---

## Docs

| File | Description |
|------|-------------|
| `getting-started.md` | Step-by-step first plugin guide |
| `templates.md` | All 8 templates compared with feature matrix |
| `plugin-api.md` | Full PluginAPI reference (persistence model, glass library, file storage FU-1, agent registration) |
| `backend-plugins.md` | Docker backend service integration |
| `signing.md` | Ed25519 signatures and verification |
| `claude-skill.md` | AI-assisted plugin development |
| `suggested-rules.md` | Pattern: ship suggested rules with plugins/skills |
| `plan-sdk-dx.md` | Internal DX improvement plan |

### Tutorials (docs/tutorials/)

| File | Template |
|------|----------|
| `agentic-team.md` | Multi-agent team walkthrough |
| `convert-mcp-server.md` | MCP to Quox plugin migration guide |
| `enterprise-extension.md` | Multi-tier enterprise plugin |
| `fleet-management.md` | Host/container management |
| `monitoring-dashboard.md` | Polling-based monitoring |
| `service-bridge.md` | Third-party service integration |
| `specialist-agent.md` | Single agent with tools |
| `ui-feature.md` | Client-side productivity features |

---

## Claude Skill (.claude/skills/quox-plugin/)

| File | Description |
|------|-------------|
| `SKILL.md` | Full skill definition (182 lines). 5 modes: scaffold, manifest, debug, extend, review. Points to canonical `quoxpert-plugin-sdk` skill. |

**Modes:**
- `scaffold` — Template selection guidance
- `manifest` — Manifest editing with field reference
- `debug` — Common issues and fixes (dark theme, permissions, build failures)
- `extend` — Adding capabilities (views, backend, tools, AEE, memory, settings)
- `review` — Plugin audit checklist

---

## Key Entry Points

| Action | Command / Path |
|--------|----------------|
| Scaffold new plugin | `npx create-quox-plugin my-plugin` |
| Scaffold from MCP | `npx create-quox-plugin my-plugin --from-mcp "command"` |
| Dev server | `npm run dev` (in plugin project, port 5174) |
| Build plugin | `npm run build` → `{id}.quoxplugin` |
| Run SDK tests | `npm test` (root) |
| Sign plugin | `node scripts/sign-plugin.js --plugin X --key Y` |
| Generate keys | `node scripts/generate-signing-key.js` |

---

## Dependencies

| Package | Role |
|---------|------|
| `vite` (peer) | Build system for quox-plugin-vite |
| `eslint` (peer) | ESLint for eslint-plugin-quox-plugin |
| `adm-zip` (dev) | ZIP creation for .quoxplugin packaging |
| `vitest` (dev) | Test runner |
| `jsdom` (dev) | DOM environment for tests |

---

## Related Repos

| Repo | Relationship |
|------|--------------|
| `quox-dashboard` | Host platform. Runs plugins via `thirdPartyPluginHost.js`. |
| `@quox/glass` | Component library exposed as `window.__quoxGlass`. |
| `quoxflow` | Workflow engine for agent autonomy. |
| `quoxmcp` | MCP server for Claude Code integration. |

---

## Testing

```bash
# Run all SDK tests (vitest, from repo root)
npm test

# Tests cover:
# - packages/quox-plugin-sdk: runtime helpers, testing utilities (2 files)
# - packages/eslint-plugin-quox-plugin: rule detection (1 file)
# - packages/quox-plugin-vite: config generation, import rewriting, dev host (4 files)
# - packages/create-quox-plugin: scaffolder output, MCP migration (2 files)
# - scripts: signing flow (1 file)
```

---

## Architecture Notes

### Plugin Activation Flow

1. QuoxCORE loads plugin.esm.js via blob URL `<script type="module">`
2. Plugin entry calls `window.__quoxPluginRegister(pluginId, exports)`
3. Host activates routes, sidebar entries, and lifecycle hooks
4. Plugin accesses host APIs via `window.__quoxPluginApi[pluginId]`

### Host-Provided Globals

```js
window.__quoxSharedDeps     // { React, ReactDOM, ReactRouterDOM, ReactJSXRuntime }
window.__quoxGlass          // Glass component library
window.__quoxPluginApi      // PluginAPI instances keyed by pluginId
window.__quoxPluginRegister // Registration function
window.__quoxDevManifest    // Dev-only: parsed manifest.json (never set in production)
```

### Dev Host Virtual Module

The dev host uses a virtual module (`virtual:quox-dev-host`) to resolve React/ReactDOM from the plugin project's node_modules rather than the SDK repo. This prevents duplicate React instances and hook failures.

---

## Invariants

| Check | Status | Details |
|-------|--------|---------|
| Package count matches workspaces | ✓ pass | 4 packages in packages/, workspaces glob `packages/*` |
| All templates have MainView | ✓ pass | 8/8 templates have src/views/MainView.jsx |
| Signing/licensing scripts exist | ✓ pass | 3 scripts in scripts/, all referenced by docs/signing.md |
| Test coverage | ✓ pass | 10 test files across packages + scripts |
| Templates per docs | ✓ pass | 8 templates, 8 matching tutorials in docs/tutorials/ |
| Permissions documented | ⚠ warn | 7/9 PluginPermission values covered in docs/plugin-api.md; `sidebar` and `tools` have no explicit "Requires" section (`storage` covered as deprecated alias of `cache`) |

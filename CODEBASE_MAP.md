# CODEBASE_MAP.md — quox-plugin-sdk

<!-- Last verified: 2026-10-13 by /codebase-mirror -->

> Auto-generated structural map of the QuoxCORE Plugin SDK monorepo.

## Overview

An **npm workspace monorepo** with tools for building, previewing, testing, signing, and distributing sandboxed third-party plugins (`.quoxplugin`) for QuoxCORE, plus the canonical QuoxGlyph terminal renderer. Community plugins run in an opaque-origin iframe whose only host surface is `window.quox` (postMessage RPC), the shared React deps, and `window.__quoxPluginRegister`; everything in this repo exists to build for, simulate, or lint against that sandbox contract.

```
quox-plugin-sdk/
├── packages/
│   ├── create-quox-plugin/         # Interactive scaffolder (npx create-quox-plugin), 8 templates
│   ├── quox-plugin-sdk/            # Runtime helpers, types, testing mocks, AWARE telemetry
│   ├── quox-plugin-vite/           # Vite build plugin + quox-plugin CLI + sandbox dev preview
│   ├── eslint-plugin-quox-plugin/  # ESLint rules for plugin authors
│   └── quox-glyph/                 # @quox/glyph, QuoxGlyph terminal output renderer (private)
├── scripts/                        # check-pack + deprecated legacy signing/licensing
├── docs/                           # 10 guides + 8 tutorials
└── .claude/skills/quox-plugin/     # Claude skill for AI-assisted plugin dev
```

Root scripts: `npm run build` (all workspaces), `npm test` (vitest + node:test for glyph), `npm run check:pack` (publish allowlist audit).

## Metrics

| Metric | Count |
|--------|-------|
| Packages | 5 (4 publishable at 0.2.0, @quox/glyph private at 0.1.0) |
| Scaffold templates | 8 (+ `_shared`) |
| Test files | 18 (~270 test cases) |
| Docs | 18 (10 guides + 8 tutorials) |
| Root scripts | 4 (1 active, 3 deprecated) |
| ESLint rules | 2 |
| window.quox RPC methods | 13 (3 of them `not_available` stubs) |
| Manifest permissions gating RPC | 5 (storage, network, memory, aee, notifications) |

---

## Package: quox-plugin-sdk (runtime)

`packages/quox-plugin-sdk/` — ESM, exports `.`, `./testing`, `./aware`, `./types`.

**`src/index.js`** (main entry): wraps the sandbox host surface.
- `getQuox()` / `usePluginApi()` — return `window.quox`, throw with guidance outside a host
- `getSharedDeps()` — `window.__quoxSharedDeps` (React, ReactDOM, ReactRouterDOM, ReactJSXRuntime)
- `registerPlugin(pluginId, {routes, sidebar})` — calls `window.__quoxPluginRegister`
- `validateManifestId()`, `MANIFEST_ID_PATTERN` (3-64 chars kebab), `RESERVED_ID_PREFIXES` (`core-`, `system-`, `quox-`, `admin-`)
- `COMMUNITY_PERMISSION_FOR_METHOD` — the fail-closed permission map (storage.* → storage, fetch → network, memory.* → memory, aee.emit → aee, notify → notifications; navigate/getUser/onEvent need none)
- `NOT_AVAILABLE_METHODS` — memory.save, memory.search, aee.emit reject `not_available` after the permission gate (no collector route yet)
- `getGlassComponents()` — removed, now throws (no host CSS/components in the sandbox)

**`src/testing.js`**: in-memory mock of the whole sandbox for unit tests. `createMockQuox()`, `installMockQuox()` / `uninstallMockQuox()`, `setupPluginTestEnv()` / `teardownPluginTestEnv()`, `setupGlassMocks()`.

**`src/aware.js`**: AWARE presence/telemetry client (collector-side, not sandbox). `createAware({feed, orgId, collectorUrl, serviceKey})`, `validateEvent()`, `startHeartbeat()` with backoff. Constants: 5 `LEDGERS` (vital, operational, intentional, social, security), 5 `KINDS` (state, delta, ask, heartbeat, retract).

**`src/types.d.ts`** (385 lines): the contract. `PluginManifest`, `PluginPermission`, `QuoxPluginApi` (see below), `SharedDeps`, `PluginExports`, `SidebarItem`, plus agent/team shapes (`AgentDefinition`, `AgentPersona`, `ToolDefinition`, `TeamDefinition`, `TeamPolicies`), `NocIntegration`, `SafetyConfig`, `ConfigSchemaField`, marketplace shapes (`Capabilities`, `ComparisonTier`, `TierLimits`, `Testimonial`).

**`window.quox` API** (`QuoxPluginApi`):
| Method | Permission | Notes |
|--------|-----------|-------|
| `storage.get/set/remove/keys/getAll` | storage | server-backed KV scoped to plugin |
| `fetch(path, opts)` | network | relative to `/collector/api/v1/plugins/<id>/`; absolute URLs and `..` refused; resolves `{status, ok, body}` even on non-2xx |
| `memory.save/search` | memory | rejects `not_available: memory` |
| `aee.emit` | aee | rejects `not_available: aee` |
| `notify(message, type)` | notifications | |
| `navigate(path)` | none | host shell navigation |
| `getUser()` | none | `{userId, orgId, role, tier}` |
| `onEvent(fn)` | none | host events (e.g. `route`), synchronous |

---

## Package: quox-plugin-vite (build + CLI + dev preview)

`packages/quox-plugin-vite/` — CJS. Main `src/index.js`, bin `quox-plugin`.

**`src/index.js`** (the Vite plugin, `quoxPluginVite(options)`):
- Externalises react, react/jsx-runtime(+dev), react-dom(+client), react-router-dom, @quox/glass and rewrites their imports to `window.__quoxSharedDeps.*` globals via `renderChunk` (rollup `output.globals` is ignored for ESM)
- Emits `dist/plugin.esm.js` + `dist/plugin.css` (no `build.lib`, so dynamic imports can code-split into `dist/assets/`)
- Prepends vendored `assets/qx-components.css` into plugin.css (`qxCss: false` to opt out)
- Pins `process.env.NODE_ENV` to production at build time
- Default dev proxies `/collector` and `/api` → `quoxCoreUrl` (or `QUOX_CORE_URL`, default `https://localhost:3000`), default port 5174, both yielding to user config
- `closeBundle` packages manifest + bundle + css + assets into `<pluginId>.quoxplugin` ZIP (adm-zip)
- `configureServer` attaches the sandbox dev preview (`devHost: false` disables)

**`bin/quox-plugin.js` → `src/cli/main.js`** — CLI commands:
| Command | Does |
|---------|------|
| `quox-plugin validate [--dir .]` | `src/cli/validate.js`: manifest rules mirroring the host (id/semver/reserved prefixes, 5MB host body limit) plus bundle scan for sandbox violations (raw fetch/XHR/WebSocket/EventSource/sendBeacon, `__quoxGlass`, the 6 throwing stub deps) and permission/declaration checks |
| `quox-plugin keygen --out <dir>` | `src/cli/signing.js`: Ed25519 keypair, prints the `quox plugin trusted-keys add` line |
| `quox-plugin sign --key <pem>` | signs `dist/plugin.esm.js` (sha256), writes `dist/signature.json` |

**`src/dev-host/`** (sandbox dev preview, attached under the Vite dev server):
- `server.js` — runs a nested production-mode watch build into a temp dir and inlines the result into the frame (the sandbox CSP cannot load URLs). Routes:
  - `GET /` — preview parent page
  - `GET /__quox-dev/parent.js` — parent client
  - `GET /__quox-dev/meta.json` — plugin meta + CSP
  - `GET /__quox-dev/events` — SSE reload channel
  - `GET /__quox-dev/frame?channel=<hex32>` — sandbox iframe srcdoc
  - `POST /__quox-dev/rpc` — window.quox RPC (same-origin only)
- `rpc.js` — in-memory `window.quox` mock enforcing the same permission map and `not_available` set as the host; `fetch` forwards to `devBackendUrl` / `QUOX_DEV_BACKEND_URL` (404 when unset) with host path confinement copied
- `frame.js` / `frame-deps.js` — frame srcdoc with production CSP (`default-src 'none'`), inlined deps
- `page.js` / `parent-client.js` — parent shell and postMessage bridge

---

## Package: create-quox-plugin (scaffolder)

`packages/create-quox-plugin/` — bin `create-quox-plugin` (`bin/create.js`, 1231 lines).

**Flags:** `--template <name>`, `--from-mcp "<stdio cmd>"` (live MCP initialize + tools/list → specialist-agent plugin wired with those tools), `--from-mcp-json <file>` (offline variant), `--local-sdk <checkout>` (file: deps for monorepo dev), `--no-skill`, `--non-interactive`.

**Templates** (`templates/<name>/`, interpolated by literal `${var}` substitution, no eval):
| Template | Pattern | Notable manifest extras |
|----------|---------|------------------------|
| basic | minimal sidebar hello world | no network |
| monitoring-dashboard | poll a service (Grafana pattern) | network, configSchema, nocIntegration + quickActions |
| fleet-management | hosts with safety gates (Docker Fleet) | network+tools, safety (approvals, kill switch), aeeIntents |
| service-bridge | 3rd-party service + specialist (GitHub) | network+tools, specialist block |
| ui-feature | client-side feature w/ storage+config | storage-centric |
| enterprise-extension | multi-tier + Dockerised backend | tiers/usage meters; `backend/server.js` (express: GET /health, GET /usage) + Dockerfile |
| specialist-agent | agent w/ tools, persona, autonomy, chat | agent definition (`src/agent/`) |
| agentic-team | multi-agent team + policies (DevOps) | team definition (`src/team/`) |

`templates/_shared/` holds per-project common files: `index.jsx`, `vite.config.js`, `_gitignore`, and `src/lib/` helpers (api.js RPC wrapper, useLoad, ui.jsx atoms, useConfig, ConfigForm). `lib/mcp-introspect.js` does the MCP handshake. `skill/quox-plugin/SKILL.md` is copied into new projects' `.claude/skills/` unless `--no-skill`. `scripts/scaffold-snapshot.mjs` regenerates test snapshots.

---

## Package: eslint-plugin-quox-plugin

`packages/eslint-plugin-quox-plugin/` — ESM, 2 rules, legacy + flat `recommended` configs:
- `no-host-only-globals` (error) — flags `window.__quoxGlass`, throwing `__quoxSharedDeps` stubs, direct fetch/XHR/WebSocket/EventSource
- `no-cache-as-primary-storage` (warn) — flags browser-only storage writes when the module never persists via `window.quox.storage` / `memory.save`

---

## Package: @quox/glyph (private, not published)

`packages/quox-glyph/index.js` — canonical JS renderer for the QuoxGlyph terminal output language; JS Quox CLIs consume this instead of hand-porting. Exports: `line(surface, verb)` grammar lines, `meter(done, total)` gradient meters, `brandName`, `celebrate`, `receipt(hash, ts)`, `events` lifecycle helpers, `setColor`; constants `GRAD`, `RAINBOW`, `STATUS`, `ICONS` (11 surfaces), `BUDGETS`, `PUA_Q`. Tests via node:test, excluded from vitest.

---

## Root scripts

| Script | Status | Does |
|--------|--------|------|
| `scripts/check-pack.mjs` | active (`npm run check:pack`, CI) | asserts each publishable tarball contains only `files`-allowlisted content and nothing secret-looking |
| `scripts/generate-signing-key.js` | DEPRECATED | Ed25519 keypair (use `quox-plugin keygen`) |
| `scripts/sign-plugin.js` | DEPRECATED | signs a .quoxplugin ZIP, injects signature.json (use `quox-plugin sign`) |
| `scripts/generate-license.js` | DEPRECATED | signed license JSON for a plugin/customer |

Deprecated three kept for official/legacy signing flows only.

## Config files

| File | Controls |
|------|----------|
| `package.json` (root) | workspaces (`packages/*`), test orchestration (vitest + node:test split), check:pack |
| `vitest.config.js` | excludes node_modules, dist, and quox-glyph (node:test) |
| `.github/workflows/ci.yml` | push to main + PRs: `npm ci`, `npm test`, `npm run check:pack` on Node 20 and 22 |
| per-project `vite.config.js` (template) | generated into scaffolds; wires `quoxPluginVite({pluginId})` |

## Test structure

Vitest everywhere except quox-glyph (node:test). 18 test files, ~270 cases.

| Location | Files | Covers |
|----------|-------|--------|
| `packages/quox-plugin-sdk/src/__tests__/` | 3 | index helpers, testing mocks (permission gate, not_available), aware client |
| `packages/quox-plugin-vite/src/__tests__/` | 9 | vite plugin config, external-globals rewrite, qx/vendored CSS, CLI validate + signing (incl. host-verify fixture), dev-host routes, dev RPC |
| `packages/create-quox-plugin/__tests__/` | 3 | scaffold output per template (44 cases), sandbox-model conformance (28), MCP migration (26, with fake-mcp-server fixture) |
| `packages/eslint-plugin-quox-plugin/src/__tests__/` | 2 | both rules |
| `packages/quox-glyph/test/` | 1 | glyph rendering (node:test) |
| `scripts/__tests__/` | 1 | legacy sign-plugin |

## Docs

`docs/`: getting-started, plugin-api, templates, signing, dev-preview, backend-plugins, aware, claude-skill, suggested-rules, plan-sdk-dx. `docs/tutorials/`: one per template (basic, monitoring-dashboard, fleet-management, service-bridge, ui-feature, enterprise-extension, specialist-agent, agentic-team) plus convert-mcp-server.

## Key invariants (enforced in 3+ places, keep in sync)

- The permission map and `not_available` set live in `quox-plugin-sdk/src/index.js`, `quox-plugin-sdk/src/testing.js`, `quox-plugin-vite/src/dev-host/rpc.js`, and the CLI validator, mirroring the host (`quox-dashboard` services/auth/routes/plugins.js).
- Plugin id rule (`^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$` + reserved prefixes) duplicated in sdk index and cli/validate.
- Sandbox contract: opaque-origin iframe, CSP `default-src 'none'` / `connect-src 'none'`, no host CSS; the dev preview, the eslint rules, and `validate`'s bundle scan all enforce it.

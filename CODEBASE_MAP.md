# CODEBASE_MAP.md: quox-plugin-sdk repo (npm scope @quoxai)

<!-- Last verified: 2026-11-05 by /codebase-mirror -->

> Auto-generated structural map of the QuoxCORE Plugin SDK monorepo. Counts come from the files and the test run on the verification date, not from memory.

## Overview

An **npm workspace monorepo** (Apache-2.0) with tools for building, previewing, testing, signing, and distributing sandboxed third-party plugins (`.quoxplugin`) for QuoxCORE, plus the canonical QuoxGlyph terminal renderer. Community plugins run in an opaque-origin iframe (`sandbox="allow-scripts"`, CSP `connect-src 'none'`) whose only host surface is `window.quox` (postMessage RPC), the shared React deps on `window.__quoxSharedDeps`, and `window.__quoxPluginRegister`. Everything in this repo exists to build for, simulate, or lint against that sandbox contract.

```
quox-plugin-sdk/
├── packages/
│   ├── quox-plugin-sdk/            # @quoxai/quox-plugin-sdk 0.4.1: runtime helpers, types, test mocks, AWARE client, status rows
│   ├── quox-plugin-vite/           # @quoxai/quox-plugin-vite 0.4.1: Vite build plugin + quox-plugin CLI + sandbox dev preview
│   ├── create-quox-plugin/         # @quoxai/create-quox-plugin 0.4.1: scaffolder (npm create @quoxai/quox-plugin), 8 templates
│   ├── eslint-plugin-quox-plugin/  # @quoxai/eslint-plugin 0.4.1: 2 rules for plugin authors
│   └── quox-glyph/                 # @quox/glyph 0.1.0: QuoxGlyph terminal output renderer (private, not published)
├── scripts/                        # check-pack (active) + 3 deprecated legacy signing/licensing scripts
├── docs/                           # 14 guides + 9 tutorials
├── .github/workflows/              # ci.yml (Node 20/22), publish.yml (tag-triggered, npm provenance)
└── .claude/skills/quox-plugin/     # Claude skill for AI-assisted plugin dev (identical copy ships in the scaffolder)
```

Root scripts: `npm run build` (all workspaces), `npm test` (vitest, then node:test for glyph), `npm run check:pack` (publish allowlist audit).

## Metrics

| Metric | Count |
|--------|-------|
| Packages | 5 (4 publishable under `@quoxai` at 0.4.1, `@quox/glyph` private at 0.1.0) |
| Scaffold templates | 8 (+ `_shared`) |
| Test files | 24 (23 vitest + 1 node:test) |
| Test cases | 360 (351 vitest + 9 node:test), all passing on 2026-11-05 |
| Docs | 23 (14 guides + 9 tutorials) |
| Root scripts | 4 (1 active, 3 deprecated) |
| ESLint rules | 2 |
| `quox-plugin` CLI commands | 4 (build, validate, keygen, sign) |
| Dev preview routes | 6 |
| `window.quox` RPC methods | 13 (3 of them `not_available` stubs) |
| Manifest permissions (`PluginPermission`) | 7 (sidebar, storage, network, memory, notifications, aee, tools) |
| Permissions gating RPC methods | 5 (storage, network, memory, aee, notifications) |
| CI workflows | 2 |

## Registration chains

- **New runtime export:** add to `packages/quox-plugin-sdk/src/<module>.js` + matching `.d.ts`, list both files in `package.json` `files` and `exports`, then run `npm run check:pack`. If it is a `window.quox` method, update `COMMUNITY_PERMISSION_FOR_METHOD` in `index.js`, the mock in `testing.js`, `PERMISSION_FOR_METHOD` in `quox-plugin-vite/src/dev-host/rpc.js`, and `QuoxPluginApi` in `types.d.ts`; `frame-contract.test.js` fails until all four agree.
- **New CLI command:** add `src/cli/<cmd>.js` in quox-plugin-vite, wire it in `src/cli/main.js` (`USAGE` string + dispatch), add `src/__tests__/cli-<cmd>.test.js`.
- **New template:** add `templates/<name>/` in create-quox-plugin, append to the `TEMPLATES` array in `bin/create.js` (name, description, suggestedCategory), regenerate snapshots with `scripts/scaffold-snapshot.mjs`, add a tutorial under `docs/tutorials/` and a row in `docs/templates.md`.
- **New ESLint rule:** add `src/rules/<rule>.js`, import it in `src/index.js` and add to `rules` + `recommendedRules`, add `src/__tests__/<rule>.test.js`.
- **Release:** bump all four `@quoxai/*` package versions to the same number, add a CHANGELOG entry, push tag `v<version>`; `publish.yml` refuses a tag that does not match every package version.

## Authoritative files

| File | Purpose | Count |
|------|---------|-------|
| `package.json` (root) | workspaces `packages/*`, test orchestration, check:pack | 5 workspaces |
| `packages/quox-plugin-sdk/src/index.js` | runtime helpers, permission map, `not_available` set, id rules | 10 exports |
| `packages/quox-plugin-sdk/src/types.d.ts` | the sandbox contract (manifest, permissions, `QuoxPluginApi`) | 429 lines, 30 exported types |
| `packages/quox-plugin-sdk/src/statusRow.js` | status-row payload/declaration contract | 4 exports |
| `packages/quox-plugin-sdk/src/aware.js` | AWARE presence/telemetry client | 5 exports |
| `packages/quox-plugin-sdk/src/testing.js` | in-memory sandbox mock | 7 exports |
| `packages/quox-plugin-vite/src/index.js` | Vite plugin (externals, ZIP packaging, dev preview attach) | 6 externalised deps |
| `packages/quox-plugin-vite/src/cli/main.js` | `quox-plugin` CLI dispatch | 4 commands |
| `packages/quox-plugin-vite/src/dev-host/server.js` | sandbox dev preview under `/__quox-dev` | 6 routes |
| `packages/create-quox-plugin/bin/create.js` | scaffolder (1236 lines), `TEMPLATES` + `CATEGORIES` | 8 templates, 7 categories |
| `packages/eslint-plugin-quox-plugin/src/index.js` | rules, `recommended` + `flat/recommended` configs | 2 rules |
| `vitest.config.js` | excludes node_modules, dist, quox-glyph | |
| `.github/workflows/ci.yml` | test + check:pack matrix | Node 20, 22 |
| `.github/workflows/publish.yml` | tag-triggered publish with provenance | 4 packages |

## Invariants

| Check | Status | Details |
|-------|--------|---------|
| Every `PluginPermission` documented in `docs/plugin-api.md` | ✓ pass | all 7 (sidebar, storage, network, memory, notifications, aee, tools) appear |
| Every template produces a buildable project | ⚠ warn | `create.test.js` scaffolds all 8 and checks file sets (45 cases, green); last full install+build+validate+sign proof was the clean-room run on 2026-10-14 (W5-STATUS), not re-run by this scan |
| Scripts referenced in docs exist | ✓ pass | `scripts/generate-license.js` and `packages/quox-plugin-vite/scripts/sync-glass-css.mjs` exist; `quox:scripts/check-sdk-qx-css.mjs` is a dashboard-repo path by design |
| Permission map identical in sdk, mock, dev host, types | ✓ pass | pinned by `frame-contract.test.js` (5 cases) |
| Status-row declaration rules identical in sdk (ESM) and vite CLI (CJS) | ✓ pass | duplicated on purpose; `cli-validate.test.js` keeps them in sync |
| Published tarballs contain only allowlisted files | ✓ pass | `npm run check:pack` green in CI; `@quox/glyph` excluded (not in the publish set) |
| Claude skill copy in `.claude/skills/` matches the one the scaffolder ships | ✓ pass | `diff -q` identical |

---

## Package: @quoxai/quox-plugin-sdk (runtime)

`packages/quox-plugin-sdk/`, ESM. Exports `.`, `./testing`, `./aware`, `./status-row`, `./types`, `./package.json`.

**`src/index.js`** (main entry): wraps the sandbox host surface.
- `getQuox()` / `usePluginApi()`: return `window.quox`, throw with guidance outside a host
- `getSharedDeps()`: `window.__quoxSharedDeps` (React, ReactDOM, ReactRouterDOM, ReactJSXRuntime)
- `registerPlugin(pluginId, {routes, sidebar})`: calls `window.__quoxPluginRegister`
- `validateManifestId()`, `MANIFEST_ID_PATTERN` (`^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`), `RESERVED_ID_PREFIXES` (`core-`, `system-`, `quox-`, `admin-`)
- `COMMUNITY_PERMISSION_FOR_METHOD`: the fail-closed permission map (storage.* → storage, fetch → network, memory.* → memory, aee.emit → aee, notify → notifications; navigate/getUser/onEvent need none)
- `NOT_AVAILABLE_METHODS`: memory.save, memory.search, aee.emit reject `not_available` after the permission gate (no collector route yet)
- `getGlassComponents()`: removed, now throws (no host CSS/components in the sandbox)

**`src/statusRow.js`** (`./status-row`, added for the ROWS stream): the one-line-in-the-quox-CLI contract. `STATUS_ROW_TONES` (ok, warn, error, info, neutral), `validateStatusRowPayload()`, `statusRow(fields)` builder, `validateStatusRowDecls()` for the manifest `statusRows` array (max 3 declarations, id 1-24 chars, `every` as `<n>s|m|h`, relative path without scheme).

**`src/testing.js`**: in-memory mock of the whole sandbox for unit tests. `createMockQuox()`, `installMockQuox()` / `uninstallMockQuox()`, `createMockPluginApi()`, `setupPluginTestEnv()` / `teardownPluginTestEnv()`, `setupGlassMocks()`. Enforces the same permission map and `not_available` set as the host.

**`src/aware.js`**: AWARE presence/telemetry client (collector-side, not sandbox). `createAware({feed, orgId, collectorUrl, serviceKey, surface, fetchImpl, timeoutMs})`, `validateEvent()`, `startHeartbeat()` with backoff. Constants: 5 `LEDGERS` (vital, operational, intentional, social, security), 5 `KINDS` (state, delta, ask, heartbeat, retract).

**`src/types.d.ts`** (429 lines): the contract. `PluginManifest` (incl. `statusRows?`), `PluginPermission`, `QuoxPluginApi` (alias `PluginAPI`), `SharedDeps`, `PluginExports`, `SidebarItem`, `StatusRowPayload`, `PluginStatusRowDecl`, agent/team shapes (`AgentDefinition`, `AgentPersona`, `AgentAutonomy`, `AgentBudget`, `AgentEscalation`, `LlmConfig`, `ToolDefinition`, `TeamDefinition`, `TeamPolicies`, `TeamMemberRef`), `NocIntegration`, `NocQuickAction`, `SafetyConfig`, `ConfigSchemaField`, marketplace shapes (`Capabilities`, `ComparisonTier`, `TierLimits`, `Testimonial`).

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

## Package: @quoxai/quox-plugin-vite (build + CLI + dev preview)

`packages/quox-plugin-vite/`, CJS. Main `src/index.js`, bin `quox-plugin`. Peer dep `vite >= 5`.

**`src/index.js`** (the Vite plugin, `quoxPluginVite(options)`):
- Externalises react, react/jsx-runtime(+dev), react-dom(+client), react-router-dom, @quox/glass (`EXTERNAL_GLOBALS`, 6 specifiers) and rewrites their imports to `window.__quoxSharedDeps.*` reads via `renderChunk` (rollup `output.globals` is ignored for ESM)
- Emits `dist/plugin.esm.js` + `dist/plugin.css` (no `build.lib`, so dynamic imports can code-split into `dist/assets/`)
- Prepends vendored `assets/qx-components.css` into plugin.css (`qxCss: false` to opt out); `scripts/sync-glass-css.mjs <dashboardDir>` refreshes the snapshot with source hashes
- Pins `process.env.NODE_ENV` to production at build time
- Default dev proxies `/collector` and `/api` → `quoxCoreUrl` (or `QUOX_CORE_URL`, default `https://localhost:3000`), default port 5174, both yielding to user config
- `closeBundle` packages manifest + bundle + css + assets into `<pluginId>.quoxplugin` ZIP (adm-zip)
- `configureServer` attaches the sandbox dev preview (`devHost: false` disables; `devBackendUrl`, `devUser` options)

**`bin/quox-plugin.js` → `src/cli/main.js`**, CLI commands:
| Command | Does |
|---------|------|
| `quox-plugin build [--dir .]` | `src/cli/build.js`: runs the project's own `vite build` (resolves vite from the project, never from this package) |
| `quox-plugin validate [--dir .]` | `src/cli/validate.js`: manifest rules mirroring the host (id/semver/reserved prefixes, 5MB host body limit), bundle scan for sandbox violations (raw fetch/XHR/WebSocket/EventSource/sendBeacon, `__quoxGlass`, the 6 throwing stub deps), declared-vs-used permission check, status-row declarations (`src/cli/status-rows.js`), signature check against current files. Warns on: unused permissions, memory/aee use, a v1 signature, an unpinned `backend.image` (hosts refuse non-`@sha256` images), missing `plugin.css` |
| `quox-plugin keygen --out <dir> [--force]` | `src/cli/signing.js`: Ed25519 keypair, prints the `quox plugin trusted-keys add` line |
| `quox-plugin sign --key <private.pem> [--dir .]` | signature v2 (`src/cli/signature-v2.js`, `FORMAT_V2`): canonical-JSON manifest sha256 + sha256 of every shipped file (bundle, css), writes `dist/signature.json`; prints the `quox plugin install` line |

**`src/dev-host/`** (sandbox dev preview, attached under the Vite dev server at `BASE = /__quox-dev`):
- `server.js`: runs a nested production-mode watch build into a temp dir and inlines the result into the frame (the sandbox CSP cannot load URLs). Routes:
  - `GET /` (and `/index.html`): preview parent page
  - `GET /__quox-dev/parent.js`: parent client
  - `GET /__quox-dev/meta.json`: plugin meta + CSP + served method list
  - `GET /__quox-dev/events`: SSE reload channel
  - `GET /__quox-dev/frame?channel=<hex32>`: sandbox iframe srcdoc
  - `POST /__quox-dev/rpc`: `window.quox` RPC (same-origin only)
- `rpc.js`: in-memory `window.quox` mock (`createDevRpc`) enforcing the same `PERMISSION_FOR_METHOD` and `NOT_AVAILABLE` set as the host; `fetch` forwards GET/POST/PUT/PATCH/DELETE to `devBackendUrl` / `QUOX_DEV_BACKEND_URL` (404 `dev_backend_not_configured` when unset) with host path confinement copied (no scheme, no `//`, no `..`, no control chars); exposes `methods` for the contract test
- `frame.js` / `frame-deps.js`: frame srcdoc with production CSP (`FRAME_CSP`, `default-src 'none'`), inlined deps
- `page.js` / `parent-client.js`: parent shell and postMessage bridge

---

## Package: @quoxai/create-quox-plugin (scaffolder)

`packages/create-quox-plugin/`, bin `create-quox-plugin` (`bin/create.js`, 1236 lines). Run as `npm create @quoxai/quox-plugin <name>`.

**Flags:** `--template <name>`, `--from-mcp "<stdio cmd>"` (live MCP initialize + tools/list → specialist-agent plugin wired with those tools), `--from-mcp-json <file>` (offline variant), `--local-sdk <checkout>` (file: deps for monorepo dev), `--no-skill`, `--non-interactive`, `--help`.

**Categories** (7): Monitoring, Productivity, Communication, AI & Intelligence, Infrastructure, Compliance & Audit, Other.

**Templates** (`templates/<name>/`, interpolated by literal `${var}` substitution, no eval):
| Template | Pattern | Suggested category | Notable extras |
|----------|---------|--------------------|----------------|
| basic | minimal sidebar hello world | Other | no network |
| monitoring-dashboard | poll a service (Grafana pattern) | Monitoring | network, configSchema, nocIntegration + quickActions, `usePolling` hook |
| fleet-management | hosts with safety gates (Docker Fleet) | Infrastructure | network+tools, safety (approvals, kill switch), aeeIntents, ConfirmModal |
| service-bridge | 3rd-party service + specialist (GitHub) | Communication | network+tools, specialist block, AgentSidebar |
| ui-feature | client-side feature w/ storage+config (Action Tracker) | Productivity | storage-centric |
| enterprise-extension | multi-tier + Dockerised backend | AI & Intelligence | tiers/usage meters, UpgradeGate; `backend/server.js` (express: GET /health, GET /usage) + Dockerfile |
| specialist-agent | agent w/ tools, persona, autonomy, chat (Security Scanner) | AI & Intelligence | `src/agent/` (agentDef, agentPersona, tools), host renders the sidebar dock |
| agentic-team | multi-agent team + policies (DevOps Team) | Infrastructure | `src/team/` (teamDef, agents, personas, policies, tools), 1 orchestrator + 3 members |

`templates/_shared/` holds per-project common files: `index.jsx`, `vite.config.js`, `_gitignore`, and `src/lib/` helpers (api.js RPC wrapper, useLoad, ui.jsx atoms, useConfig, ConfigForm). `lib/mcp-introspect.js` exports `introspectMcpStdioServer()` and `loadMcpToolsFromJsonFile()`. `skill/quox-plugin/SKILL.md` is copied into new projects' `.claude/skills/` unless `--no-skill`. `scripts/scaffold-snapshot.mjs` regenerates test snapshots.

---

## Package: @quoxai/eslint-plugin

`packages/eslint-plugin-quox-plugin/`, ESM, peer `eslint >= 8`. Namespace `@quoxai`, rules `@quoxai/<rule>`. Exports default plugin plus named `meta`, `rules`, `configs` (so eslintrc on Node 22+ can load it). `meta.version` is read from package.json. Configs: `recommended` (eslintrc) and `flat/recommended`.
- `no-host-only-globals` (error): flags `window.__quoxGlass`, throwing `__quoxSharedDeps` stubs, direct fetch/XHR/WebSocket/EventSource
- `no-cache-as-primary-storage` (warn): flags browser-only storage writes when the module never persists via `window.quox.storage` / `memory.save`

---

## Package: @quox/glyph (private, not published)

`packages/quox-glyph/index.js`: canonical JS renderer for the QuoxGlyph terminal output language; JS Quox CLIs consume this instead of hand-porting. Exports: `line(surface, verb)` grammar lines, `meter(done, total)` gradient meters, `brandName`, `celebrate`, `receipt(hash, ts)`, `events` lifecycle helpers, `setColor` (`QUOX_COLOR=2` forces colour); constants `GRAD`, `RAINBOW`, `STATUS`, `ICONS`, `BUDGETS`, `PUA_Q`. Tests via node:test, excluded from vitest and from check:pack.

---

## Root scripts

| Script | Status | Does |
|--------|--------|------|
| `scripts/check-pack.mjs` | active (`npm run check:pack`, CI + publish) | asserts each publishable tarball contains only `files`-allowlisted content and nothing secret-looking |
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
| `.github/workflows/publish.yml` | tag `v*`: test + check:pack, assert tag equals every `@quoxai/*` version, `npm publish --provenance --access public` via trusted publishing (no stored token, `id-token: write`), dependencies first, skips already-published versions |
| `packages/quox-plugin-vite/assets/qx-components.css` | vendored dashboard qx stylesheet + design tokens injected into every build and the dev preview |
| per-project `vite.config.js` (template) | generated into scaffolds; wires `quoxPluginVite({pluginId})` |

## Test structure

Vitest everywhere except quox-glyph (node:test). 24 files, 360 cases, all green on 2026-11-05.

| Location | Files | Cases | Covers |
|----------|-------|-------|--------|
| `packages/quox-plugin-sdk/src/__tests__/` | 5 | 60 | index helpers (12), testing mocks (23), aware client (9), status rows (11), frame contract pin (5) |
| `packages/quox-plugin-vite/src/__tests__/` | 10 | 116 | vite plugin config (12), external-globals rewrite (9), qx/vendored CSS (4+5), CLI build (7), validate (26), signing v1 (7) + v2 (19, incl. host-verify fixture), dev-host routes (14), dev RPC (19) |
| `packages/create-quox-plugin/__tests__/` | 4 | 90 | scaffold output per template (45), sandbox-model conformance (20), MCP migration (24, with fake-mcp-server fixture), scoped names (1) |
| `packages/eslint-plugin-quox-plugin/src/__tests__/` | 3 | 8 | both rules (2+2), scoped namespace (4) |
| `packages/quox-glyph/test/` | 1 | 9 | glyph rendering (node:test) |
| `scripts/__tests__/` | 1 | 15 | legacy sign-plugin |

## Docs

`docs/` (14): getting-started, plugin-api, templates, signing, dev-preview, backend-plugins, aware, status-rows, claude-skill, suggested-rules, listing, quality-tiers (Bronze/Silver/Gold, specification only), plan-sdk-dx, W5-STATUS (outside-builder readiness audit, 2026-10-14). `docs/tutorials/` (9): one per template (basic, monitoring-dashboard, fleet-management, service-bridge, ui-feature, enterprise-extension, specialist-agent, agentic-team) plus convert-mcp-server (draft). `docs/assets/readme-hero.png` is the README artwork.

## Key invariants (enforced in 3+ places, keep in sync)

- The permission map and `not_available` set live in `quox-plugin-sdk/src/index.js`, `quox-plugin-sdk/src/testing.js`, `quox-plugin-vite/src/dev-host/rpc.js`, and the CLI validator, mirroring the host (`quox-dashboard` `src/services/pluginFrameHost.js` and `services/auth/utils/plugins.js`). `frame-contract.test.js` here, and `pluginFrameSdkContract.test.js` in the dashboard, pin both sides.
- Plugin id rule (`^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$` + reserved prefixes) duplicated in sdk index and cli/validate.
- Status-row declaration rules duplicated in `quox-plugin-sdk/src/statusRow.js` (ESM) and `quox-plugin-vite/src/cli/status-rows.js` (CJS); change both together.
- Signature v2 binds the canonical manifest and every shipped file; the host verifier (`quox-dashboard` `services/auth/utils/pluginSignatureV2.js`) must match `signature-v2.js`. v1 signatures stay valid only for plugins asking for no more than sidebar, storage and notifications.
- Sandbox contract: opaque-origin iframe, CSP `default-src 'none'` / `connect-src 'none'`, no host CSS; the dev preview, the eslint rules, and `validate`'s bundle scan all enforce it.
- All four `@quoxai/*` packages release at the same version; `publish.yml` refuses a mismatched tag.

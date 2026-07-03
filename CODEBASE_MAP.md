<!-- Last verified: 2026-07-03 by /codebase-mirror -->

# QuoxCORE Plugin SDK — Codebase Map

> **Version:** 0.1.0 (monorepo root private) · **Stack:** Node.js npm-workspaces + Vite + Vitest + TS defs · **Repo:** github.com/quoxai/quox-plugin-sdk

Toolkit for building, testing, signing, and distributing third-party QuoxCORE plugins. npm workspaces
(`packages/*`), 4 published packages, Ed25519 signing scripts, and a template-driven scaffolder.

---

## Metrics

| Metric | Count |
|--------|-------|
| Workspace packages | 4 |
| Runtime helpers (`index.js` exports) | 3 |
| PluginPermission values | 7 |
| Scaffolder templates | 8 |
| Scaffolder categories | 7 |
| Signing/license scripts | 3 |
| Docs (top-level `.md`) | 6 |
| Tutorials | 7 |
| Test files (`*.test.js`) | 6 |
| Examples dir | none |

---

## Registration Chains

**Add a template:** append entry to the `TEMPLATES` array in
`packages/create-quox-plugin/bin/create.js` (`{ name, description, suggestedCategory }`) → add the
generator branch producing `manifest.json` + `src/` scaffold → document in `docs/templates.md` +
`docs/tutorials/`.

**Add a PluginPermission:** extend the `PluginPermission` union in
`packages/quox-plugin-sdk/src/types.d.ts` → document it in `docs/plugin-api.md` → enforce in host.

**Add a runtime helper:** `export function` in `packages/quox-plugin-sdk/src/index.js` → mock in
`src/testing.js` → cover in `src/__tests__/index.test.js`.

---

## Authoritative Files

| File | Purpose | Count |
|------|---------|-------|
| `packages/quox-plugin-sdk/src/index.js` | Runtime helpers | getSharedDeps, registerPlugin, getGlassComponents |
| `packages/quox-plugin-sdk/src/types.d.ts` | PluginManifest / PluginAPI / PluginExports + 7 permissions | — |
| `packages/quox-plugin-sdk/src/testing.js` | Mock API + test env | createMockPluginApi, setup/teardownPluginTestEnv, setupGlassMocks |
| `packages/create-quox-plugin/bin/create.js` | Scaffolder CLI | 8 templates, 7 categories |
| `packages/quox-plugin-vite/src/index.js` | Vite build plugin | externals + ZIP packaging |
| `scripts/*.js` | Ed25519 keygen, sign, license | 3 |

---

## Invariants

| Check | Status | Details |
|-------|--------|---------|
| Every PluginPermission documented in `docs/plugin-api.md` | ⚠ warn | `network`, `memory`, `notifications`, `aee` found; `sidebar` + `tools` absent; `storage` deprecated |
| Templates buildable | ⚠ warn | 8 templates defined with generators; not build-verified in this scan |
| Scripts referenced in docs exist | ✓ pass | `signing.md` cites 3 scripts, all present in `scripts/` |

---

## Packages (4)

| Package | Version | Entry | Role |
|---------|---------|-------|------|
| `quox-plugin-sdk` | 0.1.0 | `src/index.js` | Runtime helpers, types, testing utils |
| `quox-plugin-vite` | 0.1.0 | `src/index.js` (CJS) | Vite plugin: externalize shared deps, `.quoxplugin` ZIP |
| `create-quox-plugin` | 0.1.0 | `bin/create.js` | Interactive scaffolder |
| `eslint-plugin-quox-plugin` | 0.1.0 | `src/index.js` (ESM) | `no-cache-as-primary-storage` rule |

## PluginPermission Union (7)

`sidebar`, `storage` (deprecated alias of cache), `network`, `memory`, `notifications`, `aee`, `tools`.

## Templates (8) & Categories (7)

Templates: `basic`, `monitoring-dashboard`, `fleet-management`, `service-bridge`, `ui-feature`,
`enterprise-extension`, `specialist-agent`, `agentic-team`. Categories: Monitoring, Productivity,
Communication, AI & Intelligence, Infrastructure, Compliance & Audit, Other.

## PluginAPI Persistence Tiers

`api.cache.*` (ephemeral localStorage) · `api.storage.*` (deprecated) · `api.durable.*` (server,
org/user-scoped) · `api.secrets.*` (encrypted, audit-logged) · `api.config.*` · `api.memory.*` ·
`api.aee.*` · `api.fetch()` (proxied) · `api.notify()`.

## Global Integration Points

`window.__quoxSharedDeps` (React/ReactDOM/ReactRouterDOM), `window.__quoxGlass` (@quox/glass v1.1+),
`window.__quoxPluginRegister(id, exports)`, `window.__quoxPluginApi[pluginId]`.

## Docs (6 + 7 tutorials)

`getting-started.md`, `plugin-api.md`, `templates.md`, `backend-plugins.md`, `signing.md`,
`claude-skill.md`, plus `tutorials/` (7 guides).

## Size Constraints

Bundle `plugin.esm.js` ≤ 100 KB · `.quoxplugin` ZIP ≤ 5 MB · Plugin ID 3–64 chars.

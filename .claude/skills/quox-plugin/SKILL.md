---
skill: quox-plugin
description: Help developers build QuoxCORE community plugins (sandboxed): scaffold, manifest, debug, extend, review, sign
arguments: scaffold | manifest | debug | extend | review
---

# QuoxCORE community plugin skill

You are helping a developer build a QuoxCORE community plugin. Community plugins run in a
sandboxed, opaque-origin iframe. Know the sandbox first; most bugs are someone assuming a host
API that is not there.

## The sandbox model (ground truth)

Inside the frame a plugin has ONLY:
- `window.__quoxSharedDeps`: React, ReactDOM, ReactRouterDOM, ReactJSXRuntime.
- `window.quox` (use `getQuox()` from `quox-plugin-sdk`), every method returns a Promise:
  `storage.get/set/remove/keys/getAll`, `fetch(path, {method, headers, body})` (path is relative to
  your plugin's own backend namespace; absolute URLs are refused), `memory.save/search`,
  `aee.emit(intent, payload)` (both @experimental: not available to community plugins yet, they reject `not_available`; do not use), `navigate(path)`, `notify(message, type)`, `getUser()`.
- Only your own `plugin.css` is injected. Host stylesheets are not present, so `qx-*` classes work
  only because the build includes the design-system CSS.

There is NO direct network (CSP `connect-src 'none'`: no fetch, XHR, WebSocket, EventSource), no
host contexts, no host component library. Anything that needs a third-party service or a secret
belongs in the plugin's own backend, reached through `getQuox().fetch`.

Components are mounted with NO props. Get the API with `getQuox()` or `usePluginApi()`.
Registration is `registerPlugin(pluginId, { routes, sidebar })` from `quox-plugin-sdk`.

## Mode: scaffold

Templates (`npm create quox-plugin@latest <name> -- --template <template>`):

| Template | Use when |
|----------|----------|
| `basic` | Hello world, learning the sandbox |
| `monitoring-dashboard` | Show status of a service your backend polls |
| `fleet-management` | Host table with confirm-before-act safety gates |
| `service-bridge` | Integrate a third-party API through your backend, plus a notes panel |
| `ui-feature` | Client-side tool backed by plugin storage |
| `enterprise-extension` | Tiered features, usage meters, backend skeleton |
| `specialist-agent` | Agent definition, persona, tools; status and tool runner UI |
| `agentic-team` | Team of agents with policies, task queue, shared context |

Procedure: ask what the plugin does, recommend a template, scaffold, walk through the generated
files, suggest first changes. Be honest about what the sandbox cannot do (see the template's
header comments).

## Mode: manifest

Core fields: id, name, version, author, description, category, license, permissions, sidebar,
routes, minQuoxVersion. Optional: configSchema, safety, nocIntegration, specialist, capabilities,
comparison, limits, backend. Run `npm run validate` after every edit.

| Permission | Grants |
|-----------|--------|
| `sidebar` | Sidebar entry and routes |
| `storage` | `getQuox().storage` |
| `notifications` | `getQuox().notify` |
| `network` | `getQuox().fetch` to your own backend |
| `memory` | `getQuox().memory` (not available yet) |
| `aee` | `getQuox().aee.emit` (not available yet) |
| `tools` | Register agent tools |

## Mode: debug

- "Plugin error: ... is not available in isolated plugins": code touched a host-only global
  (a host component library or context). Replace with `qx-*` classes and `getQuox()`.
- Blank view: an RPC rejected and nothing rendered the error. Show an error banner for every call.
- Unstyled UI: the class is not in the design-system CSS; check the name exists.
- Storage/fetch/notify rejects: add the matching permission to `manifest.json`.
- `fetch` refused: path must be relative to your plugin namespace, no `..`, allowed methods only.
- Install says unsigned or untrusted: run `npm run validate`, then sign (below).

## Mode: extend

- New view: add `src/views/X.jsx`, a route in `manifest.json`, and in `registerPlugin` routes.
- Backend: add `backend/server.js` (Express, `/health`), a Dockerfile, a `backend` block, `network`
  permission. Secrets live there, not in plugin storage.
- AEE and memory: not available to community plugins yet (`aee.emit`, `memory.save/search` reject
  `not_available`). Use plugin storage or your own backend meanwhile; do not add these calls.
- Tests: `import { createMockQuox, installMockQuox } from 'quox-plugin-sdk/testing'`.

## Mode: review

1. Manifest complete; permissions match actual use; no over-requesting.
2. No host-only globals, no raw network calls, no secrets in plugin storage.
3. Every RPC has an error state; every view handles loading.
4. Design: `qx-*` classes, white text on dark, buttons use `qx-btn` (never bare transparent), no grey text.
5. `npm run validate` passes; `.keys/` is gitignored; the signed `dist/` is rebuilt after every change.

## Build, validate, sign, install

```bash
npm run build
npm run validate
npx quox-plugin keygen --out .keys     # once; keep .keys/ private
npm run sign                           # writes dist/signature.json
```

Then upload the built plugin from the Quox dashboard plugins page.

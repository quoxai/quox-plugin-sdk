# SDK-DX — Developer Experience stream

> Status: APPROVED (Adam, 2026-07-03, QUOX-TRADE-2 session). Scope: P1–P4 +
> template-extraction tech debt, "without major rabbit holes". Driven by the
> QuoxTrade (star-alignment) residency work; every item must serve that plugin
> AND future third-party developers.

## Findings that triggered this (2026-07-03 audit)

1. `npm run dev` on a scaffolded plugin is broken: no index.html generated, no
   glass CSS, no `window.__quoxGlass` → first destructure throws on a blank
   page. getting-started.md documents no dev loop at all (build→ZIP→install
   only). star-alignment survives dev only via a hand-built 4,070-line
   dev-preview.css + standalone fallback — geometry-false and unshippable.
2. `PluginSandbox.chat.openSidebar()` dispatches `quox-open-agent-chat`;
   zero listeners exist in quox-dashboard. Dead API.
3. `__quoxGlass` is untyped (absent from types.d.ts Window interface) and
   undocumented (no plugin-api.md section). AgentChatPanel appears in the
   monorepo only as a JSDoc mention + test mock.
4. Templates are inconsistent: `specialist-agent` uses the real
   `__quoxGlass.AgentChatSidebar` (grid `1fr 340px` ↔ `1fr 48px`);
   `service-bridge` + `agentic-team` hand-roll `position:fixed` mock chat
   overlays with hard-coded `#1a1a2e` (glass violation) and stub replies.
5. Tech debt: `templates/` is empty — all templates are inline strings in the
   3,927-line `create.js`.
6. Host truths the SDK never states: qx-components.css is global at runtime
   (plugins need NOT ship qx-* classes); `manifest.agentPersona`/
   `agentDefinition` → real chat-able agent (thirdPartyPluginHost.js:524-552);
   AgentChatPanel works inside PluginSandbox today (contexts present).

## Phases

### P1 — Dev host harness in quox-plugin-vite (subsumes star-alignment plan/18 RES.1)
Dev mode (`command === 'serve'`) gains:
- Default index.html middleware when the project has none.
- `virtual:quox-dev-host` module injected BEFORE the plugin entry
  (transformIndexHtml head-prepend; module order guarantees execution order):
  installs `window.__quoxSharedDeps` (real deps from the plugin's
  node_modules), `window.__quoxGlass` (functional dev components — working
  GlassTabBar; AgentChatPanel/AgentChatSidebar as HONEST collapse-capable
  placeholder panels labelled "dev preview — live agent in QuoxCORE"),
  `window.__quoxPluginApi` (in-memory mock, one console.info), and
  `window.__quoxPluginRegister` (captures exports).
- After the entry registers, mount the host frame: 76px left rail (icons from
  manifest.sidebar, active state), 64px top header, content area matching
  `.app-shell__content` geometry, HashRouter over `exports.routes`.
- Vendored real `qx-components.css` (snapshot from quox-dashboard
  src/styles/qx-components.css with provenance header) served at
  `/__quox-dev/qx.css`; `scripts/sync-glass-css.mjs` refreshes it.
- Escape hatches: `?bare=1` URL param and `devHost: false` plugin option.
**Done when:** a fresh `create-quox-plugin` scaffold AND star-alignment both
render inside the frame with `npm run dev`; vitest covers html injection,
virtual module, registration→mount; no new runtime deps.

### P3 — Template extraction (tech debt) + chat unification
Move inline template strings out of create.js into real files under
`packages/create-quox-plugin/templates/` consumed by the generator
(mechanical, no output change — verify by diffing scaffold output pre/post).
Then replace the two mock chat overlays with real `AgentChatSidebar` +
the canonical collapsible content+aside layout. No other template redesign
(rabbit-hole guard).

### P4 — Host listener for quox-open-agent-chat (quox-dashboard)
AppShell-level listener rendering AgentChatPanel in a right-side glass panel
(Bastion-conventions: 360px, collapse, glass tokens). Minimal, verified via
clarify-mcp.

### P2 — Types + docs (LAST, so docs describe shipped reality)
Window.__quoxGlass interface in types.d.ts (component props included);
plugin-api.md `__quoxGlass` section + chat.openSidebar; document the
manifest→chat-able-agent path; getting-started.md gains the dev loop.

## Out of scope (explicit)
- manifest.backend expansion (network allowlists, CLI exec, inbound
  webhooks) — deferred to QuoxTrade graduation planning (GRAD/RES.5).
- Any host right-sidebar SLOT in AppShell (plugins own their asides).
- Redesigning template UIs beyond the chat unification.

## Decisions log
- 2026-07-03 — Stream approved; roadmap entry SDK-DX added (IN_PROGRESS).
  Order: P1 → P3 → P4 → P2.
- 2026-07-03 — P1 live verification found + fixed 6 harness bugs (fs.allow
  lockout, dev-mode externals, raw-served client, proxy/port clobbering,
  unwired CSS, missing react-refresh preamble) and added the virtual
  bootstrap + router-shim designs. Scaffold verified rendering framed with
  agent placeholder; star-alignment verified but stays build-only until
  RES.2 (framed = unstyled, its styles are dev-only).
- 2026-07-03 — Harness caught two shipping-blockers on first use: templates
  reference unpublished npm names (couldn't install), and specialist-agent's
  token shapes would crash in the real host (P3b, fixed same day).
- 2026-07-03 — npm publish DEFERRED to launch (Adam: "nobody needs it yet").
  Scaffolder emits absolute file: paths to the local SDK checkout when
  present; registry semvers once published. Publish prep done (metadata,
  clean pack dry-runs; names verified free).
- 2026-07-03 — P2 shipped; PluginAPI type/mocks extended with the PSDK-4
  surfaces (navigate/getUser/chat) after the docs pass exposed the gap.
- Known pre-existing flake (NOT this stream): eslint-plugin-quox-plugin's
  no-cache-as-primary-storage.test.js uses node:test, vitest intermittently
  reports "No test suite found". All real tests green.

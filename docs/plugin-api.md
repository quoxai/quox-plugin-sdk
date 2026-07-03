# Plugin API Reference

Every third-party plugin runs inside a `PluginSandbox` component that provides a scoped API via React context. Access it with the `usePluginApi()` hook.

## Importing

In your plugin views:

```jsx
// The usePluginApi hook is available from the PluginSandbox context
// QuoxCORE injects it — no import needed from your plugin code.
// Access it from the context:
const api = window.__quoxPluginApi; // available after activation
```

Or if testing locally with the SDK:

```jsx
import { usePluginApi } from 'quox-plugin-sdk';
```

## API Methods

### `api.pluginId`

The unique identifier for your plugin. Read-only.

```js
console.log(api.pluginId); // "my-plugin"
```

---

## Persistence — pick the right primitive

Three primitives, three jobs. Picking the wrong one is how plugins lose user data.

| API | Where it lives | Survives browser reset? | Cross-device? | Use for |
|---|---|---|---|---|
| `api.cache` | Browser localStorage (this device only) | ❌ | ❌ | Transient UI state, last-tab, scroll position |
| `api.durable` | Server (auth.db, org-scoped) | ✅ | ✅ | Anything the user expects to keep |
| `api.secrets` | Server, encrypted at rest | ✅ | ✅ | Tokens, API keys, credentials |

**Rule of thumb:** if the user typed it, picked it, or generated it — `durable` or `secrets`. If it's a short-lived UI hint that's fine to lose — `cache`.

---

### `api.cache`

Plugin-namespaced browser cache. Backed by localStorage on this device only — not synced, not durable. The runtime warns once per session if a plugin uses `cache` without also using `durable` or `memory`.

```js
api.cache.set('lastTab', 'overview');
const tab = api.cache.get('lastTab');   // null if not set
api.cache.remove('lastTab');
const keys = api.cache.keys();          // ['lastTab', ...]
```

**Limits:** ~5 MB per origin shared with all plugins on this device. Keep entries small.

> **`api.storage` is a deprecated alias of `api.cache`.** It will be removed in
> a future minor release. Existing plugins keep working; new plugins should
> use `api.cache` directly.

---

### `api.durable`

Server-backed durable KV. Org-scoped by default; pass `{ scope: 'user' }` for per-user data. Reads and writes are HTTPS round-trips, so prefer batching for hot paths.

```js
// Org-scoped — every member of the org sees the same value
await api.durable.set('repo_count', 42);
const n = await api.durable.get('repo_count');

// User-scoped — only the calling user
await api.durable.set('view_pref', 'compact', { scope: 'user' });
const pref = await api.durable.get('view_pref', { scope: 'user' });

await api.durable.remove('repo_count');
const keys = await api.durable.keys();   // ['repo_count', ...]
```

Survives container rebuilds, browser cache clears, private windows, device switches, and is included in backups automatically.

---

### `api.secrets`

Per-plugin encrypted secrets vault. Plaintext is returned only by `get()`, and every read emits a `plugin.secret_accessed` audit row. `set()` and `remove()` require org-admin role; `get()` and `list()` are available to any org member so plugins can read their own credentials at runtime.

```js
// Admin sets the secret once via the plugin's setup UI
await api.secrets.set('github_token', 'ghp_xxx', { description: 'GitHub PAT' });

// Plugin reads at runtime — server decrypts, audit logged
const token = await api.secrets.get('github_token');

await api.secrets.list();                // ['github_token', ...]
await api.secrets.remove('github_token');
```

The database stores only AES-256-GCM ciphertext; plaintext never crosses an unauthenticated boundary.

---

### `api.config`

Access and modify the plugin's configuration (stored via QuoxCORE's plugin config system).

```js
// Get current config (merged with schema defaults)
const config = api.config.get();
// { refreshInterval: 30, theme: 'dark' }

// Save new config
api.config.save({ refreshInterval: 60, theme: 'light' });
```

---

### `api.fetch(path, options?)`

Make HTTP requests to your plugin's backend service. Requests are proxied through the QuoxCORE collector to your Docker container.

```js
// GET request
const res = await api.fetch('/api/status');
const data = await res.json();

// POST request
const res = await api.fetch('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ target: '10.0.0.0/24' }),
});

// The actual request goes:
// Browser → Collector (/api/v1/plugins/my-plugin/api/scan) → Container
```

**Authentication:** Requests include the user's session credentials automatically.

**Requires:** `network` permission in manifest.

---

### `api.notify(message, type?)`

Show a toast notification in the QuoxCORE UI.

```js
api.notify('Scan complete: 42 hosts found', 'success');
api.notify('Connection lost', 'error');
api.notify('Update available', 'info');
api.notify('Rate limit approaching', 'warning');
```

**Types:** `info` (default), `success`, `warning`, `error`

**Requires:** `notifications` permission in manifest.

---

### `api.memory`

Read and write to QuoxCORE's memory system. Useful for storing observations, facts, and decisions that agents can later recall.

```js
// Save a memory entry
await api.memory.save({
    type: 'observation',  // fact, preference, decision, observation, entity
    content: 'Port scan found SSH open on 10.0.0.5',
    tags: ['security', 'network'],
});

// Search memories
const results = await api.memory.search('SSH open ports', 10);
// Returns matching memory entries with relevance scores
```

All memory entries are tagged with `source: plugin:your-plugin-id` for traceability.

**Requires:** `memory` permission in manifest.

---

### `api.aee`

Emit events into the AEE (Agent Envelope Exchange) audit trail. Agents and other plugins can observe these events.

```js
await api.aee.emit('plugin.scan.complete', {
    hostsFound: 42,
    duration: 12500,
    subnet: '10.0.0.0/24',
});
```

Events are recorded in the AEE store and visible in the Activity view.

**Requires:** `aee` permission in manifest.

---

### `api.chat`

Open QuoxCORE's real agent chat UI, docked to the right side of the app shell.

```js
api.chat.openSidebar('sentinel', {
    agentName: 'SENTINEL',
    agentColor: '#30ff90',
    additionalContext: 'User is viewing the network scan results for 10.0.0.0/24.',
    width: 360, // optional — this is also the dock's own default
});
```

**What it does:** `openSidebar(agentId, options)` dispatches a `quox-open-agent-chat` `CustomEvent` on `window` with `{ agentId, ...options }`. QuoxCORE's `AppShell` listens for that event (SDK-DX P4) and mounts a right-side `AgentChatPanel` dock (`.app-shell__agent-dock`) — a **live, working agent conversation**, not a mock. `options` (`agentName`, `agentColor`, `additionalContext`, `width`) are passed straight through to `AgentChatPanel` — see [`AgentChatPanelProps`](../packages/quox-plugin-sdk/src/types.d.ts).

Close it programmatically by dispatching the matching close event:

```js
window.dispatchEvent(new CustomEvent('quox-close-agent-chat'));
```

The user can also collapse the dock to a 48px rail or close it from its own header controls.

**`agentId` must resolve to a real agent** — a core QuoxCORE agent id, or one your plugin registered from `manifest.agentDefinition` / `manifest.agentPersona` (see [Registering a chat-able agent from manifest.json](#registering-a-chat-able-agent-from-manifestjson) below). Passing an id nothing has registered opens the dock UI but there is no agent behind it to answer.

**Requires:** no explicit `manifest.permissions` entry today — `chat.openSidebar` is unconditionally available on `api`. If you want a *specific* agent to appear, that agent must exist first.

## File Storage (FU-1)

QuoxCORE ships a unified file store (the **file_objects** service) that every plugin can read from and write to. Files are org-scoped, content-addressed (SHA-256 dedup within an org), and persist independent of any individual plugin — QuoxChat knowledge uploads, NanoBanana generated images, and user uploads via the Files plugin all land in the same store.

Plugins interact with it through three pieces shipped by the core:

**`useFileService({ authFetch, orgId })`** — feature-detection hook. Returns `{ loading, available, uploadEndpoint, listEndpoint, maxSize }`. Call it at mount; render conditional UI based on `available`.

**`<FileDropZone />`** (from `src/components/files/shared/FileDropZone`) — accessible drag-drop + click-browse zone. Props: `accept`, `maxSize`, `multiple`, `onFiles(files)`. Handles validation; rejected files never reach your callback.

**`<FilePicker />`** (from `src/components/files/shared/FilePicker`) — modal browser over `GET /api/orgs/:orgId/files`. Props: `authFetch`, `orgId`, `namespacePrefix`, `onPick(file)`. Use `namespacePrefix` to scope the list (e.g. `quoxchat/wgt_xxx/` to only show that widget's knowledge files).

**Direct API client** (`src/services/fileObjectsClient.js`):

```js
import { upload, list, get, download, rename, remove } from 'src/services/fileObjectsClient'

const uploaded = await upload({
  authFetch, orgId: currentOrg.id,
  namespace: 'my-plugin',              // free-form string, no leading slash
  file: someFile,                      // File object
  sourcePlugin: 'my-plugin',           // surfaces in Files UI as "from my-plugin"
  sourceRef: 'message_01jxxxx',        // optional link back to your own entity
  metadata: { category: 'invoice' },   // arbitrary JSON blob
})
// → { id, org_id, namespace, virtual_path, sha256, blob_path, ... }

const { items, pagination } = await list({
  authFetch, orgId, namespacePrefix: 'my-plugin', limit: 50,
})
```

**Namespacing convention:** pick a stable prefix for your plugin — use the plugin id (`my-plugin`) for general files, or scope further (`my-plugin/<entity_id>/<subfolder>`) when you need isolation within a plugin. This is what lets `<FilePicker namespacePrefix="my-plugin/">` scope correctly.

**Auth + permissions:** reads go through `requireAuth` + `requireOrgMembership`. Cross-org reads return 403. Pass `authFetch` from `useAuth()` — never bare `fetch`.

**File size limit:** 25 MB default (`DEFAULT_MAX_SIZE` from `useFileService`). Server enforces the same cap; override per-plugin by tightening the hook's `maxSize` prop.

## `__quoxGlass` component library

QuoxCORE injects a library of ready-made glass-design-system components onto `window.__quoxGlass` before your plugin's entry module runs (`initPluginHost()`, PSDK-2). Use them so your plugin's UI matches the rest of the app instead of hand-rolling cards, pills, and chat panels.

**Availability:**

| Context | Source | Fidelity |
|---|---|---|
| Production (installed `.quoxplugin`) | `thirdPartyPluginHost.js` exports the real quox-dashboard components | Full — same components the core app uses |
| `npm run dev` (quox-plugin-vite dev host, P1) | `dev-host/client.js` installs a **functional but simplified** approximation under the same names | Partial — see caveats below |
| Unit tests (`quox-plugin-sdk/testing`) | `setupGlassMocks()` installs `data-testid`-only stub components | Structural only — asserts wiring, not visuals |

### `getGlassComponents()`

```js
import { getGlassComponents } from 'quox-plugin-sdk';

const { GlassPanel, GlassPill, AgentChatSidebar, COLORS } = getGlassComponents();
```

Throws `"@quox/glass not available. Is the plugin running inside QuoxCORE v1.1+?"` if `window.__quoxGlass` isn't present yet — call it from inside a component/hook, not at module top level. Equivalent to reading `window.__quoxGlass` directly (what the entry-point examples elsewhere in this doc do), just with the missing-global error message built in.

### What's available

- **Chat patterns:** `AgentChatSidebar` (lightweight, docked sidebar chat — the same primitive behind 14+ built-in `*ChatSidebar.jsx` surfaces), `AgentChatPanel` (fuller multi-tab chat panel with a 48px collapsed rail). Both take an `agentId` and render nothing useful until that id resolves to a registered agent — see [Registering a chat-able agent](#registering-a-chat-able-agent-from-manifestjson) below.
- **Glass primitives:** `GlassPanel`, `GlassPill`, `GlassTabBar`, `SectionHeader`, `ProgressRing`, `Sparkline`, `GlassSkeleton`, `GlassError`.
- **Design tokens:** `COLORS`, `STATUS_COLORS`, `PROTOCOL_COLORS` (color hex values), `M` (monospace font stack), `F` (sans-serif font stack).
- **Content rendering:** `MarkdownContent` — the same markdown renderer (`react-markdown` + `remark-gfm`) used throughout QuoxCORE.

Full prop types for every component are in [`packages/quox-plugin-sdk/src/types.d.ts`](../packages/quox-plugin-sdk/src/types.d.ts) (`QuoxGlassComponents` and friends), typed against the production implementations.

### AgentChatPanel / AgentChatSidebar usage — collapsible grid pattern

The canonical layout for a plugin view with a docked agent chat is a two-column CSS grid that collapses the chat column to 48px:

```jsx
const { GlassPanel, AgentChatSidebar } = window.__quoxGlass;
const { useState } = window.__quoxSharedDeps.React;

export default function MainView() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: collapsed ? '1fr 48px' : '1fr 340px',
            gap: 12,
            height: '100%',
        }}>
            <div style={{ overflow: 'auto', padding: 16 }}>
                <GlassPanel>
                    <p>Your plugin's main content goes here.</p>
                </GlassPanel>
            </div>

            <AgentChatSidebar
                agentId="my-plugin"
                agentName="MY-PLUGIN"
                agentColor="#38bdf8"
                collapsed={collapsed}
                onToggle={() => setCollapsed((c) => !c)}
                suggestions={['What changed today?', 'Summarize the last scan']}
            />
        </div>
    );
}
```

This is the `1fr 340px` ↔ `1fr 48px` grid pattern used by the `specialist-agent` template — prefer it over `position: fixed` overlays.

### Honest caveats — dev vs. production

- **`npm run dev`'s `AgentChatPanel`/`AgentChatSidebar` are NOT live agents.** The dev host renders a static "dev preview — live agent runs inside QuoxCORE" placeholder with a disabled input. Prop plumbing (collapse/expand, header content, width) works; there is no chat behind it. Real chat only exists once the plugin is installed inside a running QuoxCORE (or via `api.chat.openSidebar`, see below).
- **`window.__quoxPluginApi` in dev is an in-memory mock**, not the real server-backed `api.durable`/`api.secrets`. `api.durable`/`api.secrets` resolve against `Map`s that reset on every page reload — nothing persists across a dev-server restart. `api.fetch()` always returns `{}`. Use this to prove out UI wiring, not to test persistence.
- **Some dev-mock component props are simplified relative to production** — e.g. the dev `GlassPanel` only understands `title`/`className`/children, while the production `GlassPanel` also supports `highlight`, `hoverable`, and `onClick`. The dev host is a best-effort visual approximation, not a byte-for-byte reimplementation; always sanity-check the real thing by installing a build inside QuoxCORE before shipping.

## Registering a chat-able agent from manifest.json

A plugin can register a real, chat-able QuoxCORE agent — one that appears in `AgentChatPanel`/`AgentChatSidebar`, can be delegated to by CommanderQ, and is reachable via `api.chat.openSidebar()` — purely by declaring it in `manifest.json`. No extra runtime code is required; `thirdPartyPluginHost.js` reads these fields at **activation** time (`activateThirdPartyPlugin()`, PSDK-3) and tears the registration down again at **deactivation** (`deactivateThirdPartyPlugin()`) — nothing lingers in the agent registry after your plugin is disabled or uninstalled.

Three optional top-level manifest fields, all independent:

| Field | Registered into | Effect |
|---|---|---|
| `agentDefinition` | `agentRegistry.agents[id]` + `agentRegistry.hierarchy.pluginAgents` + CommanderQ's `canDelegateTo` list | Makes the agent a delegation target and gives it capabilities/tools/autonomy metadata |
| `agentPersona` | `assistants[id]` (via `entityRegistry`'s `getAssistant()`) | Gives the agent a name/color/voice/system-prompt so `AgentChatPanel`/`AgentChatSidebar` can render and chat with it |
| `delegatorKeywords` | `agentDelegator`'s keyword table, keyed by `agentDefinition.id \|\| pluginId` | Lets CommanderQ route free-text queries to your agent by keyword match |

In practice you want **`agentPersona` at minimum** (for chat to render sensibly) and usually `agentDefinition` too (to be delegation-reachable from CommanderQ, not just directly via `api.chat.openSidebar`).

### Minimal worked example

```jsonc
// manifest.json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "agentPersona": {
    "id": "my-plugin",
    "name": "MY-PLUGIN",
    "shortName": "MYPLG",
    "voice": "american-male-1",
    "color": "#38bdf8",
    "colorRgb": "56,189,248",
    "specialty": "Network scan triage",
    "description": "Summarizes and prioritizes findings from My Plugin's scans.",
    "llm": { "provider": "anthropic", "model": "claude-sonnet-4-5", "temperature": 0.4, "maxTokens": 2048 },
    "systemPrompt": "You are MY-PLUGIN, a specialist that explains network scan results in plain language."
  },
  "agentDefinition": {
    "id": "my-plugin",
    "name": "MY-PLUGIN",
    "role": "specialist",
    "level": 2,
    "domain": "network-scanning",
    "description": "Summarizes and prioritizes findings from My Plugin's scans.",
    "systemPrompt": "You are MY-PLUGIN, a specialist that explains network scan results in plain language.",
    "personality": { "tone": "concise", "verbosity": "medium", "formality": "professional", "traits": ["precise", "helpful"] },
    "capabilities": ["scan_summary", "risk_triage"],
    "tools": [],
    "defconLevel": "GREEN",
    "autonomy": {
      "canRunAutonomously": false,
      "budget": { "maxTokensPerRun": 20000, "maxToolCallsPerRun": 10, "maxDurationMs": 60000, "maxDailyRuns": 50 },
      "escalation": { "onHighRisk": "ESCALATE", "onBudgetWarning": "ESCALATE", "onFailure": "ESCALATE", "maxRetries": 1 }
    },
    "suggestions": ["Summarize the last scan", "What's my highest-risk host?"]
  },
  "delegatorKeywords": ["network scan", "port scan", "vulnerability triage"]
}
```

With this in place, once the plugin is installed and activated:

```jsx
const { AgentChatSidebar } = window.__quoxGlass;
// renders a real, working chat with MY-PLUGIN
<AgentChatSidebar agentId="my-plugin" agentName="MY-PLUGIN" agentColor="#38bdf8" />
```

```js
// from anywhere else in QuoxCORE (or your own plugin code)
window.__quoxPluginApi['my-plugin'].chat.openSidebar('my-plugin');
```

**Notes on the real behavior, not the aspiration:**
- `ownership` on `agentDefinition` is set by the host itself (`{ source: 'plugin', plugin: pluginId }`) — don't bother declaring it, it's overwritten on activation.
- `agentDefinition.id` (falling back to your plugin's own `id`) is the key used for `agentRegistry`, delegator keywords, **and** teardown on deactivate — keep `agentPersona.id` in sync with it if you declare both, or the two registrations can key differently and the chat/delegation experience gets inconsistent.
- None of this is validated against `AgentDefinition`/`AgentPersona`'s full TypeScript shape at runtime — the host duck-types whatever you provide straight into the registries. The full field lists in [`types.d.ts`](../packages/quox-plugin-sdk/src/types.d.ts) describe the complete schema (budgets, escalation policy, etc.) for agents that want autonomous runs; a chat-only agent can omit most of it.

## Error Handling

All API methods are safe to call — they won't crash your plugin. Network errors are caught and logged. If the collector is unreachable, `fetch`, `memory`, and `aee` methods will return error responses rather than throwing.

## Testing

The SDK provides a mock API for testing:

```js
import { createMockPluginApi } from 'quox-plugin-sdk/testing';

const api = createMockPluginApi('my-plugin');

// Storage works with an in-memory Map
api.storage.set('key', 'value');
expect(api.storage.get('key')).toBe('value');

// fetch returns empty 200 responses
const res = await api.fetch('/test');
expect(res.status).toBe(200);

// memory and aee return success
const result = await api.memory.save({ type: 'fact', content: 'test' });
expect(result.success).toBe(true);
```

There's also a `setupGlassMocks()` helper for components that consume `window.__quoxGlass`:

```js
import { setupGlassMocks, teardownPluginTestEnv } from 'quox-plugin-sdk/testing';

beforeEach(() => setupGlassMocks());
afterEach(() => teardownPluginTestEnv());

// window.__quoxGlass.GlassPanel etc. now render minimal
// <div data-testid="GlassPanel">{children}</div> stand-ins — good for
// asserting your component renders/wires props, not for visual testing.
```

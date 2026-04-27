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

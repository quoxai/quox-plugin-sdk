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

### `api.storage`

Scoped key-value storage in the browser's localStorage. All keys are automatically namespaced to your plugin — you cannot access other plugins' data.

```js
// Store a value
api.storage.set('lastScan', { timestamp: Date.now(), results: 42 });

// Retrieve a value (returns null if not found)
const lastScan = api.storage.get('lastScan');

// Remove a value
api.storage.remove('lastScan');

// List all keys (your plugin's keys only)
const keys = api.storage.keys();
// ['lastScan', 'settings', 'cache']
```

**Limits:** localStorage is limited to ~5MB per origin. Keep stored data small.

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

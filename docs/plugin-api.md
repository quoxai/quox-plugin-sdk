# Plugin API Reference

Community (third-party) Quox plugins run inside a sandboxed iframe: `sandbox="allow-scripts"`, an opaque origin, and a Content-Security-Policy with `connect-src 'none'`. The plugin cannot touch the host page, cookies, host storage or the network. Everything it needs from Quox goes through one object, `window.quox`, which proxies calls to the host over `postMessage`.

This page describes exactly what exists inside that frame. Anything not listed here does not exist for a community plugin.

Plugins that Quox itself ships (signed with an official key) run in the host page instead and have a wider surface. That path is not covered by this SDK.

## Getting the API

```js
import { getQuox } from 'quox-plugin-sdk';

const quox = getQuox();          // same object as window.quox
```

`getQuox()` and `usePluginApi()` return the same object. Both throw a clear error when called outside a Quox host. `usePluginApi()` is a plain function (no React hooks inside), so it is safe to call during render.

Every method returns a Promise.

## Registering your plugin

Call `registerPlugin(pluginId, { routes, sidebar })` once at the bottom of your entry file. Components stay inside the frame; the host sends `route` events with path strings, and the shim mounts `routes[path]` into `#plugin-root` inside a `MemoryRouter`.

```jsx
import { registerPlugin, getQuox, getSharedDeps } from 'quox-plugin-sdk';

const { React } = getSharedDeps();

function Home() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    getQuox().storage.get('count').then((v) => setCount(v ?? 0));
  }, []);
  const bump = async () => {
    const next = count + 1;
    setCount(next);
    await getQuox().storage.set('count', next);
  };
  return <button className="my-btn" onClick={bump}>Clicked {count}</button>;
}

registerPlugin('my-plugin', {
  routes: { '/plugins/my-plugin': Home },
  sidebar: [{ path: '/plugins/my-plugin', label: 'My Plugin', icon: 'puzzle', section: 'Plugins' }],
});
```

## `window.quox`

### `quox.pluginId`

Your manifest id.

### `quox.storage`

Server-backed key/value store scoped to your plugin. Survives browser clears and syncs across devices. Values must be structured-cloneable.

```js
await quox.storage.set('prefs', { theme: 'dark' });
const prefs = await quox.storage.get('prefs');   // null when missing
await quox.storage.remove('prefs');
const keys = await quox.storage.keys();
const all = await quox.storage.getAll();         // { key: value, ... }
```

Do not use `localStorage` or `sessionStorage` as your store. Inside the frame they are not reliable, and they are browser-only in any case.

### `quox.fetch(path, { method, headers, body })`

Calls your plugin's own backend namespace, `/collector/api/v1/plugins/<id>/...`. The path is relative to that namespace; absolute URLs and `..` traversal are refused, and the allowed HTTP methods are allowlisted.

```js
const res = await quox.fetch('items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x' }) });
if (res.ok) {
  const data = JSON.parse(res.body);   // body is the raw response text
}
```

It resolves with `{ status, ok, body }` and does not throw on a non-2xx status. Check `ok` (or `status`) before parsing `body`.

The global `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` are blocked by the CSP. Use `quox.fetch`.

### `quox.memory`

> Not available yet. @experimental: the host exposes these methods but community plugins cannot use them yet. After the `memory` permission check passes, every call rejects with `Error('not_available: memory')` and nothing is sent. Use `quox.storage` or your plugin's own backend meanwhile. Do not build on the example below.

```js
await quox.memory.save({ type: 'observation', content: 'Customer prefers email', tags: ['crm'] });
const hits = await quox.memory.search('customer preferences', 10);
```

### `quox.aee`

> Not available yet. @experimental: after the `aee` permission check passes, `emit` rejects with `Error('not_available: aee')` and nothing is sent. Use your plugin's own backend for audit logging meanwhile.

```js
await quox.aee.emit('my-plugin.report.generated', { reportId: 'r1' });
```

### `quox.navigate(path)` and `quox.notify(message, type?)`

```js
await quox.navigate('/plugins/my-plugin/settings');
await quox.notify('Saved', 'success');   // 'info' | 'success' | 'warning' | 'error'
```

### `quox.getUser()`

```js
const { userId, orgId, role, tier } = await quox.getUser();
```

### `quox.onEvent(fn)`

Sets the handler for host events. Synchronous; one handler at a time.

```js
quox.onEvent((method, args) => {
  if (method === 'route') console.log('navigated to', args[0]);
});
```

## Shared dependencies

`window.__quoxSharedDeps` provides `React`, `ReactDOM` (including `createRoot`), `ReactRouterDOM` and `ReactJSXRuntime`. Use `getSharedDeps()` to read them. Mark these as externals in your bundler (the scaffold does this).

## Styling

Only your own `plugin.css` is injected into the frame. Host stylesheets are not present, so `qx-*` classes and other host styles do nothing unless your `plugin.css` defines them. There is no component library: build your UI from React and your own CSS.

## What does not exist

| You may have seen | Status in the community sandbox |
|---|---|
| `api.durable`, `api.cache`, `api.secrets`, `api.config`, `api.chat` | Do not exist. Use `quox.storage`. |
| `window.__quoxGlass`, `getGlassComponents()` | Throwing stub. Removed from the SDK. |
| `__quoxSharedDeps.CapabilityPanels`, `WorkspaceContext`, `AuthContext`, `LicenseValidator`, `ServerSyncQueue`, `OrgScopedStorage` | Throwing stubs. |
| Direct `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` | Blocked by CSP. Use `quox.fetch`. |
| Agent and team registration from a manifest | Ignored in the sandbox. |

The ESLint plugin `eslint-plugin-quox-plugin` flags these (`no-host-only-globals`, `no-cache-as-primary-storage`).

## Permissions

The sandbox host enforces `manifest.permissions` on every `window.quox` call, fail-closed: an absent or non-array `permissions` grants nothing. A refused call rejects with `Error('permission_denied: <perm>')`.

| Call | Permission needed |
|------|-------------------|
| `storage.get`, `storage.set`, `storage.remove`, `storage.keys`, `storage.getAll` | `storage` |
| `fetch` | `network` |
| `memory.save`, `memory.search` | `memory` (not available yet: rejects `not_available`) |
| `aee.emit` | `aee` (not available yet: rejects `not_available`) |
| `notify` | `notifications` |
| `navigate`, `getUser`, `onEvent` | none |

`sidebar` and `tools` are declarative only: they are listed for the admin but not enforced on calls. The admin reviews the declared permissions at install time, so declare exactly what you use.

The same map is exported as `COMMUNITY_PERMISSION_FOR_METHOD` from `quox-plugin-sdk` (type `PluginPermission`). Three tools check it for you:

- The dev preview (`quox-plugin-vite`) enforces your `manifest.json` permissions with the same error text, so a missing declaration fails in dev exactly as in production.
- `quox-plugin validate` scans the built bundle: a call whose permission is not declared is an error naming the permission to add; a declared but unused permission is a warning (least privilege). The scan is a regex over member names (`.storage.`, `.fetch(`, `.memory.`, `.aee.emit`, `.notify(`), so it can over-report if unrelated code has a method with one of those names.
- `createMockQuox({ permissions })` / `createMockQuox({ manifest })` enforce the gate in unit tests. With neither (and no `strictPermissions: true`) everything is granted, for convenience.

## Manifest

`manifest.json` requires `id`, `name` and `version`. The id must match `MANIFEST_ID_PATTERN` (`^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`) and must not start with a reserved prefix (`core-`, `system-`, `quox-`, `admin-`). Both constants are exported from `quox-plugin-sdk`, along with `validateManifestId(id)`.

Fields the host reads: `id`, `name`, `version`, `author`, `permissions`, `sidebar`, `routeGuards`, `integrity`, `backend`. Fields such as `agentDefinition`, `team`, `comparison` and the marketing fields are accepted for official plugins and ignored by the community sandbox. See `PluginManifest` in `types.d.ts`.

## Testing

`quox-plugin-sdk/testing` provides an in-memory mock of `window.quox`.

```js
import { installMockQuox, uninstallMockQuox } from 'quox-plugin-sdk/testing';

afterEach(() => uninstallMockQuox());

it('saves a preference', async () => {
  const quox = installMockQuox({
    pluginId: 'my-plugin',
    fetch: (path) => (path === 'items' ? { status: 200, body: [{ id: 1 }] } : { status: 404 }),
  });

  await quox.storage.set('theme', 'dark');
  expect(quox.storageMap.get('theme')).toBe('dark');

  const res = await quox.fetch('items');
  expect(JSON.parse(res.body)).toEqual([{ id: 1 }]);
});
```

Defaults: `getUser()` returns `{ userId: 'user_test', orgId: 'org_test', role: 'admin', tier: 'free' }` (override with `user`), and `fetch` returns 404 unless you pass a handler. `memory.*` and `aee.emit` reject with `not_available: memory` / `not_available: aee` (after the permission check), like the host today; pass `simulateUnavailable: false` only to test future behaviour. `NOT_AVAILABLE_METHODS` (exported from `quox-plugin-sdk`) lists them. Inspection helpers: `storageMap`, `memoryStore`, `aeeLog`, `notifyLog`, `navigateLog`, `registered`, and `emitEvent(method, args)` to drive `onEvent`. `installMockQuox()` also installs `window.usePluginApi` and a recording `window.__quoxPluginRegister`.

`createMockQuox(opts)` builds the mock without installing it.

The old `createMockPluginApi`, `setupPluginTestEnv`, `teardownPluginTestEnv` and `setupGlassMocks` helpers now throw an error naming the replacement.

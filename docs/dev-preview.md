# Dev preview (sandbox simulation)

`vite` (via `@quoxai/quox-plugin-vite`) serves a preview that runs your plugin the way QuoxCORE
runs a community plugin, not the way the dashboard runs first-party code.

## What the preview does

- Your plugin runs in an `<iframe sandbox="allow-scripts">` with the host's CSP
  (`default-src 'none'`, `connect-src 'none'`): no network, no parent DOM, no cookies.
- Only `React`, `ReactDOM`, `ReactRouterDOM` and `ReactJSXRuntime` exist on
  `window.__quoxSharedDeps`. `CapabilityPanels`, `WorkspaceContext`, `AuthContext`,
  `LicenseValidator`, `ServerSyncQueue`, `OrgScopedStorage` and `window.__quoxGlass` are
  stubs that throw `[quox-plugin] <name> is not available in isolated plugins; use window.quox RPC instead`.
- `window.quox` is the host's postMessage RPC. The dev server answers it with an in-memory
  mock: `storage`, `notify` (shows a toast), `navigate`, `getUser`
  (`dev-user`, `dev-org`, `admin`, `pro`). `memory.*` and `aee.emit` reject with `not_available`
  (after the permission check), like the host today. State lives until the dev server stops.
- `window.quox.fetch(path)` is forwarded to a dev backend if you set `devBackendUrl` (or
  `QUOX_DEV_BACKEND_URL`), as `<backend>/collector/api/v1/plugins/<id><path>`. With none set
  it answers 404 `dev_backend_not_configured`. Absolute URLs, traversal and unlisted methods
  are refused exactly like the host.
- Styling: the build and the preview put the vendored `qx-*` component css, with its design
  tokens, in front of your own css in `plugin.css`. Opt out with `quox({ qxCss: false })`.

```js
// vite.config.js
import quox from '@quoxai/quox-plugin-vite';
export default { plugins: [quox({ pluginId: 'my-plugin', devBackendUrl: 'http://localhost:4000' })] };
```

## Hot reload

The sandbox cannot load module URLs, so the dev server runs a watch build of your plugin
(production mode, unminified, lazy chunks inlined) and inlines the result into the frame.
On every rebuild the preview re-creates the frame. Component state is NOT preserved (no HMR).
A failed build shows the error in a banner and recovers on the next good save.

## Differences from production

- React in the preview comes from your project's `node_modules`. The host ships its own
  version; test against the host before release.
- Lazy `import()` chunks are inlined in the preview only.
- Set `devHost: false` to disable all of this and get a plain Vite dev server.

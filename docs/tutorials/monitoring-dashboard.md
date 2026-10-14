# Building a Monitoring Dashboard Plugin

A status table refreshed every 60 seconds, with a settings panel for the service URL and an API key.

## 1. Scaffold

```bash
npx @quoxai/create-quox-plugin service-status --template monitoring-dashboard
cd service-status && npm install
```

Files specific to this template: views/MainView.jsx, views/SettingsPanel.jsx, hooks/usePolling.js, data/mock.js. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const status = useLoad(() => api('/status'));
usePolling(status.reload, 60000);
```
`api('/status')` is `getQuox().fetch('/status')` against YOUR plugin backend. The plugin frame cannot call Grafana or Prometheus; the backend does, and returns `{ "services": [{ id, name, status, responseMs, uptimePct, lastCheck }] }`.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`GET /status` (required), `POST /config` (receives the API key). The API key is a secret: `useConfig` sends it to the backend and never writes it to browser-visible plugin storage. Until `/status` answers, the view shows an error banner and clearly labelled sample data.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add `nocIntegration.quickActions` in the manifest, and a `POST /restart` route plus a button using `api('/restart', { method: 'POST' })`.

## 6. Ship it

```bash
npm run build
npm run validate
npx quox-plugin keygen --out .keys     # one time, keep .keys/ private
npm run sign
```

Upload the built plugin from the Quox dashboard plugins page. See [Signing](../signing.md).

## Sandbox reminders

- No direct network. Only `getQuox().fetch('/path')` to your own plugin backend.
- No host components or contexts. Style with `qx-*` classes.
- Components get no props. Use `getQuox()`.
- Design rules: white text on dark, no grey text, buttons use `qx-btn`.

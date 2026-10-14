# Integrating a Third-Party Service

Connection status, item cards and metrics from a third-party service, plus a notes panel.

## 1. Scaffold

```bash
npx @quoxai/create-quox-plugin acme-bridge --template service-bridge
cd acme-bridge && npm install
```

Files specific to this template: views/MainView.jsx, views/SettingsPanel.jsx, components/AgentSidebar.jsx, data/mock.js. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const [status, items] = await Promise.all([api('/status'), api('/items')]);
```
The notes panel (`AgentSidebar.jsx`) keeps notes in plugin storage. `window.quox.memory` is coming but is not available to community plugins yet (calls reject with `not_available`), so use storage or your own backend meanwhile. The specialist agent in `manifest.json` chats in the host's own surface; the sandbox cannot embed it.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`GET /status` -> `{ connected }`, `GET /items` -> `{ items, metrics }`, `POST /config` (OAuth token, kept server-side). The backend holds the OAuth token and calls the third-party API.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add `POST /items` to your backend and a form that calls `api('/items', { method: 'POST', body })`. `window.quox.aee` is not available to community plugins yet (calls reject with `not_available`), so do any audit logging in your backend.

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

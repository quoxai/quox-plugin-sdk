# Building an Enterprise Plugin

Usage meters, feature cards and upgrade gates, with a backend skeleton and Dockerfile.

## 1. Scaffold

```bash
npx @quoxai/create-quox-plugin insight-suite --template enterprise-extension
cd insight-suite && npm install
```

Files specific to this template: views/MainView.jsx, views/SettingsPanel.jsx, components/{UsageMeter,UpgradeGate}.jsx, data/mock.js, backend/, Dockerfile. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const user = useLoad(() => getQuox().getUser());      // tier: free | pro | enterprise
const usage = useLoad(() => api('/usage'));
```
`window.quox.memory` is coming but is not available to community plugins yet (calls reject with `not_available`). Meanwhile keep data in plugin storage (`getQuox().storage`) or your own backend. The backend skeleton serves `GET /usage` and `GET /health`, exactly what the views fetch (the host proxies `quox.fetch('/usage')` to your backend's `/usage`).

`UpgradeGate` only dims a card and names the tier. It is display, not enforcement: your backend must check the caller's tier.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`backend/server.js` is an Express skeleton with `/health` and `/api/data`; add `GET /usage` returning `{ queriesUsed, queriesLimit, storageMb, storageLimitMb }`. See [Backend plugins](../backend-plugins.md) for the `backend` manifest block.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a tier check to a backend route and return 403; show that in the UI through the error banner.

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

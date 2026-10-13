# Building a Basic Plugin

The smallest sandbox-safe plugin: it reads the signed-in user with `getQuox().getUser()` and keeps a counter in plugin storage with `getQuox().storage`.

## 1. Scaffold

```bash
npx create-quox-plugin hello-quox --template basic
cd hello-quox && npm install
```

Files specific to this template: src/index.jsx, src/views/MainView.jsx, src/lib/{api,useLoad,ui}. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const user = useLoad(() => getQuox().getUser());
const visits = useLoad(() => loadValue('visits', 0));
```
`loadValue` and `saveValue` in `src/lib/api.js` wrap `getQuox().storage.get/set`. Storage is per-org and server-side, so the value follows the user across browsers.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

None. Everything here is a host RPC.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a second route (`/plugins/hello-quox/about`) in `registerPlugin` and `manifest.json`, and link to it with `getQuox().navigate(path)`.

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

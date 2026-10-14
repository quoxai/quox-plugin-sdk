# Building a Fleet Management Plugin

A host table with Restart and Remove actions behind a confirm modal, with an audit envelope for every action.

## 1. Scaffold

```bash
npx @quoxai/create-quox-plugin host-console --template fleet-management
cd host-console && npm install
```

Files specific to this template: views/MainView.jsx, views/SettingsPanel.jsx, components/ConfirmModal.jsx, data/mock.js. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
await api('/hosts/' + id + '/restart', { method: 'POST' });
```
`window.quox.aee` (audit envelopes) is coming but is not available to community plugins yet (calls reject with `not_available`), so the template does not use it and does not declare the `aee` permission. Meanwhile, record your audit trail in your own plugin backend.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`GET /hosts` -> `{ hosts: [...] }`, `POST /hosts/<id>/restart|remove`, `POST /config`. A sandboxed plugin cannot reach hosts, a bastion or a vault; your backend does. Governed fleet access and vault credentials belong to official plugins. While no backend answers, actions are simulated on sample data and say so in the toast.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a `force-stop` action: new button, new entry in `safety.destructiveActions` and `requiresApproval`, new intent.

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

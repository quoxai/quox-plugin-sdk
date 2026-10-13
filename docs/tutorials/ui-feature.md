# Building a UI Feature Plugin

A card grid with add and remove, persisted in plugin storage, with a settings panel and an empty state. No backend.

## 1. Scaffold

```bash
npx create-quox-plugin action-tracker --template ui-feature
cd action-tracker && npm install
```

Files specific to this template: views/MainView.jsx, views/SettingsPanel.jsx, components/EmptyState.jsx, data/mock.js. Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const stored = useLoad(() => loadValue('items', MOCK_ITEMS));
await saveValue('items', next);   // reverted in the UI if this rejects
```
Storage is server-side and per-org. Writes are optimistic; a failed write rolls the list back and shows a banner.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

None.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a `category` field to items, a `qx-select` filter above the grid, and read `sortOrder` from the saved config.

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

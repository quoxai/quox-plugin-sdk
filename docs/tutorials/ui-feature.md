# Building a UI Feature Plugin

Build a client-side plugin with persistent storage, a configurable card grid, empty state handling, licence gates, and dark theme compliance. No backend required.

## What you will build

- Card grid with add/remove operations
- Persistent storage via the plugin storage API (~5 MB, localStorage-backed)
- Settings panel with `select` and `boolean` config fields
- EmptyState component with call-to-action
- Licence gate for premium features
- Dark theme styling following QuoxCORE rules

## Prerequisites

- Node.js 18+, npm 9+, a running QuoxCORE instance

## 1. Scaffold the plugin

```bash
node packages/create-quox-plugin/bin/create.js action-tracker --template ui-feature
cd action-tracker && npm install
```

Generated structure:

```
action-tracker/
├── manifest.json
├── src/index.jsx
├── src/views/MainView.jsx
├── src/views/SettingsPanel.jsx
├── src/components/EmptyState.jsx
└── src/data/mock.js
```

## 2. Understand the manifest

The ui-feature template needs only three permissions:

```json
"permissions": ["sidebar", "storage", "notifications"],
"configSchema": {
    "sortOrder": { "type": "select", "label": "Default Sort", "default": "newest",
                   "options": ["newest", "oldest", "alphabetical"] },
    "showCompleted": { "type": "boolean", "label": "Show Completed", "default": true }
},
"comparison": {
    "free": { "Items": "25", "Categories": "3", "Export": false },
    "paid": { "Items": "Unlimited", "Categories": "Unlimited", "Export": true }
}
```

- No `network` permission -- everything runs client-side.
- `select` renders a dropdown. `boolean` renders a checkbox. Other types: `string`, `number`, `password`, `url`.
- `comparison` defines tier limits shown on the marketplace listing.

## 3. The storage API

Plugin storage is scoped to your plugin ID, backed by localStorage:

```js
pluginApi.storage.set('items', [{ id: '1', title: 'Test' }]);  // JSON-serialised
const items = pluginApi.storage.get('items');                    // returns null if missing
pluginApi.storage.remove('items');
const keys = pluginApi.storage.keys();                           // your plugin's keys only
```

The scaffolded MainView uses storage for persistence:

```jsx
const [items, setItems] = React.useState(() => {
    const saved = pluginApi?.storage?.get('items');
    return saved || MOCK_ITEMS;
});

React.useEffect(() => {
    if (pluginApi?.storage) pluginApi.storage.set('items', items);
}, [items]);
```

Load from storage on mount (fall back to mock data), save after every change.

## 4. Implement the config panel

The settings panel reads config with defaults and saves on button click:

```jsx
const [config, setConfig] = React.useState(() =>
    pluginApi?.config?.get() || { sortOrder: 'newest', showCompleted: true }
);
const handleSave = () => {
    pluginApi.config.save(config);
    pluginApi.notify('Settings saved', 'success');
};
```

Use the config in the main view:

```jsx
const config = pluginApi?.config?.get() || {};
const sortOrder = config.sortOrder || 'newest';
const showCompleted = config.showCompleted !== false;
```

## 5. The EmptyState pattern

The generated `EmptyState.jsx` shows a placeholder with icon, message, and action button:

```jsx
export default function EmptyState({ message, actionLabel, onAction }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>&#x1F4E6;</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>{message}</p>
            {actionLabel && onAction && (
                <button onClick={onAction} style={{
                    padding: '0.6rem 1.5rem', background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '8px', cursor: 'pointer',
                }}>{actionLabel}</button>
            )}
        </div>
    );
}
```

Use it when the list is empty:

```jsx
if (items.length === 0) {
    return <EmptyState message="No items yet" actionLabel="Add your first item" onAction={addItem} />;
}
```

The icon uses a Unicode character, not an SVG. This avoids the `currentColor` rendering issue on dark themes.

## 6. Dark theme styling rules

| Element | Style |
|---------|-------|
| Card background | `rgba(255,255,255,0.03)` |
| Card border | `1px solid rgba(255,255,255,0.08)` |
| Primary text | `rgba(255,255,255,0.85)` |
| Secondary text | `rgba(255,255,255,0.6)` to `0.7` |
| Minimum text/icon opacity | 0.6 (never lower on dark backgrounds) |
| SVG icons | Explicit `style={{ fill: '#10b981' }}` -- never `fill="currentColor"` |
| Accent | Teal `#14b8a6` or your own colour |

If an SVG does not render after one attempt, fall back to a Unicode character.

## 7. Add a licence gate

Enforce free-tier limits before adding items:

```jsx
const addItem = () => {
    const tier = pluginApi?.config?.get()?._tier || 'free';
    if (tier === 'free' && items.length >= 25) {
        pluginApi.notify('Free tier limit (25 items). Upgrade for unlimited.', 'warning');
        return;
    }
    setItems(prev => [...prev, { id: Date.now().toString(36), title: 'New Item',
        description: 'Click to edit', status: 'active', createdAt: new Date().toISOString() }]);
};
```

For feature gates (rather than counts), disable the button and show a label:

```jsx
const canExport = (pluginApi?.config?.get()?._tier || 'free') !== 'free';
<button onClick={handleExport} disabled={!canExport} style={{
    color: canExport ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.4)',
    cursor: canExport ? 'pointer' : 'not-allowed',
}}>Export {!canExport && '(Paid)'}</button>
```

## 8. Persist state across sessions

Storage persists automatically. Handle version migrations when your data shape changes:

```jsx
const STORAGE_VERSION = 2;
const [items, setItems] = React.useState(() => {
    if (!pluginApi?.storage) return [];
    const version = pluginApi.storage.get('storageVersion');
    const saved = pluginApi.storage.get('items');
    if (version !== STORAGE_VERSION && saved) {
        const migrated = saved.map(item => ({ ...item, category: item.category || 'uncategorised' }));
        pluginApi.storage.set('items', migrated);
        pluginApi.storage.set('storageVersion', STORAGE_VERSION);
        return migrated;
    }
    return saved || [];
});
```

Keep stored data small. For larger datasets, add a backend with the `network` permission.

## 9. Build, test, and install

```bash
npm run build    # produces action-tracker.quoxplugin
```

Install: **Settings > Community Plugins > Install Plugin** -- drop the file, review permissions (sidebar, storage, notifications only), click **Approve & Install**.

Test: open the plugin, add/remove items, reload the browser (items persist), change settings, verify sort order applies.

## Next steps

- [Backend Plugins](../backend-plugins.md) -- add cross-device sync
- [Service Bridge tutorial](./service-bridge.md) -- add a specialist agent
- [Enterprise Extension tutorial](./enterprise-extension.md) -- add usage meters and tiered pricing

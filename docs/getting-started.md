# Getting Started

This guide walks through building your first QuoxCORE plugin from scratch.

## Prerequisites

- Node.js 18+
- npm 9+
- A running QuoxCORE instance (for testing)

## Step 1: Scaffold Your Plugin

```bash
npx create-quox-plugin my-first-plugin
```

You will be prompted for:

```
Plugin name (kebab-case): my-first-plugin
Display name [My First Plugin]: My First Plugin
Category (Monitoring, Productivity, ...) [Other]: Productivity
Author: Your Name
Description: A simple QuoxCORE plugin
```

This creates a project with the following structure:

```
my-first-plugin/
├── manifest.json          # Plugin metadata and config
├── package.json           # npm scripts and dependencies
├── vite.config.js         # Build config (uses quox-plugin-vite)
├── .gitignore
└── src/
    ├── index.jsx          # Entry point (registers plugin)
    └── views/
        └── MainView.jsx   # Your main UI component
```

## Step 2: Install Dependencies

```bash
cd my-first-plugin
npm install
```

## Step 3: Write Your Plugin

### The Entry Point (`src/index.jsx`)

This file registers your plugin with QuoxCORE. It runs when QuoxCORE loads your plugin.

```jsx
const { React } = window.__quoxSharedDeps;
import MainView from './views/MainView';

window.__quoxPluginRegister('my-first-plugin', {
    // Routes to register (under /plugins/my-first-plugin/)
    routes: {
        '/plugins/my-first-plugin': MainView,
    },

    // Sidebar items to show
    sidebar: [
        {
            path: '/plugins/my-first-plugin',
            label: 'My First Plugin',
            icon: 'puzzle',
        },
    ],

    // Lifecycle hooks
    hooks: {
        onActivate() {
            console.log('My plugin activated');
        },
        onDeactivate() {
            console.log('My plugin deactivated');
        },
    },
});
```

### Your View Component (`src/views/MainView.jsx`)

Write a standard React component. QuoxCORE provides React via shared deps.

```jsx
const { React } = window.__quoxSharedDeps;
const { useState, useEffect } = React;

export default function MainView() {
    const [count, setCount] = useState(0);

    return (
        <div style={{ padding: '2rem', maxWidth: '800px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)' }}>
                My First Plugin
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
                Button clicked {count} times.
            </p>
            <button
                onClick={() => setCount(c => c + 1)}
                style={{
                    padding: '8px 16px',
                    background: 'rgba(20,184,166,0.2)',
                    border: '1px solid rgba(20,184,166,0.4)',
                    borderRadius: '8px',
                    color: 'rgba(255,255,255,0.9)',
                    cursor: 'pointer',
                }}
            >
                Click Me
            </button>
        </div>
    );
}
```

### Styling

QuoxCORE uses a dark theme. Follow these guidelines:

- **Background:** Use transparent or `rgba(255,255,255,0.05)` for cards
- **Text:** Primary: `rgba(255,255,255,0.9)`, Secondary: `rgba(255,255,255,0.6)`
- **Accent:** Teal `#14b8a6` for community plugins (or your own accent)
- **Borders:** `rgba(255,255,255,0.1)` for subtle borders
- **Minimum opacity:** Never below 0.6 for text/icons on dark backgrounds

## Step 4: Build

```bash
npm run build
```

This produces `my-first-plugin.quoxplugin` in the project root — a ZIP file ready for installation.

## Step 5: Install in QuoxCORE

1. Open QuoxCORE in your browser
2. Go to **Settings** (sidebar or keyboard shortcut `9`)
3. Scroll down to **Community Plugins**
4. Click **Install Plugin**
5. Drag and drop your `.quoxplugin` file
6. Review the verification step (shows plugin info + signature status)
7. Review and approve permissions
8. Click **Approve & Install**

Your plugin now appears in the sidebar and the community plugins section.

## Step 6: Iterate

To update your plugin in QuoxCORE:

1. Make changes to your source code
2. Run `npm run build` again
3. In QuoxCORE, uninstall the old version
4. Install the new `.quoxplugin` file

## Next Steps

- [Plugin API Reference](./plugin-api.md) — Storage, notifications, memory, AEE
- [Backend Plugins](./backend-plugins.md) — Adding a backend service
- [Signing & Distribution](./signing.md) — Signing plugins for verified distribution
- [Manifest Reference](./manifest.md) — Complete manifest field reference

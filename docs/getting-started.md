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

You will be prompted to select a template:

```
Select a template:

  1. basic                — Minimal sidebar plugin (hello world)
  2. monitoring-dashboard — Connect to a service, poll data, display status
  3. fleet-management     — Manage hosts/containers with safety gates
  4. service-bridge       — Integrate a third-party service with a specialist agent
  5. ui-feature           — Client-side feature with storage and config
  6. enterprise-extension — Multi-tier plugin with memory, AOCL, and backend
  7. specialist-agent     — Specialist agent with tools, persona, and autonomy
  8. agentic-team         — Multi-agent team with orchestrator and policies

Template number [1]:
```

For your first plugin, select **1 (basic)**. Then provide:

```
Display name [My First Plugin]: My First Plugin
Category (...) [Other]: Productivity
Author: Your Name
Description: A simple QuoxCORE plugin
```

You can also skip the menu with `--template`:

```bash
npx create-quox-plugin my-first-plugin --template basic
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

More advanced templates generate additional files (settings panels, components, hooks, mock data). See [Templates](./templates.md) for the full comparison.

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

## Step 4: Run the Dev Preview

Before building and installing a ZIP for every change, iterate locally:

```bash
npm run dev
```

This starts a Vite dev server (port 5174 by default, unless your `vite.config.js` or the CLI sets its own) with a **framed host preview** — `quox-plugin-vite`'s dev host harness. It approximates enough of QuoxCORE's `AppShell` that a scaffolded plugin renders immediately instead of throwing on a blank page:

- A **76px left icon rail** built from `manifest.sidebar`, a **64px top header**, and a content area sized like `.app-shell__content`.
- A `HashRouter` (`react-router-dom`, or a small built-in hash-router shim if your project hasn't installed it) wired over whatever `routes` your entry passes to `window.__quoxPluginRegister`.
- `window.__quoxSharedDeps` — your project's own `react`/`react-dom`/`react-router-dom` instances (**not** a bundled copy — see the devDependency note below).
- `window.__quoxGlass` — functional dev versions of the glass component library (working `GlassTabBar`, `GlassPanel`, etc.). `AgentChatPanel`/`AgentChatSidebar` render an honest **"dev preview — live agent runs inside QuoxCORE"** placeholder with a disabled input, not a real conversation.
- `window.__quoxPluginApi` — an in-memory mock (`cache`/`durable`/`secrets` back onto plain `Map`s that reset every page reload; `fetch()` always resolves `{}`). One `console.info('[quox-dev-host] mock pluginApi active')` marks it as non-production.
- The real, vendored `qx-components.css` served at `/__quox-dev/qx.css` — so `.qx-*` classes render correctly without your plugin shipping them.
- Your parsed `manifest.json`, served at `/__quox-dev/manifest.js` as `window.__quoxDevManifest`.

If the frame shows **"quox-dev-host: no plugin registered"**, your entry module hasn't called `window.__quoxPluginRegister(...)` yet — check the browser console for a build/import error in `src/index.jsx`.

**devDependency requirement:** the dev host resolves `react`/`react-dom` (and `react-router-dom`, if present) from **your project's own** `node_modules`, not from the SDK. `create-quox-plugin` scaffolds already add `react` and `react-dom` as devDependencies (see the generated `package.json`) — don't remove them.

**Escape hatches** — for plugins that already have their own standalone dev fallback, or want the raw Vite page with nothing injected:
- **`?bare=1`** URL query param (e.g. `http://localhost:5174/?bare=1`) — skips installing all the `window.__quox*` globals and skips mounting the frame; only your entry module runs.
- **`devHost: false`** plugin option in `vite.config.js`:
  ```js
  quoxPluginVite({ pluginId: 'my-first-plugin', devHost: false })
  ```
  Disables the harness entirely at the Vite-plugin level — nothing is injected, no `/__quox-dev/*` routes are registered.

**Refreshing the vendored glass CSS:** `qx-components.css` is snapshotted into `quox-plugin-vite`'s own `assets/` directory so plugin authors don't need a sibling `quox-dashboard` checkout. This is an **SDK-maintainer** task, not something typical plugin authors run — if you're working on the SDK itself and `quox-dashboard`'s `qx-components.css` has changed, re-vendor it with `npm run sync-glass-css` from `packages/quox-plugin-vite`.

**Honest limits of the dev preview:** it's a *visual and prop-plumbing* approximation, not a QuoxCORE instance. There's no real agent behind `AgentChatPanel`/`AgentChatSidebar`, no server-backed `api.durable`/`api.secrets`, and `api.fetch()` never reaches a real collector. Validate persistence, chat, and backend calls by building and installing into a running QuoxCORE (next step).

## Step 5: Build

```bash
npm run build
```

This produces `my-first-plugin.quoxplugin` in the project root — a ZIP file ready for installation.

## Step 6: Install in QuoxCORE

1. Open QuoxCORE in your browser
2. Go to **Settings** (sidebar or keyboard shortcut `9`)
3. Scroll down to **Community Plugins**
4. Click **Install Plugin**
5. Drag and drop your `.quoxplugin` file
6. Review the verification step (shows plugin info + signature status)
7. Review and approve permissions
8. Click **Approve & Install**

Your plugin now appears in the sidebar and the community plugins section.

## Step 7: Iterate

For UI/logic changes, prefer looping on **Step 4 (`npm run dev`)** — it's instant and doesn't require reinstalling. Rebuild and reinstall into QuoxCORE (Steps 5–6) when you need to verify something the dev preview can't fake: real agent chat, server-backed `api.durable`/`api.secrets`, or actual backend calls through `api.fetch()`.

To update an already-installed plugin in QuoxCORE:

1. Make changes to your source code
2. Run `npm run build` again
3. In QuoxCORE, uninstall the old version
4. Install the new `.quoxplugin` file

## Next Steps

- [Templates Overview](./templates.md) — All 8 templates compared
- [Plugin API Reference](./plugin-api.md) — Storage, notifications, memory, AEE
- [Backend Plugins](./backend-plugins.md) — Adding a backend service
- [Signing & Distribution](./signing.md) — Signing plugins for verified distribution
- [Claude Skill](./claude-skill.md) — AI-assisted plugin development
- Template tutorials: [monitoring](./tutorials/monitoring-dashboard.md), [fleet](./tutorials/fleet-management.md), [service bridge](./tutorials/service-bridge.md), [UI feature](./tutorials/ui-feature.md), [enterprise](./tutorials/enterprise-extension.md), [specialist agent](./tutorials/specialist-agent.md), [agentic team](./tutorials/agentic-team.md)

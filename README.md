# QuoxCORE Plugin SDK

Build, test, and distribute third-party plugins for QuoxCORE.

## Overview

The QuoxCORE Plugin SDK provides everything a developer needs to build plugins that extend the QuoxCORE platform. Plugins can add sidebar navigation, new views, backend services, agent tools, and more.

This monorepo contains three packages:

| Package | Purpose |
|---------|---------|
| `create-quox-plugin` | Interactive scaffolder — run `npx create-quox-plugin my-plugin` to start |
| `quox-plugin-sdk` | TypeScript types, runtime helpers, and testing utilities |
| `quox-plugin-vite` | Vite build plugin — externalises shared deps, outputs `.quoxplugin` ZIP |

## Quick Start

### 1. Scaffold a new plugin

```bash
npx create-quox-plugin my-monitoring-plugin
cd my-monitoring-plugin
npm install
```

The scaffolder asks for:
- Display name
- Category (Monitoring, Productivity, Communication, etc.)
- Whether to include a backend service
- Author name

### 2. Develop

```bash
npm run dev
```

This starts a Vite dev server with hot reload. Your plugin code lives in `src/` and the entry point is `src/index.jsx`.

### 3. Build

```bash
npm run build
```

This produces a `my-monitoring-plugin.quoxplugin` file — a ZIP containing your compiled bundle, manifest, and assets.

### 4. Install in QuoxCORE

Go to **Settings > Plugins > Community Plugins > Install Plugin** in QuoxCORE and upload your `.quoxplugin` file.

## Plugin Architecture

### Package Format

A `.quoxplugin` file is a ZIP archive containing:

```
manifest.json       — Plugin metadata, permissions, sidebar config
plugin.esm.js       — Compiled ESM bundle (React externalised)
plugin.css           — Optional scoped styles
assets/              — Optional static assets
signature.json       — Optional Ed25519 signature
```

### Shared Dependencies

QuoxCORE provides React, ReactDOM, and React Router to all plugins via `window.__quoxSharedDeps`. The Vite build plugin automatically externalises these — you write normal React code and import React as usual.

### Plugin Entry Point

Your plugin's entry point (`src/index.jsx`) registers with QuoxCORE:

```jsx
const { React } = window.__quoxSharedDeps;
import MainView from './views/MainView';
import SettingsView from './views/SettingsView';

window.__quoxPluginRegister('my-plugin', {
    routes: {
        '/plugins/my-plugin': MainView,
        '/plugins/my-plugin/settings': SettingsView,
    },
    sidebar: [
        { path: '/plugins/my-plugin', label: 'My Plugin', icon: 'puzzle' },
    ],
    hooks: {
        onActivate() { console.log('Plugin activated'); },
        onDeactivate() { console.log('Plugin deactivated'); },
    },
});
```

### Route Namespace

All third-party plugin routes are automatically namespaced under `/plugins/{pluginId}/` to prevent collision with core routes.

## Manifest Reference

```json
{
    "id": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "author": "Your Name",
    "description": "What this plugin does",
    "category": "Monitoring",
    "license": "free",
    "permissions": ["sidebar", "storage", "notifications"],
    "sidebar": [
        {
            "path": "/plugins/my-plugin",
            "label": "My Plugin",
            "icon": "puzzle"
        }
    ],
    "routes": {
        "/plugins/my-plugin": "MainView"
    },
    "minQuoxVersion": "1.0.0",
    "backend": {
        "image": "my-plugin-backend:latest",
        "healthPath": "/health",
        "port": 8080
    }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier. Lowercase, dashes, 3-64 chars. Cannot start with `core-`, `system-`, `quox-`, `admin-`. |
| `name` | Yes | Display name shown in the plugin manager |
| `version` | Yes | Semantic version (x.y.z) |
| `author` | No | Author name or organisation |
| `description` | No | Short description of the plugin |
| `category` | No | One of: Monitoring, Productivity, Communication, AI & Intelligence, Infrastructure, Compliance & Audit, Other |
| `license` | No | `"free"` for free plugins, or a license tier identifier |
| `permissions` | No | Array of permission strings (see below) |
| `sidebar` | No | Array of sidebar items to register |
| `routes` | No | Map of route path to view name |
| `minQuoxVersion` | No | Minimum compatible QuoxCORE version |
| `backend` | No | Backend container configuration (Tier 2 plugins) |

### Permissions

| Permission | Description |
|-----------|-------------|
| `sidebar` | Add items to the sidebar navigation |
| `storage` | Store configuration data in browser storage |
| `network` | Make API requests through the plugin backend gateway |
| `memory` | Read and write to QuoxCORE memory system |
| `notifications` | Show toast notifications |
| `aee` | Emit AEE (Agent Envelope Exchange) events |
| `tools` | Register agent tools |

## Plugin API

Plugins access QuoxCORE features through a scoped API provided via React context:

```jsx
import { usePluginApi } from 'quox-plugin-sdk';

function MyComponent() {
    const api = usePluginApi();

    // Scoped storage (namespaced to your plugin)
    api.storage.set('lastRun', Date.now());
    const lastRun = api.storage.get('lastRun');

    // Show notifications
    api.notify('Scan complete', 'success');

    // Fetch from your backend (proxied through collector)
    const res = await api.fetch('/api/status');
    const data = await res.json();

    // Save to memory
    await api.memory.save({
        type: 'observation',
        content: 'Network scan found 3 new hosts',
        tags: ['network', 'discovery'],
    });

    // Search memory
    const results = await api.memory.search('network hosts');

    // Emit AEE event
    await api.aee.emit('plugin.scan.complete', { hostsFound: 3 });
}
```

## Backend Plugins (Tier 2)

Plugins can include a backend service that runs as a Docker container alongside QuoxCORE:

```yaml
# docker-compose.override.yml
services:
  plugin-my-monitor:
    image: my-monitor-backend:1.0
    networks: [quox-network]
    deploy:
      resources:
        limits:
          memory: 256m
          cpus: '0.5'
```

Backend requests from the plugin frontend are proxied through the collector:

```
Frontend: api.fetch('/api/status')
    → Collector: /api/v1/plugins/my-monitor/api/status
    → Container: http://plugin-my-monitor:8080/api/status
```

The backend must be registered with the collector admin API:

```bash
curl -X POST http://localhost:9848/api/v1/admin/plugins/my-monitor/backend \
  -H "Content-Type: application/json" \
  -d '{"url": "http://plugin-my-monitor:8080", "healthPath": "/health"}'
```

## Plugin Signing

Sign your plugin for verified distribution:

```bash
# Generate a signing key pair (once)
node scripts/generate-signing-key.js

# Sign a plugin
node scripts/sign-plugin.js --plugin ./my-plugin.quoxplugin --key ./quox-signing.key
```

Signed plugins show a "Signed" badge in the QuoxCORE plugin manager. Unsigned plugins show a warning.

## Testing

The SDK provides testing utilities:

```js
import { createMockPluginApi, setupPluginTestEnv, teardownPluginTestEnv } from 'quox-plugin-sdk/testing';

beforeAll(() => setupPluginTestEnv());
afterAll(() => teardownPluginTestEnv());

test('my component', () => {
    const api = createMockPluginApi('my-plugin');
    api.storage.set('key', 'value');
    expect(api.storage.get('key')).toBe('value');
});
```

## Size Limits

- Plugin bundle (`plugin.esm.js`): 100KB max
- Total `.quoxplugin` package: 5MB max
- Plugin ID: 3-64 characters

## Security

- Plugin code runs in the browser context (not sandboxed in an iframe)
- Plugins are wrapped in a React ErrorBoundary — render errors are caught
- Dangerous patterns (eval, dynamic imports, prototype manipulation) are blocked during validation
- Network requests are proxied through the collector — plugins cannot make direct external requests
- Storage is namespaced — plugins cannot access other plugins' data

## Contributing

1. Clone this repo
2. `npm install` (installs all workspace dependencies)
3. Make changes in the relevant package under `packages/`
4. `npm test` to run all tests
5. Submit a PR

## Licence

MIT

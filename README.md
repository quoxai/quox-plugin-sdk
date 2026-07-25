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
```

The scaffolder presents a template menu:

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
```

Or specify directly: `npx create-quox-plugin my-plugin --template monitoring-dashboard`

### 2. Develop

```bash
cd my-monitoring-plugin
npm install
npm run dev
```

### 3. Build

```bash
npm run build
```

Produces a `my-monitoring-plugin.quoxplugin` file — a ZIP ready for installation.

### 4. Install in QuoxCORE

Go to **Settings > Plugins > Community Plugins > Install Plugin** and upload the `.quoxplugin` file.

## Templates

| Template | Use Case | Key Features |
|----------|----------|-------------|
| `basic` | Hello world, learning | Sidebar entry |
| `monitoring-dashboard` | Service monitoring | Vault config, NOC quick actions, polling, status badges |
| `fleet-management` | Host/container management | Safety gates, AEE audit, agent tools, kill switch |
| `service-bridge` | Third-party integration | OAuth, specialist agent, tiered features, marketing metadata |
| `ui-feature` | Client-side productivity tool | Plugin storage, config panel, empty state |
| `enterprise-extension` | Complex multi-tier plugin | Memory API, AOCL events, Docker backend, usage meters, upgrade gates |
| `specialist-agent` | Specialist agent plugin | Agent definition, persona, 3 tools, inline chat, DEFCON, autonomy |
| `agentic-team` | Multi-agent team plugin | Team definition, 4 agents, 8 tools, policies, task queue |

See [docs/templates.md](docs/templates.md) for the full comparison and platform features matrix.

### Tutorials

- [Building a Monitoring Dashboard Plugin](docs/tutorials/monitoring-dashboard.md)
- [Building a Fleet Management Plugin](docs/tutorials/fleet-management.md)
- [Integrating a Third-Party Service](docs/tutorials/service-bridge.md)
- [Building a UI Feature Plugin](docs/tutorials/ui-feature.md)
- [Building an Enterprise Plugin](docs/tutorials/enterprise-extension.md)
- [Building a Specialist Agent Plugin](docs/tutorials/specialist-agent.md)
- [Building an Agentic Team Plugin](docs/tutorials/agentic-team.md)

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

window.__quoxPluginRegister('my-plugin', {
    routes: {
        '/plugins/my-plugin': MainView,
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

All third-party plugin routes are namespaced under `/plugins/{pluginId}/`.

## Manifest Reference

### Core Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier. Lowercase, dashes, 3-64 chars |
| `name` | Yes | Display name shown in the plugin manager |
| `version` | Yes | Semantic version (x.y.z) |
| `author` | No | Author name or organisation |
| `description` | No | Short description |
| `category` | No | Monitoring, Productivity, Communication, AI & Intelligence, Infrastructure, Compliance & Audit, Other |
| `license` | No | `"free"` or a license tier identifier |
| `permissions` | No | Array of permission strings |
| `sidebar` | No | Array of sidebar items |
| `routes` | No | Map of route path to view name |
| `minQuoxVersion` | No | Minimum compatible QuoxCORE version |

### Extended Fields

| Field | Description |
|-------|-------------|
| `configSchema` | Configuration fields (type, label, description, default, premium?, enterprise?) |
| `safety` | Destructive action declarations (destructiveActions, requiresApproval, aeeRequired, killSwitchEnabled) |
| `nocIntegration` | NOC dashboard tab and quick actions |
| `specialist` | Specialist agent registration (name, description, capabilities) |
| `comparison` | Feature comparison across tiers |
| `limits` | Usage limits per tier |
| `capabilities` | AEE intents and tool access declarations |
| `backend` | Docker backend container (image, healthPath, port) |
| `heroGradient`, `accentColor`, `badge` | Marketing / marketplace display |
| `testimonials`, `marketingPoints` | Marketplace listing content |

### Permissions

| Permission | Description |
|-----------|-------------|
| `sidebar` | Add items to the sidebar navigation |
| `storage` | Store data in browser storage (~5MB, namespaced) |
| `network` | Make API requests through the plugin backend gateway |
| `memory` | Read and write to QuoxCORE memory system |
| `notifications` | Show toast notifications |
| `aee` | Emit AEE (Agent Envelope Exchange) events |
| `tools` | Register agent tools |

## Plugin API

```jsx
// Scoped storage
pluginApi.storage.set('key', 'value');
pluginApi.storage.get('key');

// Notifications
pluginApi.notify('Scan complete', 'success');

// HTTP requests (proxied through collector)
const res = await pluginApi.fetch('/api/status');

// Memory
await pluginApi.memory.save({ type: 'fact', content: '...', tags: [] });
const results = await pluginApi.memory.search('query');

// AEE events
await pluginApi.aee.emit('plugin.scan.complete', { hostsFound: 3 });

// Config
const config = pluginApi.config.get();
pluginApi.config.save({ ...config, newField: 'value' });
```

## Plugin Signing & Licensing

### Scripts

```bash
# Generate a signing key pair (once)
node scripts/generate-signing-key.js

# Sign a plugin
node scripts/sign-plugin.js --plugin ./my-plugin.quoxplugin --key ./quox-signing.key

# Generate a license for a paid plugin
node scripts/generate-license.js --plugin my-plugin --customer "Acme Corp" --expires 2027-12-31 --key ./quox-signing.key
```

See [docs/signing.md](docs/signing.md) for details on the signature format and verification flow.

## Testing

### SDK Tests

```bash
npm test
```

Runs Vitest across all packages: SDK runtime helpers, testing utilities, Vite plugin config, and scaffolder output verification.

### Plugin Testing Utilities

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

## Claude Skill

A Claude Code skill is included for AI-assisted plugin development:

```bash
# Install the skill
cp -r .claude/skills/quox-plugin ~/.claude/skills/

# Use it
/quox-plugin scaffold    # Guide template selection
/quox-plugin manifest    # Help edit manifest fields
/quox-plugin debug       # Diagnose common issues
/quox-plugin extend      # Add capabilities to existing plugin
/quox-plugin review      # Audit plugin for completeness
```

See [docs/claude-skill.md](docs/claude-skill.md) for details.

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

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Step-by-step first plugin guide |
| [Templates](docs/templates.md) | All 8 templates compared |
| [Plugin API](docs/plugin-api.md) | Storage, notifications, memory, AEE |
| [Backend Plugins](docs/backend-plugins.md) | Adding a Docker backend service |
| [Signing & Licensing](docs/signing.md) | Ed25519 signatures and license keys |
| [Claude Skill](docs/claude-skill.md) | AI-assisted plugin development |
| [Suggested Rules](docs/suggested-rules.md) | Ship rules with every skill/plugin so agents actually use them |
| [Contributing](CONTRIBUTING.md) | Development setup and PR guidelines |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, how to add templates, and PR guidelines.

## Licence

MIT

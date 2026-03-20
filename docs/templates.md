# Plugin Templates

The scaffolder provides 6 archetype-based templates, each pre-wired with the QuoxCORE platform features that archetype needs.

## Template Comparison

| Template | Use Case | Permissions | Platform Features |
|----------|----------|-------------|-------------------|
| `basic` | Hello world, learning | sidebar, storage, notifications | Sidebar entry |
| `monitoring-dashboard` | Service monitoring (Grafana pattern) | + network | Vault config, NOC quick actions, polling, status badges |
| `fleet-management` | Host/container management (Docker Fleet) | + network, aee, tools | Vault credentials, safety gates, AEE audit, agent tools, kill switch |
| `service-bridge` | Third-party integration (GitHub pattern) | + network, aee, tools, memory | OAuth vault, specialist agent, tiered features, marketing metadata |
| `ui-feature` | Client-side tool (Action Tracker) | sidebar, storage, notifications | Plugin storage, config panel, empty state, dark theme |
| `enterprise-extension` | Multi-tier with backend (Advanced Memory) | + network, memory, aee | Memory API, AOCL events, Docker backend, usage meters, upgrade gates |

## When to Use Each Template

### basic

Start here if you are new to QuoxCORE plugin development. Generates a minimal sidebar plugin with a single view. No backend, no integrations — just a React component registered with the platform.

### monitoring-dashboard

Choose this when your plugin connects to an external monitoring service and displays status data. The template includes a polling hook, status table with coloured badges, and NOC quick actions. Modelled on Grafana, Prometheus, and Uptime Kuma plugins.

### fleet-management

Choose this when your plugin manages infrastructure resources (hosts, containers, VMs) and needs destructive action safety gates. Includes a host table, confirmation modal, AEE audit trail, and kill switch. Modelled on Docker Fleet, Wazuh, and Proxmox plugins.

### service-bridge

Choose this when integrating a third-party API or service. Includes OAuth configuration, a specialist agent sidebar, tiered feature comparison, and marketing metadata for the marketplace. Modelled on GitHub and LinkedIn plugins.

### ui-feature

Choose this for client-side productivity tools that persist state locally. Includes plugin storage, a config panel, empty state component, and card grid layout. No backend needed. Modelled on Action Tracker, OpsDeck, and Prompts Library plugins.

### enterprise-extension

Choose this for complex plugins that need a backend service, multi-tier licensing, and platform integrations. Includes a Docker backend, usage meters, upgrade gates, memory API integration, and AOCL event emission. Modelled on Advanced Memory and AOCL Compliance Suite plugins.

## Generated Files

### Common to All Templates

| File | Purpose |
|------|---------|
| `manifest.json` | Plugin metadata, permissions, routes, config |
| `src/index.jsx` | Entry point — registers routes, sidebar, hooks |
| `src/views/MainView.jsx` | Primary view component |
| `vite.config.js` | Build configuration |
| `package.json` | Dependencies and scripts |
| `.gitignore` | Excludes node_modules, dist, .quoxplugin |

### Template-Specific Files

| Template | Additional Files |
|----------|-----------------|
| monitoring-dashboard | `src/views/SettingsPanel.jsx`, `src/hooks/usePolling.js`, `src/data/mock.js` |
| fleet-management | `src/views/SettingsPanel.jsx`, `src/components/ConfirmModal.jsx`, `src/data/mock.js` |
| service-bridge | `src/views/SettingsPanel.jsx`, `src/components/AgentSidebar.jsx`, `src/data/mock.js` |
| ui-feature | `src/views/SettingsPanel.jsx`, `src/components/EmptyState.jsx`, `src/data/mock.js` |
| enterprise-extension | `src/views/SettingsPanel.jsx`, `src/components/UsageMeter.jsx`, `src/components/UpgradeGate.jsx`, `src/data/mock.js`, `backend/server.js`, `backend/package.json`, `Dockerfile` |

## Platform Features Matrix

| Feature | basic | monitoring | fleet | bridge | ui | enterprise |
|---------|-------|-----------|-------|--------|-----|-----------|
| Sidebar entry | Yes | Yes | Yes | Yes | Yes | Yes |
| Settings panel | — | Yes | Yes | Yes | Yes | Yes |
| Config schema | — | Yes | Yes | Yes | Yes | Yes |
| Plugin storage | — | — | — | — | Yes | — |
| Data polling | — | Yes | — | — | — | — |
| NOC integration | — | Yes | — | — | — | — |
| Safety gates | — | — | Yes | Yes | — | — |
| AEE audit | — | — | Yes | Yes | — | Yes |
| Agent tools | — | — | Yes | Yes | — | — |
| Specialist agent | — | — | — | Yes | — | — |
| Memory API | — | — | — | Yes | — | Yes |
| Tiered comparison | — | — | — | Yes | Yes | Yes |
| Usage meters | — | — | — | — | — | Yes |
| Upgrade gates | — | — | — | — | — | Yes |
| Backend container | — | — | — | — | — | Yes |
| Marketing metadata | — | — | — | Yes | — | — |

## Scaffolding

```bash
# Interactive mode
node packages/create-quox-plugin/bin/create.js my-plugin

# Direct template selection
node packages/create-quox-plugin/bin/create.js my-plugin --template monitoring-dashboard
```

## Tutorials

The basic template is covered by the [Getting Started](getting-started.md) guide. Each advanced template has a dedicated tutorial:

- [Building a Monitoring Dashboard Plugin](tutorials/monitoring-dashboard.md)
- [Building a Fleet Management Plugin](tutorials/fleet-management.md)
- [Integrating a Third-Party Service](tutorials/service-bridge.md)
- [Building a UI Feature Plugin](tutorials/ui-feature.md)
- [Building an Enterprise Plugin](tutorials/enterprise-extension.md)

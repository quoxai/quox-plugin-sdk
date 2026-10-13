# Plugin Templates

`create-quox-plugin` ships 8 templates. All of them target the **community plugin sandbox**: the plugin runs in an isolated frame with no network of its own, talks to Quox only through `getQuox()` from `quox-plugin-sdk`, and is styled with the `qx-*` design-system classes. None of them use host-only globals, so a scaffolded plugin renders the first time it is installed.

## Template comparison

| Template | Use case | Manifest permissions | What the view does |
|----------|----------|----------------------|--------------------|
| `basic` | Hello world, learning the sandbox | sidebar, storage, notifications, network | `getUser()` plus a counter in plugin storage |
| `monitoring-dashboard` | Service status | + network | Polls `GET /status` on your backend, status table |
| `fleet-management` | Hosts with destructive actions | + network, tools | Host table, confirm modal, `POST /hosts/<id>/<action>` |
| `service-bridge` | Third-party integration | + network, tools | Items and metrics from your backend, notes panel (plugin storage) |
| `ui-feature` | Client-side tool | sidebar, storage, notifications, network | Card grid persisted in plugin storage |
| `enterprise-extension` | Tiers, usage, backend | + network | Usage meters, upgrade gates, backend skeleton |
| `specialist-agent` | Agent with tools and persona | + network, tools | Agent status, tool runner, ask-the-agent panel |
| `agentic-team` | Multi-agent team | + network, tools | Members, policies, task queue, chat with the lead |

Each manifest declares exactly the permissions its code uses (the host refuses undeclared calls, see [Permissions](./plugin-api.md#permissions)); a test scaffolds every template and checks declared equals used. `tools` and `sidebar` are declarative and not enforced on calls.

## What every template gives you

- `src/index.jsx` calls `registerPlugin` from `quox-plugin-sdk`.
- `src/lib/` helpers: `api.js` (wrapper over `getQuox().fetch` and `storage`), `useLoad.js` (load state hook), `ui.jsx` (error banner, spinner, page frame), `useConfig.js` and `ConfigForm.jsx` (settings).
- Every view shows an **error state** when an RPC fails. Nothing renders blank.
- `README.md` in the project explaining build, validate, sign and install.
- `.gitignore` covering `node_modules/`, `dist/` and `.keys/`.
- `.claude/skills/quox-plugin/` (the Claude skill), unless you pass `--no-skill`.

## Honest scope: what needs a backend

A sandboxed plugin cannot reach the network, hosts, a bastion, a vault or a model. Where a template's purpose depends on one of those, it calls **your plugin's own backend** through `getQuox().fetch('/some/path')` (paths are relative to `/collector/api/v1/plugins/<id>/`). The template says so in the header comment of `MainView.jsx`, and shows labelled sample data when no backend answers.

- `monitoring-dashboard`, `service-bridge`: your backend talks to the third-party service and holds its credentials.
- `fleet-management`: your backend performs host actions. Governed fleet access and vault credentials belong to official plugins, not the sandbox.
- `specialist-agent`, `agentic-team`: the agent or team is declared in `manifest.json` and run by Quox and your backend. The plugin is the UI for it. The host's own chat surface cannot be embedded, so the chat panel calls your backend.
- `enterprise-extension`: includes `backend/` (Express) and a `Dockerfile` as the starting point.

## Styling

Use `qx-*` classes (`qx-card`, `qx-btn`, `qx-pill`, `qx-table`, `qx-input`, `qx-banner`, `qx-modal`, `qx-progress`, and so on). The build includes the design-system CSS in `plugin.css`; host stylesheets are not available inside the frame. Rules: white text on dark, no grey text, buttons always use `qx-btn` (never bare transparent), and keep inline styles to layout.

## Scaffolder flags

| Flag | Effect |
|------|--------|
| `--template <name>` | Pick a template without the menu |
| `--from-mcp "<cmd>"` / `--from-mcp-json <file>` | Scaffold a specialist-agent plugin from an MCP server's tool list |
| `--local-sdk <path>` | Use `file:` deps from a local `quox-plugin-sdk` checkout (monorepo development only) |
| `--no-skill` | Do not write the Claude skill |
| `--non-interactive` | Use defaults for anything not passed as a flag |

## Generated files by template

Common to all: `manifest.json`, `package.json`, `vite.config.js`, `README.md`, `.gitignore`, `src/index.jsx`, `src/views/MainView.jsx`, `src/lib/*`.

| Template | Additional files |
|----------|------------------|
| `basic` | none |
| `monitoring-dashboard` | `views/SettingsPanel.jsx`, `hooks/usePolling.js`, `data/mock.js` |
| `fleet-management` | `views/SettingsPanel.jsx`, `components/ConfirmModal.jsx`, `data/mock.js` |
| `service-bridge` | `views/SettingsPanel.jsx`, `components/AgentSidebar.jsx` (notes panel), `data/mock.js` |
| `ui-feature` | `views/SettingsPanel.jsx`, `components/EmptyState.jsx`, `data/mock.js` |
| `enterprise-extension` | `views/SettingsPanel.jsx`, `components/UsageMeter.jsx`, `components/UpgradeGate.jsx`, `data/mock.js`, `backend/`, `Dockerfile` |
| `specialist-agent` | `agent/{agentDef,agentPersona,tools}.js`, `views/SettingsPanel.jsx`, `components/{AgentStatusCard,ToolCard,AgentChat}.jsx`, `data/mock.js` |
| `agentic-team` | `team/{teamDef,agents,personas,tools,policies}.js`, `views/SettingsPanel.jsx`, `components/{MemberCard,TaskQueue,SharedContextPanel,PolicyBadges,AgentChat}.jsx`, `data/mock.js` |

## Tutorials

[basic](./tutorials/basic.md), [monitoring-dashboard](./tutorials/monitoring-dashboard.md), [fleet-management](./tutorials/fleet-management.md), [service-bridge](./tutorials/service-bridge.md), [ui-feature](./tutorials/ui-feature.md), [enterprise-extension](./tutorials/enterprise-extension.md), [specialist-agent](./tutorials/specialist-agent.md), [agentic-team](./tutorials/agentic-team.md), [convert an MCP server](./tutorials/convert-mcp-server.md).

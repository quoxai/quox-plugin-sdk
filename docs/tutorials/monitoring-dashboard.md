# Building a Monitoring Dashboard Plugin

Build a plugin that polls an external service, displays a status table, and integrates with the QuoxCORE NOC view.

## What you will build

- Status table with colour-coded badges (healthy, degraded, down)
- Automatic polling with configurable intervals
- Settings panel for service URL and API key (vault-stored)
- NOC quick actions for agent-triggered operations

## Prerequisites

- Node.js 18+, npm 9+, a running QuoxCORE instance

## 1. Scaffold the plugin

```bash
node packages/create-quox-plugin/bin/create.js uptime-monitor --template monitoring-dashboard
```

The interactive prompt lists all six templates. Select `monitoring-dashboard`, fill in display name, category, author, and description, then:

```bash
cd uptime-monitor && npm install
```

Generated structure:

```
uptime-monitor/
├── manifest.json
├── src/index.jsx
├── src/views/MainView.jsx
├── src/views/SettingsPanel.jsx
├── src/hooks/usePolling.js
└── src/data/mock.js
```

## 2. Understand the manifest

The template generates these key blocks:

**configSchema** -- defines settings panel fields. The `password` type stores the value in the credential vault rather than plain localStorage. Six types available: `string`, `number`, `boolean`, `password`, `select`, `url`.

```json
"configSchema": {
    "serviceUrl": { "type": "url", "label": "Service URL", "default": "http://localhost:3000" },
    "apiKey": { "type": "password", "label": "API Key", "default": "" }
}
```

**nocIntegration** -- registers a tab in the NOC view. Each quick action has a `prompt` that CommanderQ receives when the operator clicks the button.

```json
"nocIntegration": {
    "tab": { "label": "Uptime Monitor", "icon": "activity" },
    "quickActions": [{
        "id": "check-health", "label": "Health Check", "icon": "heart",
        "description": "Run health check on all services",
        "severity": "info",
        "prompt": "Check health of all Uptime Monitor services"
    }]
}
```

**permissions** -- `["sidebar", "storage", "notifications", "network"]`. The `network` permission is required for `api.fetch()`.

## 3. Configure vault credentials

The settings panel reads and writes config through `pluginApi.config`:

```jsx
const [config, setConfig] = React.useState(() =>
    pluginApi?.config?.get() || { serviceUrl: 'http://localhost:3000', apiKey: '' }
);
const handleSave = () => {
    pluginApi.config.save(config);
    pluginApi.notify('Settings saved', 'success');
};
```

Password-type fields are encrypted before persistence. Your plugin reads them back in plaintext via `config.get()`.

## 4. Implement the polling hook

The generated `usePolling` hook calls a function at a fixed interval with proper cleanup:

```jsx
export default function usePolling(callback, intervalMs = 60000) {
    const savedCallback = React.useRef(callback);
    React.useEffect(() => { savedCallback.current = callback; }, [callback]);
    React.useEffect(() => {
        let mounted = true;
        const id = setInterval(() => { if (mounted) savedCallback.current(); }, intervalMs);
        return () => { mounted = false; clearInterval(id); };
    }, [intervalMs]);
}
```

The `mounted` guard prevents state updates after unmount. The ref avoids stale closures.

## 5. Replace mock data with real logic

The scaffolded MainView imports `MOCK_SERVICES`. Replace the polling callback with a real fetch:

```jsx
export default function MainView({ pluginApi }) {
    const [services, setServices] = React.useState([]);
    const [error, setError] = React.useState(null);

    const fetchStatus = async () => {
        try {
            const res = await pluginApi.fetch('/api/status');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setServices((await res.json()).services);
            setError(null);
        } catch (err) {
            setError(err.message);
            pluginApi.notify('Poll failed: ' + err.message, 'warning');
        }
    };

    React.useEffect(() => { fetchStatus(); }, []);
    usePolling(fetchStatus, 60000);
    // ... render table
}
```

`pluginApi.fetch('/api/status')` is proxied: Browser -> Collector (`/api/v1/plugins/uptime-monitor/api/status`) -> your backend container.

## 6. Status badge styling

Follow QuoxCORE dark theme rules for status badges:

```jsx
const STATUS_COLORS = { healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444' };
// Badge style:
{
    backgroundColor: STATUS_COLORS[status] + '22',  // 13% opacity
    color: STATUS_COLORS[status],
    borderRadius: '9999px',
    fontSize: '0.75rem', fontWeight: 600,
    padding: '0.2rem 0.6rem',
}
```

Rules: never use `currentColor` in SVGs (use explicit colours or Unicode fallbacks). Minimum text opacity on dark backgrounds is 0.6. Use 0.7 for secondary text, 0.85 for primary.

## 7. NOC quick actions deep-dive

Each NOC action field:

| Field | Purpose |
|-------|---------|
| `id` | Unique within this plugin |
| `label` | Button text in the NOC |
| `severity` | `info`, `warning`, or `critical` -- sets button colour |
| `prompt` | Natural language sent to CommanderQ on click |

Add more actions in `manifest.json`:

```json
{ "id": "restart-degraded", "label": "Restart Degraded", "icon": "refresh",
  "description": "Restart degraded services", "severity": "warning",
  "prompt": "Restart degraded Uptime Monitor services" }
```

## 8. Build, test, and install

```bash
npm run build      # produces uptime-monitor.quoxplugin
npm run validate   # checks manifest
```

Install: **Settings > Community Plugins > Install Plugin** -- drop the `.quoxplugin` file, review permissions, click **Approve & Install**. The plugin appears in the sidebar and the NOC gains your quick actions tab.

## Next steps

- [Backend Plugins](../backend-plugins.md) -- add a polling endpoint
- [Fleet Management tutorial](./fleet-management.md) -- register agent tools
- [Signing & Distribution](../signing.md) -- sign for verified distribution
- [Enterprise Extension tutorial](./enterprise-extension.md) -- add multi-tier licensing

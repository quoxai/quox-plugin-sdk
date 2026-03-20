# Integrating a Third-Party Service

Build a service bridge plugin that connects an external platform to QuoxCORE with a specialist agent, tiered features, and marketplace metadata.

## What you will build

- Connection status banner (live/disconnected)
- Item card grid synced from the external service
- Specialist agent sidebar for natural language queries
- Tiered feature comparison (free vs paid)
- Marketing metadata for the plugin marketplace
- OAuth credential storage

## Prerequisites

- Node.js 18+, npm 9+, a running QuoxCORE instance

## 1. Scaffold the plugin

```bash
node packages/create-quox-plugin/bin/create.js projecto-bridge --template service-bridge
cd projecto-bridge && npm install
```

Generated structure:

```
projecto-bridge/
├── manifest.json
├── src/index.jsx
├── src/views/MainView.jsx
├── src/views/SettingsPanel.jsx
├── src/components/AgentSidebar.jsx
└── src/data/mock.js
```

## 2. Understand the manifest

The service-bridge template requests all seven permissions and adds specialist agent, comparison, and marketing blocks:

**specialist** -- registers an agent that CommanderQ can delegate to:

```json
"specialist": {
    "name": "Projecto Bridge Agent",
    "description": "Specialist agent for Projecto Bridge integration",
    "capabilities": ["query", "create", "update", "analyse"]
}
```

**comparison** -- defines tier features shown on the marketplace listing:

```json
"comparison": {
    "free": { "Items synced": "50", "Agent queries": "10/day", "Webhooks": false },
    "paid": { "Items synced": "Unlimited", "Agent queries": "Unlimited", "Webhooks": true }
}
```

Boolean values render as tick/cross. String values display as-is.

**Marketing fields** -- `heroGradient` (CSS gradient for the listing banner), `badge` (label next to plugin name), `testimonials` (array of `{ quote, author, role }`), and `marketingPoints` (bullet list).

**configSchema** -- `oauthToken` (password type, vault-stored) and `orgName` (string).

## 3. Configure OAuth

The settings panel stores credentials via `pluginApi.config`:

```jsx
const [config, setConfig] = React.useState(() =>
    pluginApi?.config?.get() || { oauthToken: '', orgName: '' }
);
const handleSave = () => {
    pluginApi.config.save(config);
    pluginApi.notify('Settings saved', 'success');
};
```

For production, implement a proper OAuth flow: a "Connect" button opens the third-party consent page, a callback handler stores the token. The `password` field is for manual entry during development.

## 4. Display connection status

Replace mock data in `MainView.jsx` with a real status check:

```jsx
export default function MainView({ pluginApi }) {
    const [connected, setConnected] = React.useState(false);
    const [items, setItems] = React.useState([]);
    const [showAgent, setShowAgent] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                const res = await pluginApi.fetch('/api/connection/status');
                if (res.ok) setConnected((await res.json()).connected);
                const itemsRes = await pluginApi.fetch('/api/items');
                if (itemsRes.ok) setItems((await itemsRes.json()).items);
            } catch (err) {
                pluginApi.notify('Connection check failed', 'warning');
            }
        })();
    }, []);

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            {/* Connection banner */}
            <div style={{
                padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: '8px',
                background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: '1px solid ' + (connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'),
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ color: connected ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                    {connected ? 'Connected' : 'Disconnected'}
                </span>
                <button onClick={() => setShowAgent(!showAgent)}>Ask Agent</button>
            </div>
            {/* Item cards, metrics... */}
            {showAgent && <AgentSidebar pluginApi={pluginApi} context={{ connected, items }} onClose={() => setShowAgent(false)} />}
        </div>
    );
}
```

## 5. The specialist agent and context builder

The key pattern in `AgentSidebar.jsx` is the context builder:

```jsx
function buildAgentContext(data) {
    return {
        connected: data.connected,
        itemCount: data.items?.length || 0,
        metrics: data.metrics,
    };
}
```

This distils UI state into a compact object the specialist agent receives alongside the user's query. The agent uses this context to answer without making additional API calls.

When a user asks CommanderQ about Projecto-related topics, the orchestrator delegates to your specialist. The agent receives: the query, the context object, and access to your registered tools.

Wire the send handler to your backend:

```jsx
const handleSend = async () => {
    if (!query.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    const agentContext = buildAgentContext(context);
    try {
        const res = await pluginApi.fetch('/api/agent/query', {
            method: 'POST',
            body: JSON.stringify({ query, context: agentContext }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'agent', text: data.response }]);
    } catch (err) {
        setMessages(prev => [...prev, { role: 'agent', text: 'Query failed: ' + err.message }]);
    }
    setQuery('');
};
```

## 6. Tiered features

Enforce tier limits at runtime:

```jsx
const tier = pluginApi?.config?.get()?._tier || 'free';
if (tier === 'free' && items.length >= 50) {
    pluginApi.notify('Free tier limit reached (50 items). Upgrade for unlimited.', 'warning');
    return;
}
```

QuoxCORE injects `_tier` into the config object based on the user's licence.

## 7. Marketing metadata

Update these fields in `manifest.json` as your plugin matures:

```json
"heroGradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
"badge": "Integration",
"testimonials": [
    { "quote": "Replaced three separate tools.", "author": "Jane Smith", "role": "Engineering Manager" }
],
"marketingPoints": ["Bi-directional sync", "AI-powered analysis", "Real-time webhooks"]
```

These appear on your plugin's marketplace listing page. All are optional.

## 8. Build, test, and install

```bash
npm run build    # produces projecto-bridge.quoxplugin
```

Install: **Settings > Community Plugins > Install Plugin** -- drop the file, review permissions (all seven requested), click **Approve & Install**.

Test: open the plugin, check the connection banner, click **Ask Agent** to open the sidebar, go to settings and enter credentials.

## Next steps

- [Backend Plugins](../backend-plugins.md) -- build the API proxy backend
- [Fleet Management tutorial](./fleet-management.md) -- register agent tools
- [Enterprise Extension tutorial](./enterprise-extension.md) -- add multi-tier licensing
- [Plugin API Reference](../plugin-api.md) -- memory integration for sync history

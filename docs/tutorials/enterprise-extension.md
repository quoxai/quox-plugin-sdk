# Building an Enterprise Plugin

Build a multi-tier plugin with usage meters, upgrade gates, memory integration, AOCL events, a backend Docker container, and premium field gating. This is the most advanced template.

## What you will build

- Three-tier licensing (free, pro, enterprise) with runtime enforcement
- UsageMeter component showing consumption against tier limits
- UpgradeGate overlay for locked features
- Memory API integration (save and search knowledge)
- AOCL event emission for orchestration
- Backend Docker container registered with the collector
- Settings fields gated by tier

## Prerequisites

- Node.js 18+, npm 9+, Docker, a running QuoxCORE instance

## 1. Scaffold the plugin

```bash
node packages/create-quox-plugin/bin/create.js insight-engine --template enterprise-extension
cd insight-engine && npm install
```

Generated structure (note the `backend/` directory and `Dockerfile`):

```
insight-engine/
├── manifest.json
├── Dockerfile
├── backend/server.js
├── backend/package.json
├── src/index.jsx
├── src/views/MainView.jsx
├── src/views/SettingsPanel.jsx
├── src/components/UsageMeter.jsx
├── src/components/UpgradeGate.jsx
└── src/data/mock.js
```

## 2. Understand the manifest

The enterprise template generates the most complete manifest:

**limits** -- numeric caps per tier (`-1` means unlimited):

```json
"limits": {
    "free":       { "queries": 100,   "storage_mb": 50,  "retention_days": 30 },
    "pro":        { "queries": 10000, "storage_mb": 500, "retention_days": 90 },
    "enterprise": { "queries": -1,    "storage_mb": -1,  "retention_days": 365 }
}
```

**comparison** -- human-readable tier table for the marketplace:

```json
"comparison": {
    "free":       { "Queries": "100/month",   "Storage": "50 MB",    "Analytics": false, "API access": false },
    "pro":        { "Queries": "10,000/month", "Storage": "500 MB",  "Analytics": true,  "API access": false },
    "enterprise": { "Queries": "Unlimited",    "Storage": "Unlimited","Analytics": true,  "API access": true }
}
```

**configSchema with tier flags** -- fields with `premium: true` are disabled for free users; `enterprise: true` requires the enterprise tier:

```json
"configSchema": {
    "endpoint":          { "type": "url",     "label": "Service Endpoint", "default": "http://localhost:8080" },
    "maxRetention":      { "type": "number",  "label": "Retention Days",   "default": 90, "premium": true },
    "advancedAnalytics": { "type": "boolean", "label": "Advanced Analytics","default": false, "enterprise": true }
}
```

**backend** -- declares a Docker container:

```json
"backend": { "image": "insight-engine-backend:latest", "healthPath": "/health", "port": 8080 }
```

## 3. The UsageMeter component

Shows a progress bar that turns amber at 80% and red at 95%:

```jsx
export default function UsageMeter({ label, current, limit, unit = '' }) {
    const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const barColor = pct > 95 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';
    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{label}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    {current}{unit} / {limit}{unit}
                </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: pct + '%', borderRadius: '3px',
                    background: barColor, transition: 'width 0.3s ease' }} />
            </div>
        </div>
    );
}
```

Usage:

```jsx
<UsageMeter label="Queries" current={usage.queriesUsed} limit={tierLimits.queries} />
<UsageMeter label="Storage" current={usage.storageMb} limit={tierLimits.storage_mb} unit=" MB" />
```

## 4. The UpgradeGate component

Wraps locked features with a semi-transparent overlay and upgrade button:

```jsx
export default function UpgradeGate({ children, requiredTier = 'pro' }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem',
                    fontWeight: 600, textTransform: 'uppercase',
                    background: requiredTier === 'enterprise' ? 'rgba(234,179,8,0.2)' : 'rgba(168,85,247,0.2)',
                    color: requiredTier === 'enterprise' ? '#eab308' : '#a855f7',
                }}>{requiredTier} required</span>
                <button onClick={() => console.log('Upgrade to', requiredTier)}>Upgrade</button>
            </div>
        </div>
    );
}
```

Wrap any locked feature card:

```jsx
{lockedFeatures.map(f => (
    <UpgradeGate key={f.id} requiredTier={f.requiredTier}>
        <FeatureCard feature={f} />
    </UpgradeGate>
))}
```

Children render at 0.4 opacity with no pointer events. Tier badge colours: purple (`#a855f7`) for pro, gold (`#eab308`) for enterprise.

## 5. Wire the memory API

The `memory` permission lets you store and search knowledge:

```jsx
// Save
await pluginApi.memory.save({
    type: 'observation',  // fact, preference, decision, observation, entity
    content: 'Query volume peaked at 450/hour on 2026-03-20',
    tags: ['analytics', 'peak'],
});

// Search
const results = await pluginApi.memory.search('query volume peaks', 10);
```

All entries are automatically tagged with `source: plugin:insight-engine`. Agents can search these memories for context.

Combine memory with data operations:

```jsx
const handleDataStore = async (record) => {
    await pluginApi.fetch('/api/data', { method: 'POST', body: JSON.stringify(record) });
    await pluginApi.memory.save({
        type: 'fact',
        content: `Stored record: ${record.title} (${record.category})`,
        tags: ['data-store', record.category],
    });
    await pluginApi.aee.emit('insight-engine.data.store', { recordId: record.id });
};
```

## 6. Emit AOCL events

AOCL events are emitted through the same `pluginApi.aee.emit()` method. The `layer` field in the payload tells the AOCL router which processing tier to use:

```jsx
await pluginApi.aee.emit('insight-engine.analytics.run', {
    layer: 'compute',       // compute, storage, network, security
    priority: 'normal',
    analysisType: 'trend',
    dataRange: '30d',
});
```

Declare all intents in `capabilities.aeeIntents`:

```json
"capabilities": {
    "aeeIntents": ["insight-engine.data.store", "insight-engine.data.query", "insight-engine.analytics.run"]
}
```

## 7. Build the backend container

The scaffolder generates `backend/server.js` (Express, port 8080) and a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install --production
COPY backend/ ./
EXPOSE 8080
CMD ["node", "server.js"]
```

Build, deploy, and register:

```bash
docker build -t insight-engine-backend:latest .
```

```yaml
# docker-compose.override.yml
services:
  plugin-insight-engine:
    image: insight-engine-backend:latest
    networks: [quox-network]
    restart: unless-stopped
    deploy:
      resources:
        limits: { memory: 256m, cpus: '0.5' }
```

```bash
curl -X POST http://localhost:9848/api/v1/admin/plugins/insight-engine/backend \
  -H "Content-Type: application/json" -H "X-Service-Key: YOUR_KEY" \
  -d '{"url": "http://plugin-insight-engine:8080", "healthPath": "/health", "rateLimit": 60}'
```

Requests via `pluginApi.fetch('/api/usage')` are proxied: Browser -> Collector (`/api/v1/plugins/insight-engine/api/usage`) -> Container (`:8080/api/usage`).

## 8. Premium field gating in settings

Disable config fields based on tier:

```jsx
const currentTier = pluginApi?.config?.get()?._tier || 'free';

{/* Pro-gated field */}
<div style={{ opacity: currentTier === 'free' ? 0.5 : 1 }}>
    <label>Retention Days <span style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7',
        padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem' }}>PRO</span></label>
    <input type="number" value={config.maxRetention} disabled={currentTier === 'free'}
        onChange={e => setConfig(prev => ({ ...prev, maxRetention: parseInt(e.target.value) || 30 }))} />
</div>

{/* Enterprise-gated field */}
<div style={{ opacity: currentTier !== 'enterprise' ? 0.5 : 1 }}>
    <label><input type="checkbox" checked={config.advancedAnalytics}
        disabled={currentTier !== 'enterprise'}
        onChange={e => setConfig(prev => ({ ...prev, advancedAnalytics: e.target.checked }))} />
    Advanced Analytics <span style={{ background: 'rgba(234,179,8,0.2)', color: '#eab308',
        padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem' }}>ENTERPRISE</span></label>
</div>
```

## 9. Build, test, and install

```bash
npm run build                                      # frontend: insight-engine.quoxplugin
docker build -t insight-engine-backend:latest .     # backend (if using Docker)
```

Install the frontend: **Settings > Community Plugins > Install Plugin** -- drop the file, review permissions (sidebar, storage, notifications, network, memory, aee), click **Approve & Install**.

Test: check usage meters, try memory search, click a locked feature (UpgradeGate appears), open settings (Retention Days disabled on free tier).

## Next steps

- [Fleet Management tutorial](./fleet-management.md) -- register agent tools
- [Monitoring Dashboard tutorial](./monitoring-dashboard.md) -- add NOC quick actions
- [Service Bridge tutorial](./service-bridge.md) -- add a specialist agent
- [Signing & Distribution](../signing.md) -- sign for verified distribution

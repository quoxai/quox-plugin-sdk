# Building a Fleet Management Plugin

Build a plugin that displays a host inventory, enforces safety gates before destructive actions, emits AEE audit envelopes, and registers agent tools for CommanderQ.

## What you will build

- Host table with status badges and action buttons
- ConfirmModal safety gate for destructive operations
- AEE envelope emission for every destructive action
- Agent tool registration for programmatic host management
- Settings panel for bastion credentials

## Prerequisites

- Node.js 18+, npm 9+, a running QuoxCORE instance

## 1. Scaffold the plugin

```bash
node packages/create-quox-plugin/bin/create.js docker-fleet --template fleet-management
cd docker-fleet && npm install
```

Generated structure:

```
docker-fleet/
├── manifest.json
├── src/index.jsx
├── src/views/MainView.jsx
├── src/views/SettingsPanel.jsx
├── src/components/ConfirmModal.jsx
└── src/data/mock.js
```

## 2. Understand the manifest

The fleet-management template adds safety and AEE capability blocks:

```json
"permissions": ["sidebar", "storage", "notifications", "network", "aee", "tools"],
"safety": {
    "destructiveActions": ["restart-host", "remove-host", "force-stop"],
    "requiresApproval": ["restart-host", "remove-host"],
    "aeeRequired": true,
    "killSwitchEnabled": true
},
"capabilities": {
    "aeeIntents": ["docker-fleet.host.restart", "docker-fleet.host.remove", "docker-fleet.host.status"]
}
```

- **`destructiveActions`** -- actions the platform treats as dangerous.
- **`requiresApproval`** -- subset requiring a confirmation step (your UI shows the modal; the platform also enforces server-side).
- **`aeeRequired`** -- every destructive action must emit an AEE envelope before execution.
- **`killSwitchEnabled`** -- admins can disable all destructive actions without uninstalling.
- **`aeeIntents`** -- format: `{pluginId}.{entity}.{action}`. Other plugins and agents can subscribe to these.

## 3. The ConfirmModal pattern

The generated `ConfirmModal.jsx` renders a full-screen overlay with cancel/confirm buttons:

```jsx
export default function ConfirmModal({ action, target, onConfirm, onCancel }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '90%' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.9)' }}>Confirm {action}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Are you sure you want to <strong style={{ color: '#ef4444' }}>{action}</strong> <strong>{target}</strong>?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel}>Cancel</button>
                    <button onClick={onConfirm}>Confirm {action}</button>
                </div>
            </div>
        </div>
    );
}
```

The pattern: store the pending action in state, render the modal when non-null, execute only on confirm.

## 4. Wire destructive actions with AEE

Replace the scaffolded mock logic with real API calls. The critical sequence is: emit envelope first, then call the backend, then refresh.

```jsx
const [confirmAction, setConfirmAction] = React.useState(null);

const handleAction = (action, host) => setConfirmAction({ action, host });

const executeAction = async () => {
    const { action, host } = confirmAction;

    // Step 1: Emit AEE audit envelope BEFORE the action
    await pluginApi.aee.emit(`docker-fleet.host.${action}`, {
        hostId: host.id, hostname: host.hostname, action,
        timestamp: new Date().toISOString(),
    });

    // Step 2: Call the backend
    try {
        const res = await pluginApi.fetch(`/api/hosts/${host.id}/${action}`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pluginApi.notify(`${action} ${host.hostname}: success`, 'success');
    } catch (err) {
        pluginApi.notify(`${action} failed: ${err.message}`, 'error');
    }

    setConfirmAction(null);
};
```

If the AEE emission fails, do not proceed with the action.

## 5. AEE envelope structure

When you call `pluginApi.aee.emit(intent, payload)`, QuoxCORE wraps it:

```json
{
    "envelope": {
        "version": "1.0",
        "id": "aee-uuid-here",
        "timestamp": "2026-03-20T10:30:00Z",
        "source": "plugin:docker-fleet",
        "intent": "docker-fleet.host.restart",
        "payload": { "hostId": "h-1", "hostname": "docker01", "action": "restart" }
    }
}
```

Envelopes are recorded in the AEE store and visible in the QuoxCORE Activity view. Admins can search by plugin, intent, or time range.

## 6. Register agent tools

Register tools so CommanderQ can manage hosts via natural language:

```bash
curl -X POST http://localhost:9848/api/v1/admin/plugins/docker-fleet/tools \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_KEY" \
  -d '{
    "tools": [
      {
        "name": "list_hosts",
        "description": "List all hosts in the Docker fleet with status",
        "input_schema": {
          "type": "object",
          "properties": {
            "group": { "type": "string", "description": "Filter by group" }
          }
        }
      },
      {
        "name": "restart_host",
        "description": "Restart a host by hostname. Requires approval.",
        "input_schema": {
          "type": "object",
          "properties": { "hostname": { "type": "string" } },
          "required": ["hostname"]
        }
      }
    ]
  }'
```

Tools are namespaced: `plugin_docker_fleet_list_hosts`. When called, the collector POSTs to `http://your-backend:8080/tools/list_hosts` with the input.

## 7. Build, test, and install

```bash
npm run build    # produces docker-fleet.quoxplugin
```

Install: **Settings > Community Plugins > Install Plugin** -- drop the file, review permissions (note `aee` and `tools`), click **Approve & Install**.

Test the safety gates:
1. Click **Restart** -- ConfirmModal appears
2. Confirm -- check the Activity view for the AEE envelope
3. If the admin enables the kill switch, all destructive actions are blocked at the platform level

## Next steps

- [Backend Plugins](../backend-plugins.md) -- build the host operations backend
- [Monitoring Dashboard tutorial](./monitoring-dashboard.md) -- add NOC quick actions
- [Enterprise Extension tutorial](./enterprise-extension.md) -- add tiered licensing for large fleets

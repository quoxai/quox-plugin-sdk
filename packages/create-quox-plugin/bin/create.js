#!/usr/bin/env node
/**
 * create-quox-plugin — Interactive scaffolder for QuoxCORE third-party plugins.
 *
 * Usage:
 *   npx create-quox-plugin my-plugin
 *   npx create-quox-plugin my-plugin --template monitoring-dashboard
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

const CATEGORIES = ['Monitoring', 'Productivity', 'Communication', 'AI & Intelligence', 'Infrastructure', 'Compliance & Audit', 'Other'];

const TEMPLATES = [
    { name: 'basic', description: 'Minimal sidebar plugin (hello world)', suggestedCategory: 'Other' },
    { name: 'monitoring-dashboard', description: 'Connect to a service, poll data, display status (Grafana pattern)', suggestedCategory: 'Monitoring' },
    { name: 'fleet-management', description: 'Manage hosts/containers with safety gates (Docker Fleet pattern)', suggestedCategory: 'Infrastructure' },
    { name: 'service-bridge', description: 'Integrate a third-party service with a specialist agent (GitHub pattern)', suggestedCategory: 'Communication' },
    { name: 'ui-feature', description: 'Client-side feature with storage and config (Action Tracker pattern)', suggestedCategory: 'Productivity' },
    { name: 'enterprise-extension', description: 'Multi-tier plugin with memory, AOCL, and backend (Advanced Memory pattern)', suggestedCategory: 'AI & Intelligence' },
];

const TEMPLATE_NAMES = TEMPLATES.map(t => t.name);

// --- File generators per template ---

function generateManifest(pluginName, displayName, author, description, category, template) {
    const base = {
        id: pluginName,
        name: displayName,
        version: '0.1.0',
        author,
        description,
        category,
        license: 'free',
        permissions: ['sidebar', 'storage', 'notifications'],
        sidebar: [{ path: `/plugins/${pluginName}`, label: displayName, icon: 'puzzle' }],
        routes: { [`/plugins/${pluginName}`]: 'MainView' },
        minQuoxVersion: '1.0.0',
    };

    if (template === 'monitoring-dashboard') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            serviceUrl: { type: 'url', label: 'Service URL', description: 'Base URL of the monitoring service', default: 'http://localhost:3000' },
            apiKey: { type: 'password', label: 'API Key', description: 'API key for authentication', default: '' },
        };
        base.nocIntegration = {
            tab: { label: displayName, icon: 'activity' },
            quickActions: [
                { id: 'check-health', label: 'Health Check', icon: 'heart', description: 'Run health check on all services', severity: 'info', prompt: `Check health of all ${displayName} services` },
                { id: 'restart-degraded', label: 'Restart Degraded', icon: 'refresh', description: 'Restart any degraded services', severity: 'warning', prompt: `Restart degraded ${displayName} services` },
            ],
        };
    }

    if (template === 'fleet-management') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network', 'aee', 'tools'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            bastionUrl: { type: 'url', label: 'Bastion URL', description: 'URL of the bastion host', default: 'http://localhost:9848' },
            apiToken: { type: 'password', label: 'API Token', description: 'Authentication token', default: '' },
        };
        base.safety = {
            destructiveActions: ['restart-host', 'remove-host', 'force-stop'],
            requiresApproval: ['restart-host', 'remove-host'],
            aeeRequired: true,
            killSwitchEnabled: true,
        };
        base.capabilities = {
            aeeIntents: [`${pluginName}.host.restart`, `${pluginName}.host.remove`, `${pluginName}.host.status`],
        };
    }

    if (template === 'service-bridge') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network', 'aee', 'tools', 'memory'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            oauthToken: { type: 'password', label: 'OAuth Token', description: 'OAuth access token for the service', default: '' },
            orgName: { type: 'string', label: 'Organization', description: 'Organization or workspace name', default: '' },
        };
        base.specialist = {
            name: `${displayName} Agent`,
            description: `Specialist agent for ${displayName} integration`,
            capabilities: ['query', 'create', 'update', 'analyse'],
        };
        base.capabilities = {
            aeeIntents: [`${pluginName}.item.create`, `${pluginName}.item.update`, `${pluginName}.item.delete`],
        };
        base.comparison = {
            free: { 'Items synced': '50', 'Agent queries': '10/day', 'Webhooks': false },
            paid: { 'Items synced': 'Unlimited', 'Agent queries': 'Unlimited', 'Webhooks': true },
        };
        base.safety = {
            destructiveActions: ['publish', 'delete'],
            requiresApproval: ['delete'],
            aeeRequired: true,
            killSwitchEnabled: false,
        };
        base.heroGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        base.badge = 'Integration';
        base.testimonials = [
            { quote: 'Saved us hours of manual sync work.', author: 'Example User', role: 'DevOps Engineer' },
        ];
        base.marketingPoints = ['Bi-directional sync', 'AI-powered analysis', 'Real-time webhooks'];
    }

    if (template === 'ui-feature') {
        base.permissions = ['sidebar', 'storage', 'notifications'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            sortOrder: { type: 'select', label: 'Default Sort', description: 'Default sort order for items', default: 'newest', options: ['newest', 'oldest', 'alphabetical'] },
            showCompleted: { type: 'boolean', label: 'Show Completed', description: 'Show completed items in the list', default: true },
        };
        base.comparison = {
            free: { 'Items': '25', 'Categories': '3', 'Export': false },
            paid: { 'Items': 'Unlimited', 'Categories': 'Unlimited', 'Export': true },
        };
    }

    if (template === 'enterprise-extension') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network', 'memory', 'aee'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            endpoint: { type: 'url', label: 'Service Endpoint', description: 'Backend service URL', default: 'http://localhost:8080' },
            maxRetention: { type: 'number', label: 'Retention Days', description: 'Maximum data retention in days', default: 90, premium: true },
            advancedAnalytics: { type: 'boolean', label: 'Advanced Analytics', description: 'Enable advanced analytics features', default: false, enterprise: true },
        };
        base.limits = {
            free: { queries: 100, storage_mb: 50, retention_days: 30 },
            pro: { queries: 10000, storage_mb: 500, retention_days: 90 },
            enterprise: { queries: -1, storage_mb: -1, retention_days: 365 },
        };
        base.comparison = {
            free: { 'Queries': '100/month', 'Storage': '50 MB', 'Analytics': false, 'API access': false },
            pro: { 'Queries': '10,000/month', 'Storage': '500 MB', 'Analytics': true, 'API access': false },
            enterprise: { 'Queries': 'Unlimited', 'Storage': 'Unlimited', 'Analytics': true, 'API access': true },
        };
        base.capabilities = {
            aeeIntents: [`${pluginName}.data.store`, `${pluginName}.data.query`, `${pluginName}.analytics.run`],
        };
        base.backend = {
            image: `${pluginName}-backend:latest`,
            healthPath: '/health',
            port: 8080,
        };
    }

    return base;
}

function generateIndexJsx(pluginName, displayName, template) {
    const hasSettings = template !== 'basic';
    const settingsImport = hasSettings ? `\nimport SettingsPanel from './views/SettingsPanel';` : '';
    const settingsRoute = hasSettings ? `\n        '/plugins/${pluginName}/settings': SettingsPanel,` : '';

    return `/**
 * ${displayName} — QuoxCORE Plugin Entry Point
 */

const { React } = window.__quoxSharedDeps;
import MainView from './views/MainView';${settingsImport}

window.__quoxPluginRegister('${pluginName}', {
    routes: {
        '/plugins/${pluginName}': MainView,${settingsRoute}
    },
    sidebar: [
        { path: '/plugins/${pluginName}', label: '${displayName}', icon: 'puzzle' },
    ],
    hooks: {
        onActivate() {
            console.log('[${displayName}] Activated');
        },
        onDeactivate() {
            console.log('[${displayName}] Deactivated');
        },
    },
});
`;
}

// --- MainView generators ---

function generateBasicMainView(displayName, description) {
    return `/**
 * ${displayName} — Main View
 */

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    return (
        <div style={{
            padding: '2rem',
            maxWidth: '800px',
        }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }}>
                ${displayName}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                ${description}
            </p>
        </div>
    );
}
`;
}

function generateMonitoringMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Displays service status table with polling.
 */

const { React } = window.__quoxSharedDeps;
import { MOCK_SERVICES } from '../data/mock';
import usePolling from '../hooks/usePolling';

const STATUS_COLORS = {
    healthy: '#10b981',
    degraded: '#f59e0b',
    down: '#ef4444',
};

export default function MainView({ pluginApi }) {
    const [services, setServices] = React.useState(MOCK_SERVICES);

    // Poll for status updates every 60 seconds
    usePolling(() => {
        // Replace with real API call: pluginApi.fetch('/api/status')
        setServices(prev => prev.map(s => ({
            ...s,
            lastCheck: new Date().toISOString(),
        })));
    }, 60000);

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName}
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Service', 'Status', 'Response', 'Uptime', 'Last Check'].map(h => (
                            <th key={h} style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                color: 'rgba(255,255,255,0.6)',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {services.map(service => (
                        <tr key={service.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                                {service.name}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: STATUS_COLORS[service.status] + '22',
                                    color: STATUS_COLORS[service.status],
                                }}>
                                    {service.status}
                                </span>
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                {service.responseMs}ms
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                {service.uptimePct}%
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                {new Date(service.lastCheck).toLocaleTimeString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
`;
}

function generateFleetMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Displays host table with action buttons and safety gates.
 */

const { React } = window.__quoxSharedDeps;
import { MOCK_HOSTS } from '../data/mock';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_COLORS = {
    online: '#10b981',
    offline: '#ef4444',
    maintenance: '#f59e0b',
};

export default function MainView({ pluginApi }) {
    const [hosts, setHosts] = React.useState(MOCK_HOSTS);
    const [confirmAction, setConfirmAction] = React.useState(null);

    const handleAction = (action, host) => {
        setConfirmAction({ action, host });
    };

    const executeAction = async () => {
        if (!confirmAction) return;
        const { action, host } = confirmAction;

        // Emit AEE audit envelope
        if (pluginApi?.aee) {
            await pluginApi.aee.emit('${pluginName}.host.' + action, {
                hostId: host.id,
                hostname: host.hostname,
                action,
            });
        }

        // Replace with real API call
        if (action === 'restart') {
            setHosts(prev => prev.map(h =>
                h.id === host.id ? { ...h, status: 'maintenance' } : h
            ));
            if (pluginApi?.notify) {
                pluginApi.notify('Restarting ' + host.hostname + '...', 'info');
            }
        } else if (action === 'remove') {
            setHosts(prev => prev.filter(h => h.id !== host.id));
            if (pluginApi?.notify) {
                pluginApi.notify('Removed ' + host.hostname, 'warning');
            }
        }
        setConfirmAction(null);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName}
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Hostname', 'IP', 'Group', 'OS', 'Status', 'Last Seen', 'Actions'].map(h => (
                            <th key={h} style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                color: 'rgba(255,255,255,0.6)',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {hosts.map(host => (
                        <tr key={host.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                                {host.hostname}
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                                {host.ip}
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{host.group}</td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{host.os}</td>
                            <td style={{ padding: '0.75rem' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: (STATUS_COLORS[host.status] || '#6b7280') + '22',
                                    color: STATUS_COLORS[host.status] || '#6b7280',
                                }}>
                                    {host.status}
                                </span>
                            </td>
                            <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                {new Date(host.lastSeen).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                                <button
                                    onClick={() => handleAction('restart', host)}
                                    style={{
                                        padding: '0.3rem 0.6rem',
                                        marginRight: '0.5rem',
                                        background: 'rgba(59,130,246,0.15)',
                                        color: 'rgba(59,130,246,0.9)',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    &#x21BB; Restart
                                </button>
                                <button
                                    onClick={() => handleAction('remove', host)}
                                    style={{
                                        padding: '0.3rem 0.6rem',
                                        background: 'rgba(239,68,68,0.15)',
                                        color: 'rgba(239,68,68,0.9)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    &#x2715; Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {confirmAction && (
                <ConfirmModal
                    action={confirmAction.action}
                    target={confirmAction.host.hostname}
                    onConfirm={executeAction}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
}
`;
}

function generateServiceBridgeMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Displays connection status, item cards, and engagement stats.
 */

const { React } = window.__quoxSharedDeps;
import { MOCK_DATA } from '../data/mock';
import AgentSidebar from '../components/AgentSidebar';

export default function MainView({ pluginApi }) {
    const [data, setData] = React.useState(MOCK_DATA);
    const [showAgent, setShowAgent] = React.useState(false);

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }}>
                ${displayName}
            </h2>

            {/* Connection Status Banner */}
            <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: '8px',
                background: data.connected
                    ? 'rgba(16,185,129,0.1)'
                    : 'rgba(239,68,68,0.1)',
                border: '1px solid ' + (data.connected
                    ? 'rgba(16,185,129,0.3)'
                    : 'rgba(239,68,68,0.3)'),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{
                    color: data.connected ? '#10b981' : '#ef4444',
                    fontWeight: 500,
                }}>
                    {data.connected ? '&#x2713; Connected' : '&#x2717; Disconnected'}
                </span>
                <button
                    onClick={() => setShowAgent(!showAgent)}
                    style={{
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(102,126,234,0.15)',
                        color: 'rgba(102,126,234,0.9)',
                        border: '1px solid rgba(102,126,234,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}
                >
                    &#x2728; Ask Agent
                </button>
            </div>

            {/* Item Card Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
            }}>
                {data.items.map(item => (
                    <div key={item.id} style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.5rem' }}>
                            {item.title}
                        </h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                            {item.description}
                        </p>
                        <span style={{
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            background: 'rgba(102,126,234,0.15)',
                            color: 'rgba(102,126,234,0.9)',
                        }}>
                            {item.type}
                        </span>
                    </div>
                ))}
            </div>

            {/* Engagement Stats Row */}
            <div style={{
                display: 'flex',
                gap: '1.5rem',
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                {[
                    { label: 'Total Items', value: data.metrics.total },
                    { label: 'This Week', value: data.metrics.thisWeek },
                    { label: 'Engagement', value: data.metrics.engagement + '%' },
                ].map(stat => (
                    <div key={stat.label}>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.25rem', fontWeight: 600 }}>
                            {stat.value}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {showAgent && (
                <AgentSidebar
                    pluginApi={pluginApi}
                    context={data}
                    onClose={() => setShowAgent(false)}
                />
            )}
        </div>
    );
}
`;
}

function generateUiFeatureMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Card grid with storage persistence, add/remove, and empty state.
 */

const { React } = window.__quoxSharedDeps;
import { MOCK_ITEMS } from '../data/mock';
import EmptyState from '../components/EmptyState';

export default function MainView({ pluginApi }) {
    const [items, setItems] = React.useState(() => {
        // Load from plugin storage if available
        if (pluginApi?.storage) {
            const saved = pluginApi.storage.get('items');
            if (saved) return saved;
        }
        return MOCK_ITEMS;
    });

    // Persist to storage on change
    React.useEffect(() => {
        if (pluginApi?.storage) {
            pluginApi.storage.set('items', items);
        }
    }, [items, pluginApi]);

    const addItem = () => {
        const id = Date.now().toString(36);
        setItems(prev => [...prev, {
            id,
            title: 'New Item',
            description: 'Click to edit this item',
            status: 'active',
            createdAt: new Date().toISOString(),
        }]);
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    if (items.length === 0) {
        return (
            <div style={{ padding: '2rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                    ${displayName}
                </h2>
                <EmptyState
                    message="No items yet"
                    actionLabel="Add your first item"
                    onAction={addItem}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    ${displayName}
                </h2>
                <button
                    onClick={addItem}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(16,185,129,0.15)',
                        color: 'rgba(16,185,129,0.9)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}
                >
                    + Add Item
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
            }}>
                {items.map(item => (
                    <div key={item.id} style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => removeItem(item.id)}
                            style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                fontSize: '1rem',
                            }}
                        >
                            &#x2715;
                        </button>
                        <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.5rem' }}>
                            {item.title}
                        </h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                            {item.description}
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                background: item.status === 'active'
                                    ? 'rgba(16,185,129,0.15)'
                                    : 'rgba(107,114,128,0.15)',
                                color: item.status === 'active'
                                    ? '#10b981'
                                    : '#6b7280',
                            }}>
                                {item.status}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                                {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
`;
}

function generateEnterpriseMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Multi-tier enterprise view with usage meter, feature cards, and upgrade gates.
 */

const { React } = window.__quoxSharedDeps;
import { MOCK_DATA } from '../data/mock';
import UsageMeter from '../components/UsageMeter';
import UpgradeGate from '../components/UpgradeGate';

export default function MainView({ pluginApi }) {
    const [data, setData] = React.useState(MOCK_DATA);
    const [searchQuery, setSearchQuery] = React.useState('');
    const currentTier = 'free'; // Replace with real tier detection

    const handleMemorySearch = async () => {
        if (!searchQuery.trim()) return;
        if (pluginApi?.memory) {
            const results = await pluginApi.memory.search(searchQuery, 10);
            console.log('Memory search results:', results);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '0.5rem' }}>
                ${displayName}
            </h2>

            {/* Tier Banner + Usage Meter */}
            <div style={{
                padding: '1rem',
                marginBottom: '1.5rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                }}>
                    <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(107,114,128,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'uppercase',
                    }}>
                        {currentTier} tier
                    </span>
                </div>
                <UsageMeter
                    label="Queries"
                    current={data.tierUsage.queriesUsed}
                    limit={data.tierUsage.queriesLimit}
                />
                <UsageMeter
                    label="Storage"
                    current={data.tierUsage.storageMb}
                    limit={data.tierUsage.storageLimitMb}
                    unit="MB"
                />
            </div>

            {/* Memory Search */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
            }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMemorySearch()}
                    placeholder="Search memory..."
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleMemorySearch}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(102,126,234,0.15)',
                        color: 'rgba(102,126,234,0.9)',
                        border: '1px solid rgba(102,126,234,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    Search
                </button>
            </div>

            {/* Unlocked Feature Cards */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontSize: '1rem' }}>
                Available Features
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
            }}>
                {data.features.filter(f => !f.locked).map(feature => (
                    <div key={feature.id} style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.5rem' }}>
                            {feature.name}
                        </h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Locked Feature Cards with Upgrade Gate */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontSize: '1rem' }}>
                Premium Features
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
            }}>
                {data.features.filter(f => f.locked).map(feature => (
                    <UpgradeGate key={feature.id} requiredTier={feature.requiredTier}>
                        <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.5rem' }}>
                                {feature.name}
                            </h4>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                                {feature.description}
                            </p>
                        </div>
                    </UpgradeGate>
                ))}
            </div>
        </div>
    );
}
`;
}

// --- Settings Panel generators ---

function generateMonitoringSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * Configuration for service URL and API key.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { serviceUrl: 'http://localhost:3000', apiKey: '' };
    });

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Service URL
                </label>
                <input
                    type="url"
                    value={config.serviceUrl}
                    onChange={e => setConfig(prev => ({ ...prev, serviceUrl: e.target.value }))}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    API Key
                </label>
                <input
                    type="password"
                    value={config.apiKey}
                    onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter API key"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
`;
}

function generateFleetSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * Configuration for bastion credentials.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { bastionUrl: 'http://localhost:9848', apiToken: '' };
    });

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Bastion URL
                </label>
                <input
                    type="url"
                    value={config.bastionUrl}
                    onChange={e => setConfig(prev => ({ ...prev, bastionUrl: e.target.value }))}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    API Token
                </label>
                <input
                    type="password"
                    value={config.apiToken}
                    onChange={e => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                    placeholder="Enter API token"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
`;
}

function generateServiceBridgeSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * OAuth credential and organization configuration.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { oauthToken: '', orgName: '' };
    });

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    OAuth Token
                </label>
                <input
                    type="password"
                    value={config.oauthToken}
                    onChange={e => setConfig(prev => ({ ...prev, oauthToken: e.target.value }))}
                    placeholder="Enter OAuth access token"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Organization
                </label>
                <input
                    type="text"
                    value={config.orgName}
                    onChange={e => setConfig(prev => ({ ...prev, orgName: e.target.value }))}
                    placeholder="e.g. my-org"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
`;
}

function generateUiFeatureSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * Simple preferences configuration.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { sortOrder: 'newest', showCompleted: true };
    });

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Default Sort Order
                </label>
                <select
                    value={config.sortOrder}
                    onChange={e => setConfig(prev => ({ ...prev, sortOrder: e.target.value }))}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="alphabetical">Alphabetical</option>
                </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={config.showCompleted}
                        onChange={e => setConfig(prev => ({ ...prev, showCompleted: e.target.checked }))}
                    />
                    Show completed items
                </label>
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
`;
}

function generateEnterpriseSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * Complex configuration with premium-flagged fields.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || {
            endpoint: 'http://localhost:8080',
            maxRetention: 90,
            advancedAnalytics: false,
        };
    });
    const currentTier = 'free'; // Replace with real tier detection

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    const fieldStyle = {
        width: '100%',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: 'rgba(255,255,255,0.85)',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Service Endpoint
                </label>
                <input
                    type="url"
                    value={config.endpoint}
                    onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    style={fieldStyle}
                />
            </div>

            <div style={{ marginBottom: '1.25rem', opacity: currentTier === 'free' ? 0.5 : 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Retention Days
                    <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        background: 'rgba(168,85,247,0.2)',
                        color: '#a855f7',
                    }}>PRO</span>
                </label>
                <input
                    type="number"
                    value={config.maxRetention}
                    onChange={e => setConfig(prev => ({ ...prev, maxRetention: parseInt(e.target.value) || 30 }))}
                    disabled={currentTier === 'free'}
                    style={{ ...fieldStyle, opacity: currentTier === 'free' ? 0.5 : 1 }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem', opacity: currentTier !== 'enterprise' ? 0.5 : 1 }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: currentTier === 'enterprise' ? 'pointer' : 'not-allowed',
                }}>
                    <input
                        type="checkbox"
                        checked={config.advancedAnalytics}
                        onChange={e => setConfig(prev => ({ ...prev, advancedAnalytics: e.target.checked }))}
                        disabled={currentTier !== 'enterprise'}
                    />
                    Advanced Analytics
                    <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        background: 'rgba(234,179,8,0.2)',
                        color: '#eab308',
                    }}>ENTERPRISE</span>
                </label>
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}
`;
}

// --- Component generators ---

function generateConfirmModal() {
    return `/**
 * ConfirmModal — Safety gate confirmation dialog.
 * Used before destructive actions (restart, remove, etc.)
 */

const { React } = window.__quoxSharedDeps;

export default function ConfirmModal({ action, target, onConfirm, onCancel }) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '90%',
            }}>
                <h3 style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 0.75rem' }}>
                    Confirm {action}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.25rem' }}>
                    Are you sure you want to <strong style={{ color: '#ef4444' }}>{action}</strong> <strong>{target}</strong>?
                    This action may be destructive.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(239,68,68,0.15)',
                            color: 'rgba(239,68,68,0.9)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Confirm {action}
                    </button>
                </div>
            </div>
        </div>
    );
}
`;
}

function generateAgentSidebar(pluginName, displayName) {
    return `/**
 * AgentSidebar — Agent chat panel stub with context builder.
 * Displays a chat-like interface for the specialist agent.
 */

const { React } = window.__quoxSharedDeps;

function buildAgentContext(data) {
    return {
        connected: data.connected,
        itemCount: data.items?.length || 0,
        metrics: data.metrics,
    };
}

export default function AgentSidebar({ pluginApi, context, onClose }) {
    const [query, setQuery] = React.useState('');
    const [messages, setMessages] = React.useState([
        { role: 'agent', text: 'Hello! I can help you with ${displayName}. What would you like to do?' },
    ]);

    const handleSend = async () => {
        if (!query.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: query }]);

        // Build context for the agent
        const agentContext = buildAgentContext(context);
        console.log('[${displayName}] Agent context:', agentContext);

        // Stub: In production, this would call the specialist agent via pluginApi
        setMessages(prev => [...prev, {
            role: 'agent',
            text: 'I received your query. In production, this would be processed by the ${displayName} specialist agent with full context.',
        }]);
        setQuery('');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '360px',
            background: '#1a1a2e',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    &#x2728; ${displayName} Agent
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                    }}
                >
                    &#x2715;
                </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0 }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        marginBottom: '0.75rem',
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            maxWidth: '85%',
                            background: msg.role === 'user'
                                ? 'rgba(102,126,234,0.15)'
                                : 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.85rem',
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div style={{
                padding: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '0.5rem',
            }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask the agent..."
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(102,126,234,0.15)',
                        color: 'rgba(102,126,234,0.9)',
                        border: '1px solid rgba(102,126,234,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    &#x27A4;
                </button>
            </div>
        </div>
    );
}
`;
}

function generateEmptyState() {
    return `/**
 * EmptyState — Empty state placeholder with icon, message, and CTA.
 */

const { React } = window.__quoxSharedDeps;

export default function EmptyState({ message, actionLabel, onAction }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                opacity: 0.3,
            }}>
                &#x1F4E6;
            </div>
            <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem',
                marginBottom: '1.5rem',
            }}>
                {message}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        padding: '0.6rem 1.5rem',
                        background: 'rgba(16,185,129,0.15)',
                        color: 'rgba(16,185,129,0.9)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
`;
}

function generateUsageMeter() {
    return `/**
 * UsageMeter — Progress bar with tier-aware limits.
 */

const { React } = window.__quoxSharedDeps;

export default function UsageMeter({ label, current, limit, unit = '' }) {
    const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const isWarning = pct > 80;
    const isCritical = pct > 95;

    const barColor = isCritical
        ? '#ef4444'
        : isWarning
            ? '#f59e0b'
            : '#10b981';

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.3rem',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    {label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    {current}{unit} / {limit}{unit}
                </span>
            </div>
            <div style={{
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: pct + '%',
                    borderRadius: '3px',
                    background: barColor,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
}
`;
}

function generateUpgradeGate() {
    return `/**
 * UpgradeGate — Locked feature overlay with upgrade CTA.
 */

const { React } = window.__quoxSharedDeps;

export default function UpgradeGate({ children, requiredTier = 'pro' }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
                {children}
            </div>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
            }}>
                <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: requiredTier === 'enterprise'
                        ? 'rgba(234,179,8,0.2)'
                        : 'rgba(168,85,247,0.2)',
                    color: requiredTier === 'enterprise' ? '#eab308' : '#a855f7',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                }}>
                    {requiredTier} required
                </span>
                <button
                    onClick={() => {
                        // Open upgrade flow
                        console.log('Upgrade to', requiredTier);
                    }}
                    style={{
                        padding: '0.3rem 0.8rem',
                        background: 'rgba(168,85,247,0.15)',
                        color: 'rgba(168,85,247,0.9)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                    }}
                >
                    Upgrade
                </button>
            </div>
        </div>
    );
}
`;
}

// --- Hook generators ---

function generateUsePolling() {
    return `/**
 * usePolling — Poll a function at a fixed interval with cleanup.
 */

const { React } = window.__quoxSharedDeps;

export default function usePolling(callback, intervalMs = 60000) {
    const savedCallback = React.useRef(callback);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        mountedRef.current = true;

        const tick = () => {
            if (mountedRef.current) {
                savedCallback.current();
            }
        };

        const id = setInterval(tick, intervalMs);

        return () => {
            mountedRef.current = false;
            clearInterval(id);
        };
    }, [intervalMs]);
}
`;
}

// --- Mock data generators ---

function generateMonitoringMock() {
    return `/**
 * Mock data for monitoring-dashboard template.
 */

export const MOCK_SERVICES = [
    { id: 'svc-1', name: 'API Gateway', status: 'healthy', responseMs: 45, uptimePct: 99.97, lastCheck: new Date().toISOString() },
    { id: 'svc-2', name: 'Database', status: 'healthy', responseMs: 12, uptimePct: 99.99, lastCheck: new Date().toISOString() },
    { id: 'svc-3', name: 'Cache Layer', status: 'degraded', responseMs: 230, uptimePct: 98.5, lastCheck: new Date().toISOString() },
];
`;
}

function generateFleetMock() {
    return `/**
 * Mock data for fleet-management template.
 */

export const MOCK_HOSTS = [
    { id: 'h-1', hostname: 'docker01', ip: '10.0.0.101', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-2', hostname: 'docker02', ip: '10.0.0.102', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-3', hostname: 'docker03', ip: '10.0.0.103', group: 'compute', status: 'maintenance', lastSeen: new Date(Date.now() - 300000).toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-4', hostname: 'pve01', ip: '10.0.0.1', group: 'hypervisor', status: 'online', lastSeen: new Date().toISOString(), os: 'Proxmox VE 8.1' },
    { id: 'h-5', hostname: 'monitor01', ip: '10.0.0.200', group: 'monitoring', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), os: 'Debian 12' },
];
`;
}

function generateServiceBridgeMock() {
    return `/**
 * Mock data for service-bridge template.
 */

export const MOCK_DATA = {
    connected: true,
    items: [
        { id: 'item-1', title: 'Weekly Report', description: 'Automated weekly status report', type: 'report' },
        { id: 'item-2', title: 'Security Scan', description: 'Scheduled vulnerability scan results', type: 'scan' },
        { id: 'item-3', title: 'Deployment Log', description: 'Latest production deployment details', type: 'deployment' },
    ],
    metrics: {
        total: 156,
        thisWeek: 12,
        engagement: 78,
    },
};
`;
}

function generateUiFeatureMock() {
    return `/**
 * Mock data for ui-feature template.
 */

export const MOCK_ITEMS = [
    { id: 'item-1', title: 'Review pull requests', description: 'Check pending PRs for the dashboard repo', status: 'active', createdAt: new Date().toISOString() },
    { id: 'item-2', title: 'Update documentation', description: 'Add plugin SDK tutorial section', status: 'active', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'item-3', title: 'Fix login redirect', description: 'OAuth callback not redirecting correctly', status: 'active', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'item-4', title: 'Deploy monitoring', description: 'Roll out Grafana dashboards to production', status: 'completed', createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'item-5', title: 'Backup audit', description: 'Verify all backup scripts are running correctly', status: 'active', createdAt: new Date(Date.now() - 345600000).toISOString() },
];
`;
}

function generateEnterpriseMock() {
    return `/**
 * Mock data for enterprise-extension template.
 */

export const MOCK_DATA = {
    tierUsage: {
        queriesUsed: 67,
        queriesLimit: 100,
        storageMb: 23,
        storageLimitMb: 50,
    },
    features: [
        { id: 'f-1', name: 'Data Storage', description: 'Store and retrieve structured data', locked: false },
        { id: 'f-2', name: 'Basic Search', description: 'Full-text search across stored data', locked: false },
        { id: 'f-3', name: 'Export', description: 'Export data in CSV and JSON formats', locked: false },
        { id: 'f-4', name: 'Advanced Analytics', description: 'Trend analysis and anomaly detection', locked: true, requiredTier: 'pro' },
        { id: 'f-5', name: 'API Access', description: 'REST API for programmatic access', locked: true, requiredTier: 'enterprise' },
        { id: 'f-6', name: 'Custom Integrations', description: 'Connect to external services and pipelines', locked: true, requiredTier: 'enterprise' },
    ],
    memories: [
        { id: 'm-1', type: 'fact', content: 'Example memory entry for search demonstration', tags: ['example'] },
    ],
};
`;
}

// --- Backend generators (enterprise only) ---

function generateBackendServer(pluginName, displayName) {
    return `/**
 * ${displayName} — Backend Service
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', plugin: '${pluginName}', uptime: process.uptime() });
});

// API endpoint stub
app.get('/api/data', (req, res) => {
    res.json({
        items: [],
        meta: { total: 0, page: 1, limit: 50 },
    });
});

app.listen(PORT, () => {
    console.log('[${displayName}] Backend running on port ' + PORT);
});
`;
}

function generateBackendPackageJson(pluginName, displayName) {
    return JSON.stringify({
        name: `${pluginName}-backend`,
        version: '0.1.0',
        private: true,
        description: `${displayName} backend service`,
        main: 'server.js',
        scripts: {
            start: 'node server.js',
        },
        dependencies: {
            express: '^4.18.0',
        },
    }, null, 2);
}

function generateDockerfile(pluginName) {
    return `FROM node:20-alpine
WORKDIR /app
COPY backend/package.json ./
RUN npm install --production
COPY backend/ ./
EXPOSE 8080
CMD ["node", "server.js"]
`;
}

// --- Shared generators ---

function generateViteConfig(pluginName) {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import quoxPlugin from 'quox-plugin-vite';

export default defineConfig({
    plugins: [
        react(),
        quoxPlugin({ pluginId: '${pluginName}' }),
    ],
});
`;
}

function generatePackageJson(pluginName) {
    return JSON.stringify({
        name: pluginName,
        version: '0.1.0',
        private: true,
        scripts: {
            dev: 'vite',
            build: 'vite build',
            validate: 'node -e "const m = require(\'./manifest.json\'); console.log(\'Manifest OK:\', m.id, m.version)"',
        },
        devDependencies: {
            '@vitejs/plugin-react': '^4.0.0',
            'quox-plugin-vite': '^0.1.0',
            'quox-plugin-sdk': '^0.1.0',
            vite: '^7.0.0',
            'adm-zip': '^0.5.10',
        },
    }, null, 2);
}

function generateGitignore() {
    return `node_modules/
dist/
*.quoxplugin
`;
}

// --- Template file map ---

function getTemplateFiles(pluginName, displayName, author, description, category, template) {
    const manifest = generateManifest(pluginName, displayName, author, description, category, template);
    const files = {
        'manifest.json': JSON.stringify(manifest, null, 2),
        'src/index.jsx': generateIndexJsx(pluginName, displayName, template),
        'vite.config.js': generateViteConfig(pluginName),
        'package.json': generatePackageJson(pluginName),
        '.gitignore': generateGitignore(),
    };

    switch (template) {
        case 'basic':
            files['src/views/MainView.jsx'] = generateBasicMainView(displayName, description);
            break;

        case 'monitoring-dashboard':
            files['src/views/MainView.jsx'] = generateMonitoringMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateMonitoringSettings(pluginName, displayName);
            files['src/hooks/usePolling.js'] = generateUsePolling();
            files['src/data/mock.js'] = generateMonitoringMock();
            break;

        case 'fleet-management':
            files['src/views/MainView.jsx'] = generateFleetMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateFleetSettings(pluginName, displayName);
            files['src/components/ConfirmModal.jsx'] = generateConfirmModal();
            files['src/data/mock.js'] = generateFleetMock();
            break;

        case 'service-bridge':
            files['src/views/MainView.jsx'] = generateServiceBridgeMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateServiceBridgeSettings(pluginName, displayName);
            files['src/components/AgentSidebar.jsx'] = generateAgentSidebar(pluginName, displayName);
            files['src/data/mock.js'] = generateServiceBridgeMock();
            break;

        case 'ui-feature':
            files['src/views/MainView.jsx'] = generateUiFeatureMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateUiFeatureSettings(pluginName, displayName);
            files['src/components/EmptyState.jsx'] = generateEmptyState();
            files['src/data/mock.js'] = generateUiFeatureMock();
            break;

        case 'enterprise-extension':
            files['src/views/MainView.jsx'] = generateEnterpriseMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateEnterpriseSettings(pluginName, displayName);
            files['src/components/UsageMeter.jsx'] = generateUsageMeter();
            files['src/components/UpgradeGate.jsx'] = generateUpgradeGate();
            files['src/data/mock.js'] = generateEnterpriseMock();
            files['backend/server.js'] = generateBackendServer(pluginName, displayName);
            files['backend/package.json'] = generateBackendPackageJson(pluginName, displayName);
            files['Dockerfile'] = generateDockerfile(pluginName);
            break;
    }

    return files;
}

// --- Main ---

async function main() {
    const args = process.argv.slice(2);
    let pluginName = args.find(a => !a.startsWith('--'));
    let template = null;
    const nonInteractive = args.includes('--non-interactive') || !process.stdin.isTTY;

    const templateIdx = args.indexOf('--template');
    if (templateIdx !== -1 && args[templateIdx + 1]) {
        template = args[templateIdx + 1];
        if (!TEMPLATE_NAMES.includes(template)) {
            console.error(`Unknown template: ${template}`);
            console.error(`Available: ${TEMPLATE_NAMES.join(', ')}`);
            process.exit(1);
        }
    }

    if (!pluginName) {
        if (nonInteractive) {
            console.error('Plugin name is required in non-interactive mode.');
            process.exit(1);
        }
        pluginName = await ask('Plugin name (kebab-case): ');
    }

    // Validate name
    if (!/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/.test(pluginName)) {
        console.error('Invalid plugin name. Use lowercase letters, numbers, and dashes (3-64 chars).');
        process.exit(1);
    }

    // Template selection
    if (!template) {
        if (nonInteractive) {
            template = 'basic';
        } else {
            console.log('\nSelect a template:\n');
            TEMPLATES.forEach((t, i) => {
                console.log(`  ${i + 1}. ${t.name.padEnd(24)} — ${t.description}`);
            });
            console.log('');
            const choice = await ask('Template number [1]: ') || '1';
            const idx = parseInt(choice) - 1;
            if (idx < 0 || idx >= TEMPLATES.length) {
                console.error('Invalid template choice.');
                process.exit(1);
            }
            template = TEMPLATES[idx].name;
        }
    }

    const suggestedCategory = TEMPLATES.find(t => t.name === template)?.suggestedCategory || 'Other';
    const defaultDisplayName = pluginName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

    let displayName, category, author, description;
    if (nonInteractive) {
        displayName = defaultDisplayName;
        category = suggestedCategory;
        author = '';
        description = `A QuoxCORE plugin: ${defaultDisplayName}`;
    } else {
        displayName = await ask(`Display name [${defaultDisplayName}]: `) || defaultDisplayName;
        category = await ask(`Category (${CATEGORIES.join(', ')}) [${suggestedCategory}]: `) || suggestedCategory;
        author = await ask('Author: ') || '';
        description = await ask('Description: ') || `A QuoxCORE plugin: ${displayName}`;
    }

    rl.close();

    const outDir = path.resolve(pluginName);
    if (fs.existsSync(outDir)) {
        console.error(`Directory ${pluginName} already exists.`);
        process.exit(1);
    }

    console.log(`\nScaffolding ${displayName} (${template} template)...\n`);

    // Generate all files
    const files = getTemplateFiles(pluginName, displayName, author, description, category, template);

    // Write files
    const writtenFiles = [];
    for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(outDir, relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
        writtenFiles.push(relativePath);
    }

    // Print summary
    console.log(`Created ${pluginName}/`);
    writtenFiles.forEach(f => console.log(`  ${f}`));
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${pluginName}`);
    console.log('  npm install');
    console.log('  npm run build    # produces .quoxplugin file');
    console.log('  npm run dev      # start dev server');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

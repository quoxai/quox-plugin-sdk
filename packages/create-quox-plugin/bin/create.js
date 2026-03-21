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
    { name: 'specialist-agent', description: 'Specialist agent with tools, persona, autonomy, and inline chat (Security Scanner pattern)', suggestedCategory: 'AI & Intelligence' },
    { name: 'agentic-team', description: 'Multi-agent team with orchestrator, policies, and shared context (DevOps Team pattern)', suggestedCategory: 'Infrastructure' },
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

    if (template === 'specialist-agent') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network', 'aee', 'tools', 'memory'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            scanTarget: { type: 'string', label: 'Default Target', description: 'Default scan target (subnet or host)', default: '10.0.0.0/24' },
            defconLevel: { type: 'select', label: 'DEFCON Level', description: 'Agent alert level', default: 'AMBER', options: ['GREEN', 'AMBER', 'ORANGE', 'RED'] },
        };
        base.safety = {
            destructiveActions: ['deep-scan', 'remediate'],
            requiresApproval: ['remediate'],
            aeeRequired: true,
            killSwitchEnabled: true,
        };
        base.capabilities = {
            aeeIntents: [`${pluginName}.scan.start`, `${pluginName}.scan.complete`, `${pluginName}.finding.report`],
        };
        base.agentDefinition = {
            id: `${pluginName}-agent`,
            name: `${displayName} Agent`,
            role: 'specialist',
            level: 1,
            domain: 'security',
            description: `Specialist security scanning agent for ${displayName}`,
            ownership: { source: 'plugin', plugin: pluginName },
            systemPrompt: `You are the ${displayName} specialist agent. You scan infrastructure for vulnerabilities, analyse findings, and generate security reports. Be thorough, precise, and always prioritise critical findings.`,
            personality: { tone: 'professional', verbosity: 'medium', formality: 'formal', traits: ['thorough', 'precise', 'security-focused'] },
            capabilities: ['scan', 'analyse', 'report', 'remediate'],
            tools: [`plugin_${pluginName}_run_scan`, `plugin_${pluginName}_get_findings`, `plugin_${pluginName}_generate_report`],
            defconLevel: 'AMBER',
            autonomy: {
                canRunAutonomously: true,
                defaultSchedule: '0 */4 * * *',
                budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 300000, maxDailyRuns: 6 },
                escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
                allowedTriggers: ['schedule', 'manual', 'webhook'],
            },
            suggestions: [
                'Scan the production subnet for vulnerabilities',
                'Show critical findings from the last scan',
                'Generate an executive summary of our security posture',
                'What are the most common vulnerabilities across hosts?',
                'Schedule a deep scan for tonight',
            ],
        };
        base.agentPersona = {
            id: `${pluginName}-agent`,
            name: `${displayName} Agent`,
            shortName: displayName.split(' ')[0],
            voice: 'analytical',
            color: '#f59e0b',
            colorRgb: '245, 158, 11',
            specialty: 'Security scanning and vulnerability analysis',
            description: `Specialist agent for ${displayName} — scans infrastructure, analyses findings, and generates reports`,
            llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
            systemPrompt: `You are the ${displayName} specialist agent. You scan infrastructure for vulnerabilities, analyse findings, and generate security reports.`,
        };
        base.toolDefinitions = [
            {
                name: `plugin_${pluginName}_run_scan`,
                description: 'Run a security scan against a target',
                input_schema: {
                    type: 'object',
                    properties: {
                        target: { type: 'string', description: 'Target host or subnet to scan' },
                        depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Scan depth level' },
                        categories: { type: 'array', items: { type: 'string' }, description: 'Vulnerability categories to check' },
                    },
                    required: ['target'],
                },
            },
            {
                name: `plugin_${pluginName}_get_findings`,
                description: 'Retrieve findings from a completed scan',
                input_schema: {
                    type: 'object',
                    properties: {
                        scanId: { type: 'string', description: 'ID of the scan to retrieve findings for' },
                        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Filter by severity level' },
                        limit: { type: 'number', description: 'Maximum number of findings to return' },
                    },
                    required: ['severity'],
                },
            },
            {
                name: `plugin_${pluginName}_generate_report`,
                description: 'Generate a report from scan findings',
                input_schema: {
                    type: 'object',
                    properties: {
                        scanId: { type: 'string', description: 'ID of the scan to report on' },
                        format: { type: 'string', enum: ['summary', 'detailed', 'executive'], description: 'Report format' },
                        includeRemediation: { type: 'boolean', description: 'Include remediation steps in the report' },
                    },
                    required: ['scanId', 'format'],
                },
            },
        ];
        // Backward compat: also set specialist field
        base.specialist = {
            name: `${displayName} Agent`,
            description: `Specialist security scanning agent for ${displayName}`,
            capabilities: ['scan', 'analyse', 'report', 'remediate'],
        };
    }

    if (template === 'agentic-team') {
        base.permissions = ['sidebar', 'storage', 'notifications', 'network', 'aee', 'tools', 'memory'];
        base.routes[`/plugins/${pluginName}/settings`] = 'SettingsPanel';
        base.configSchema = {
            approvalRequired: { type: 'boolean', label: 'Require Approval', description: 'Require approval before team starts a task', default: true },
            maxParallelTasks: { type: 'number', label: 'Max Parallel Tasks', description: 'Maximum concurrent tasks across the team', default: 2 },
        };
        base.safety = {
            destructiveActions: ['deploy', 'rollback', 'escalate'],
            requiresApproval: ['deploy', 'rollback'],
            aeeRequired: true,
            killSwitchEnabled: true,
        };
        base.capabilities = {
            aeeIntents: [`${pluginName}.task.assign`, `${pluginName}.deploy.start`, `${pluginName}.incident.create`],
        };

        const agentDefs = [
            { id: `${pluginName}-lead`, name: `${displayName} Lead`, role: 'orchestrator', domain: 'devops', defcon: 'GREEN', color: '#38bdf8', colorRgb: '56, 189, 248', shortName: 'Lead', voice: 'commanding' },
            { id: `${pluginName}-deployer`, name: `${displayName} Deployer`, role: 'specialist', domain: 'deployment', defcon: 'AMBER', color: '#f59e0b', colorRgb: '245, 158, 11', shortName: 'Deployer', voice: 'methodical' },
            { id: `${pluginName}-monitor`, name: `${displayName} Monitor`, role: 'specialist', domain: 'monitoring', defcon: 'GREEN', color: '#10b981', colorRgb: '16, 185, 129', shortName: 'Monitor', voice: 'observant' },
            { id: `${pluginName}-responder`, name: `${displayName} Responder`, role: 'analyst', domain: 'incident-response', defcon: 'ORANGE', color: '#ef4444', colorRgb: '239, 68, 68', shortName: 'Responder', voice: 'urgent' },
        ];

        const toolDefs = [
            { name: `plugin_${pluginName}_assign_task`, desc: 'Assign a task to a team member', props: { agentId: { type: 'string', description: 'ID of agent to assign to' }, task: { type: 'string', description: 'Task description' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Task priority' } }, required: ['agentId', 'task'] },
            { name: `plugin_${pluginName}_get_team_status`, desc: 'Get current status of all team members', props: {}, required: [] },
            { name: `plugin_${pluginName}_deploy_service`, desc: 'Deploy a service to the target environment', props: { service: { type: 'string', description: 'Service name to deploy' }, environment: { type: 'string', enum: ['staging', 'production'], description: 'Target environment' }, version: { type: 'string', description: 'Version to deploy' } }, required: ['service', 'environment'] },
            { name: `plugin_${pluginName}_rollback_service`, desc: 'Roll back a service to a previous version', props: { service: { type: 'string', description: 'Service name to roll back' }, targetVersion: { type: 'string', description: 'Version to roll back to' } }, required: ['service'] },
            { name: `plugin_${pluginName}_check_health`, desc: 'Check health of a service or all services', props: { service: { type: 'string', description: 'Service name (omit for all)' } }, required: [] },
            { name: `plugin_${pluginName}_query_metrics`, desc: 'Query metrics for a service', props: { service: { type: 'string', description: 'Service name' }, metric: { type: 'string', description: 'Metric name (cpu, memory, latency, errors)' }, period: { type: 'string', description: 'Time period (1h, 6h, 24h, 7d)' } }, required: ['service', 'metric'] },
            { name: `plugin_${pluginName}_create_incident`, desc: 'Create an incident report', props: { title: { type: 'string', description: 'Incident title' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Incident severity' }, description: { type: 'string', description: 'Incident description' } }, required: ['title', 'severity'] },
            { name: `plugin_${pluginName}_escalate_incident`, desc: 'Escalate an incident to a higher tier', props: { incidentId: { type: 'string', description: 'Incident ID to escalate' }, reason: { type: 'string', description: 'Reason for escalation' } }, required: ['incidentId'] },
        ];

        base.team = {
            id: `${pluginName}-team`,
            type: 'team',
            version: '1.0.0',
            displayName: `${displayName} Team`,
            description: `DevOps team for ${displayName} — orchestrates deployments, monitoring, and incident response`,
            orchestrator: { agentId: agentDefs[0].id, role: 'orchestrator', domains: ['devops', 'coordination'] },
            members: agentDefs.map(a => ({ agentId: a.id, role: a.role, domains: [a.domain] })),
            policies: {
                maxBudgetTokens: 200000,
                maxBudgetToolCalls: 80,
                maxDurationMs: 14400000,
                maxTaskDurationMs: 600000,
                heartbeatIntervalMs: 15000,
                maxParallelTasks: 2,
                requireApprovalBeforeStart: true,
                checkpointAfterEachTask: true,
                voltRequired: true,
                allowedChannels: ['dashboard', 'aee', 'webhook'],
            },
            sharedContext: `Team context for ${displayName}. This team manages deployments, monitors service health, and responds to incidents.`,
        };

        base.agents = agentDefs.map(a => ({
            id: a.id,
            name: a.name,
            role: a.role,
            level: a.role === 'orchestrator' ? 2 : 1,
            domain: a.domain,
            description: `${a.role} agent for ${a.domain} in the ${displayName} team`,
            ownership: { source: 'plugin', plugin: pluginName },
            systemPrompt: `You are ${a.name}, a ${a.role} agent responsible for ${a.domain}. Work as part of the ${displayName} team.`,
            personality: { tone: 'professional', verbosity: 'medium', formality: 'professional', traits: [a.voice, 'reliable', 'team-oriented'] },
            capabilities: [a.domain, 'collaboration'],
            tools: toolDefs.filter((_, i) => Math.floor(i / 2) === agentDefs.indexOf(a)).map(t => t.name),
            defconLevel: a.defcon,
            autonomy: {
                canRunAutonomously: a.role === 'orchestrator',
                budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 600000, maxDailyRuns: 10 },
                escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
            },
            suggestions: [],
        }));

        base.agentPersonas = agentDefs.map(a => ({
            id: a.id,
            name: a.name,
            shortName: a.shortName,
            voice: a.voice,
            color: a.color,
            colorRgb: a.colorRgb,
            specialty: a.domain,
            description: `${a.role} agent for ${a.domain}`,
            llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
            systemPrompt: `You are ${a.name}, a ${a.role} agent responsible for ${a.domain}.`,
        }));

        base.toolDefinitions = toolDefs.map(t => ({
            name: t.name,
            description: t.desc,
            input_schema: { type: 'object', properties: t.props, required: t.required },
        }));
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

// --- Specialist Agent generators ---

function generateSpecialistAgentDef(pluginName, displayName) {
    return `/**
 * ${displayName} — Agent Definition
 * Compatible with agentRegistry.js shape.
 */

export const agentDefinition = {
    id: '${pluginName}-agent',
    name: '${displayName} Agent',
    role: 'specialist',
    level: 1,
    domain: 'security',
    description: 'Specialist security scanning agent for ${displayName}',
    ownership: { source: 'plugin', plugin: '${pluginName}' },
    systemPrompt: 'You are the ${displayName} specialist agent. You scan infrastructure for vulnerabilities, analyse findings, and generate security reports. Be thorough, precise, and always prioritise critical findings.',
    personality: {
        tone: 'professional',
        verbosity: 'medium',
        formality: 'formal',
        traits: ['thorough', 'precise', 'security-focused'],
    },
    capabilities: ['scan', 'analyse', 'report', 'remediate'],
    tools: ['plugin_${pluginName}_run_scan', 'plugin_${pluginName}_get_findings', 'plugin_${pluginName}_generate_report'],
    defconLevel: 'AMBER',
    autonomy: {
        canRunAutonomously: true,
        defaultSchedule: '0 */4 * * *',
        budget: {
            maxTokensPerRun: 50000,
            maxToolCallsPerRun: 20,
            maxDurationMs: 300000,
            maxDailyRuns: 6,
        },
        escalation: {
            onHighRisk: 'ESCALATE',
            onBudgetWarning: 'DEFER',
            onFailure: 'ESCALATE',
            maxRetries: 2,
        },
        allowedTriggers: ['schedule', 'manual', 'webhook'],
    },
    suggestions: [
        'Scan the production subnet for vulnerabilities',
        'Show critical findings from the last scan',
        'Generate an executive summary of our security posture',
        'What are the most common vulnerabilities across hosts?',
        'Schedule a deep scan for tonight',
    ],
};
`;
}

function generateSpecialistAgentPersona(pluginName, displayName) {
    const shortName = displayName.split(' ')[0];
    return `/**
 * ${displayName} — Agent Persona
 * Compatible with assistants.js shape.
 */

export const agentPersona = {
    id: '${pluginName}-agent',
    name: '${displayName} Agent',
    shortName: '${shortName}',
    voice: 'analytical',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    specialty: 'Security scanning and vulnerability analysis',
    description: 'Specialist agent for ${displayName} — scans infrastructure, analyses findings, and generates reports',
    llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.3,
        maxTokens: 4096,
    },
    systemPrompt: 'You are the ${displayName} specialist agent. You scan infrastructure for vulnerabilities, analyse findings, and generate security reports.',
};
`;
}

function generateSpecialistAgentTools(pluginName) {
    return `/**
 * Agent tool definitions — Claude tool_use format.
 * Naming convention: plugin_{pluginId}_{tool_name}
 */

export const toolDefinitions = [
    {
        name: 'plugin_${pluginName}_run_scan',
        description: 'Run a security scan against a target',
        input_schema: {
            type: 'object',
            properties: {
                target: { type: 'string', description: 'Target host or subnet to scan' },
                depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Scan depth level' },
                categories: { type: 'array', items: { type: 'string' }, description: 'Vulnerability categories to check' },
            },
            required: ['target'],
        },
    },
    {
        name: 'plugin_${pluginName}_get_findings',
        description: 'Retrieve findings from a completed scan',
        input_schema: {
            type: 'object',
            properties: {
                scanId: { type: 'string', description: 'ID of the scan to retrieve findings for' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Filter by severity level' },
                limit: { type: 'number', description: 'Maximum number of findings to return' },
            },
            required: ['severity'],
        },
    },
    {
        name: 'plugin_${pluginName}_generate_report',
        description: 'Generate a report from scan findings',
        input_schema: {
            type: 'object',
            properties: {
                scanId: { type: 'string', description: 'ID of the scan to report on' },
                format: { type: 'string', enum: ['summary', 'detailed', 'executive'], description: 'Report format' },
                includeRemediation: { type: 'boolean', description: 'Include remediation steps in the report' },
            },
            required: ['scanId', 'format'],
        },
    },
];
`;
}

function generateSpecialistMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Agent status card, tool cards, quick action chips, and inline chat.
 */

const { React } = window.__quoxSharedDeps;
import AgentStatusCard from '../components/AgentStatusCard';
import ToolCard from '../components/ToolCard';
import AgentChat from '../components/AgentChat';
import { MOCK_STATUS, MOCK_FINDINGS } from '../data/mock';
import { toolDefinitions } from '../agent/tools';

export default function MainView({ pluginApi }) {
    const [agentStatus, setAgentStatus] = React.useState(MOCK_STATUS);
    const [showChat, setShowChat] = React.useState(false);

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    ${displayName}
                </h2>
                <button
                    onClick={() => setShowChat(!showChat)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(245,158,11,0.15)',
                        color: 'rgba(245,158,11,0.9)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}
                >
                    &#x2728; Chat with Agent
                </button>
            </div>

            {/* Agent Status Card */}
            <AgentStatusCard status={agentStatus} />

            {/* Tool Cards Row */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Agent Tools
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
            }}>
                {toolDefinitions.map(tool => (
                    <ToolCard key={tool.name} tool={tool} pluginApi={pluginApi} />
                ))}
            </div>

            {/* Quick Action Chips */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Quick Actions
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {agentStatus.suggestions.map((suggestion, i) => (
                    <button
                        key={i}
                        onClick={() => setShowChat(true)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

            {showChat && (
                <AgentChat
                    pluginApi={pluginApi}
                    suggestions={agentStatus.suggestions}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
`;
}

function generateSpecialistSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * DEFCON level, autonomy toggle, schedule, budget, escalation, scope.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || {
            scanTarget: '10.0.0.0/24',
            defconLevel: 'AMBER',
            autonomous: true,
            schedule: '0 */4 * * *',
            maxTokensPerRun: 50000,
            maxToolCallsPerRun: 20,
            maxDailyRuns: 6,
            escalateOnHighRisk: true,
        };
    });

    const handleSave = () => {
        if (pluginApi?.config) pluginApi.config.save(config);
        if (pluginApi?.notify) pluginApi.notify('Settings saved', 'success');
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
                    Default Scan Target
                </label>
                <input
                    type="text"
                    value={config.scanTarget}
                    onChange={e => setConfig(prev => ({ ...prev, scanTarget: e.target.value }))}
                    style={fieldStyle}
                />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    DEFCON Level
                </label>
                <select
                    value={config.defconLevel}
                    onChange={e => setConfig(prev => ({ ...prev, defconLevel: e.target.value }))}
                    style={fieldStyle}
                >
                    {Object.keys(DEFCON_COLORS).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                <div style={{
                    marginTop: '0.3rem',
                    height: '4px',
                    borderRadius: '2px',
                    background: DEFCON_COLORS[config.defconLevel] || '#6b7280',
                }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={config.autonomous}
                        onChange={e => setConfig(prev => ({ ...prev, autonomous: e.target.checked }))}
                    />
                    Autonomous mode (run on schedule)
                </label>
            </div>

            {config.autonomous && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Cron Schedule
                    </label>
                    <input
                        type="text"
                        value={config.schedule}
                        onChange={e => setConfig(prev => ({ ...prev, schedule: e.target.value }))}
                        placeholder="0 */4 * * *"
                        style={fieldStyle}
                    />
                </div>
            )}

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Budget
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Max Tokens/Run
                    </label>
                    <input
                        type="number"
                        value={config.maxTokensPerRun}
                        onChange={e => setConfig(prev => ({ ...prev, maxTokensPerRun: parseInt(e.target.value) || 50000 }))}
                        style={fieldStyle}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Max Tool Calls/Run
                    </label>
                    <input
                        type="number"
                        value={config.maxToolCallsPerRun}
                        onChange={e => setConfig(prev => ({ ...prev, maxToolCallsPerRun: parseInt(e.target.value) || 20 }))}
                        style={fieldStyle}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Max Daily Runs
                </label>
                <input
                    type="number"
                    value={config.maxDailyRuns}
                    onChange={e => setConfig(prev => ({ ...prev, maxDailyRuns: parseInt(e.target.value) || 6 }))}
                    style={fieldStyle}
                />
            </div>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Escalation
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={config.escalateOnHighRisk}
                        onChange={e => setConfig(prev => ({ ...prev, escalateOnHighRisk: e.target.checked }))}
                    />
                    Escalate on high-risk findings
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

function generateAgentStatusCard() {
    return `/**
 * AgentStatusCard — Status dot, DEFCON badge, token usage bar, current task.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function AgentStatusCard({ status }) {
    const defconColor = DEFCON_COLORS[status.defconLevel] || '#6b7280';
    const tokenPct = status.budget.limit > 0
        ? Math.min((status.budget.used / status.budget.limit) * 100, 100)
        : 0;

    return (
        <div style={{
            padding: '1.25rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Status dot */}
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: status.running ? '#10b981' : '#6b7280',
                        boxShadow: status.running ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                    }} />
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                        {status.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                        {status.running ? 'Running' : 'Idle'}
                    </span>
                </div>
                {/* DEFCON badge */}
                <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: defconColor + '22',
                    color: defconColor,
                }}>
                    DEFCON {status.defconLevel}
                </span>
            </div>

            {/* Token usage bar */}
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Token Budget</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        {status.budget.used.toLocaleString()} / {status.budget.limit.toLocaleString()}
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
                        width: tokenPct + '%',
                        borderRadius: '3px',
                        background: tokenPct > 90 ? '#ef4444' : tokenPct > 70 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Current task */}
            {status.currentTask && (
                <div style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Current: </span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{status.currentTask}</span>
                </div>
            )}
        </div>
    );
}
`;
}

function generateToolCard() {
    return `/**
 * ToolCard — Tool name, description, Run button, expandable parameter form.
 */

const { React } = window.__quoxSharedDeps;

export default function ToolCard({ tool, pluginApi }) {
    const [expanded, setExpanded] = React.useState(false);
    const [params, setParams] = React.useState({});
    const [running, setRunning] = React.useState(false);

    const handleRun = async () => {
        setRunning(true);
        // Stub: In production, this would invoke the tool via the agent
        console.log('[ToolCard] Running', tool.name, 'with params:', params);
        if (pluginApi?.notify) {
            pluginApi.notify('Running ' + tool.name + '...', 'info');
        }
        // Simulate execution
        setTimeout(() => {
            setRunning(false);
            if (pluginApi?.notify) {
                pluginApi.notify(tool.name + ' completed', 'success');
            }
        }, 2000);
    };

    const properties = tool.input_schema?.properties || {};

    return (
        <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.3rem', fontSize: '0.9rem' }}>
                        {tool.name.split('_').slice(2).join('_')}
                    </h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0 }}>
                        {tool.description}
                    </p>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {expanded ? '&#x25B2;' : '&#x25BC;'}
                </button>
            </div>

            {expanded && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {Object.entries(properties).map(([key, schema]) => (
                        <div key={key} style={{ marginBottom: '0.5rem' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                {key} {(tool.input_schema.required || []).includes(key) ? '*' : ''}
                            </label>
                            <input
                                type={schema.type === 'number' ? 'number' : 'text'}
                                value={params[key] || ''}
                                onChange={e => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={schema.description || key}
                                style={{
                                    width: '100%',
                                    padding: '0.35rem 0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleRun}
                        disabled={running}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            background: running ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.15)',
                            color: running ? 'rgba(107,114,128,0.7)' : 'rgba(16,185,129,0.9)',
                            border: '1px solid ' + (running ? 'rgba(107,114,128,0.3)' : 'rgba(16,185,129,0.3)'),
                            borderRadius: '6px',
                            cursor: running ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        {running ? 'Running...' : '&#x25B6; Run'}
                    </button>
                </div>
            )}
        </div>
    );
}
`;
}

function generateAgentChat(pluginName, displayName) {
    return `/**
 * AgentChat — Inline chat panel with messages, input, and quick action chips.
 */

const { React } = window.__quoxSharedDeps;

export default function AgentChat({ pluginApi, suggestions, onClose }) {
    const [query, setQuery] = React.useState('');
    const [messages, setMessages] = React.useState([
        { role: 'agent', text: 'Hello! I am the ${displayName} agent. I can scan infrastructure, analyse findings, and generate reports. What would you like me to do?' },
    ]);

    const handleSend = async (text) => {
        const message = text || query;
        if (!message.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: message }]);

        // Stub: In production, this routes through the specialist agent
        setMessages(prev => [...prev, {
            role: 'agent',
            text: 'I received your request. In production, I would process this using my tools and return results.',
        }]);
        setQuery('');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            background: '#1a1a2e',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
        }}>
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ color: 'rgba(245,158,11,0.9)', fontWeight: 500 }}>
                    &#x2728; ${displayName} Agent
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                    &#x2715;
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0 }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            maxWidth: '85%',
                            background: msg.role === 'user' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.85rem',
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick action chips */}
            <div style={{ padding: '0.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {(suggestions || []).slice(0, 3).map((s, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(s)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                        }}
                    >
                        {s.length > 35 ? s.slice(0, 35) + '...' : s}
                    </button>
                ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem' }}>
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
                    onClick={() => handleSend()}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(245,158,11,0.15)',
                        color: 'rgba(245,158,11,0.9)',
                        border: '1px solid rgba(245,158,11,0.3)',
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

function generateSpecialistMock(displayName) {
    return `/**
 * Mock data for specialist-agent template.
 */

export const MOCK_STATUS = {
    name: '${displayName} Agent',
    running: true,
    defconLevel: 'AMBER',
    currentTask: 'Scanning 10.0.0.0/24 (standard depth)',
    budget: { used: 12500, limit: 50000 },
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    suggestions: [
        'Scan the production subnet for vulnerabilities',
        'Show critical findings from the last scan',
        'Generate an executive summary of our security posture',
        'What are the most common vulnerabilities across hosts?',
        'Schedule a deep scan for tonight',
    ],
};

export const MOCK_FINDINGS = [
    { id: 'f-1', severity: 'critical', host: '10.0.0.101', title: 'OpenSSH < 9.0 — CVE-2023-38408', category: 'remote-access', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-2', severity: 'high', host: '10.0.0.102', title: 'TLS 1.0 enabled on port 443', category: 'encryption', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-3', severity: 'medium', host: '10.0.0.103', title: 'Default SNMP community string', category: 'configuration', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-4', severity: 'low', host: '10.0.0.200', title: 'HTTP server version disclosure', category: 'information', discovered: new Date(Date.now() - 7200000).toISOString() },
];

export const MOCK_SCAN_HISTORY = [
    { id: 'scan-1', target: '10.0.0.0/24', depth: 'standard', status: 'completed', findings: 4, startedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'scan-2', target: '10.0.0.0/24', depth: 'quick', status: 'completed', findings: 2, startedAt: new Date(Date.now() - 86400000).toISOString() },
];
`;
}

// --- Agentic Team generators ---

function generateTeamDef(pluginName, displayName) {
    return `/**
 * ${displayName} — Team Definition
 * Compatible with teams/*.json shape (e.g. secops.json).
 */

export const teamDefinition = {
    id: '${pluginName}-team',
    type: 'team',
    version: '1.0.0',
    displayName: '${displayName} Team',
    description: 'DevOps team for ${displayName} — orchestrates deployments, monitoring, and incident response',
    orchestrator: {
        agentId: '${pluginName}-lead',
        role: 'orchestrator',
        domains: ['devops', 'coordination'],
    },
    members: [
        { agentId: '${pluginName}-lead', role: 'orchestrator', domains: ['devops', 'coordination'] },
        { agentId: '${pluginName}-deployer', role: 'specialist', domains: ['deployment'] },
        { agentId: '${pluginName}-monitor', role: 'specialist', domains: ['monitoring'] },
        { agentId: '${pluginName}-responder', role: 'analyst', domains: ['incident-response'] },
    ],
    policies: {
        maxBudgetTokens: 200000,
        maxBudgetToolCalls: 80,
        maxDurationMs: 14400000,
        maxTaskDurationMs: 600000,
        heartbeatIntervalMs: 15000,
        maxParallelTasks: 2,
        requireApprovalBeforeStart: true,
        checkpointAfterEachTask: true,
        voltRequired: true,
        allowedChannels: ['dashboard', 'aee', 'webhook'],
    },
    sharedContext: 'Team context for ${displayName}. This team manages deployments, monitors service health, and responds to incidents.',
};
`;
}

function generateTeamAgents(pluginName, displayName) {
    return `/**
 * ${displayName} — Agent Definitions
 * 4 agents: Lead (orchestrator), Deployer, Monitor, Responder.
 */

export const agents = [
    {
        id: '${pluginName}-lead',
        name: '${displayName} Lead',
        role: 'orchestrator',
        level: 2,
        domain: 'devops',
        description: 'Orchestrator agent for devops in the ${displayName} team',
        ownership: { source: 'plugin', plugin: '${pluginName}' },
        systemPrompt: 'You are ${displayName} Lead, an orchestrator agent responsible for devops. You coordinate the team, assign tasks, and ensure smooth operations.',
        personality: { tone: 'professional', verbosity: 'medium', formality: 'professional', traits: ['commanding', 'reliable', 'team-oriented'] },
        capabilities: ['devops', 'collaboration'],
        tools: ['plugin_${pluginName}_assign_task', 'plugin_${pluginName}_get_team_status'],
        defconLevel: 'GREEN',
        autonomy: {
            canRunAutonomously: true,
            budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 600000, maxDailyRuns: 10 },
            escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
        },
        suggestions: [],
    },
    {
        id: '${pluginName}-deployer',
        name: '${displayName} Deployer',
        role: 'specialist',
        level: 1,
        domain: 'deployment',
        description: 'Specialist agent for deployment in the ${displayName} team',
        ownership: { source: 'plugin', plugin: '${pluginName}' },
        systemPrompt: 'You are ${displayName} Deployer, a specialist agent responsible for deployment. You deploy services, manage rollbacks, and ensure deployment safety.',
        personality: { tone: 'professional', verbosity: 'medium', formality: 'professional', traits: ['methodical', 'reliable', 'team-oriented'] },
        capabilities: ['deployment', 'collaboration'],
        tools: ['plugin_${pluginName}_deploy_service', 'plugin_${pluginName}_rollback_service'],
        defconLevel: 'AMBER',
        autonomy: {
            canRunAutonomously: false,
            budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 600000, maxDailyRuns: 10 },
            escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
        },
        suggestions: [],
    },
    {
        id: '${pluginName}-monitor',
        name: '${displayName} Monitor',
        role: 'specialist',
        level: 1,
        domain: 'monitoring',
        description: 'Specialist agent for monitoring in the ${displayName} team',
        ownership: { source: 'plugin', plugin: '${pluginName}' },
        systemPrompt: 'You are ${displayName} Monitor, a specialist agent responsible for monitoring. You check service health, query metrics, and detect anomalies.',
        personality: { tone: 'professional', verbosity: 'medium', formality: 'professional', traits: ['observant', 'reliable', 'team-oriented'] },
        capabilities: ['monitoring', 'collaboration'],
        tools: ['plugin_${pluginName}_check_health', 'plugin_${pluginName}_query_metrics'],
        defconLevel: 'GREEN',
        autonomy: {
            canRunAutonomously: false,
            budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 600000, maxDailyRuns: 10 },
            escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
        },
        suggestions: [],
    },
    {
        id: '${pluginName}-responder',
        name: '${displayName} Responder',
        role: 'analyst',
        level: 1,
        domain: 'incident-response',
        description: 'Analyst agent for incident-response in the ${displayName} team',
        ownership: { source: 'plugin', plugin: '${pluginName}' },
        systemPrompt: 'You are ${displayName} Responder, an analyst agent responsible for incident-response. You create incidents, escalate issues, and coordinate the response.',
        personality: { tone: 'professional', verbosity: 'medium', formality: 'professional', traits: ['urgent', 'reliable', 'team-oriented'] },
        capabilities: ['incident-response', 'collaboration'],
        tools: ['plugin_${pluginName}_create_incident', 'plugin_${pluginName}_escalate_incident'],
        defconLevel: 'ORANGE',
        autonomy: {
            canRunAutonomously: false,
            budget: { maxTokensPerRun: 50000, maxToolCallsPerRun: 20, maxDurationMs: 600000, maxDailyRuns: 10 },
            escalation: { onHighRisk: 'ESCALATE', onBudgetWarning: 'DEFER', onFailure: 'ESCALATE', maxRetries: 2 },
        },
        suggestions: [],
    },
];
`;
}

function generateTeamPersonas(pluginName, displayName) {
    return `/**
 * ${displayName} — Agent Personas
 * 4 personas with distinct colours matching the team agents.
 */

export const personas = [
    {
        id: '${pluginName}-lead',
        name: '${displayName} Lead',
        shortName: 'Lead',
        voice: 'commanding',
        color: '#38bdf8',
        colorRgb: '56, 189, 248',
        specialty: 'devops',
        description: 'Orchestrator agent for devops',
        llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
        systemPrompt: 'You are ${displayName} Lead, an orchestrator agent responsible for devops.',
    },
    {
        id: '${pluginName}-deployer',
        name: '${displayName} Deployer',
        shortName: 'Deployer',
        voice: 'methodical',
        color: '#f59e0b',
        colorRgb: '245, 158, 11',
        specialty: 'deployment',
        description: 'Specialist agent for deployment',
        llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
        systemPrompt: 'You are ${displayName} Deployer, a specialist agent responsible for deployment.',
    },
    {
        id: '${pluginName}-monitor',
        name: '${displayName} Monitor',
        shortName: 'Monitor',
        voice: 'observant',
        color: '#10b981',
        colorRgb: '16, 185, 129',
        specialty: 'monitoring',
        description: 'Specialist agent for monitoring',
        llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
        systemPrompt: 'You are ${displayName} Monitor, a specialist agent responsible for monitoring.',
    },
    {
        id: '${pluginName}-responder',
        name: '${displayName} Responder',
        shortName: 'Responder',
        voice: 'urgent',
        color: '#ef4444',
        colorRgb: '239, 68, 68',
        specialty: 'incident-response',
        description: 'Analyst agent for incident-response',
        llm: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 4096 },
        systemPrompt: 'You are ${displayName} Responder, an analyst agent responsible for incident-response.',
    },
];
`;
}

function generateTeamTools(pluginName) {
    return `/**
 * ${pluginName} — Team Tool Definitions
 * 8 tools (2 per agent) in Claude tool_use format.
 */

export const toolDefinitions = [
    // Lead tools
    {
        name: 'plugin_${pluginName}_assign_task',
        description: 'Assign a task to a team member',
        input_schema: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'ID of agent to assign to' },
                task: { type: 'string', description: 'Task description' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Task priority' },
            },
            required: ['agentId', 'task'],
        },
    },
    {
        name: 'plugin_${pluginName}_get_team_status',
        description: 'Get current status of all team members',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    // Deployer tools
    {
        name: 'plugin_${pluginName}_deploy_service',
        description: 'Deploy a service to the target environment',
        input_schema: {
            type: 'object',
            properties: {
                service: { type: 'string', description: 'Service name to deploy' },
                environment: { type: 'string', enum: ['staging', 'production'], description: 'Target environment' },
                version: { type: 'string', description: 'Version to deploy' },
            },
            required: ['service', 'environment'],
        },
    },
    {
        name: 'plugin_${pluginName}_rollback_service',
        description: 'Roll back a service to a previous version',
        input_schema: {
            type: 'object',
            properties: {
                service: { type: 'string', description: 'Service name to roll back' },
                targetVersion: { type: 'string', description: 'Version to roll back to' },
            },
            required: ['service'],
        },
    },
    // Monitor tools
    {
        name: 'plugin_${pluginName}_check_health',
        description: 'Check health of a service or all services',
        input_schema: {
            type: 'object',
            properties: {
                service: { type: 'string', description: 'Service name (omit for all)' },
            },
            required: [],
        },
    },
    {
        name: 'plugin_${pluginName}_query_metrics',
        description: 'Query metrics for a service',
        input_schema: {
            type: 'object',
            properties: {
                service: { type: 'string', description: 'Service name' },
                metric: { type: 'string', description: 'Metric name (cpu, memory, latency, errors)' },
                period: { type: 'string', description: 'Time period (1h, 6h, 24h, 7d)' },
            },
            required: ['service', 'metric'],
        },
    },
    // Responder tools
    {
        name: 'plugin_${pluginName}_create_incident',
        description: 'Create an incident report',
        input_schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Incident title' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Incident severity' },
                description: { type: 'string', description: 'Incident description' },
            },
            required: ['title', 'severity'],
        },
    },
    {
        name: 'plugin_${pluginName}_escalate_incident',
        description: 'Escalate an incident to a higher tier',
        input_schema: {
            type: 'object',
            properties: {
                incidentId: { type: 'string', description: 'Incident ID to escalate' },
                reason: { type: 'string', description: 'Reason for escalation' },
            },
            required: ['incidentId'],
        },
    },
];
`;
}

function generateTeamPolicies(pluginName, displayName) {
    return `/**
 * ${displayName} — Team Policies
 * Default policies, validation, and merge helpers.
 */

export const defaultPolicies = {
    maxBudgetTokens: 200000,
    maxBudgetToolCalls: 80,
    maxDurationMs: 14400000,
    maxTaskDurationMs: 600000,
    heartbeatIntervalMs: 15000,
    maxParallelTasks: 2,
    requireApprovalBeforeStart: true,
    checkpointAfterEachTask: true,
    voltRequired: true,
    allowedChannels: ['dashboard', 'aee', 'webhook'],
};

export function validatePolicies(policies) {
    const errors = [];
    if (!policies.maxBudgetTokens || policies.maxBudgetTokens <= 0) errors.push('maxBudgetTokens must be positive');
    if (!policies.maxBudgetToolCalls || policies.maxBudgetToolCalls <= 0) errors.push('maxBudgetToolCalls must be positive');
    if (!policies.maxDurationMs || policies.maxDurationMs <= 0) errors.push('maxDurationMs must be positive');
    if (!policies.maxTaskDurationMs || policies.maxTaskDurationMs <= 0) errors.push('maxTaskDurationMs must be positive');
    if (!policies.heartbeatIntervalMs || policies.heartbeatIntervalMs <= 0) errors.push('heartbeatIntervalMs must be positive');
    if (!policies.maxParallelTasks || policies.maxParallelTasks <= 0) errors.push('maxParallelTasks must be positive');
    if (!Array.isArray(policies.allowedChannels)) errors.push('allowedChannels must be an array');
    return { valid: errors.length === 0, errors };
}

export function mergePolicies(base, overrides) {
    return { ...base, ...overrides };
}
`;
}

function generateTeamMainView(pluginName, displayName) {
    return `/**
 * ${displayName} — Main View
 * Member cards row, task queue, shared context, quick actions.
 */

const { React } = window.__quoxSharedDeps;
import MemberCard from '../components/MemberCard';
import TaskQueue from '../components/TaskQueue';
import SharedContextPanel from '../components/SharedContextPanel';
import PolicyBadges from '../components/PolicyBadges';
import { MOCK_TEAM_STATUS, MOCK_TASKS } from '../data/mock';
import { teamDefinition } from '../team/teamDef';

export default function MainView({ pluginApi }) {
    const [teamStatus, setTeamStatus] = React.useState(MOCK_TEAM_STATUS);
    const [tasks, setTasks] = React.useState(MOCK_TASKS);
    const [showContext, setShowContext] = React.useState(false);

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    ${displayName} Team
                </h2>
                <button
                    onClick={() => setShowContext(!showContext)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(56,189,248,0.15)',
                        color: 'rgba(56,189,248,0.9)',
                        border: '1px solid rgba(56,189,248,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}
                >
                    {showContext ? 'Hide Context' : 'Shared Context'}
                </button>
            </div>

            {/* Policy Badges */}
            <PolicyBadges policies={teamDefinition.policies} />

            {/* Member Cards Row */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Team Members
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
            }}>
                {teamStatus.members.map(member => (
                    <MemberCard key={member.id} member={member} />
                ))}
            </div>

            {/* Task Queue */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Task Queue
            </h3>
            <TaskQueue tasks={tasks} />

            {/* Quick Actions */}
            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Quick Actions
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['Deploy latest to staging', 'Check all service health', 'View team metrics', 'Create incident report'].map((action, i) => (
                    <button
                        key={i}
                        style={{
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        {action}
                    </button>
                ))}
            </div>

            {showContext && (
                <SharedContextPanel
                    context={teamDefinition.sharedContext}
                    onClose={() => setShowContext(false)}
                />
            )}
        </div>
    );
}
`;
}

function generateTeamSettings(pluginName, displayName) {
    return `/**
 * ${displayName} — Settings Panel
 * Budget, approval, VOLT, checkpoint, channels, per-member DEFCON.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || {
            approvalRequired: true,
            maxParallelTasks: 2,
            voltRequired: true,
            checkpointAfterEachTask: true,
            maxBudgetTokens: 200000,
            maxBudgetToolCalls: 80,
            allowedChannels: 'dashboard,aee,webhook',
        };
    });

    const handleSave = () => {
        if (pluginApi?.config) pluginApi.config.save(config);
        if (pluginApi?.notify) pluginApi.notify('Team settings saved', 'success');
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
                ${displayName} Team Settings
            </h2>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem', fontSize: '1rem' }}>
                Policies
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.approvalRequired} onChange={e => setConfig(prev => ({ ...prev, approvalRequired: e.target.checked }))} />
                    Require approval before start
                </label>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.voltRequired} onChange={e => setConfig(prev => ({ ...prev, voltRequired: e.target.checked }))} />
                    VOLT audit trail required
                </label>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.checkpointAfterEachTask} onChange={e => setConfig(prev => ({ ...prev, checkpointAfterEachTask: e.target.checked }))} />
                    Checkpoint after each task
                </label>
            </div>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Budget
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Budget Tokens</label>
                    <input type="number" value={config.maxBudgetTokens} onChange={e => setConfig(prev => ({ ...prev, maxBudgetTokens: parseInt(e.target.value) || 200000 }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Tool Calls</label>
                    <input type="number" value={config.maxBudgetToolCalls} onChange={e => setConfig(prev => ({ ...prev, maxBudgetToolCalls: parseInt(e.target.value) || 80 }))} style={fieldStyle} />
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Parallel Tasks</label>
                <input type="number" value={config.maxParallelTasks} onChange={e => setConfig(prev => ({ ...prev, maxParallelTasks: parseInt(e.target.value) || 2 }))} style={fieldStyle} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Allowed Channels (comma-separated)</label>
                <input type="text" value={config.allowedChannels} onChange={e => setConfig(prev => ({ ...prev, allowedChannels: e.target.value }))} style={fieldStyle} />
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

function generateMemberCard() {
    return `/**
 * MemberCard — Coloured avatar circle, name, domain, DEFCON badge, status.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function MemberCard({ member }) {
    const defconColor = DEFCON_COLORS[member.defconLevel] || '#6b7280';

    return (
        <div style={{
            padding: '1rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
        }}>
            {/* Coloured avatar circle */}
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: member.color + '22',
                border: '2px solid ' + member.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: member.color,
            }}>
                {member.shortName[0]}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: '0.25rem' }}>
                {member.shortName}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {member.role} / {member.domain}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Status dot */}
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: member.running ? '#10b981' : '#6b7280',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                    {member.running ? 'Active' : 'Idle'}
                </span>
                {/* DEFCON badge */}
                <span style={{
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    background: defconColor + '22',
                    color: defconColor,
                }}>
                    {member.defconLevel}
                </span>
            </div>
        </div>
    );
}
`;
}

function generateTaskQueue() {
    return `/**
 * TaskQueue — Task list with assigned agent, priority, status badges.
 */

const { React } = window.__quoxSharedDeps;

const PRIORITY_COLORS = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
};

const STATUS_COLORS = {
    queued: '#6b7280',
    running: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
};

export default function TaskQueue({ tasks }) {
    return (
        <div style={{
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
        }}>
            {tasks.map((task, i) => (
                <div key={task.id} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{task.title}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                            &#x2192; {task.assignedTo}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: (PRIORITY_COLORS[task.priority] || '#6b7280') + '22',
                            color: PRIORITY_COLORS[task.priority] || '#6b7280',
                        }}>
                            {task.priority}
                        </span>
                        <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: (STATUS_COLORS[task.status] || '#6b7280') + '22',
                            color: STATUS_COLORS[task.status] || '#6b7280',
                        }}>
                            {task.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
`;
}

function generateSharedContextPanel() {
    return `/**
 * SharedContextPanel — Collapsible context viewer.
 */

const { React } = window.__quoxSharedDeps;

export default function SharedContextPanel({ context, onClose }) {
    return (
        <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.15)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'rgba(56,189,248,0.9)', fontWeight: 500, fontSize: '0.9rem' }}>
                    Shared Context
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                >
                    &#x2715;
                </button>
            </div>
            <pre style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: 'monospace',
            }}>
                {typeof context === 'string' ? context : JSON.stringify(context, null, 2)}
            </pre>
        </div>
    );
}
`;
}

function generatePolicyBadges() {
    return `/**
 * PolicyBadges — VOLT, Approval, Parallel, Checkpoint badge pills.
 */

const { React } = window.__quoxSharedDeps;

export default function PolicyBadges({ policies }) {
    const badges = [
        { label: 'VOLT', active: policies.voltRequired, color: '#8b5cf6' },
        { label: 'Approval', active: policies.requireApprovalBeforeStart, color: '#f59e0b' },
        { label: 'Parallel: ' + policies.maxParallelTasks, active: true, color: '#3b82f6' },
        { label: 'Checkpoint', active: policies.checkpointAfterEachTask, color: '#10b981' },
    ];

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {badges.map(badge => (
                <span
                    key={badge.label}
                    style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: badge.active ? badge.color + '22' : 'rgba(107,114,128,0.15)',
                        color: badge.active ? badge.color : 'rgba(107,114,128,0.7)',
                    }}
                >
                    {badge.label}
                </span>
            ))}
        </div>
    );
}
`;
}

function generateTeamMock(pluginName, displayName) {
    return `/**
 * Mock data for agentic-team template.
 */

export const MOCK_TEAM_STATUS = {
    id: '${pluginName}-team',
    name: '${displayName} Team',
    members: [
        { id: '${pluginName}-lead', shortName: 'Lead', role: 'orchestrator', domain: 'devops', color: '#38bdf8', defconLevel: 'GREEN', running: true },
        { id: '${pluginName}-deployer', shortName: 'Deployer', role: 'specialist', domain: 'deployment', color: '#f59e0b', defconLevel: 'AMBER', running: false },
        { id: '${pluginName}-monitor', shortName: 'Monitor', role: 'specialist', domain: 'monitoring', color: '#10b981', defconLevel: 'GREEN', running: true },
        { id: '${pluginName}-responder', shortName: 'Responder', role: 'analyst', domain: 'incident-response', color: '#ef4444', defconLevel: 'ORANGE', running: false },
    ],
};

export const MOCK_TASKS = [
    { id: 'task-1', title: 'Deploy API v2.3.1 to staging', assignedTo: 'Deployer', priority: 'high', status: 'queued' },
    { id: 'task-2', title: 'Check health of payment service', assignedTo: 'Monitor', priority: 'medium', status: 'running' },
    { id: 'task-3', title: 'Investigate latency spike on auth', assignedTo: 'Responder', priority: 'critical', status: 'queued' },
    { id: 'task-4', title: 'Validate staging deploy', assignedTo: 'Monitor', priority: 'medium', status: 'completed' },
];

export const MOCK_SHARED_CONTEXT = {
    environment: 'production',
    activeIncidents: 0,
    lastDeploy: { service: 'api-gateway', version: '2.3.0', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'healthy' },
    services: ['api-gateway', 'auth-service', 'payment-service', 'notification-service'],
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

        case 'specialist-agent':
            files['src/agent/agentDef.js'] = generateSpecialistAgentDef(pluginName, displayName);
            files['src/agent/agentPersona.js'] = generateSpecialistAgentPersona(pluginName, displayName);
            files['src/agent/tools.js'] = generateSpecialistAgentTools(pluginName);
            files['src/views/MainView.jsx'] = generateSpecialistMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateSpecialistSettings(pluginName, displayName);
            files['src/components/AgentStatusCard.jsx'] = generateAgentStatusCard();
            files['src/components/ToolCard.jsx'] = generateToolCard();
            files['src/components/AgentChat.jsx'] = generateAgentChat(pluginName, displayName);
            files['src/data/mock.js'] = generateSpecialistMock(displayName);
            break;

        case 'agentic-team':
            files['src/team/teamDef.js'] = generateTeamDef(pluginName, displayName);
            files['src/team/agents.js'] = generateTeamAgents(pluginName, displayName);
            files['src/team/personas.js'] = generateTeamPersonas(pluginName, displayName);
            files['src/team/tools.js'] = generateTeamTools(pluginName);
            files['src/team/policies.js'] = generateTeamPolicies(pluginName, displayName);
            files['src/views/MainView.jsx'] = generateTeamMainView(pluginName, displayName);
            files['src/views/SettingsPanel.jsx'] = generateTeamSettings(pluginName, displayName);
            files['src/components/MemberCard.jsx'] = generateMemberCard();
            files['src/components/TaskQueue.jsx'] = generateTaskQueue();
            files['src/components/SharedContextPanel.jsx'] = generateSharedContextPanel();
            files['src/components/PolicyBadges.jsx'] = generatePolicyBadges();
            files['src/data/mock.js'] = generateTeamMock(pluginName, displayName);
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

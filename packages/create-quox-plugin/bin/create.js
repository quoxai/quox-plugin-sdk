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

// --- Template file loading ---
// Generated file contents live under templates/<template-name>/... (and templates/_shared/
// for content identical across every template: index.jsx, vite.config.js, .gitignore).
// Interpolation is a minimal `${varName}` -> value text substitution (no eval), matching the
// exact set of expressions the original inline template literals used.
const TEMPLATES_ROOT = path.join(__dirname, '..', 'templates');

function renderTemplate(relPath, vars = {}) {
    let content = fs.readFileSync(path.join(TEMPLATES_ROOT, relPath), 'utf8');
    for (const [key, value] of Object.entries(vars)) {
        content = content.split('${' + key + '}').join(value);
    }
    return content;
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
        // Delegator keywords: used by the routing layer to dispatch conversations to this agent
        base.delegatorKeywords = ['scan', 'vulnerability', 'security', 'finding', 'remediate', 'audit', pluginName];
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
        // Delegator keywords: used by the routing layer to dispatch conversations to this team
        base.delegatorKeywords = ['deploy', 'rollback', 'incident', 'health', 'monitor', 'devops', pluginName];
    }

    return base;
}

function generateIndexJsx(pluginName, displayName, template) {
    const hasSettings = template !== 'basic';
    const settingsImport = hasSettings ? `\nimport SettingsPanel from './views/SettingsPanel';` : '';
    const settingsRoute = hasSettings ? `\n        '/plugins/${pluginName}/settings': SettingsPanel,` : '';

    return renderTemplate('_shared/index.jsx', { pluginName, displayName, settingsImport, settingsRoute });
}

// --- MainView generators ---

function generateBasicMainView(displayName, description) {
    return renderTemplate('basic/src/views/MainView.jsx', { displayName, description });
}

function generateMonitoringMainView(pluginName, displayName) {
    return renderTemplate('monitoring-dashboard/src/views/MainView.jsx', { pluginName, displayName });
}

function generateFleetMainView(pluginName, displayName) {
    return renderTemplate('fleet-management/src/views/MainView.jsx', { pluginName, displayName });
}

function generateServiceBridgeMainView(pluginName, displayName) {
    return renderTemplate('service-bridge/src/views/MainView.jsx', { pluginName, displayName });
}

function generateUiFeatureMainView(pluginName, displayName) {
    return renderTemplate('ui-feature/src/views/MainView.jsx', { pluginName, displayName });
}

function generateEnterpriseMainView(pluginName, displayName) {
    return renderTemplate('enterprise-extension/src/views/MainView.jsx', { pluginName, displayName });
}

// --- Settings Panel generators ---

function generateMonitoringSettings(pluginName, displayName) {
    return renderTemplate('monitoring-dashboard/src/views/SettingsPanel.jsx', { displayName });
}

function generateFleetSettings(pluginName, displayName) {
    return renderTemplate('fleet-management/src/views/SettingsPanel.jsx', { displayName });
}

function generateServiceBridgeSettings(pluginName, displayName) {
    return renderTemplate('service-bridge/src/views/SettingsPanel.jsx', { displayName });
}

function generateUiFeatureSettings(pluginName, displayName) {
    return renderTemplate('ui-feature/src/views/SettingsPanel.jsx', { displayName });
}

function generateEnterpriseSettings(pluginName, displayName) {
    return renderTemplate('enterprise-extension/src/views/SettingsPanel.jsx', { displayName });
}

// --- Component generators ---

function generateConfirmModal() {
    return renderTemplate('fleet-management/src/components/ConfirmModal.jsx');
}

function generateAgentSidebar(pluginName, displayName) {
    return renderTemplate('service-bridge/src/components/AgentSidebar.jsx', { displayName });
}

function generateEmptyState() {
    return renderTemplate('ui-feature/src/components/EmptyState.jsx');
}

function generateUsageMeter() {
    return renderTemplate('enterprise-extension/src/components/UsageMeter.jsx');
}

function generateUpgradeGate() {
    return renderTemplate('enterprise-extension/src/components/UpgradeGate.jsx');
}

// --- Hook generators ---

function generateUsePolling() {
    return renderTemplate('monitoring-dashboard/src/hooks/usePolling.js');
}

// --- Mock data generators ---

function generateMonitoringMock() {
    return renderTemplate('monitoring-dashboard/src/data/mock.js');
}

function generateFleetMock() {
    return renderTemplate('fleet-management/src/data/mock.js');
}

function generateServiceBridgeMock() {
    return renderTemplate('service-bridge/src/data/mock.js');
}

function generateUiFeatureMock() {
    return renderTemplate('ui-feature/src/data/mock.js');
}

function generateEnterpriseMock() {
    return renderTemplate('enterprise-extension/src/data/mock.js');
}

// --- Specialist Agent generators ---

function generateSpecialistAgentDef(pluginName, displayName) {
    return renderTemplate('specialist-agent/src/agent/agentDef.js', { pluginName, displayName });
}

function generateSpecialistAgentPersona(pluginName, displayName) {
    const shortName = displayName.split(' ')[0];
    return renderTemplate('specialist-agent/src/agent/agentPersona.js', { pluginName, displayName, shortName });
}

function generateSpecialistAgentTools(pluginName) {
    return renderTemplate('specialist-agent/src/agent/tools.js', { pluginName });
}

function generateSpecialistMainView(pluginName, displayName) {
    return renderTemplate('specialist-agent/src/views/MainView.jsx', { pluginName, displayName });
}

function generateSpecialistSettings(pluginName, displayName) {
    return renderTemplate('specialist-agent/src/views/SettingsPanel.jsx', { displayName });
}

function generateAgentStatusCard() {
    return renderTemplate('specialist-agent/src/components/AgentStatusCard.jsx');
}

function generateToolCard() {
    return renderTemplate('specialist-agent/src/components/ToolCard.jsx');
}

function generateAgentChat(pluginName, displayName) {
    return renderTemplate('specialist-agent/src/components/AgentChat.jsx', { displayName });
}

function generateSpecialistMock(displayName) {
    return renderTemplate('specialist-agent/src/data/mock.js', { displayName });
}

// --- Agentic Team generators ---

function generateTeamDef(pluginName, displayName) {
    return renderTemplate('agentic-team/src/team/teamDef.js', { pluginName, displayName });
}

function generateTeamAgents(pluginName, displayName) {
    return renderTemplate('agentic-team/src/team/agents.js', { pluginName, displayName });
}

function generateTeamPersonas(pluginName, displayName) {
    return renderTemplate('agentic-team/src/team/personas.js', { pluginName, displayName });
}

function generateTeamTools(pluginName) {
    return renderTemplate('agentic-team/src/team/tools.js', { pluginName });
}

function generateTeamPolicies(pluginName, displayName) {
    return renderTemplate('agentic-team/src/team/policies.js', { displayName });
}

function generateTeamMainView(pluginName, displayName) {
    return renderTemplate('agentic-team/src/views/MainView.jsx', { pluginName, displayName });
}

function generateTeamSettings(pluginName, displayName) {
    return renderTemplate('agentic-team/src/views/SettingsPanel.jsx', { displayName });
}

function generateMemberCard() {
    return renderTemplate('agentic-team/src/components/MemberCard.jsx');
}

function generateTaskQueue() {
    return renderTemplate('agentic-team/src/components/TaskQueue.jsx');
}

function generateSharedContextPanel() {
    return renderTemplate('agentic-team/src/components/SharedContextPanel.jsx');
}

function generatePolicyBadges() {
    return renderTemplate('agentic-team/src/components/PolicyBadges.jsx');
}

function generateTeamChat() {
    return renderTemplate('agentic-team/src/components/AgentChat.jsx');
}

function generateTeamMock(pluginName, displayName) {
    return renderTemplate('agentic-team/src/data/mock.js', { pluginName, displayName });
}

// --- Backend generators (enterprise only) ---

function generateBackendServer(pluginName, displayName) {
    return renderTemplate('enterprise-extension/backend/server.js', { pluginName, displayName });
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
    return renderTemplate('enterprise-extension/Dockerfile');
}

// --- Shared generators ---

function generateViteConfig(pluginName) {
    return renderTemplate('_shared/vite.config.js', { pluginName });
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
    return renderTemplate('_shared/.gitignore');
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
            files['src/components/AgentChat.jsx'] = generateTeamChat();
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

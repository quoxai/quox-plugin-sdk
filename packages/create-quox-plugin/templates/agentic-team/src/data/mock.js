/**
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

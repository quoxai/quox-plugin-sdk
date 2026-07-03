/**
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

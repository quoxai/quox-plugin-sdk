/**
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

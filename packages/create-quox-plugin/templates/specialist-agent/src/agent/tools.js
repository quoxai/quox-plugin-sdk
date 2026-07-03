/**
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

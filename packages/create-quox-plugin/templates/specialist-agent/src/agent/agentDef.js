/**
 * ${displayName} — Agent Definition
 * Compatible with agentRegistry.js shape.
 */

export const agentDefinition = {
    id: '${pluginName}-agent',
    name: '${displayName} Agent',
    role: 'specialist',
    color: '#f59e0b',
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

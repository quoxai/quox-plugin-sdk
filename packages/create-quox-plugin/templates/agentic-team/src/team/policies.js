/**
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

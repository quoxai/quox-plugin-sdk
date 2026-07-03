/**
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

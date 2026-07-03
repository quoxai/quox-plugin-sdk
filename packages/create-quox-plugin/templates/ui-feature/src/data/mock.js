/**
 * Mock data for ui-feature template.
 */

export const MOCK_ITEMS = [
    { id: 'item-1', title: 'Review pull requests', description: 'Check pending PRs for the dashboard repo', status: 'active', createdAt: new Date().toISOString() },
    { id: 'item-2', title: 'Update documentation', description: 'Add plugin SDK tutorial section', status: 'active', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'item-3', title: 'Fix login redirect', description: 'OAuth callback not redirecting correctly', status: 'active', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'item-4', title: 'Deploy monitoring', description: 'Roll out Grafana dashboards to production', status: 'completed', createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'item-5', title: 'Backup audit', description: 'Verify all backup scripts are running correctly', status: 'active', createdAt: new Date(Date.now() - 345600000).toISOString() },
];

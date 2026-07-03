/**
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

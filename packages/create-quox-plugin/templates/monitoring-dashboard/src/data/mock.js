/**
 * Mock data for monitoring-dashboard template.
 */

export const MOCK_SERVICES = [
    { id: 'svc-1', name: 'API Gateway', status: 'healthy', responseMs: 45, uptimePct: 99.97, lastCheck: new Date().toISOString() },
    { id: 'svc-2', name: 'Database', status: 'healthy', responseMs: 12, uptimePct: 99.99, lastCheck: new Date().toISOString() },
    { id: 'svc-3', name: 'Cache Layer', status: 'degraded', responseMs: 230, uptimePct: 98.5, lastCheck: new Date().toISOString() },
];

/**
 * Mock data for specialist-agent template.
 */

export const MOCK_STATUS = {
    name: '${displayName} Agent',
    running: true,
    defconLevel: 'AMBER',
    currentTask: 'Scanning 192.0.2.0/24 (standard depth)',
    budget: { used: 12500, limit: 50000 },
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    suggestions: [
        'Scan the production subnet for vulnerabilities',
        'Show critical findings from the last scan',
        'Generate an executive summary of our security posture',
        'What are the most common vulnerabilities across hosts?',
        'Schedule a deep scan for tonight',
    ],
};

export const MOCK_FINDINGS = [
    { id: 'f-1', severity: 'critical', host: '192.0.2.101', title: 'OpenSSH < 9.0 — CVE-2023-38408', category: 'remote-access', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-2', severity: 'high', host: '192.0.2.102', title: 'TLS 1.0 enabled on port 443', category: 'encryption', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-3', severity: 'medium', host: '192.0.2.103', title: 'Default SNMP community string', category: 'configuration', discovered: new Date(Date.now() - 7200000).toISOString() },
    { id: 'f-4', severity: 'low', host: '192.0.2.200', title: 'HTTP server version disclosure', category: 'information', discovered: new Date(Date.now() - 7200000).toISOString() },
];

export const MOCK_SCAN_HISTORY = [
    { id: 'scan-1', target: '192.0.2.0/24', depth: 'standard', status: 'completed', findings: 4, startedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'scan-2', target: '192.0.2.0/24', depth: 'quick', status: 'completed', findings: 2, startedAt: new Date(Date.now() - 86400000).toISOString() },
];

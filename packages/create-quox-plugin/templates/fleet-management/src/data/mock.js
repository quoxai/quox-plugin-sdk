/**
 * Mock data for fleet-management template.
 */

export const MOCK_HOSTS = [
    { id: 'h-1', hostname: 'docker-1.example', ip: '192.0.2.101', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-2', hostname: 'docker-2.example', ip: '192.0.2.102', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-3', hostname: 'docker-3.example', ip: '192.0.2.103', group: 'compute', status: 'maintenance', lastSeen: new Date(Date.now() - 300000).toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-4', hostname: 'node-a.example', ip: '192.0.2.1', group: 'hypervisor', status: 'online', lastSeen: new Date().toISOString(), os: 'Proxmox VE 8.1' },
    { id: 'h-5', hostname: 'monitor.example', ip: '192.0.2.200', group: 'monitoring', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), os: 'Debian 12' },
];

/**
 * Mock data for fleet-management template.
 */

export const MOCK_HOSTS = [
    { id: 'h-1', hostname: 'docker01', ip: '10.0.0.101', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-2', hostname: 'docker02', ip: '10.0.0.102', group: 'compute', status: 'online', lastSeen: new Date().toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-3', hostname: 'docker03', ip: '10.0.0.103', group: 'compute', status: 'maintenance', lastSeen: new Date(Date.now() - 300000).toISOString(), os: 'Ubuntu 22.04' },
    { id: 'h-4', hostname: 'pve01', ip: '10.0.0.1', group: 'hypervisor', status: 'online', lastSeen: new Date().toISOString(), os: 'Proxmox VE 8.1' },
    { id: 'h-5', hostname: 'monitor01', ip: '10.0.0.200', group: 'monitoring', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), os: 'Debian 12' },
];

/**
 * ${displayName} — Main View
 * Displays host table with action buttons and safety gates.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
import { MOCK_HOSTS } from '../data/mock';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_COLORS = {
    online: '#10b981',
    offline: '#ef4444',
    maintenance: '#f59e0b',
};

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [hosts, setHosts] = React.useState(MOCK_HOSTS);
    const [confirmAction, setConfirmAction] = React.useState(null);

    const handleAction = (action, host) => {
        setConfirmAction({ action, host });
    };

    const executeAction = async () => {
        if (!confirmAction) return;
        const { action, host } = confirmAction;

        // Emit AEE audit envelope
        if (pluginApi?.aee) {
            await pluginApi.aee.emit('${pluginName}.host.' + action, {
                hostId: host.id,
                hostname: host.hostname,
                action,
            });
        }

        // Replace with real API call
        if (action === 'restart') {
            setHosts(prev => prev.map(h =>
                h.id === host.id ? { ...h, status: 'maintenance' } : h
            ));
            if (pluginApi?.notify) {
                pluginApi.notify('Restarting ' + host.hostname + '...', 'info');
            }
        } else if (action === 'remove') {
            setHosts(prev => prev.filter(h => h.id !== host.id));
            if (pluginApi?.notify) {
                pluginApi.notify('Removed ' + host.hostname, 'warning');
            }
        }
        setConfirmAction(null);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <h2 style={{ color: COLORS.white, marginBottom: 24, fontFamily: F }}>
                ${displayName}
            </h2>

            <GlassPanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Hostname', 'IP', 'Group', 'OS', 'Status', 'Last Seen', 'Actions'].map(h => (
                            <th key={h} style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                color: COLORS.subtleText,
                                fontWeight: 500,
                                fontSize: '0.85rem',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {hosts.map(host => (
                        <tr key={host.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: COLORS.white, fontWeight: 500 }}>
                                {host.hostname}
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.dimText, fontFamily: 'monospace' }}>
                                {host.ip}
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.dimText }}>{host.group}</td>
                            <td style={{ padding: '0.75rem', color: COLORS.dimText }}>{host.os}</td>
                            <td style={{ padding: '0.75rem' }}>
                                <GlassPill color={STATUS_COLORS[host.status] || '#6b7280'}>
                                    {host.status}
                                </GlassPill>
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.subtleText, fontSize: '0.85rem' }}>
                                {new Date(host.lastSeen).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                                <button
                                    onClick={() => handleAction('restart', host)}
                                    style={{
                                        padding: '0.3rem 0.6rem',
                                        marginRight: '0.5rem',
                                        background: 'rgba(59,130,246,0.15)',
                                        color: 'rgba(59,130,246,0.9)',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    ↻ Restart
                                </button>
                                <button
                                    onClick={() => handleAction('remove', host)}
                                    style={{
                                        padding: '0.3rem 0.6rem',
                                        background: 'rgba(239,68,68,0.15)',
                                        color: 'rgba(239,68,68,0.9)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    ✕ Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </GlassPanel>

            {confirmAction && (
                <ConfirmModal
                    action={confirmAction.action}
                    target={confirmAction.host.hostname}
                    onConfirm={executeAction}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
}

/**
 * ${displayName} — Main View
 * Displays service status table with polling.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
import { MOCK_SERVICES } from '../data/mock';
import usePolling from '../hooks/usePolling';

const STATUS_COLORS = {
    healthy: '#10b981',
    degraded: '#f59e0b',
    down: '#ef4444',
};

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [services, setServices] = React.useState(MOCK_SERVICES);

    // Poll for status updates every 60 seconds
    usePolling(() => {
        // Replace with real API call: pluginApi.fetch('/api/status')
        setServices(prev => prev.map(s => ({
            ...s,
            lastCheck: new Date().toISOString(),
        })));
    }, 60000);

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
            <h2 style={{ color: COLORS.text.primary, marginBottom: M.lg, ...F.heading }}>
                ${displayName}
            </h2>

            <GlassPanel>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['Service', 'Status', 'Response', 'Uptime', 'Last Check'].map(h => (
                            <th key={h} style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                color: COLORS.text.muted,
                                fontWeight: 500,
                                fontSize: '0.85rem',
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {services.map(service => (
                        <tr key={service.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem', color: COLORS.text.primary }}>
                                {service.name}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                                <GlassPill color={STATUS_COLORS[service.status]}>
                                    {service.status}
                                </GlassPill>
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.text.secondary }}>
                                {service.responseMs}ms
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.text.secondary }}>
                                {service.uptimePct}%
                            </td>
                            <td style={{ padding: '0.75rem', color: COLORS.text.muted, fontSize: '0.85rem' }}>
                                {new Date(service.lastCheck).toLocaleTimeString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </GlassPanel>
        </div>
    );
}

/**
 * ${displayName} — Main View
 * Displays connection status, item cards, engagement stats, and AgentChatSidebar.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
const PLUGIN_ID = '${pluginName}';
const DISPLAY_NAME = '${displayName}';
import { MOCK_DATA } from '../data/mock';
import AgentSidebar from '../components/AgentSidebar';

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [data, setData] = React.useState(MOCK_DATA);
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: collapsed ? '1fr 48px' : '1fr 340px', height: '100%', overflow: 'hidden' }}>
            {/* Main content pane */}
            <div style={{ overflowY: 'auto', padding: '2rem' }}>
                <h2 style={{ color: COLORS.white, marginBottom: 16, fontFamily: F }}>
                    ${displayName}
                </h2>

                {/* Connection Status Banner */}
                <GlassPanel style={{
                    padding: '0.75rem 1rem',
                    marginBottom: 24,
                    background: data.connected
                        ? 'rgba(16,185,129,0.1)'
                        : 'rgba(239,68,68,0.1)',
                    border: '1px solid ' + (data.connected
                        ? 'rgba(16,185,129,0.3)'
                        : 'rgba(239,68,68,0.3)'),
                }}>
                    <span style={{
                        color: data.connected ? '#10b981' : '#ef4444',
                        fontWeight: 500,
                    }}>
                        {data.connected ? '✓ Connected' : '✗ Disconnected'}
                    </span>
                </GlassPanel>

                {/* Item Card Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    {data.items.map(item => (
                        <GlassPanel key={item.id} style={{ padding: 16 }}>
                            <h4 style={{ color: COLORS.white, margin: '0 0 0.5rem' }}>
                                {item.title}
                            </h4>
                            <p style={{ color: COLORS.dimText, fontSize: '0.85rem', margin: 0 }}>
                                {item.description}
                            </p>
                            <GlassPill style={{ marginTop: 8 }}>
                                {item.type}
                            </GlassPill>
                        </GlassPanel>
                    ))}
                </div>

                {/* Engagement Stats Row */}
                <GlassPanel style={{
                    display: 'flex',
                    gap: 24,
                    padding: 16,
                }}>
                    {[
                        { label: 'Total Items', value: data.metrics.total },
                        { label: 'This Week', value: data.metrics.thisWeek },
                        { label: 'Engagement', value: data.metrics.engagement + '%' },
                    ].map(stat => (
                        <div key={stat.label}>
                            <div style={{ color: COLORS.white, fontSize: '1.25rem', fontWeight: 600 }}>
                                {stat.value}
                            </div>
                            <div style={{ color: COLORS.subtleText, fontSize: '0.8rem' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </GlassPanel>
            </div>

            {/* Agent Chat Sidebar */}
            <AgentSidebar
                agentId={PLUGIN_ID + '-agent'}
                agentName={DISPLAY_NAME + ' Agent'}
                agentColor='#667eea'
                suggestions={['Sync the latest items', 'Summarise engagement this week', 'Check connection status']}
                collapsed={collapsed}
                onToggle={() => setCollapsed(c => !c)}
            />
        </div>
    );
}

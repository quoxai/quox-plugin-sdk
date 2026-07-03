/**
 * ${displayName} — Main View
 * Agent status card, tool cards, quick action chips, and AgentChatSidebar.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F, AgentChatSidebar } = window.__quoxGlass;
const PLUGIN_ID = '${pluginName}';
const DISPLAY_NAME = '${displayName}';
import AgentStatusCard from '../components/AgentStatusCard';
import ToolCard from '../components/ToolCard';
import { MOCK_STATUS, MOCK_FINDINGS } from '../data/mock';
import { toolDefinitions } from '../agent/tools';

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [agentStatus, setAgentStatus] = React.useState(MOCK_STATUS);
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: collapsed ? '1fr 48px' : '1fr 340px', height: '100%', overflow: 'hidden' }}>
            {/* Main content pane */}
            <div style={{ overflowY: 'auto', padding: '2rem' }}>
                <h2 style={{ color: COLORS.white, marginBottom: 24, fontFamily: F }}>
                    ${displayName}
                </h2>

                {/* Agent Status Card */}
                <AgentStatusCard status={agentStatus} />

                {/* Tool Cards Row */}
                <h3 style={{ color: COLORS.dimText, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                    Agent Tools
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    {toolDefinitions.map(tool => (
                        <ToolCard key={tool.name} tool={tool} pluginApi={pluginApi} />
                    ))}
                </div>

                {/* Quick Action Chips */}
                <h3 style={{ color: COLORS.dimText, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                    Quick Actions
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {agentStatus.suggestions.map((suggestion, i) => (
                        <GlassPill key={i} style={{ cursor: 'pointer' }} onClick={() => setCollapsed(false)}>
                            {suggestion}
                        </GlassPill>
                    ))}
                </div>
            </div>

            {/* Agent Chat Sidebar */}
            <AgentChatSidebar
                agentId={PLUGIN_ID}
                agentName={DISPLAY_NAME + ' Agent'}
                agentColor='#f59e0b'
                suggestions={agentStatus.suggestions}
                collapsed={collapsed}
                onToggle={() => setCollapsed(c => !c)}
            />
        </div>
    );
}

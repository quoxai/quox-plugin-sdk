/**
 * ${displayName} — Main View
 * Member cards row, task queue, shared context, quick actions, and AgentChatSidebar
 * pointed at the team orchestrator.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
const ORCHESTRATOR_ID = '${pluginName}-lead';
const DISPLAY_NAME = '${displayName}';
import MemberCard from '../components/MemberCard';
import TaskQueue from '../components/TaskQueue';
import SharedContextPanel from '../components/SharedContextPanel';
import PolicyBadges from '../components/PolicyBadges';
import AgentChat from '../components/AgentChat';
import { MOCK_TEAM_STATUS, MOCK_TASKS } from '../data/mock';
import { teamDefinition } from '../team/teamDef';

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [teamStatus, setTeamStatus] = React.useState(MOCK_TEAM_STATUS);
    const [tasks, setTasks] = React.useState(MOCK_TASKS);
    const [showContext, setShowContext] = React.useState(false);
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: collapsed ? '1fr 48px' : '1fr 340px', height: '100%', overflow: 'hidden' }}>
            {/* Main content pane */}
            <div style={{ overflowY: 'auto', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ color: COLORS.white, margin: 0, fontFamily: F }}>
                        ${displayName} Team
                    </h2>
                    <button
                        onClick={() => setShowContext(!showContext)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(56,189,248,0.15)',
                            color: 'rgba(56,189,248,0.9)',
                            border: '1px solid rgba(56,189,248,0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                        }}
                    >
                        {showContext ? 'Hide Context' : 'Shared Context'}
                    </button>
                </div>

                {/* Policy Badges */}
                <PolicyBadges policies={teamDefinition.policies} />

                {/* Member Cards Row */}
                <h3 style={{ color: COLORS.dimText, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                    Team Members
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}>
                    {teamStatus.members.map(member => (
                        <MemberCard key={member.id} member={member} />
                    ))}
                </div>

                {/* Task Queue */}
                <h3 style={{ color: COLORS.dimText, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                    Task Queue
                </h3>
                <TaskQueue tasks={tasks} />

                {/* Quick Actions */}
                <h3 style={{ color: COLORS.dimText, margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                    Quick Actions
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['Deploy latest to staging', 'Check all service health', 'View team metrics', 'Create incident report'].map((action, i) => (
                        <GlassPill key={i} style={{ cursor: 'pointer' }} onClick={() => setCollapsed(false)}>
                            {action}
                        </GlassPill>
                    ))}
                </div>

                {showContext && (
                    <SharedContextPanel
                        context={teamDefinition.sharedContext}
                        onClose={() => setShowContext(false)}
                    />
                )}
            </div>

            {/* Agent Chat Sidebar — orchestrator */}
            <AgentChat
                agentId={ORCHESTRATOR_ID}
                agentName={DISPLAY_NAME + ' Lead'}
                agentColor='#38bdf8'
                suggestions={['Deploy latest to staging', 'Check all service health', 'View team metrics', 'Create incident report']}
                collapsed={collapsed}
                onToggle={() => setCollapsed(c => !c)}
            />
        </div>
    );
}

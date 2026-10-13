/**
 * ${displayName}: Main View
 *
 * Member cards, task queue, policies and shared context.
 *
 * Honest scope: the team (agents, personas, tools, policies) is declared in
 * manifest.json and run by Quox plus YOUR backend. This sandboxed plugin is the
 * UI for it: status from GET /team/status, tasks from GET /tasks. Until a backend
 * answers, you see the error and labelled sample data. The chat with the lead is NOT
 * built here: the Quox host renders its agent sidebar beside your plugin from
 * manifest.agentDefinition, so it matches Quox's own agents.
 * Policy enforcement (VOLT, approval, budgets) must live in the backend.
 */

import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page, Spinner } from '../lib/ui';
import MemberCard from '../components/MemberCard';
import TaskQueue from '../components/TaskQueue';
import SharedContextPanel from '../components/SharedContextPanel';
import PolicyBadges from '../components/PolicyBadges';
import { MOCK_TEAM_STATUS, MOCK_TASKS } from '../data/mock';
import { teamDefinition } from '../team/teamDef';

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    const team = useLoad(async () => {
        const [status, tasks] = await Promise.all([api('/team/status'), api('/tasks')]);
        return { status, tasks: tasks.tasks || [] };
    });
    const [showContext, setShowContext] = React.useState(false);

    const status = team.data ? team.data.status : (team.error ? MOCK_TEAM_STATUS : null);
    const tasks = team.data ? team.data.tasks : (team.error ? MOCK_TASKS : []);

    return (
        <Page
            title="${displayName} team"
            maxWidth={1200}
            actions={
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="qx-btn qx-btn--sm" onClick={() => setShowContext(!showContext)}>{showContext ? 'Hide context' : 'Shared context'}</button>
                    <button className="qx-btn qx-btn--sm" onClick={team.reload}>Refresh</button>
                </div>
            }
        >
            <ErrorBanner error={team.error} onRetry={team.reload} title="Team backend unavailable" />
            {team.error && <InfoBanner>Showing sample data. Build /team/status and /tasks in your plugin backend to replace it.</InfoBanner>}

            {!status ? <Spinner /> : (
                <div>
                    <PolicyBadges policies={teamDefinition.policies} />

                    <div className="qx-section-title" style={{ marginTop: 24 }}>Team members</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        {status.members.map(m => <MemberCard key={m.id} member={m} />)}
                    </div>

                    <div className="qx-section-title" style={{ marginTop: 24 }}>Task queue</div>
                    <TaskQueue tasks={tasks} />

                    {showContext && <SharedContextPanel context={teamDefinition.sharedContext} onClose={() => setShowContext(false)} />}
                </div>
            )}
        </Page>
    );
}

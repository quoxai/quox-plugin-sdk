/**
 * ${displayName}: Main View
 *
 * Agent status and a tool runner.
 *
 * Honest scope: the agent itself (persona, tools, autonomy) is declared in
 * manifest.json (agentDefinition) and run by Quox plus YOUR backend. The chat
 * panel is NOT built here: the Quox host renders its agent sidebar beside your
 * plugin from manifest.agentDefinition, so it matches Quox's own agents. A
 * sandboxed plugin is the UI around it: status from GET /agent/status, tool runs
 * via POST /tools/<name>/run. Until a backend answers, the status card shows
 * labelled sample data and the tool calls show their errors.
 */

import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page, Spinner } from '../lib/ui';
import AgentStatusCard from '../components/AgentStatusCard';
import ToolCard from '../components/ToolCard';
import { MOCK_STATUS } from '../data/mock';
import { toolDefinitions } from '../agent/tools';

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    const status = useLoad(() => api('/agent/status'));
    const agent = status.data || (status.error ? MOCK_STATUS : null);

    return (
        <Page
            title="${displayName}"
            maxWidth={1200}
            actions={<button className="qx-btn qx-btn--sm" onClick={status.reload}>Refresh</button>}
        >
            <ErrorBanner error={status.error} onRetry={status.reload} title="Agent backend unavailable" />
            {status.error && <InfoBanner>Showing sample status. Build GET /agent/status in your plugin backend to replace it.</InfoBanner>}

            {!agent ? <Spinner /> : (
                <div>
                    <AgentStatusCard status={agent} />

                    <div className="qx-section-title" style={{ marginTop: 24 }}>Agent tools</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {toolDefinitions.map(tool => <ToolCard key={tool.name} tool={tool} />)}
                    </div>
                </div>
            )}
        </Page>
    );
}

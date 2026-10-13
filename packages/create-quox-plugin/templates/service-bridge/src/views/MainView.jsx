/**
 * ${displayName}: Main View
 *
 * Integration pattern: your plugin BACKEND talks to the third-party service
 * (a sandboxed plugin has no network of its own). This view reads it through
 * getQuox().fetch: GET /status -> { connected }, GET /items -> { items, metrics }.
 * Until a backend answers, the view shows an error and labelled sample data.
 */

import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page, Spinner } from '../lib/ui';
import AgentSidebar from '../components/AgentSidebar';
import { MOCK_DATA } from '../data/mock';

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    const state = useLoad(async () => {
        const [status, items] = await Promise.all([api('/status'), api('/items')]);
        return { connected: Boolean(status && status.connected), items: items.items || [], metrics: items.metrics || {} };
    });

    const data = state.data || (state.error ? MOCK_DATA : null);

    return (
        <Page
            title="${displayName}"
            maxWidth={1200}
            actions={<button className="qx-btn qx-btn--sm" onClick={state.reload}>Refresh</button>}
        >
            <ErrorBanner error={state.error} onRetry={state.reload} title="Integration backend unavailable" />
            {state.error && <InfoBanner>Showing sample data. Build /status and /items in your plugin backend to replace it.</InfoBanner>}

            {!data ? <Spinner /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
                    <div>
                        <div className={'qx-banner ' + (data.connected ? 'qx-banner--success' : 'qx-banner--error')} style={{ marginBottom: 16 }}>
                            {data.connected ? 'Connected' : 'Disconnected'}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                            {data.items.map(item => (
                                <div key={item.id} className="qx-card" style={{ padding: 16 }}>
                                    <h4 style={{ margin: '0 0 8px' }}>{item.title}</h4>
                                    <p style={{ margin: '0 0 8px' }}>{item.description}</p>
                                    <span className="qx-pill qx-pill--info qx-pill--sm">{item.type}</span>
                                </div>
                            ))}
                        </div>

                        <div className="qx-card" style={{ padding: 16, display: 'flex', gap: 32 }}>
                            <div className="qx-stat"><div className="qx-stat__head">Total items</div><div className="qx-stat__value">{data.metrics.total}</div></div>
                            <div className="qx-stat"><div className="qx-stat__head">This week</div><div className="qx-stat__value">{data.metrics.thisWeek}</div></div>
                            <div className="qx-stat"><div className="qx-stat__head">Engagement</div><div className="qx-stat__value">{data.metrics.engagement}%</div></div>
                        </div>
                    </div>

                    <AgentSidebar title="${displayName} notes" />
                </div>
            )}
        </Page>
    );
}

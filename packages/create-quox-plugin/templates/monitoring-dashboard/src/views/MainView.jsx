/**
 * ${displayName}: Main View
 *
 * Service status table, refreshed every 60 seconds.
 *
 * Data path: this view calls YOUR plugin backend through getQuox().fetch('/status')
 * (see the enterprise-extension template for a backend skeleton). A sandboxed
 * plugin cannot call Grafana, Prometheus or any other service directly; the
 * backend does that and returns JSON shaped like { services: [...] }.
 * While no backend answers, the view shows an error and clearly labelled sample data.
 */

import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page, Spinner } from '../lib/ui';
import usePolling from '../hooks/usePolling';
import { MOCK_SERVICES } from '../data/mock';

const { React } = window.__quoxSharedDeps;

const STATUS_PILL = {
    healthy: 'qx-pill qx-pill--online',
    degraded: 'qx-pill qx-pill--degraded',
    down: 'qx-pill qx-pill--offline',
};

export default function MainView() {
    const status = useLoad(() => api('/status'));
    usePolling(status.reload, 60000);

    const live = status.data && Array.isArray(status.data.services);
    const services = live ? status.data.services : (status.error ? MOCK_SERVICES : []);

    return (
        <Page
            title="${displayName}"
            actions={<button className="qx-btn qx-btn--sm" onClick={status.reload}>Refresh</button>}
        >
            <ErrorBanner error={status.error} onRetry={status.reload} title="Status backend unavailable" />
            {status.error && <InfoBanner>Showing sample data. Build the /status route in your plugin backend to replace it.</InfoBanner>}

            {status.loading && !status.data && !status.error ? <Spinner /> : (
                <div className="qx-card" style={{ padding: 8 }}>
                    <table className="qx-table">
                        <thead>
                            <tr>
                                <th>Service</th><th>Status</th><th>Response</th><th>Uptime</th><th>Last check</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map(s => (
                                <tr key={s.id}>
                                    <td>{s.name}</td>
                                    <td><span className={STATUS_PILL[s.status] || 'qx-pill'}>{s.status}</span></td>
                                    <td className="qx-mono">{s.responseMs}ms</td>
                                    <td className="qx-mono">{s.uptimePct}%</td>
                                    <td>{new Date(s.lastCheck).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Page>
    );
}

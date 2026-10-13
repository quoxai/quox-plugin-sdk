/**
 * ${displayName}: Main View
 *
 * Host table with confirm-before-act safety gates.
 *
 * What a sandboxed plugin can and cannot do: it cannot reach hosts, a bastion
 * or the fleet directly. This view asks YOUR plugin backend (getQuox().fetch)
 * to list hosts and to run actions, and records an audit envelope for every
 * action with getQuox().aee.emit. Governed host access (the Quox fleet, vault
 * credentials, bastion exec) belongs to an official plugin or to your backend
 * calling a service you operate; it is not available inside the sandbox.
 *
 * Backend contract: GET /hosts -> { hosts: [...] }, POST /hosts/<id>/<action>.
 * Until a backend answers, the view shows an error and labelled sample data; actions on
 * sample data are simulated locally and say so.
 */

import { getQuox } from 'quox-plugin-sdk';
import { api, toast } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page, Spinner } from '../lib/ui';
import ConfirmModal from '../components/ConfirmModal';
import { MOCK_HOSTS } from '../data/mock';

const { React } = window.__quoxSharedDeps;

const STATUS_PILL = {
    online: 'qx-pill qx-pill--online',
    offline: 'qx-pill qx-pill--offline',
    maintenance: 'qx-pill qx-pill--degraded',
};

export default function MainView() {
    const hosts = useLoad(() => api('/hosts'));
    const [sample, setSample] = React.useState(MOCK_HOSTS);
    const [confirm, setConfirm] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [actionError, setActionError] = React.useState(null);

    const usingSample = Boolean(hosts.error);
    const rows = usingSample ? sample : ((hosts.data && hosts.data.hosts) || []);

    const execute = async () => {
        const { action, host } = confirm;
        setBusy(true);
        setActionError(null);
        try {
            // Audit first: if the host refuses the envelope we do not act.
            await getQuox().aee.emit('${pluginName}.host.' + action, { hostId: host.id, hostname: host.hostname, action });
            if (usingSample) {
                setSample(prev => action === 'remove'
                    ? prev.filter(h => h.id !== host.id)
                    : prev.map(h => (h.id === host.id ? { ...h, status: 'maintenance' } : h)));
                toast('Simulated ' + action + ' on ' + host.hostname + ' (sample data, nothing was sent)', 'info');
            } else {
                await api('/hosts/' + encodeURIComponent(host.id) + '/' + action, { method: 'POST' });
                toast(action + ' requested for ' + host.hostname, 'success');
                hosts.reload();
            }
            setConfirm(null);
        } catch (e) {
            setActionError(e);
            toast('Action failed: ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Page
            title="${displayName}"
            maxWidth={1100}
            actions={<button className="qx-btn qx-btn--sm" onClick={hosts.reload}>Refresh</button>}
        >
            <ErrorBanner error={hosts.error} onRetry={hosts.reload} title="Host backend unavailable" />
            {usingSample && <InfoBanner>Showing sample data. Actions are simulated until your plugin backend serves /hosts.</InfoBanner>}
            <ErrorBanner error={actionError} title="Action failed" />

            {hosts.loading && !hosts.data && !hosts.error ? <Spinner /> : (
                <div className="qx-card" style={{ padding: 8 }}>
                    <table className="qx-table">
                        <thead>
                            <tr><th>Hostname</th><th>IP</th><th>Group</th><th>OS</th><th>Status</th><th>Last seen</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {rows.map(h => (
                                <tr key={h.id}>
                                    <td>{h.hostname}</td>
                                    <td className="qx-mono">{h.ip}</td>
                                    <td>{h.group}</td>
                                    <td>{h.os}</td>
                                    <td><span className={STATUS_PILL[h.status] || 'qx-pill'}>{h.status}</span></td>
                                    <td>{new Date(h.lastSeen).toLocaleString()}</td>
                                    <td>
                                        <span style={{ display: 'inline-flex', gap: 8 }}>
                                            <button className="qx-btn qx-btn--sm" onClick={() => setConfirm({ action: 'restart', host: h })}>Restart</button>
                                            <button className="qx-btn qx-btn--sm qx-btn--danger" onClick={() => setConfirm({ action: 'remove', host: h })}>Remove</button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {confirm && (
                <ConfirmModal
                    action={confirm.action}
                    target={confirm.host.hostname}
                    busy={busy}
                    onConfirm={execute}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </Page>
    );
}

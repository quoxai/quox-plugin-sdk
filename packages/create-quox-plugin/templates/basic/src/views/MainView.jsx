/**
 * ${displayName}: Main View
 *
 * A minimal sandbox-safe plugin: shows who is signed in (getQuox().getUser())
 * and a counter that persists in plugin storage (getQuox().storage). Both calls
 * are RPCs to the Quox host and can fail, so both have an error state.
 */

import { getQuox } from '@quoxai/quox-plugin-sdk';
import { loadValue, saveValue, toast } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, Page, Spinner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    const user = useLoad(() => getQuox().getUser());
    const visits = useLoad(() => loadValue('visits', 0));
    const [saveError, setSaveError] = React.useState(null);

    const bump = async () => {
        setSaveError(null);
        try {
            await saveValue('visits', (visits.data || 0) + 1);
            toast('Saved', 'success');
            visits.reload();
        } catch (e) {
            setSaveError(e);
        }
    };

    return (
        <Page title="${displayName}" maxWidth={800}>
            <ErrorBanner error={user.error} onRetry={user.reload} title="Could not read your user" />
            <ErrorBanner error={visits.error} onRetry={visits.reload} title="Could not read storage" />
            <ErrorBanner error={saveError} title="Could not save" />

            <div className="qx-card" style={{ padding: 24 }}>
                <p style={{ marginTop: 0 }}>${description}</p>

                {user.loading && !user.data ? <Spinner /> : user.data && (
                    <div className="qx-stat-row">
                        <span className="qx-stat-row__label">Signed in as</span>
                        <span className="qx-stat-row__value">{user.data.role} ({user.data.tier})</span>
                    </div>
                )}
                <div className="qx-stat-row">
                    <span className="qx-stat-row__label">Button presses saved in plugin storage</span>
                    <span className="qx-stat-row__value">{visits.data === null ? '-' : visits.data}</span>
                </div>

                <div style={{ marginTop: 16 }}>
                    <button className="qx-btn qx-btn--primary" onClick={bump}>Press me</button>
                </div>
            </div>
        </Page>
    );
}

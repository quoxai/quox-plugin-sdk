/**
 * ${displayName}: Settings Panel
 *
 * Settings are kept in plugin storage. Premium fields only take effect on a tier that includes
 * them; enforce that in your backend, never only in the UI.
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'endpoint', label: 'Backend endpoint', type: 'url', hint: 'Informational. Calls always go through your plugin backend namespace.' },
    { key: 'maxRetention', label: 'Retention (days)', type: 'number' },
    { key: 'advancedAnalytics', label: 'Advanced analytics (Pro)', type: 'toggle', hint: 'Requires the Pro tier.' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', { endpoint: 'http://localhost:8080', maxRetention: 90, advancedAnalytics: false });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

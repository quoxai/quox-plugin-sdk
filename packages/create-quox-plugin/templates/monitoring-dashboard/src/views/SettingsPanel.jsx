/**
 * ${displayName}: Settings Panel
 *
 * The service URL is kept in plugin storage. The API key is a secret: it is sent
 * to your plugin backend (POST /config) and never stored in the browser-visible
 * plugin storage.
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'serviceUrl', label: 'Service URL', type: 'url', hint: 'Base URL of the monitoring service. Your backend calls it, not this page.' },
    { key: 'apiKey', label: 'API key', type: 'password', hint: 'Sent to your plugin backend only. Leave empty to keep the saved key.' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', { serviceUrl: 'http://localhost:3000', apiKey: '' }, { secretKeys: ['apiKey'], remotePath: '/config' });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

/**
 * ${displayName}: Settings Panel
 *
 * The bastion URL is kept in plugin storage. The API token is a secret: it is
 * sent to your plugin backend (POST /config) and never stored in the
 * browser-visible plugin storage.
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'bastionUrl', label: 'Bastion URL', type: 'url', hint: 'Your backend connects to this, not this page.' },
    { key: 'apiToken', label: 'API token', type: 'password', hint: 'Sent to your plugin backend only. Leave empty to keep the saved token.' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', { bastionUrl: 'http://localhost:9848', apiToken: '' }, { secretKeys: ['apiToken'], remotePath: '/config' });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

/**
 * ${displayName}: Settings Panel
 *
 * Preferences are kept in plugin storage (per-org, server-side).
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'sortOrder', label: 'Sort order', type: 'select', options: ['newest', 'oldest', 'alphabetical'] },
    { key: 'showCompleted', label: 'Show completed items', type: 'toggle' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', { sortOrder: 'newest', showCompleted: true });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

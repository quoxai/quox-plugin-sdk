/**
 * ${displayName}: Settings Panel
 *
 * Agent limits are kept in plugin storage. They are inputs for YOUR backend; the sandbox does
 * not run the agent itself.
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'scanTarget', label: 'Scan target', type: 'text' },
    { key: 'defconLevel', label: 'DEFCON level', type: 'select', options: ['GREEN', 'AMBER', 'ORANGE', 'RED'] },
    { key: 'autonomous', label: 'Autonomous runs', type: 'toggle' },
    { key: 'schedule', label: 'Schedule (cron)', type: 'text' },
    { key: 'maxTokensPerRun', label: 'Max tokens per run', type: 'number' },
    { key: 'maxToolCallsPerRun', label: 'Max tool calls per run', type: 'number' },
    { key: 'maxDailyRuns', label: 'Max runs per day', type: 'number' },
    { key: 'escalateOnHighRisk', label: 'Escalate on high risk', type: 'toggle' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', {
        scanTarget: '192.0.2.0/24',
        defconLevel: 'AMBER',
        autonomous: true,
        schedule: '0 */4 * * *',
        maxTokensPerRun: 50000,
        maxToolCallsPerRun: 20,
        maxDailyRuns: 6,
        escalateOnHighRisk: true,
    });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

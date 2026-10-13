/**
 * ${displayName}: Settings Panel
 *
 * Team policy is kept in plugin storage. These are inputs for YOUR backend; enforcement of
 * approval, VOLT and budgets happens there, never only in this form.
 */

import useConfig from '../lib/useConfig';
import ConfigForm from '../lib/ConfigForm';
import { ErrorBanner, Page } from '../lib/ui';

const FIELDS = [
    { key: 'approvalRequired', label: 'Require approval before start', type: 'toggle' },
    { key: 'voltRequired', label: 'Require VOLT', type: 'toggle' },
    { key: 'checkpointAfterEachTask', label: 'Checkpoint after each task', type: 'toggle' },
    { key: 'maxBudgetTokens', label: 'Max budget tokens', type: 'number' },
    { key: 'maxBudgetToolCalls', label: 'Max tool calls', type: 'number' },
    { key: 'maxParallelTasks', label: 'Max parallel tasks', type: 'number' },
    { key: 'allowedChannels', label: 'Allowed channels (comma-separated)', type: 'text' },
];

export default function SettingsPanel() {
    const cfg = useConfig('config', {
        approvalRequired: true,
        maxParallelTasks: 2,
        voltRequired: true,
        checkpointAfterEachTask: true,
        maxBudgetTokens: 200000,
        maxBudgetToolCalls: 80,
        allowedChannels: 'dashboard,aee,webhook',
    });

    return (
        <Page title="${displayName} settings" maxWidth={640}>
            <ErrorBanner error={cfg.error} title="Settings problem" />
            <ConfigForm fields={FIELDS} config={cfg.config} onChange={cfg.setConfig} onSave={cfg.save} saving={cfg.saving} disabled={cfg.loading} />
        </Page>
    );
}

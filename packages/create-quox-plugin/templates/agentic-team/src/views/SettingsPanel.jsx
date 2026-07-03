/**
 * ${displayName} — Settings Panel
 * Budget, approval, VOLT, checkpoint, channels, per-member DEFCON.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || {
            approvalRequired: true,
            maxParallelTasks: 2,
            voltRequired: true,
            checkpointAfterEachTask: true,
            maxBudgetTokens: 200000,
            maxBudgetToolCalls: 80,
            allowedChannels: 'dashboard,aee,webhook',
        };
    });

    const handleSave = () => {
        if (pluginApi?.config) pluginApi.config.save(config);
        if (pluginApi?.notify) pluginApi.notify('Team settings saved', 'success');
    };

    const fieldStyle = {
        width: '100%',
        padding: '0.5rem 0.75rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: 'rgba(255,255,255,0.85)',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Team Settings
            </h2>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem', fontSize: '1rem' }}>
                Policies
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.approvalRequired} onChange={e => setConfig(prev => ({ ...prev, approvalRequired: e.target.checked }))} />
                    Require approval before start
                </label>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.voltRequired} onChange={e => setConfig(prev => ({ ...prev, voltRequired: e.target.checked }))} />
                    VOLT audit trail required
                </label>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.checkpointAfterEachTask} onChange={e => setConfig(prev => ({ ...prev, checkpointAfterEachTask: e.target.checked }))} />
                    Checkpoint after each task
                </label>
            </div>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Budget
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Budget Tokens</label>
                    <input type="number" value={config.maxBudgetTokens} onChange={e => setConfig(prev => ({ ...prev, maxBudgetTokens: parseInt(e.target.value) || 200000 }))} style={fieldStyle} />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Tool Calls</label>
                    <input type="number" value={config.maxBudgetToolCalls} onChange={e => setConfig(prev => ({ ...prev, maxBudgetToolCalls: parseInt(e.target.value) || 80 }))} style={fieldStyle} />
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Parallel Tasks</label>
                <input type="number" value={config.maxParallelTasks} onChange={e => setConfig(prev => ({ ...prev, maxParallelTasks: parseInt(e.target.value) || 2 }))} style={fieldStyle} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Allowed Channels (comma-separated)</label>
                <input type="text" value={config.allowedChannels} onChange={e => setConfig(prev => ({ ...prev, allowedChannels: e.target.value }))} style={fieldStyle} />
            </div>

            <button
                onClick={handleSave}
                style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(16,185,129,0.15)',
                    color: 'rgba(16,185,129,0.9)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                Save Settings
            </button>
        </div>
    );
}

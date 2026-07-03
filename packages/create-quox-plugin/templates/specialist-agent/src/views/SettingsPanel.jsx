/**
 * ${displayName} — Settings Panel
 * DEFCON level, autonomy toggle, schedule, budget, escalation, scope.
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
            scanTarget: '10.0.0.0/24',
            defconLevel: 'AMBER',
            autonomous: true,
            schedule: '0 */4 * * *',
            maxTokensPerRun: 50000,
            maxToolCallsPerRun: 20,
            maxDailyRuns: 6,
            escalateOnHighRisk: true,
        };
    });

    const handleSave = () => {
        if (pluginApi?.config) pluginApi.config.save(config);
        if (pluginApi?.notify) pluginApi.notify('Settings saved', 'success');
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
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Default Scan Target
                </label>
                <input
                    type="text"
                    value={config.scanTarget}
                    onChange={e => setConfig(prev => ({ ...prev, scanTarget: e.target.value }))}
                    style={fieldStyle}
                />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    DEFCON Level
                </label>
                <select
                    value={config.defconLevel}
                    onChange={e => setConfig(prev => ({ ...prev, defconLevel: e.target.value }))}
                    style={fieldStyle}
                >
                    {Object.keys(DEFCON_COLORS).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                <div style={{
                    marginTop: '0.3rem',
                    height: '4px',
                    borderRadius: '2px',
                    background: DEFCON_COLORS[config.defconLevel] || '#6b7280',
                }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={config.autonomous}
                        onChange={e => setConfig(prev => ({ ...prev, autonomous: e.target.checked }))}
                    />
                    Autonomous mode (run on schedule)
                </label>
            </div>

            {config.autonomous && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Cron Schedule
                    </label>
                    <input
                        type="text"
                        value={config.schedule}
                        onChange={e => setConfig(prev => ({ ...prev, schedule: e.target.value }))}
                        placeholder="0 */4 * * *"
                        style={fieldStyle}
                    />
                </div>
            )}

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Budget
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Max Tokens/Run
                    </label>
                    <input
                        type="number"
                        value={config.maxTokensPerRun}
                        onChange={e => setConfig(prev => ({ ...prev, maxTokensPerRun: parseInt(e.target.value) || 50000 }))}
                        style={fieldStyle}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        Max Tool Calls/Run
                    </label>
                    <input
                        type="number"
                        value={config.maxToolCallsPerRun}
                        onChange={e => setConfig(prev => ({ ...prev, maxToolCallsPerRun: parseInt(e.target.value) || 20 }))}
                        style={fieldStyle}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Max Daily Runs
                </label>
                <input
                    type="number"
                    value={config.maxDailyRuns}
                    onChange={e => setConfig(prev => ({ ...prev, maxDailyRuns: parseInt(e.target.value) || 6 }))}
                    style={fieldStyle}
                />
            </div>

            <h3 style={{ color: 'rgba(255,255,255,0.8)', margin: '1.5rem 0 1rem', fontSize: '1rem' }}>
                Escalation
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={config.escalateOnHighRisk}
                        onChange={e => setConfig(prev => ({ ...prev, escalateOnHighRisk: e.target.checked }))}
                    />
                    Escalate on high-risk findings
                </label>
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

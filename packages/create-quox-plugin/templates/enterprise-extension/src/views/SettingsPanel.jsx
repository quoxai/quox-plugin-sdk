/**
 * ${displayName} — Settings Panel
 * Complex configuration with premium-flagged fields.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || {
            endpoint: 'http://localhost:8080',
            maxRetention: 90,
            advancedAnalytics: false,
        };
    });
    const currentTier = 'free'; // Replace with real tier detection

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
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
                    Service Endpoint
                </label>
                <input
                    type="url"
                    value={config.endpoint}
                    onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    style={fieldStyle}
                />
            </div>

            <div style={{ marginBottom: '1.25rem', opacity: currentTier === 'free' ? 0.5 : 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Retention Days
                    <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        background: 'rgba(168,85,247,0.2)',
                        color: '#a855f7',
                    }}>PRO</span>
                </label>
                <input
                    type="number"
                    value={config.maxRetention}
                    onChange={e => setConfig(prev => ({ ...prev, maxRetention: parseInt(e.target.value) || 30 }))}
                    disabled={currentTier === 'free'}
                    style={{ ...fieldStyle, opacity: currentTier === 'free' ? 0.5 : 1 }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem', opacity: currentTier !== 'enterprise' ? 0.5 : 1 }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: currentTier === 'enterprise' ? 'pointer' : 'not-allowed',
                }}>
                    <input
                        type="checkbox"
                        checked={config.advancedAnalytics}
                        onChange={e => setConfig(prev => ({ ...prev, advancedAnalytics: e.target.checked }))}
                        disabled={currentTier !== 'enterprise'}
                    />
                    Advanced Analytics
                    <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        background: 'rgba(234,179,8,0.2)',
                        color: '#eab308',
                    }}>ENTERPRISE</span>
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

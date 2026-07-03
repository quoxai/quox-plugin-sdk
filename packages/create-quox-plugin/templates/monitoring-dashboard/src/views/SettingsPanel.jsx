/**
 * ${displayName} — Settings Panel
 * Configuration for service URL and API key.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { serviceUrl: 'http://localhost:3000', apiKey: '' };
    });

    const handleSave = () => {
        if (pluginApi?.config) {
            pluginApi.config.save(config);
        }
        if (pluginApi?.notify) {
            pluginApi.notify('Settings saved', 'success');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                ${displayName} Settings
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    Service URL
                </label>
                <input
                    type="url"
                    value={config.serviceUrl}
                    onChange={e => setConfig(prev => ({ ...prev, serviceUrl: e.target.value }))}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                    API Key
                </label>
                <input
                    type="password"
                    value={config.apiKey}
                    onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter API key"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
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

/**
 * ${displayName} — Settings Panel
 * Simple preferences configuration.
 */

const { React } = window.__quoxSharedDeps;

export default function SettingsPanel({ pluginApi }) {
    const [config, setConfig] = React.useState(() => {
        return pluginApi?.config?.get() || { sortOrder: 'newest', showCompleted: true };
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
                    Default Sort Order
                </label>
                <select
                    value={config.sortOrder}
                    onChange={e => setConfig(prev => ({ ...prev, sortOrder: e.target.value }))}
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
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="alphabetical">Alphabetical</option>
                </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={config.showCompleted}
                        onChange={e => setConfig(prev => ({ ...prev, showCompleted: e.target.checked }))}
                    />
                    Show completed items
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

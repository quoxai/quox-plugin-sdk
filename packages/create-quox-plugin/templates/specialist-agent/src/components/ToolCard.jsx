/**
 * ToolCard — Tool name, description, Run button, expandable parameter form.
 */

const { React } = window.__quoxSharedDeps;

export default function ToolCard({ tool, pluginApi }) {
    const [expanded, setExpanded] = React.useState(false);
    const [params, setParams] = React.useState({});
    const [running, setRunning] = React.useState(false);

    const handleRun = async () => {
        setRunning(true);
        // Stub: In production, this would invoke the tool via the agent
        console.log('[ToolCard] Running', tool.name, 'with params:', params);
        if (pluginApi?.notify) {
            pluginApi.notify('Running ' + tool.name + '...', 'info');
        }
        // Simulate execution
        setTimeout(() => {
            setRunning(false);
            if (pluginApi?.notify) {
                pluginApi.notify(tool.name + ' completed', 'success');
            }
        }, 2000);
    };

    const properties = tool.input_schema?.properties || {};

    return (
        <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h4 style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 0.3rem', fontSize: '0.9rem' }}>
                        {tool.name.split('_').slice(2).join('_')}
                    </h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0 }}>
                        {tool.description}
                    </p>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {expanded ? '&#x25B2;' : '&#x25BC;'}
                </button>
            </div>

            {expanded && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {Object.entries(properties).map(([key, schema]) => (
                        <div key={key} style={{ marginBottom: '0.5rem' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                {key} {(tool.input_schema.required || []).includes(key) ? '*' : ''}
                            </label>
                            <input
                                type={schema.type === 'number' ? 'number' : 'text'}
                                value={params[key] || ''}
                                onChange={e => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={schema.description || key}
                                style={{
                                    width: '100%',
                                    padding: '0.35rem 0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleRun}
                        disabled={running}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            background: running ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.15)',
                            color: running ? 'rgba(107,114,128,0.7)' : 'rgba(16,185,129,0.9)',
                            border: '1px solid ' + (running ? 'rgba(107,114,128,0.3)' : 'rgba(16,185,129,0.3)'),
                            borderRadius: '6px',
                            cursor: running ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        {running ? 'Running...' : '&#x25B6; Run'}
                    </button>
                </div>
            )}
        </div>
    );
}

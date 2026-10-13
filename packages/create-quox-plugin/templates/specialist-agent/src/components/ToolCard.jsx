/**
 * ToolCard: tool name, description, expandable parameter form and Run button.
 *
 * Run asks YOUR backend to execute the tool: POST /tools/<name>/run with the
 * parameters. The sandbox cannot run tools itself. window.quox.aee is not
 * available to community plugins yet (it rejects not_available), so write your
 * own audit trail in your backend until it ships. Result and failure are both shown on the card.
 */

import { api, toast } from '../lib/api';
import { ErrorBanner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

export default function ToolCard({ tool }) {
    const [expanded, setExpanded] = React.useState(false);
    const [params, setParams] = React.useState({});
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState(null);

    const shortName = tool.name.split('_').slice(2).join('_');
    const properties = (tool.input_schema && tool.input_schema.properties) || {};
    const required = (tool.input_schema && tool.input_schema.required) || [];

    const run = async () => {
        setRunning(true);
        setError(null);
        setResult(null);
        try {
            const out = await api('/tools/' + encodeURIComponent(tool.name) + '/run', { method: 'POST', body: { params } });
            setResult(out);
            toast(shortName + ' completed', 'success');
        } catch (e) {
            setError(e);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="qx-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                    <h4 style={{ margin: '0 0 4px' }}>{shortName}</h4>
                    <p style={{ margin: 0 }}>{tool.description}</p>
                </div>
                <button className="qx-btn qx-btn--ghost qx-btn--sm" onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Hide' : 'Configure'}
                </button>
            </div>

            {expanded && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(properties).map(([key, schema]) => (
                        <div className="qx-field" key={key}>
                            <label className={'qx-field__label' + (required.includes(key) ? ' qx-field__label--required' : '')} htmlFor={'p-' + tool.name + key}>{key}</label>
                            <input
                                id={'p-' + tool.name + key}
                                className="qx-input"
                                type={schema.type === 'number' ? 'number' : 'text'}
                                value={params[key] || ''}
                                onChange={e => setParams(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={schema.description || key}
                            />
                        </div>
                    ))}
                    <div>
                        <button className="qx-btn qx-btn--primary qx-btn--sm" onClick={run} disabled={running}>
                            {running ? 'Running...' : 'Run'}
                        </button>
                    </div>
                    <ErrorBanner error={error} title="Tool run failed" />
                    {result && <pre className="qx-code-block">{JSON.stringify(result, null, 2)}</pre>}
                </div>
            )}
        </div>
    );
}

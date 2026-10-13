/**
 * ConfigForm: render a settings form from a field list. Fields:
 *   { key, label, type: 'text'|'url'|'password'|'number'|'select'|'toggle', hint, options }
 */

const { React } = window.__quoxSharedDeps;

export default function ConfigForm({ fields, config, onChange, onSave, saving, disabled }) {
    const set = (key, value) => onChange({ ...config, [key]: value });

    return (
        <form
            onSubmit={e => { e.preventDefault(); onSave(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
            {fields.map(f => (
                <div className="qx-field" key={f.key}>
                    <label className="qx-field__label" htmlFor={'cfg-' + f.key}>{f.label}</label>
                    {f.type === 'toggle' ? (
                        <label className="qx-toggle">
                            <input
                                id={'cfg-' + f.key}
                                type="checkbox"
                                checked={Boolean(config[f.key])}
                                onChange={e => set(f.key, e.target.checked)}
                            />
                            <span className="qx-toggle__track" />
                        </label>
                    ) : f.type === 'select' ? (
                        <select
                            id={'cfg-' + f.key}
                            className="qx-select"
                            value={config[f.key]}
                            onChange={e => set(f.key, e.target.value)}
                        >
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    ) : (
                        <input
                            id={'cfg-' + f.key}
                            className="qx-input"
                            type={f.type || 'text'}
                            value={config[f.key] === undefined ? '' : config[f.key]}
                            autoComplete="off"
                            onChange={e => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                        />
                    )}
                    {f.hint && <div className="qx-field__hint">{f.hint}</div>}
                </div>
            ))}
            <div>
                <button className="qx-btn qx-btn--primary" type="submit" disabled={saving || disabled}>
                    {saving ? 'Saving...' : 'Save settings'}
                </button>
            </div>
        </form>
    );
}

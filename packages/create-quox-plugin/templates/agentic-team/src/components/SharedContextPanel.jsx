/**
 * SharedContextPanel — Collapsible context viewer.
 */

const { React } = window.__quoxSharedDeps;

export default function SharedContextPanel({ context, onClose }) {
    return (
        <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.15)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: 'rgba(56,189,248,0.9)', fontWeight: 500, fontSize: '0.9rem' }}>
                    Shared Context
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>
            <pre style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: 'monospace',
            }}>
                {typeof context === 'string' ? context : JSON.stringify(context, null, 2)}
            </pre>
        </div>
    );
}

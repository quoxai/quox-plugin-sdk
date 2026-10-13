/**
 * SharedContextPanel: read-only view of the team's shared context.
 */

const { React } = window.__quoxSharedDeps;

export default function SharedContextPanel({ context, onClose }) {
    return (
        <div className="qx-card" style={{ padding: 16, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="qx-section-title" style={{ margin: 0, flex: 1 }}>Shared context</div>
                <button className="qx-btn qx-btn--ghost qx-btn--sm" onClick={onClose}>Close</button>
            </div>
            <pre className="qx-code-block">{typeof context === 'string' ? context : JSON.stringify(context, null, 2)}</pre>
        </div>
    );
}

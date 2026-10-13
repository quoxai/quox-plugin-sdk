/**
 * ConfirmModal: safety gate shown before a destructive action.
 */

const { React } = window.__quoxSharedDeps;

export default function ConfirmModal({ action, target, busy, onConfirm, onCancel }) {
    return (
        <div className="qx-modal-overlay" role="dialog" aria-modal="true">
            <div className="qx-modal" style={{ maxWidth: 420 }}>
                <div className="qx-modal__header">
                    <h3>Confirm {action}</h3>
                </div>
                <div className="qx-modal__body">
                    <p className="qx-modal__desc">
                        Are you sure you want to {action} <strong>{target}</strong>? This action may be destructive.
                    </p>
                </div>
                <div className="qx-modal__actions">
                    <button className="qx-btn" onClick={onCancel} disabled={busy}>Cancel</button>
                    <button className="qx-btn qx-btn--danger" onClick={onConfirm} disabled={busy}>
                        {busy ? 'Working...' : 'Confirm ' + action}
                    </button>
                </div>
            </div>
        </div>
    );
}

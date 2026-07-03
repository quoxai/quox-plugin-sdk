/**
 * ConfirmModal — Safety gate confirmation dialog.
 * Used before destructive actions (restart, remove, etc.)
 */

const { React } = window.__quoxSharedDeps;

export default function ConfirmModal({ action, target, onConfirm, onCancel }) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '90%',
            }}>
                <h3 style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 0.75rem' }}>
                    Confirm {action}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.25rem' }}>
                    Are you sure you want to <strong style={{ color: '#ef4444' }}>{action}</strong> <strong>{target}</strong>?
                    This action may be destructive.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(239,68,68,0.15)',
                            color: 'rgba(239,68,68,0.9)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        Confirm {action}
                    </button>
                </div>
            </div>
        </div>
    );
}

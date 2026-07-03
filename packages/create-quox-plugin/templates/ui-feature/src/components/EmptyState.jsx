/**
 * EmptyState — Empty state placeholder with icon, message, and CTA.
 */

const { React } = window.__quoxSharedDeps;

export default function EmptyState({ message, actionLabel, onAction }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                opacity: 0.3,
            }}>
                &#x1F4E6;
            </div>
            <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1rem',
                marginBottom: '1.5rem',
            }}>
                {message}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        padding: '0.6rem 1.5rem',
                        background: 'rgba(16,185,129,0.15)',
                        color: 'rgba(16,185,129,0.9)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

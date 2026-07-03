/**
 * UpgradeGate — Locked feature overlay with upgrade CTA.
 */

const { React } = window.__quoxSharedDeps;

export default function UpgradeGate({ children, requiredTier = 'pro' }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
                {children}
            </div>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
            }}>
                <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: requiredTier === 'enterprise'
                        ? 'rgba(234,179,8,0.2)'
                        : 'rgba(168,85,247,0.2)',
                    color: requiredTier === 'enterprise' ? '#eab308' : '#a855f7',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                }}>
                    {requiredTier} required
                </span>
                <button
                    onClick={() => {
                        // Open upgrade flow
                        console.log('Upgrade to', requiredTier);
                    }}
                    style={{
                        padding: '0.3rem 0.8rem',
                        background: 'rgba(168,85,247,0.15)',
                        color: 'rgba(168,85,247,0.9)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                    }}
                >
                    Upgrade
                </button>
            </div>
        </div>
    );
}

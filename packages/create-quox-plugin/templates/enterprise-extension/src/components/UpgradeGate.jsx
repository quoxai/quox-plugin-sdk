/**
 * UpgradeGate: dims a locked feature and says which tier unlocks it.
 * Display only. The real gate is your backend checking the caller's tier
 * (getQuox().getUser() reports it); never rely on the UI to protect a feature.
 */

const { React } = window.__quoxSharedDeps;

export default function UpgradeGate({ children, requiredTier = 'pro' }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.45, pointerEvents: 'none' }}>{children}</div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className={'qx-pill ' + (requiredTier === 'enterprise' ? 'qx-pill--warn' : 'qx-pill--purple')}>
                    {requiredTier} tier required
                </span>
            </div>
        </div>
    );
}

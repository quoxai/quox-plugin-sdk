/**
 * UsageMeter — Progress bar with tier-aware limits.
 */

const { React } = window.__quoxSharedDeps;

export default function UsageMeter({ label, current, limit, unit = '' }) {
    const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const isWarning = pct > 80;
    const isCritical = pct > 95;

    const barColor = isCritical
        ? '#ef4444'
        : isWarning
            ? '#f59e0b'
            : '#10b981';

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.3rem',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    {label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    {current}{unit} / {limit}{unit}
                </span>
            </div>
            <div style={{
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: pct + '%',
                    borderRadius: '3px',
                    background: barColor,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
}

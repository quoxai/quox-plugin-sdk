/**
 * UsageMeter: progress bar with tier-aware limits.
 */

const { React } = window.__quoxSharedDeps;

export default function UsageMeter({ label, current, limit, unit = '' }) {
    const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
    const tone = ratio > 0.95 ? ' qx-progress--crit' : ratio > 0.8 ? ' qx-progress--warn' : ' qx-progress--success';

    return (
        <div style={{ marginBottom: 12 }}>
            <div className="qx-stat-row" style={{ borderBottom: 'none', padding: '0 0 6px' }}>
                <span className="qx-stat-row__label">{label}</span>
                <span className="qx-stat-row__value">{current}{unit} / {limit}{unit}</span>
            </div>
            <div className={'qx-progress' + tone} style={{ '--qx-progress': ratio }} />
        </div>
    );
}

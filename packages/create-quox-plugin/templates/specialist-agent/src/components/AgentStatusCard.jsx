/**
 * AgentStatusCard: status dot, DEFCON pill, token budget bar, current task.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_PILL = {
    GREEN: 'qx-pill qx-pill--online',
    AMBER: 'qx-pill qx-pill--warn',
    ORANGE: 'qx-pill qx-pill--degraded',
    RED: 'qx-pill qx-pill--critical',
};

export default function AgentStatusCard({ status }) {
    const ratio = status.budget.limit > 0 ? Math.min(status.budget.used / status.budget.limit, 1) : 0;
    const tone = ratio > 0.9 ? ' qx-progress--crit' : ratio > 0.7 ? ' qx-progress--warn' : ' qx-progress--success';

    return (
        <div className="qx-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={'qx-dot ' + (status.running ? 'qx-dot--online' : 'qx-dot--idle')} />
                    <strong>{status.name}</strong>
                    <span>{status.running ? 'Running' : 'Idle'}</span>
                </div>
                <span className={DEFCON_PILL[status.defconLevel] || 'qx-pill'}>DEFCON {status.defconLevel}</span>
            </div>

            <div className="qx-stat-row" style={{ borderBottom: 'none', padding: '0 0 6px' }}>
                <span className="qx-stat-row__label">Token budget</span>
                <span className="qx-stat-row__value">{status.budget.used.toLocaleString()} / {status.budget.limit.toLocaleString()}</span>
            </div>
            <div className={'qx-progress' + tone} style={{ '--qx-progress': ratio }} />

            {status.currentTask && (
                <div className="qx-hint" style={{ marginTop: 12 }}>Current: {status.currentTask}</div>
            )}
        </div>
    );
}

/**
 * AgentStatusCard — Status dot, DEFCON badge, token usage bar, current task.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function AgentStatusCard({ status }) {
    const defconColor = DEFCON_COLORS[status.defconLevel] || '#6b7280';
    const tokenPct = status.budget.limit > 0
        ? Math.min((status.budget.used / status.budget.limit) * 100, 100)
        : 0;

    return (
        <div style={{
            padding: '1.25rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Status dot */}
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: status.running ? '#10b981' : '#6b7280',
                        boxShadow: status.running ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                    }} />
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                        {status.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                        {status.running ? 'Running' : 'Idle'}
                    </span>
                </div>
                {/* DEFCON badge */}
                <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: defconColor + '22',
                    color: defconColor,
                }}>
                    DEFCON {status.defconLevel}
                </span>
            </div>

            {/* Token usage bar */}
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Token Budget</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        {status.budget.used.toLocaleString()} / {status.budget.limit.toLocaleString()}
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
                        width: tokenPct + '%',
                        borderRadius: '3px',
                        background: tokenPct > 90 ? '#ef4444' : tokenPct > 70 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Current task */}
            {status.currentTask && (
                <div style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Current: </span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{status.currentTask}</span>
                </div>
            )}
        </div>
    );
}

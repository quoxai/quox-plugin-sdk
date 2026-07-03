/**
 * PolicyBadges — VOLT, Approval, Parallel, Checkpoint badge pills.
 */

const { React } = window.__quoxSharedDeps;

export default function PolicyBadges({ policies }) {
    const badges = [
        { label: 'VOLT', active: policies.voltRequired, color: '#8b5cf6' },
        { label: 'Approval', active: policies.requireApprovalBeforeStart, color: '#f59e0b' },
        { label: 'Parallel: ' + policies.maxParallelTasks, active: true, color: '#3b82f6' },
        { label: 'Checkpoint', active: policies.checkpointAfterEachTask, color: '#10b981' },
    ];

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {badges.map(badge => (
                <span
                    key={badge.label}
                    style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: badge.active ? badge.color + '22' : 'rgba(107,114,128,0.15)',
                        color: badge.active ? badge.color : 'rgba(107,114,128,0.7)',
                    }}
                >
                    {badge.label}
                </span>
            ))}
        </div>
    );
}

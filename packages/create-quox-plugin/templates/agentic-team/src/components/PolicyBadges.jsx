/**
 * PolicyBadges: VOLT, approval, parallelism and checkpoint policy pills.
 */

const { React } = window.__quoxSharedDeps;

export default function PolicyBadges({ policies }) {
    const badges = [
        { label: 'VOLT', active: policies.voltRequired },
        { label: 'Approval', active: policies.requireApprovalBeforeStart },
        { label: 'Parallel: ' + policies.maxParallelTasks, active: true },
        { label: 'Checkpoint', active: policies.checkpointAfterEachTask },
    ];

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(b => (
                <span key={b.label} className={b.active ? 'qx-pill qx-pill--info' : 'qx-pill qx-pill--ghost'}>{b.label}</span>
            ))}
        </div>
    );
}

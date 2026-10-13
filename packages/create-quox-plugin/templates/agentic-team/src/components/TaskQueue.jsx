/**
 * TaskQueue: tasks with assigned member, priority and status pills.
 */

const { React } = window.__quoxSharedDeps;

const PRIORITY_PILL = {
    low: 'qx-pill qx-pill--ghost qx-pill--sm',
    medium: 'qx-pill qx-pill--info qx-pill--sm',
    high: 'qx-pill qx-pill--warn qx-pill--sm',
    critical: 'qx-pill qx-pill--critical qx-pill--sm',
};

const STATUS_PILL = {
    queued: 'qx-pill qx-pill--ghost qx-pill--sm',
    running: 'qx-pill qx-pill--info qx-pill--sm',
    completed: 'qx-pill qx-pill--online qx-pill--sm',
    failed: 'qx-pill qx-pill--critical qx-pill--sm',
};

export default function TaskQueue({ tasks }) {
    if (tasks.length === 0) {
        return <div className="qx-empty"><div className="qx-empty__title">No tasks</div></div>;
    }
    return (
        <div className="qx-card" style={{ padding: 8 }}>
            <table className="qx-table">
                <tbody>
                    {tasks.map(t => (
                        <tr key={t.id}>
                            <td>{t.title}</td>
                            <td>{t.assignedTo}</td>
                            <td><span className={PRIORITY_PILL[t.priority] || 'qx-pill qx-pill--sm'}>{t.priority}</span></td>
                            <td><span className={STATUS_PILL[t.status] || 'qx-pill qx-pill--sm'}>{t.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

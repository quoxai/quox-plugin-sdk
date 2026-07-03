/**
 * TaskQueue — Task list with assigned agent, priority, status badges.
 */

const { React } = window.__quoxSharedDeps;

const PRIORITY_COLORS = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
};

const STATUS_COLORS = {
    queued: '#6b7280',
    running: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
};

export default function TaskQueue({ tasks }) {
    return (
        <div style={{
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
        }}>
            {tasks.map((task, i) => (
                <div key={task.id} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{task.title}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                            → {task.assignedTo}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: (PRIORITY_COLORS[task.priority] || '#6b7280') + '22',
                            color: PRIORITY_COLORS[task.priority] || '#6b7280',
                        }}>
                            {task.priority}
                        </span>
                        <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: (STATUS_COLORS[task.status] || '#6b7280') + '22',
                            color: STATUS_COLORS[task.status] || '#6b7280',
                        }}>
                            {task.status}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * MemberCard — Coloured avatar circle, name, domain, DEFCON badge, status.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_COLORS = {
    GREEN: '#10b981',
    AMBER: '#f59e0b',
    ORANGE: '#f97316',
    RED: '#ef4444',
};

export default function MemberCard({ member }) {
    const defconColor = DEFCON_COLORS[member.defconLevel] || '#6b7280';

    return (
        <div style={{
            padding: '1rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
        }}>
            {/* Coloured avatar circle */}
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: member.color + '22',
                border: '2px solid ' + member.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: member.color,
            }}>
                {member.shortName[0]}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: '0.25rem' }}>
                {member.shortName}
            </div>

            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                {member.role} / {member.domain}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Status dot */}
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: member.running ? '#10b981' : '#6b7280',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                    {member.running ? 'Active' : 'Idle'}
                </span>
                {/* DEFCON badge */}
                <span style={{
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    background: defconColor + '22',
                    color: defconColor,
                }}>
                    {member.defconLevel}
                </span>
            </div>
        </div>
    );
}

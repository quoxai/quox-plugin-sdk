/**
 * MemberCard: coloured avatar, name, domain, DEFCON pill and status.
 */

const { React } = window.__quoxSharedDeps;

const DEFCON_PILL = {
    GREEN: 'qx-pill qx-pill--online qx-pill--sm',
    AMBER: 'qx-pill qx-pill--warn qx-pill--sm',
    ORANGE: 'qx-pill qx-pill--degraded qx-pill--sm',
    RED: 'qx-pill qx-pill--critical qx-pill--sm',
};

export default function MemberCard({ member }) {
    return (
        <div className="qx-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <div
                className="qx-avatar qx-avatar--circle"
                style={{ border: '2px solid ' + member.color, color: member.color }}
            >
                {member.shortName[0]}
            </div>
            <strong>{member.shortName}</strong>
            <div className="qx-hint qx-hint--sm">{member.role} / {member.domain}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={'qx-dot qx-dot--sm ' + (member.running ? 'qx-dot--online' : 'qx-dot--idle')} />
                <span className="qx-hint qx-hint--sm">{member.running ? 'Active' : 'Idle'}</span>
                <span className={DEFCON_PILL[member.defconLevel] || 'qx-pill qx-pill--sm'}>{member.defconLevel}</span>
            </div>
        </div>
    );
}

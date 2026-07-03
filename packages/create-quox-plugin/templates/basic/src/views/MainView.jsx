/**
 * ${displayName} — Main View
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;

export default function MainView() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px' }}>
            <GlassPanel style={{ padding: 24 }}>
                <h2 style={{ color: COLORS.white, marginBottom: 16, fontFamily: F }}>
                    ${displayName}
                </h2>
                <p style={{ color: COLORS.dimText }}>
                    ${description}
                </p>
            </GlassPanel>
        </div>
    );
}

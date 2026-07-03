/**
 * ${displayName} — Main View
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;

export default function MainView() {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px' }}>
            <GlassPanel style={{ padding: M.lg }}>
                <h2 style={{ color: COLORS.text.primary, marginBottom: M.md, ...F.heading }}>
                    ${displayName}
                </h2>
                <p style={{ color: COLORS.text.secondary }}>
                    ${description}
                </p>
            </GlassPanel>
        </div>
    );
}

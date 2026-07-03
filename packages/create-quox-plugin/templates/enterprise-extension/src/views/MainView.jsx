/**
 * ${displayName} — Main View
 * Multi-tier enterprise view with usage meter, feature cards, and upgrade gates.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
import { MOCK_DATA } from '../data/mock';
import UsageMeter from '../components/UsageMeter';
import UpgradeGate from '../components/UpgradeGate';

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [data, setData] = React.useState(MOCK_DATA);
    const [searchQuery, setSearchQuery] = React.useState('');
    const currentTier = 'free'; // Replace with real tier detection

    const handleMemorySearch = async () => {
        if (!searchQuery.trim()) return;
        if (pluginApi?.memory) {
            const results = await pluginApi.memory.search(searchQuery, 10);
            console.log('Memory search results:', results);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px' }}>
            <h2 style={{ color: COLORS.white, marginBottom: 8, fontFamily: F }}>
                ${displayName}
            </h2>

            {/* Tier Banner + Usage Meter */}
            <GlassPanel style={{ padding: 16, marginBottom: 24 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                }}>
                    <GlassPill>
                        {currentTier} tier
                    </GlassPill>
                </div>
                <UsageMeter
                    label="Queries"
                    current={data.tierUsage.queriesUsed}
                    limit={data.tierUsage.queriesLimit}
                />
                <UsageMeter
                    label="Storage"
                    current={data.tierUsage.storageMb}
                    limit={data.tierUsage.storageLimitMb}
                    unit="MB"
                />
            </GlassPanel>

            {/* Memory Search */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
            }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMemorySearch()}
                    placeholder="Search memory..."
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.85)',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleMemorySearch}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(102,126,234,0.15)',
                        color: 'rgba(102,126,234,0.9)',
                        border: '1px solid rgba(102,126,234,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    Search
                </button>
            </div>

            {/* Unlocked Feature Cards */}
            <h3 style={{ color: COLORS.dimText, marginBottom: 16, fontSize: '1rem' }}>
                Available Features
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 32,
            }}>
                {data.features.filter(f => !f.locked).map(feature => (
                    <GlassPanel key={feature.id} style={{ padding: 16 }}>
                        <h4 style={{ color: COLORS.white, margin: '0 0 0.5rem' }}>
                            {feature.name}
                        </h4>
                        <p style={{ color: COLORS.dimText, fontSize: '0.85rem', margin: 0 }}>
                            {feature.description}
                        </p>
                    </GlassPanel>
                ))}
            </div>

            {/* Locked Feature Cards with Upgrade Gate */}
            <h3 style={{ color: COLORS.dimText, marginBottom: 16, fontSize: '1rem' }}>
                Premium Features
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
            }}>
                {data.features.filter(f => f.locked).map(feature => (
                    <UpgradeGate key={feature.id} requiredTier={feature.requiredTier}>
                        <GlassPanel style={{ padding: 16 }}>
                            <h4 style={{ color: COLORS.white, margin: '0 0 0.5rem' }}>
                                {feature.name}
                            </h4>
                            <p style={{ color: COLORS.dimText, fontSize: '0.85rem', margin: 0 }}>
                                {feature.description}
                            </p>
                        </GlassPanel>
                    </UpgradeGate>
                ))}
            </div>
        </div>
    );
}

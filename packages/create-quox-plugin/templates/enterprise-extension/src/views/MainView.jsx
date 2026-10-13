/**
 * ${displayName}: Main View
 *
 * Multi-tier view: usage meters, memory search, feature cards, upgrade gates.
 *
 * - Tier comes from getQuox().getUser() (display only; enforce tiers in your backend).
 * - Usage comes from your backend: GET /usage -> { queriesUsed, queriesLimit, storageMb, storageLimitMb }.
 *   The backend skeleton is in backend/ (Dockerfile included). Until it answers you see an
 *   error and labelled sample numbers.
 * - Memory search uses getQuox().memory.search.
 */

import { getQuox } from 'quox-plugin-sdk';
import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page } from '../lib/ui';
import UsageMeter from '../components/UsageMeter';
import UpgradeGate from '../components/UpgradeGate';
import { MOCK_DATA } from '../data/mock';

const { React } = window.__quoxSharedDeps;

function FeatureCard({ feature }) {
    return (
        <div className="qx-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>{feature.name}</h4>
            <p style={{ margin: 0 }}>{feature.description}</p>
        </div>
    );
}

export default function MainView() {
    const user = useLoad(() => getQuox().getUser());
    const usage = useLoad(() => api('/usage'));
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState(null);
    const [searchError, setSearchError] = React.useState(null);

    const tier = (user.data && user.data.tier) || 'free';
    const meters = usage.data || (usage.error ? MOCK_DATA.tierUsage : null);

    const search = async () => {
        if (!query.trim()) return;
        setSearchError(null);
        try {
            const found = await getQuox().memory.search(query.trim(), 10);
            setResults(Array.isArray(found) ? found : (found && found.results) || []);
        } catch (e) {
            setSearchError(e);
        }
    };

    return (
        <Page title="${displayName}" maxWidth={1100}>
            <ErrorBanner error={user.error} onRetry={user.reload} title="Could not read your user" />
            <ErrorBanner error={usage.error} onRetry={usage.reload} title="Usage backend unavailable" />
            {usage.error && <InfoBanner>Showing sample usage. Build GET /usage in your plugin backend to replace it.</InfoBanner>}

            <div className="qx-card" style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ marginBottom: 12 }}><span className="qx-pill qx-pill--info">{tier} tier</span></div>
                {meters && <>
                    <UsageMeter label="Queries" current={meters.queriesUsed} limit={meters.queriesLimit} />
                    <UsageMeter label="Storage" current={meters.storageMb} limit={meters.storageLimitMb} unit="MB" />
                </>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                    className="qx-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder="Search memory"
                />
                <button className="qx-btn qx-btn--primary" onClick={search}>Search</button>
            </div>
            <ErrorBanner error={searchError} title="Memory search failed" />
            {results && (
                <div className="qx-card" style={{ padding: 12, marginBottom: 24 }}>
                    {results.length === 0 ? <span className="qx-hint">No matches.</span> : results.map((r, i) => (
                        <div key={r.id || i} className="qx-stat-row"><span className="qx-stat-row__label">{r.content || r.text || JSON.stringify(r)}</span></div>
                    ))}
                </div>
            )}

            <div className="qx-section-title" style={{ marginTop: 16 }}>Available features</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
                {MOCK_DATA.features.filter(f => !f.locked).map(f => <FeatureCard key={f.id} feature={f} />)}
            </div>

            <div className="qx-section-title">Premium features</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {MOCK_DATA.features.filter(f => f.locked).map(f => (
                    <UpgradeGate key={f.id} requiredTier={f.requiredTier}><FeatureCard feature={f} /></UpgradeGate>
                ))}
            </div>
        </Page>
    );
}

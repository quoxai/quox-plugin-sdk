/**
 * ${displayName}: Main View
 *
 * Multi-tier view: usage meters, feature cards, upgrade gates.
 *
 * - Tier comes from getQuox().getUser() (display only; enforce tiers in your backend).
 * - Usage comes from your backend: GET /usage -> { queriesUsed, queriesLimit, storageMb, storageLimitMb }.
 *   The backend skeleton is in backend/ (Dockerfile included). Until it answers you see an
 *   error and labelled sample numbers.
 * - window.quox.memory is not available to community plugins yet (it rejects not_available).
 *   Until it ships, keep your data in plugin storage (getQuox().storage) or your own backend.
 */

import { getQuox } from '@quoxai/quox-plugin-sdk';
import { api } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, InfoBanner, Page } from '../lib/ui';
import UsageMeter from '../components/UsageMeter';
import UpgradeGate from '../components/UpgradeGate';
import { MOCK_DATA } from '../data/mock';

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

    const tier = (user.data && user.data.tier) || 'free';
    const meters = usage.data || (usage.error ? MOCK_DATA.tierUsage : null);

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

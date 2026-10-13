/**
 * AgentChat: talk to the team lead through YOUR backend.
 *
 * POST /team/chat { message } -> { reply }. The host's own agent chat surface
 * cannot be embedded in a sandboxed plugin, so this panel calls your backend,
 * which routes to the orchestrator however you choose.
 */

import { api } from '../lib/api';
import { ErrorBanner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

export default function AgentChat({ agentName, suggestions = [] }) {
    const [query, setQuery] = React.useState('');
    const [messages, setMessages] = React.useState([]);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState(null);

    const send = async (text) => {
        const message = (text || query).trim();
        if (!message) return;
        setMessages(prev => [...prev, { role: 'user', text: message }]);
        setQuery('');
        setBusy(true);
        setError(null);
        try {
            const out = await api('/team/chat', { method: 'POST', body: { message } });
            setMessages(prev => [...prev, { role: 'agent', text: (out && out.reply) || '(empty reply)' }]);
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="qx-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="qx-section-title">{agentName}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {messages.length === 0 && <div className="qx-hint">Ask the lead to coordinate the team.</div>}
                {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <span className={m.role === 'user' ? 'qx-pill qx-pill--info' : 'qx-pill qx-pill--ghost'} style={{ whiteSpace: 'normal' }}>{m.text}</span>
                    </div>
                ))}
            </div>
            <ErrorBanner error={error} title="Team backend unavailable" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.slice(0, 3).map((s, i) => (
                    <button key={i} className="qx-chip" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="qx-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="Message the lead"
                />
                <button className="qx-btn qx-btn--primary" onClick={() => send()} disabled={busy}>{busy ? '...' : 'Send'}</button>
            </div>
        </div>
    );
}

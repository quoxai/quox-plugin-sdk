/**
 * AgentChat: ask the agent a question through YOUR backend.
 *
 * POST /agent/chat { message } -> { reply }. The host's own agent chat surface
 * cannot be embedded in a sandboxed plugin, so this panel talks to your
 * backend, which can call a model or the Quox API however you choose.
 */

import { api } from '../lib/api';
import { ErrorBanner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

export default function AgentChat({ suggestions = [] }) {
    const [query, setQuery] = React.useState('');
    const [messages, setMessages] = React.useState([
        { role: 'agent', text: 'Hello! I am the ${displayName} agent. What would you like me to do?' },
    ]);
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
            const out = await api('/agent/chat', { method: 'POST', body: { message } });
            setMessages(prev => [...prev, { role: 'agent', text: (out && out.reply) || '(empty reply)' }]);
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="qx-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="qx-section-title">Ask the agent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <span className={m.role === 'user' ? 'qx-pill qx-pill--info' : 'qx-pill qx-pill--ghost'} style={{ whiteSpace: 'normal' }}>{m.text}</span>
                    </div>
                ))}
            </div>
            <ErrorBanner error={error} title="Agent backend unavailable" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.slice(0, 3).map((s, i) => (
                    <button key={i} className="qx-chip" onClick={() => send(s)} disabled={busy}>{s.length > 40 ? s.slice(0, 40) + '...' : s}</button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="qx-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="Ask the agent"
                />
                <button className="qx-btn qx-btn--primary" onClick={() => send()} disabled={busy}>{busy ? '...' : 'Send'}</button>
            </div>
        </div>
    );
}

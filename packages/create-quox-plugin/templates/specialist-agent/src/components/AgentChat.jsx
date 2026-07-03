/**
 * AgentChat — Inline chat panel with messages, input, and quick action chips.
 */

const { React } = window.__quoxSharedDeps;

export default function AgentChat({ pluginApi, suggestions, onClose }) {
    const [query, setQuery] = React.useState('');
    const [messages, setMessages] = React.useState([
        { role: 'agent', text: 'Hello! I am the ${displayName} agent. I can scan infrastructure, analyse findings, and generate reports. What would you like me to do?' },
    ]);

    const handleSend = async (text) => {
        const message = text || query;
        if (!message.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: message }]);

        // Stub: In production, this routes through the specialist agent
        setMessages(prev => [...prev, {
            role: 'agent',
            text: 'I received your request. In production, I would process this using my tools and return results.',
        }]);
        setQuery('');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            background: '#1a1a2e',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
        }}>
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ color: 'rgba(245,158,11,0.9)', fontWeight: 500 }}>
                    &#x2728; ${displayName} Agent
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                    &#x2715;
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0 }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            maxWidth: '85%',
                            background: msg.role === 'user' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.85rem',
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick action chips */}
            <div style={{ padding: '0.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {(suggestions || []).slice(0, 3).map((s, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(s)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                        }}
                    >
                        {s.length > 35 ? s.slice(0, 35) + '...' : s}
                    </button>
                ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask the agent..."
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
                    onClick={() => handleSend()}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(245,158,11,0.15)',
                        color: 'rgba(245,158,11,0.9)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    &#x27A4;
                </button>
            </div>
        </div>
    );
}

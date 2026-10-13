/**
 * AgentSidebar: a notes panel for this integration.
 *
 * The specialist agent for this plugin is declared in manifest.json and chats
 * in the host's own chat surface. A sandboxed plugin cannot embed that chat, so
 * this panel keeps simple notes in plugin storage (getQuox().storage, per org).
 *
 * window.quox.memory is NOT available to community plugins yet (it rejects
 * not_available), so notes live in plugin storage. For anything larger, keep the
 * data in your own plugin backend and read it through getQuox().fetch.
 */

import { loadValue, saveValue, toast } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

const NOTES_KEY = 'notes';

export default function AgentSidebar({ title = 'Notes' }) {
    const notes = useLoad(() => loadValue(NOTES_KEY, []));
    const [text, setText] = React.useState('');
    const [filter, setFilter] = React.useState('');
    const [error, setError] = React.useState(null);
    const [busy, setBusy] = React.useState(false);

    const all = Array.isArray(notes.data) ? notes.data : [];
    const shown = filter.trim() ? all.filter(n => n.content.toLowerCase().includes(filter.trim().toLowerCase())) : all;

    const save = async () => {
        if (!text.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await saveValue(NOTES_KEY, [{ content: text.trim(), at: new Date().toISOString() }, ...all].slice(0, 100));
            toast('Note saved', 'success');
            setText('');
            notes.reload();
        } catch (e) { setError(e); } finally { setBusy(false); }
    };

    return (
        <div className="qx-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="qx-section-title">{title}</div>
            <ErrorBanner error={error || notes.error} onRetry={notes.reload} title="Notes unavailable" />
            <textarea
                className="qx-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write a note"
            />
            <div style={{ display: 'flex', gap: 8 }}>
                <button className="qx-btn qx-btn--primary qx-btn--sm" onClick={save} disabled={busy}>Save note</button>
                <input className="qx-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter notes" />
            </div>
            {shown.length === 0
                ? <div className="qx-hint">No notes.</div>
                : shown.map((n, i) => <div key={n.at || i} className="qx-hint">{n.content}</div>)}
        </div>
    );
}

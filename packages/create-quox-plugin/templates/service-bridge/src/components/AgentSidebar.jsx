/**
 * AgentSidebar: a memory panel for this integration.
 *
 * The specialist agent for this plugin is declared in manifest.json and chats
 * in the host's own chat surface. A sandboxed plugin cannot embed that chat, so
 * this panel does what the sandbox allows: save notes to Quox memory
 * (getQuox().memory.save) and search them (getQuox().memory.search).
 */

import { getQuox } from 'quox-plugin-sdk';
import { toast } from '../lib/api';
import { ErrorBanner } from '../lib/ui';

const { React } = window.__quoxSharedDeps;

export default function AgentSidebar({ title = 'Memory' }) {
    const [text, setText] = React.useState('');
    const [results, setResults] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [busy, setBusy] = React.useState(false);

    const run = async (fn) => {
        setBusy(true);
        setError(null);
        try { await fn(); } catch (e) { setError(e); } finally { setBusy(false); }
    };

    const save = () => run(async () => {
        if (!text.trim()) return;
        await getQuox().memory.save({ type: 'note', content: text.trim(), tags: ['${pluginName}'] });
        toast('Saved to memory', 'success');
        setText('');
    });

    const search = () => run(async () => {
        if (!text.trim()) return;
        const found = await getQuox().memory.search(text.trim(), 10);
        setResults(Array.isArray(found) ? found : (found && found.results) || []);
    });

    return (
        <div className="qx-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="qx-section-title">{title}</div>
            <ErrorBanner error={error} title="Memory call failed" />
            <textarea
                className="qx-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write a note, or type a query"
            />
            <div style={{ display: 'flex', gap: 8 }}>
                <button className="qx-btn qx-btn--primary qx-btn--sm" onClick={save} disabled={busy}>Save note</button>
                <button className="qx-btn qx-btn--sm" onClick={search} disabled={busy}>Search</button>
            </div>
            {results && (results.length === 0
                ? <div className="qx-hint">No matches.</div>
                : results.map((r, i) => <div key={r.id || i} className="qx-hint">{r.content || r.text || JSON.stringify(r)}</div>))}
        </div>
    );
}

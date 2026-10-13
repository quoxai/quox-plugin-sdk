/**
 * ${displayName}: Main View
 *
 * Card grid persisted in plugin storage (getQuox().storage). Storage is
 * per-org and server-side, so the list follows the user across browsers.
 * Every storage call is an RPC and can fail; failures show a banner.
 */

import { loadValue, saveValue } from '../lib/api';
import useLoad from '../lib/useLoad';
import { ErrorBanner, Page, Spinner } from '../lib/ui';
import EmptyState from '../components/EmptyState';
import { MOCK_ITEMS } from '../data/mock';

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    const stored = useLoad(() => loadValue('items', MOCK_ITEMS));
    const [items, setItems] = React.useState(null);
    const [saveError, setSaveError] = React.useState(null);

    React.useEffect(() => {
        if (stored.data) setItems(stored.data);
    }, [stored.data]);

    const persist = async (next) => {
        const previous = items;
        setItems(next);
        setSaveError(null);
        try {
            await saveValue('items', next);
        } catch (e) {
            setItems(previous);
            setSaveError(e);
        }
    };

    const addItem = () => persist([...(items || []), {
        id: Date.now().toString(36),
        title: 'New item',
        description: 'Edit this item in your own code',
        status: 'active',
        createdAt: new Date().toISOString(),
    }]);
    const removeItem = (id) => persist(items.filter(i => i.id !== id));

    return (
        <Page
            title="${displayName}"
            actions={<button className="qx-btn qx-btn--primary qx-btn--sm" onClick={addItem} disabled={!items}>Add item</button>}
        >
            <ErrorBanner error={stored.error} onRetry={stored.reload} title="Could not load items" />
            <ErrorBanner error={saveError} title="Could not save, change reverted" />

            {!items ? (stored.error ? null : <Spinner />) : items.length === 0 ? (
                <EmptyState message="No items yet" actionLabel="Add your first item" onAction={addItem} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {items.map(item => (
                        <div key={item.id} className="qx-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                                <h4 style={{ margin: '0 0 8px' }}>{item.title}</h4>
                                <button className="qx-btn qx-btn--ghost qx-btn--sm" onClick={() => removeItem(item.id)} aria-label={'Remove ' + item.title}>Remove</button>
                            </div>
                            <p style={{ margin: '0 0 8px' }}>{item.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={item.status === 'active' ? 'qx-pill qx-pill--online qx-pill--sm' : 'qx-pill qx-pill--ghost qx-pill--sm'}>{item.status}</span>
                                <span className="qx-hint qx-hint--sm">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Page>
    );
}

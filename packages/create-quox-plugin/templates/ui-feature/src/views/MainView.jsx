/**
 * ${displayName} — Main View
 * Card grid with storage persistence, add/remove, and empty state.
 */

const { React } = window.__quoxSharedDeps;
const { GlassPanel, GlassPill, COLORS, M, F } = window.__quoxGlass;
import { MOCK_ITEMS } from '../data/mock';
import EmptyState from '../components/EmptyState';

// pluginApi is passed as a prop by the plugin sandbox.
// Alternatively, use: const pluginApi = window.__quoxPluginApi?.['${pluginName}'];
export default function MainView({ pluginApi }) {
    const [items, setItems] = React.useState(() => {
        // Load from plugin storage if available
        if (pluginApi?.storage) {
            const saved = pluginApi.storage.get('items');
            if (saved) return saved;
        }
        return MOCK_ITEMS;
    });

    // Persist to storage on change
    React.useEffect(() => {
        if (pluginApi?.storage) {
            pluginApi.storage.set('items', items);
        }
    }, [items, pluginApi]);

    const addItem = () => {
        const id = Date.now().toString(36);
        setItems(prev => [...prev, {
            id,
            title: 'New Item',
            description: 'Click to edit this item',
            status: 'active',
            createdAt: new Date().toISOString(),
        }]);
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    if (items.length === 0) {
        return (
            <div style={{ padding: '2rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                    ${displayName}
                </h2>
                <EmptyState
                    message="No items yet"
                    actionLabel="Add your first item"
                    onAction={addItem}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                    ${displayName}
                </h2>
                <button
                    onClick={addItem}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(16,185,129,0.15)',
                        color: 'rgba(16,185,129,0.9)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                    }}
                >
                    + Add Item
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
            }}>
                {items.map(item => (
                    <GlassPanel key={item.id} style={{ padding: 16, position: 'relative' }}>
                        <button
                            onClick={() => removeItem(item.id)}
                            style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: COLORS.subtleText,
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: 0,
                            }}
                        >
                            ✕
                        </button>
                        <h4 style={{ color: COLORS.white, margin: '0 0 0.5rem' }}>
                            {item.title}
                        </h4>
                        <p style={{ color: COLORS.dimText, fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                            {item.description}
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <GlassPill color={item.status === 'active' ? '#10b981' : '#6b7280'}>
                                {item.status}
                            </GlassPill>
                            <span style={{ color: COLORS.subtleText, fontSize: '0.7rem' }}>
                                {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </GlassPanel>
                ))}
            </div>
        </div>
    );
}

/**
 * Small shared UI pieces. Styling comes from the qx-* classes in plugin.css
 * (the Quox design system), so the plugin matches the host without touching it.
 */

const { React } = window.__quoxSharedDeps;

/** Red banner for a failed RPC, with an optional Retry button. */
export function ErrorBanner({ error, onRetry, title = 'Something went wrong' }) {
    if (!error) return null;
    return (
        <div className="qx-banner qx-banner--error" role="alert" style={{ marginBottom: 16 }}>
            <span className="qx-banner__title">{title}</span>
            <span>{error.message || String(error)}</span>
            {onRetry && (
                <span className="qx-banner__actions">
                    <button className="qx-btn qx-btn--sm" onClick={onRetry}>Retry</button>
                </span>
            )}
        </div>
    );
}

/** Info banner, used for "this is sample data" notices. */
export function InfoBanner({ children }) {
    return <div className="qx-banner qx-banner--info" style={{ marginBottom: 16 }}>{children}</div>;
}

export function Spinner() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span className="qx-spinner qx-spinner--lg" aria-label="Loading" />
        </div>
    );
}

/** Page frame: title row + padding. */
export function Page({ title, actions, children, maxWidth = 1000 }) {
    return (
        <div style={{ padding: 24, maxWidth }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                {actions}
            </div>
            {children}
        </div>
    );
}

/** Empty state card. */
export function Empty({ title, body, children }) {
    return (
        <div className="qx-empty">
            <div className="qx-empty__title">{title}</div>
            {body && <div className="qx-empty__body">{body}</div>}
            {children}
        </div>
    );
}

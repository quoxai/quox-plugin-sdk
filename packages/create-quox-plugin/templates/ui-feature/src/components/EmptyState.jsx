/**
 * EmptyState: placeholder with a message and an optional call to action.
 */

const { React } = window.__quoxSharedDeps;

export default function EmptyState({ message, actionLabel, onAction }) {
    return (
        <div className="qx-empty">
            <div className="qx-empty__title">{message}</div>
            {actionLabel && onAction && (
                <button className="qx-btn qx-btn--primary" onClick={onAction}>{actionLabel}</button>
            )}
        </div>
    );
}

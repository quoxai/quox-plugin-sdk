/**
 * usePolling: call a function at a fixed interval, with cleanup on unmount.
 * The interval lives inside your plugin frame, so it only runs while the
 * plugin page is open. Anything that must run in the background belongs in
 * your plugin backend.
 */

const { React } = window.__quoxSharedDeps;

export default function usePolling(callback, intervalMs = 60000) {
    const saved = React.useRef(callback);
    saved.current = callback;

    React.useEffect(() => {
        const id = setInterval(() => saved.current(), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
}

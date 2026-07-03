/**
 * usePolling — Poll a function at a fixed interval with cleanup.
 */

const { React } = window.__quoxSharedDeps;

export default function usePolling(callback, intervalMs = 60000) {
    const savedCallback = React.useRef(callback);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        mountedRef.current = true;

        const tick = () => {
            if (mountedRef.current) {
                savedCallback.current();
            }
        };

        const id = setInterval(tick, intervalMs);

        return () => {
            mountedRef.current = false;
            clearInterval(id);
        };
    }, [intervalMs]);
}

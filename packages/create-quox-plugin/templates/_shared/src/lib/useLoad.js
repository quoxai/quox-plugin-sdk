/**
 * useLoad: run an async loader on mount (and on demand) and track the result.
 *
 *   const { data, error, loading, reload } = useLoad(() => api('/status'));
 *
 * `error` is an Error you should render (see LoadState in ./ui). A failed load
 * never leaves the view blank.
 */

const { React } = window.__quoxSharedDeps;

export default function useLoad(loader, deps = []) {
    const [state, setState] = React.useState({ data: null, error: null, loading: true });
    const alive = React.useRef(true);
    const loaderRef = React.useRef(loader);
    loaderRef.current = loader;

    const run = React.useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        try {
            const data = await loaderRef.current();
            if (alive.current) setState({ data, error: null, loading: false });
        } catch (error) {
            if (alive.current) setState(s => ({ data: s.data, error, loading: false }));
        }
    }, []);

    React.useEffect(() => {
        alive.current = true;
        run();
        return () => { alive.current = false; };
    }, deps);

    return { ...state, reload: run };
}

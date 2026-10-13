/**
 * useConfig: settings kept in plugin storage (per-org, server-side), with
 * optional secret fields that are sent to YOUR backend instead of being stored
 * in the browser-visible storage.
 *
 *   const cfg = useConfig('config', DEFAULTS, { secretKeys: ['apiKey'], remotePath: '/config' });
 *
 * Secrets are never written to plugin storage and never read back: the form
 * shows them empty and a saved secret is simply replaced when you type a new one.
 */

import { api, loadValue, saveValue, toast } from './api';

const { React } = window.__quoxSharedDeps;

export default function useConfig(storageKey, defaults, { secretKeys = [], remotePath } = {}) {
    const [config, setConfig] = React.useState(defaults);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        let alive = true;
        loadValue(storageKey, null)
            .then(saved => { if (alive && saved) setConfig({ ...defaults, ...saved }); })
            .catch(e => { if (alive) setError(e); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [storageKey]);

    const save = React.useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const plain = {};
            const secrets = {};
            for (const [k, v] of Object.entries(config)) {
                if (secretKeys.includes(k)) secrets[k] = v; else plain[k] = v;
            }
            await saveValue(storageKey, plain);
            if (remotePath && Object.values(secrets).some(Boolean)) {
                await api(remotePath, { method: 'POST', body: secrets });
            }
            toast('Settings saved', 'success');
        } catch (e) {
            setError(e);
            toast('Could not save settings', 'error');
        } finally {
            setSaving(false);
        }
    }, [config, storageKey]);

    return { config, setConfig, save, loading, saving, error };
}

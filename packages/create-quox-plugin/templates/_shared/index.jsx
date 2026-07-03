/**
 * ${displayName} — QuoxCORE Plugin Entry Point
 */

const { React } = window.__quoxSharedDeps;
import MainView from './views/MainView';${settingsImport}

window.__quoxPluginRegister('${pluginName}', {
    routes: {
        '/plugins/${pluginName}': MainView,${settingsRoute}
    },
    sidebar: [
        { path: '/plugins/${pluginName}', label: '${displayName}', icon: 'puzzle' },
    ],
    hooks: {
        onActivate() {
            console.log('[${displayName}] Activated');
        },
        onDeactivate() {
            console.log('[${displayName}] Deactivated');
        },
    },
});

/**
 * ${displayName}: QuoxCORE community plugin entry point.
 *
 * Community plugins run inside a sandboxed frame. registerPlugin hands your
 * route components to the host; everything else (storage, backend calls,
 * memory, notifications) goes through getQuox() from @quoxai/quox-plugin-sdk.
 */

import { registerPlugin } from '@quoxai/quox-plugin-sdk';
import MainView from './views/MainView';${settingsImport}

registerPlugin('${pluginName}', {
    routes: {
        '/plugins/${pluginName}': MainView,${settingsRoute}
    },
    sidebar: [
        { path: '/plugins/${pluginName}', label: '${displayName}', icon: 'puzzle' },
    ],
});

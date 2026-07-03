/**
 * Pure, dependency-free helpers that translate a plugin's manifest.json plus
 * whatever it passed to window.__quoxPluginRegister(pluginId, exports) into
 * the shape the dev-host frame needs to render (rail items + routed views).
 *
 * Deliberately has ZERO imports (not even react) so it can be unit-tested
 * in plain Node without react/react-dom/react-router-dom installed — those
 * only need to resolve in a consuming plugin project's node_modules, not in
 * this monorepo. client.js imports this module and adds the React glue.
 */

/**
 * @param {{manifest?: object, pluginId?: string, exports?: object}} input
 * @returns {{
 *   ok: boolean,
 *   reason: null | 'not-registered' | 'no-routes',
 *   pluginId: string|null,
 *   pluginName: string,
 *   sidebar: Array<{path: string, label?: string, icon?: string}>,
 *   routes: Array<{path: string, Component: any}>,
 *   homePath: string|null,
 * }}
 */
export function buildFrameModel(input = {}) {
    const { manifest = {}, pluginId, exports } = input;
    const pluginName = manifest.name || pluginId || manifest.id || 'Plugin';
    const resolvedPluginId = pluginId || manifest.id || null;

    if (!exports || typeof exports !== 'object') {
        return {
            ok: false,
            reason: 'not-registered',
            pluginId: resolvedPluginId,
            pluginName,
            sidebar: [],
            routes: [],
            homePath: null,
        };
    }

    const sidebar = Array.isArray(exports.sidebar) && exports.sidebar.length
        ? exports.sidebar
        : Array.isArray(manifest.sidebar) ? manifest.sidebar : [];

    const routesSource = exports.routes && typeof exports.routes === 'object' ? exports.routes : {};
    const routes = Object.keys(routesSource).map((routePath) => ({
        path: routePath,
        Component: routesSource[routePath],
    }));

    const homePath = (sidebar[0] && sidebar[0].path) || (routes[0] && routes[0].path) || null;

    return {
        ok: true,
        reason: routes.length ? null : 'no-routes',
        pluginId: resolvedPluginId,
        pluginName,
        sidebar,
        routes,
        homePath,
    };
}

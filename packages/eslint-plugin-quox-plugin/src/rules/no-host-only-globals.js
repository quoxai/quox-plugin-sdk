/**
 * no-host-only-globals
 *
 * Community plugins run in a sandboxed iframe (opaque origin, CSP
 * connect-src 'none'). These things do not work there:
 *   - window.__quoxGlass and the throwing __quoxSharedDeps stubs
 *     (CapabilityPanels, WorkspaceContext, AuthContext, LicenseValidator,
 *     ServerSyncQueue, OrgScopedStorage)
 *   - direct fetch(), XMLHttpRequest, WebSocket, EventSource (blocked by CSP)
 *
 * Use window.quox.fetch (relative path into the plugin's own namespace) and
 * your own plugin.css instead.
 */
const STUBBED_DEPS = new Set([
    'CapabilityPanels', 'WorkspaceContext', 'AuthContext',
    'LicenseValidator', 'ServerSyncQueue', 'OrgScopedStorage',
]);
const BLOCKED_CONSTRUCTORS = new Set(['XMLHttpRequest', 'WebSocket', 'EventSource']);
const WINDOW_NAMES = new Set(['window', 'globalThis', 'self']);

function propName(node) {
    if (!node || node.type !== 'MemberExpression') return null;
    if (!node.computed && node.property?.type === 'Identifier') return node.property.name;
    if (node.computed && node.property?.type === 'Literal' && typeof node.property.value === 'string') return node.property.value;
    return null;
}

function isWindowish(node) {
    return node?.type === 'Identifier' && WINDOW_NAMES.has(node.name);
}

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow host-only globals and direct network APIs that do not exist in the Quox plugin sandbox',
            recommended: true,
        },
        messages: {
            glass: 'window.__quoxGlass does not exist in the community sandbox (it is a throwing stub). Build your UI with React and put styles in plugin.css.',
            stub: '__quoxSharedDeps.{{name}} is a throwing stub in the community sandbox. Use window.quox (getQuox()) for user, storage and navigation.',
            network: '{{name}} is blocked in the sandbox (CSP connect-src none). Use window.quox.fetch(path), which is relative to your plugin namespace.',
        },
        schema: [],
    },

    create(context) {
        function checkMember(node) {
            const name = propName(node);
            if (!name) return;
            if (name === '__quoxGlass' && isWindowish(node.object)) {
                context.report({ node, messageId: 'glass' });
                return;
            }
            if (STUBBED_DEPS.has(name)) {
                const obj = node.object;
                const objName = propName(obj);
                const direct = obj?.type === 'Identifier' && obj.name === '__quoxSharedDeps';
                if (direct || objName === '__quoxSharedDeps') {
                    context.report({ node, messageId: 'stub', data: { name } });
                }
            }
        }

        return {
            MemberExpression: checkMember,

            // const { CapabilityPanels } = window.__quoxSharedDeps
            VariableDeclarator(node) {
                if (node.id?.type !== 'ObjectPattern' || !node.init) return;
                const isDeps = (node.init.type === 'Identifier' && node.init.name === '__quoxSharedDeps')
                    || (node.init.type === 'MemberExpression' && propName(node.init) === '__quoxSharedDeps');
                if (!isDeps) return;
                for (const p of node.id.properties) {
                    const key = p.type === 'Property' && !p.computed ? (p.key.name ?? p.key.value) : null;
                    if (STUBBED_DEPS.has(key)) {
                        context.report({ node: p, messageId: 'stub', data: { name: key } });
                    }
                }
            },

            CallExpression(node) {
                const c = node.callee;
                if (c.type === 'Identifier' && c.name === 'fetch') {
                    context.report({ node, messageId: 'network', data: { name: 'fetch()' } });
                } else if (c.type === 'MemberExpression' && isWindowish(c.object) && propName(c) === 'fetch') {
                    context.report({ node, messageId: 'network', data: { name: 'fetch()' } });
                }
            },

            NewExpression(node) {
                const c = node.callee;
                let name = null;
                if (c.type === 'Identifier') name = c.name;
                else if (c.type === 'MemberExpression' && isWindowish(c.object)) name = propName(c);
                if (name && BLOCKED_CONSTRUCTORS.has(name)) {
                    context.report({ node, messageId: 'network', data: { name } });
                }
            },
        };
    },
};

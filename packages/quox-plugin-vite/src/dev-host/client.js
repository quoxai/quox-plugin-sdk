/**
 * quox-dev-host client.
 *
 * Injected into the page HEAD (see transformIndexHtml / the default-html
 * middleware in ../index.js) so it executes BEFORE the plugin's own entry
 * module — both are `type="module"` scripts, which the HTML spec runs in
 * document order after parsing, so a head module always finishes evaluating
 * before a later body module starts. That ordering guarantee is what makes
 * window.__quoxPluginRegister etc. exist by the time the plugin entry runs.
 *
 * Plain JS, React.createElement only — no JSX means no extra transform
 * config is needed to serve this file raw from the vite plugin package.
 *
 * Escape hatches:
 *   - ?bare=1 in the URL: skip installing globals AND skip mounting the
 *     frame entirely (lets a plugin's own standalone/no-host dev fallback,
 *     if it has one, run untouched).
 *   - plugin option `devHost: false`: this file is never injected at all
 *     (see ../index.js) — nothing to opt out of client-side in that case.
 */
import { buildFrameModel } from './frame-model.js';
// Frame chrome geometry + qx token aliases. Resolves because this module is
// served through Vite's /@fs pipeline (see the virtual bootstrap module in
// ../index.js).
import './dev-host.css';

// React & co. are INJECTED via installDevHost() by the virtual bootstrap
// module (virtual:quox-dev-host) — this file lives outside the plugin
// project's root, so bare `react` imports here would resolve against the SDK
// repo (404, or worse a second React instance that breaks hooks). Virtual
// modules resolve bare imports from the project root; real /@fs modules
// don't. All component functions below only run after installDevHost().
let React, ReactDOM, ReactRouterDOM, h;

const COLORS = { purple: '#a855f7', cyan: '#38bdf8', green: '#30ff90', amber: '#f59e0b', red: '#ef4444', white: '#fff' };
const STATUS_COLORS = { compliant: '#30ff90', partial: '#f59e0b', 'non-compliant': '#ef4444' };
const PROTOCOL_COLORS = { AEE: '#38bdf8', AOCL: '#a855f7', VOLT: '#30ff90', WARD: '#06b6d4' };
const M = "'JetBrains Mono',monospace";
const F = "'Inter',sans-serif";

// ─────────────────────────────────────────────────────────────────────────
// Functional dev components (window.__quoxGlass)
// ─────────────────────────────────────────────────────────────────────────

function GlassPanel({ title, className = '', children, ...rest }) {
    return h('div', { className: `quox-dev-host__panel qx-card ${className}`.trim(), ...rest },
        title ? h('div', { className: 'quox-dev-host__panel-title' }, title) : null,
        children,
    );
}

function GlassPill({ children, tone, className = '', ...rest }) {
    const toneClass = tone ? `qx-pill--${tone}` : '';
    return h('span', { className: `qx-pill ${toneClass} ${className}`.trim(), ...rest }, children);
}

function GlassTabBar({ tabs = [], active, onChange, className = '' }) {
    const normalized = tabs.map((tab) => (typeof tab === 'string' ? { id: tab, label: tab } : tab));
    return h('div', { className: `qx-tabs ${className}`.trim(), role: 'tablist' },
        normalized.map((tab) => h('button', {
            key: tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab.id === active,
            className: `qx-tab${tab.id === active ? ' qx-tab--active' : ''}`,
            onClick: () => onChange && onChange(tab.id),
        }, tab.label ?? tab.id)),
    );
}

function SectionHeader({ title, subtitle, actions, className = '' }) {
    return h('div', { className: `quox-dev-host__section-header qx-section-title ${className}`.trim() },
        h('span', null, title),
        subtitle ? h('span', { className: 'quox-dev-host__section-subtitle' }, subtitle) : null,
        actions ? h('div', { className: 'quox-dev-host__section-actions' }, actions) : null,
    );
}

function ProgressRing({ value = 0, size = 40, color = COLORS.cyan }) {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, value));
    const offset = circumference * (1 - clamped / 100);
    return h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, className: 'quox-dev-host__ring' },
        h('circle', { cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 4 }),
        h('circle', {
            cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: color, strokeWidth: 4,
            strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: 'round',
            transform: `rotate(-90 ${size / 2} ${size / 2})`,
        }),
    );
}

function Sparkline({ data = [], width = 80, height = 24, color = COLORS.cyan }) {
    if (!data.length) return h('svg', { width, height });
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
    return h('svg', { width, height, className: 'quox-dev-host__spark' },
        h('polyline', { points, fill: 'none', stroke: color, strokeWidth: 1.5 }),
    );
}

function GlassSkeleton({ lines = 1, className = '' }) {
    const count = Math.max(1, lines);
    return h('div', { className: `quox-dev-host__skeleton-stack ${className}`.trim() },
        Array.from({ length: count }, (_, i) => h('div', { key: i, className: 'qx-skeleton qx-skeleton--line-md' })),
    );
}

function GlassError({ message = 'Something went wrong.', onRetry, className = '' }) {
    return h('div', { className: `quox-dev-host__error ${className}`.trim() },
        h('span', null, message),
        onRetry ? h('button', { type: 'button', onClick: onRetry }, 'Retry') : null,
    );
}

function MarkdownContent({ content = '', className = '' }) {
    return h('div', { className: `quox-dev-host__markdown ${className}`.trim(), style: { whiteSpace: 'pre-wrap' } }, content);
}

// Honest placeholder — shared body for both AgentChatPanel and
// AgentChatSidebar. Real agent chat only runs inside QuoxCORE; this dev
// preview just proves out layout/prop-plumbing.
function renderAgentChatBody({ agentId, agentName = 'Agent', agentColor = COLORS.purple, collapsed = false, onToggle, width = 300, headerContent, className = '' }) {
    if (collapsed) {
        return h('div', { className: `quox-dev-host__agent-chat quox-dev-host__agent-chat--collapsed ${className}`.trim(), style: { width: 48 } },
            h('button', { type: 'button', className: 'quox-dev-host__agent-chat-toggle', onClick: onToggle, title: 'Expand agent chat' }, '«'),
        );
    }
    return h('div', { className: `quox-dev-host__agent-chat ${className}`.trim(), style: { width } },
        h('div', { className: 'quox-dev-host__agent-chat-header' },
            h('span', { className: 'quox-dev-host__agent-chat-dot', style: { background: agentColor } }),
            h('span', { className: 'quox-dev-host__agent-chat-name' }, agentName),
            headerContent || null,
            onToggle ? h('button', { type: 'button', className: 'quox-dev-host__agent-chat-toggle', onClick: onToggle, title: 'Collapse agent chat' }, '»') : null,
        ),
        h('div', { className: 'quox-dev-host__agent-chat-roster' },
            h('div', { className: 'quox-dev-host__agent-chat-roster-item' }, `${agentName} (${agentId || 'unknown-agent'})`),
        ),
        h('div', { className: 'quox-dev-host__agent-chat-body' },
            h('div', { className: 'quox-dev-host__agent-chat-placeholder' }, 'Dev preview — live agent runs inside QuoxCORE'),
        ),
        h('div', { className: 'quox-dev-host__agent-chat-input-strip' },
            h('input', { type: 'text', disabled: true, placeholder: 'Dev preview — live agent runs inside QuoxCORE' }),
        ),
    );
}

function AgentChatPanel(props) {
    return renderAgentChatBody(props);
}

function AgentChatSidebar(props) {
    return h('aside', { className: 'quox-dev-host__agent-chat-sidebar' }, renderAgentChatBody(props));
}

function buildGlassMocks() {
    return {
        AgentChatSidebar,
        AgentChatPanel,
        GlassPanel,
        GlassPill,
        GlassTabBar,
        SectionHeader,
        ProgressRing,
        Sparkline,
        GlassSkeleton,
        GlassError,
        MarkdownContent,
        COLORS,
        STATUS_COLORS,
        PROTOCOL_COLORS,
        M,
        F,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// window.__quoxPluginApi mock — client-side reimplementation of
// quox-plugin-sdk's testing.js createMockPluginApi semantics (ESM, no
// require()).
// ─────────────────────────────────────────────────────────────────────────

function createDevPluginApi(pluginId = 'dev-plugin') {
    const cacheStore = new Map();
    const durableStore = new Map();
    const secretsStore = new Map();

    function durableKey(scope, key) { return `${scope}:${key}`; }

    const cache = {
        get(key) { return cacheStore.get(key) ?? null; },
        set(key, value) { cacheStore.set(key, value); },
        remove(key) { cacheStore.delete(key); },
        keys() { return [...cacheStore.keys()]; },
    };

    console.info('[quox-dev-host] mock pluginApi active');

    return {
        pluginId,
        cache,
        storage: cache, // deprecated alias, kept for parity with real API
        durable: {
            async get(key, opts = {}) {
                return durableStore.get(durableKey(opts.scope || 'org', key)) ?? null;
            },
            async set(key, value, opts = {}) {
                durableStore.set(durableKey(opts.scope || 'org', key), value);
            },
            async remove(key, opts = {}) {
                durableStore.delete(durableKey(opts.scope || 'org', key));
            },
            async keys(opts = {}) {
                const prefix = `${opts.scope || 'org'}:`;
                return [...durableStore.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
            },
        },
        secrets: {
            async list() { return [...secretsStore.keys()]; },
            async get(name) { return secretsStore.has(name) ? secretsStore.get(name) : null; },
            async set(name, value) { secretsStore.set(name, value); },
            async remove(name) { secretsStore.delete(name); },
        },
        config: {
            get() { return {}; },
            save() {},
        },
        async fetch() { return new Response('{}', { status: 200 }); },
        notify() {},
        memory: {
            async save() { return { success: true }; },
            async search() { return { results: [] }; },
        },
        aee: {
            async emit() { return { success: true }; },
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Router shim — used when the plugin project does not install
// react-router-dom (it's a host-provided dep; plugins that never import it
// won't have it in node_modules — star-alignment hand-rolls hash routing).
// Covers exactly the API surface the frame uses: HashRouter, Routes, Route,
// Navigate, NavLink. Deliberately looser than the real router: a hash the
// frame doesn't recognise (e.g. the plugin's OWN internal hash routing,
// '#overview') keeps the last matched frame route mounted instead of
// unmounting the plugin.
// ─────────────────────────────────────────────────────────────────────────

function buildRouterShim() {
    function readHashPath() {
        return (typeof window !== 'undefined' && window.location.hash.slice(1)) || '/';
    }
    function useHashPath() {
        const [path, setPath] = React.useState(readHashPath);
        React.useEffect(() => {
            const onChange = () => setPath(readHashPath());
            window.addEventListener('hashchange', onChange);
            return () => window.removeEventListener('hashchange', onChange);
        }, []);
        return path;
    }
    const HashRouter = ({ children }) => h(React.Fragment, null, children);
    const Route = () => null; // config carrier — read by Routes, never rendered
    function Routes({ children }) {
        const current = useHashPath();
        const lastMatch = React.useRef(null);
        const list = (Array.isArray(children) ? children : [children]).filter(Boolean);
        for (const child of list) {
            const p = child && child.props ? child.props.path : undefined;
            if (p === current) {
                lastMatch.current = child.props.element ?? null;
                return lastMatch.current;
            }
        }
        if (lastMatch.current) return lastMatch.current; // unknown hash: hold
        const home = list.find((c) => c && c.props && c.props.path === '/');
        return home ? (home.props.element ?? null) : null;
    }
    function Navigate({ to, replace }) {
        React.useEffect(() => {
            if (replace) window.location.replace(`#${to}`);
            else window.location.hash = to;
        }, [to, replace]);
        return null;
    }
    function NavLink({ to, className, children }) {
        const current = useHashPath();
        const isActive = current === to;
        const cls = typeof className === 'function' ? className({ isActive }) : className;
        const kids = typeof children === 'function' ? children({ isActive }) : children;
        return h('a', { href: `#${to}`, className: cls }, kids);
    }
    return { HashRouter, Routes, Route, Navigate, NavLink, __shim: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Host frame — mounted on window 'load', after the plugin entry has had a
// chance to call window.__quoxPluginRegister.
// ─────────────────────────────────────────────────────────────────────────

function RailIcon({ label, active }) {
    const glyph = (label || '?').trim().charAt(0).toUpperCase() || '?';
    return h('div', { className: `quox-dev-host__rail-glyph${active ? ' quox-dev-host__rail-glyph--active' : ''}` }, glyph);
}

function Rail({ model }) {
    const { NavLink } = ReactRouterDOM;
    return h('nav', { className: 'quox-dev-host__rail' },
        model.sidebar.map((item) => h(NavLink, {
            key: item.path,
            to: item.path,
            className: ({ isActive }) => `quox-dev-host__rail-item${isActive ? ' quox-dev-host__rail-item--active' : ''}`,
        }, ({ isActive }) => [
            h(RailIcon, { key: 'icon', label: item.icon || item.label, active: isActive }),
            h('span', { key: 'label', className: 'quox-dev-host__rail-label' }, item.label || item.path),
        ])),
        h('div', { className: 'quox-dev-host__rail-badge' }, 'DEV'),
    );
}

function Header({ model }) {
    return h('header', { className: 'quox-dev-host__header' },
        h('span', { className: 'quox-dev-host__header-brand' }, 'QuoxCORE · dev preview'),
        h('span', { className: 'quox-dev-host__header-plugin' }, model.pluginName),
    );
}

function Diagnostic({ model }) {
    return h('div', { className: 'quox-dev-host__diagnostic' },
        h('h1', null, 'quox-dev-host: no plugin registered'),
        h('p', null, 'window.__quoxPluginRegister was installed before your entry module ran, but nothing called it by the time the page finished loading.'),
        h('p', null, 'Check that your entry module (e.g. src/index.jsx) calls:'),
        h('pre', null, "window.__quoxPluginRegister(pluginId, { routes, sidebar, hooks })"),
        model.pluginId ? h('p', null, `Expected plugin id (from manifest.json): ${model.pluginId}`) : null,
    );
}

function DevHostFrame({ model }) {
    if (!model.ok) {
        return h(Diagnostic, { model });
    }

    const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM;

    return h(HashRouter, null,
        h('div', { className: 'quox-dev-host' },
            h(Rail, { model }),
            h('div', { className: 'quox-dev-host__main' },
                h(Header, { model }),
                h('div', { className: 'quox-dev-host__content' },
                    h(Routes, null, [
                        ...model.routes.map(({ path, Component }) => h(Route, { key: path, path, element: h(Component) })),
                        model.homePath ? h(Route, { key: '__home', path: '/', element: h(Navigate, { to: model.homePath, replace: true }) }) : null,
                    ]),
                ),
            ),
        ),
    );
}

function mountFrame() {
    const pluginId = window.__quoxDevRegisteredPluginId || null;
    const registered = window.__quoxRegisteredPlugins || {};
    const exports = pluginId ? registered[pluginId] : undefined;
    const manifest = window.__quoxDevManifest || {};

    let rootEl = document.getElementById('root');
    if (!rootEl) {
        rootEl = document.createElement('div');
        rootEl.id = 'root';
        document.body.appendChild(rootEl);
    }

    const model = buildFrameModel({ manifest, pluginId: pluginId || manifest.id, exports });
    ReactDOM.createRoot(rootEl).render(h(DevHostFrame, { model }));
}

function installGlobals() {
    window.__quoxSharedDeps = { React, ReactDOM, ReactRouterDOM };
    window.__quoxGlass = buildGlassMocks();
    window.__quoxPluginApi = createDevPluginApi();
    window.__quoxRegisteredPlugins = window.__quoxRegisteredPlugins || {};
    window.__quoxPluginRegister = (pluginId, exports) => {
        window.__quoxRegisteredPlugins[pluginId] = exports;
        window.__quoxDevRegisteredPluginId = pluginId;
    };
}

function isBareMode() {
    return typeof window !== 'undefined'
        && typeof window.location !== 'undefined'
        && new URLSearchParams(window.location.search).get('bare') === '1';
}

/**
 * Entry point, called by the virtual bootstrap module (virtual:quox-dev-host)
 * with the plugin project's own React/ReactDOM/ReactRouterDOM instances.
 * Runs synchronously in a head module, i.e. BEFORE the plugin's body entry
 * module evaluates — that ordering is what makes window.__quoxPluginRegister
 * exist by the time the plugin registers.
 */
export function installDevHost(deps) {
    if (typeof window === 'undefined' || isBareMode()) return;
    React = deps.React;
    ReactDOM = deps.ReactDOM;
    h = React.createElement;
    // Falls back to the hash-router shim when the project doesn't install
    // react-router-dom (the bootstrap passes null in that case).
    ReactRouterDOM = deps.ReactRouterDOM || buildRouterShim();
    installGlobals();
    window.addEventListener('load', mountFrame);
}

export { buildFrameModel, buildGlassMocks, createDevPluginApi, DevHostFrame };

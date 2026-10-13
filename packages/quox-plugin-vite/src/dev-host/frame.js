/**
 * Sandbox frame document for the dev preview.
 *
 * FAITHFUL COPY of the host's frame builder so the preview behaves like the
 * real community-plugin sandbox.
 *   Source: src/services/pluginFrameHost.js (FRAME_SANDBOX, FRAME_CSP,
 *           buildFrameSrcdoc)
 *   Repo:   quox-dashboard, origin/main @ 17684609a4fba813966445926541e4390e16fda2
 * Changes from the host: CommonJS exports, and the frame-deps IIFE is passed in
 * as `frameDepsCode` (the host inlines its own build-time bundle).
 * Never add allow-same-origin to FRAME_SANDBOX: it defeats the boundary.
 */

const FRAME_SANDBOX = 'allow-scripts';

const FRAME_CSP = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
].join('; ');

const RPC_MARK = '__quoxPluginFrame';

function buildFrameSrcdoc({ pluginId, channel, bundleCode, cssCode = "", frameDepsCode = "" }) {
    // The bootstrap shim: exposes window.quox (the mediated SDK) and
    // window.__quoxPluginRegister to the plugin, both talking ONLY via postMessage.
    // No host object, function, or credential is ever passed into the frame.
    const shim = `
(function () {
  var CH = ${JSON.stringify(channel)};
  var MARK = ${JSON.stringify(RPC_MARK)};
  var seq = 0;
  var pending = {};
  function send(kind, body) {
    parent.postMessage(Object.assign({ __quoxPluginFrame: 1, channel: CH, kind: kind }, body), '*');
  }
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      var id = 'c' + (++seq);
      pending[id] = { resolve: resolve, reject: reject };
      send('call', { id: id, method: method, args: args });
    });
  }
  window.addEventListener('message', function (e) {
    // Only accept messages from the host (the frame's parent) on our channel.
    if (e.source !== parent) return;
    var d = e.data;
    if (!d || d[MARK] !== 1 || d.channel !== CH) return;
    if (d.kind === 'result') {
      var p = pending[d.id];
      if (!p) return;
      delete pending[d.id];
      if (d.ok) p.resolve(d.value); else p.reject(new Error(d.error || 'plugin RPC error'));
    } else if (d.kind === 'event') {
      // Host -> frame navigation: DATA ONLY (a path string). Drives the legacy bridge.
      if (d.method === 'route' && d.args && typeof d.args.path === 'string') mountLegacyRoute(d.args.path);
      if (typeof window.__quoxPluginOnEvent === 'function') {
        try { window.__quoxPluginOnEvent(d.method, d.args); } catch (err) { /* plugin handler threw */ }
      }
    }
  });
  // The mediated SDK. Every method is an RPC — the plugin has no direct fetch/DOM/creds.
  var api = {
    pluginId: ${JSON.stringify(pluginId)},
    storage: {
      get: function (k) { return call('storage.get', { key: k }); },
      set: function (k, v) { return call('storage.set', { key: k, value: v }); },
      remove: function (k) { return call('storage.remove', { key: k }); },
      keys: function () { return call('storage.keys', {}); },
      getAll: function () { return call('storage.getAll', {}); },
    },
    fetch: function (path, options) { return call('fetch', { path: path, options: options || {} }); },
    memory: {
      save: function (entry) { return call('memory.save', { entry: entry }); },
      search: function (q, limit) { return call('memory.search', { query: q, limit: limit || 10 }); },
    },
    aee: { emit: function (intent, payload) { return call('aee.emit', { intent: intent, payload: payload }); } },
    navigate: function (p) { return call('navigate', { path: p }); },
    notify: function (m, t) { return call('notify', { message: m, type: t || 'info' }); },
    getUser: function () { return call('getUser', {}); },
    onEvent: function (fn) { window.__quoxPluginOnEvent = fn; },
  };
  window.quox = api;
  window.usePluginApi = function () { return api; };
  // Registration: the plugin declares its serialisable surfaces. React components do
  // NOT cross the boundary — the plugin renders its own UI into #plugin-root.
  // LEGACY BRIDGE (GRIPE-701). Pre-isolation bundles call
  // __quoxPluginRegister(pluginId, { routes: { path: Component }, sidebar }). The
  // components stay IN this frame; only route paths + plain-string nav entries are
  // sent to the host, which later sends a 'route' event (a path string) to pick which
  // component to mount into #plugin-root.
  var legacyRoutes = null;
  var legacyRoot = null;
  var legacyPath = null;
  function plainNav(items) {
    var out = [];
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || typeof it.path !== 'string') return;
      var n = { path: it.path };
      ['label', 'icon', 'section', 'title'].forEach(function (k) { if (typeof it[k] === 'string') n[k] = it[k]; });
      out.push(n);
    });
    return out;
  }
  function mountLegacyRoute(path) {
    if (!legacyRoutes) return;
    var Comp = legacyRoutes[path];
    if (!Comp) return;
    var deps = window.__quoxSharedDeps || {};
    var R = deps.React, RD = deps.ReactDOM;
    var host = document.getElementById('plugin-root');
    if (!R || !RD || !RD.createRoot || !host) return;
    legacyPath = path;
    if (!legacyRoot) legacyRoot = RD.createRoot(host);
    var Boundary = (function (Base) {
      function B(props) { Base.call(this, props); this.state = { err: null }; }
      B.prototype = Object.create(Base.prototype);
      B.prototype.constructor = B;
      B.getDerivedStateFromError = function (err) { return { err: err }; };
      B.prototype.render = function () {
        if (this.state.err) {
          return R.createElement('pre', { style: { color: '#ff8a8a', whiteSpace: 'pre-wrap', padding: '1rem' } },
            'Plugin error: ' + String(this.state.err && this.state.err.message || this.state.err));
        }
        return this.props.children;
      };
      return B;
    })(R.Component);
    var el = R.createElement(Comp, {});
    var RR = deps.ReactRouterDOM;
    if (RR && RR.MemoryRouter) el = R.createElement(RR.MemoryRouter, { initialEntries: [path] }, el);
    // key forces a clean remount when the route changes.
    legacyRoot.render(R.createElement(Boundary, { key: path }, el));
  }
  window.__quoxPluginRegister = function (a, b) {
    if (typeof a === 'string' && b && typeof b === 'object') {
      var routes = b.routes && typeof b.routes === 'object' ? b.routes : {};
      legacyRoutes = routes;
      var paths = Object.keys(routes);
      send('register', { surfaces: {
        routes: paths.map(function (p) { return { path: p }; }),
        nav: plainNav(b.sidebar),
        panels: [],
        agent: null,
      } });
      if (paths.length) mountLegacyRoute(paths[0]);
      return;
    }
    var reg = a || {};
    send('register', { surfaces: {
      routes: reg.routes || [],
      nav: reg.nav || [],
      panels: reg.panels || [],
      agent: reg.agent || reg.agentDefinition || null,
    } });
  };
  send('boot', {});
})();
`;
    // NB: cssCode/bundleCode are attacker-influenced. They can only ever run INSIDE this
    // opaque-origin, network-less frame, so string interpolation here does not create a
    // host-side injection surface — the blast radius is the sandbox itself, by design.
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">
<style>html,body{margin:0;padding:0;background:transparent;color:#fff;font-family:system-ui,sans-serif}</style>
<style data-plugin-css="${pluginId}">${cssCode || ''}</style>
</head>
<body>
<div id="plugin-root" data-plugin-root="${pluginId}"></div>
<script>${frameDepsCode}</script>
<script>${shim}</script>
<script type="module">${bundleCode}</script>
</body>
</html>`;
}

module.exports = { FRAME_SANDBOX, FRAME_CSP, RPC_MARK, buildFrameSrcdoc };

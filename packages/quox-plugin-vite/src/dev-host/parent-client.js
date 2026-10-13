/*
 * quox-plugin-vite dev preview: PARENT page script (classic script, no imports).
 *
 * The plugin itself runs in an iframe sandboxed exactly like the QuoxCORE
 * community-plugin sandbox (sandbox="allow-scripts", CSP connect-src 'none').
 * This page plays the host: it validates frame messages (source + channel),
 * forwards window.quox calls to the dev server's in-memory mock, and shows
 * toasts / a call log. Plugin hot reload = the dev server rebuilds the bundle
 * and this page re-creates the frame (no HMR state preservation).
 */
(function () {
    var MARK = '__quoxPluginFrame';
    var stage = document.getElementById('stage');
    var routesEl = document.getElementById('routes');
    var logEl = document.getElementById('log');
    var banner = document.getElementById('banner');
    var toasts = document.getElementById('toasts');
    var titleEl = document.getElementById('title');

    var meta = {};
    var iframe = null;
    var channel = null;
    var currentRoute = null;
    var routeList = [];
    var navLabels = {};

    function mintChannel() {
        var a = new Uint8Array(16);
        crypto.getRandomValues(a);
        return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function log(line) {
        var d = document.createElement('div');
        d.textContent = new Date().toLocaleTimeString() + '  ' + line;
        logEl.prepend(d);
        while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild);
    }

    function toast(message, type) {
        var t = document.createElement('div');
        t.className = 'toast toast-' + (type || 'info');
        t.textContent = String(message);
        toasts.appendChild(t);
        setTimeout(function () { t.remove(); }, 4000);
    }

    function showBanner(text) {
        banner.textContent = text || '';
        banner.hidden = !text;
    }

    function renderRoutes() {
        routesEl.textContent = '';
        routeList.forEach(function (p) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'route' + (p === currentRoute ? ' active' : '');
            b.textContent = navLabels[p] || p;
            b.title = p;
            b.onclick = function () { goTo(p); };
            routesEl.appendChild(b);
        });
    }

    function postToFrame(msg) {
        if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(msg, '*');
    }

    function goTo(path) {
        currentRoute = path;
        postToFrame({ __quoxPluginFrame: 1, channel: channel, kind: 'event', method: 'route', args: { path: path } });
        renderRoutes();
    }

    function isFromFrame(e) {
        if (!iframe || e.source !== iframe.contentWindow) return false;
        var d = e.data;
        return !!d && typeof d === 'object' && d[MARK] === 1 && d.channel === channel;
    }

    function summarize(v) {
        var s;
        try { s = JSON.stringify(v); } catch (err) { s = String(v); }
        return s && s.length > 120 ? s.slice(0, 117) + '...' : s;
    }

    async function onCall(d) {
        var reply = { __quoxPluginFrame: 1, channel: channel, kind: 'result', id: d.id };
        try {
            var res = await fetch('/__quox-dev/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: d.method, args: d.args }),
            });
            var body = await res.json();
            if (!body.ok) throw new Error(body.error || 'rpc error');
            reply.ok = true;
            reply.value = body.value;
            log(d.method + ' ' + summarize(d.args) + ' -> ' + summarize(body.value));
            if (d.method === 'notify' && d.args) toast(d.args.message, d.args.type);
            if (d.method === 'navigate' && d.args && routeList.indexOf(d.args.path) !== -1) goTo(d.args.path);
        } catch (err) {
            reply.ok = false;
            reply.error = String((err && err.message) || err);
            log(d.method + ' ' + summarize(d.args) + ' !! ' + reply.error);
        }
        postToFrame(reply);
    }

    window.addEventListener('message', function (e) {
        if (!isFromFrame(e)) return;
        var d = e.data;
        if (d.kind === 'call') { onCall(d); return; }
        if (d.kind === 'register') {
            var s = d.surfaces || {};
            routeList = (s.routes || []).map(function (r) { return r.path; });
            navLabels = {};
            (s.nav || []).forEach(function (n) { navLabels[n.path] = n.label || n.title; });
            log('register routes=' + summarize(routeList));
            if (currentRoute && routeList.indexOf(currentRoute) !== -1) goTo(currentRoute);
            else currentRoute = routeList[0] || null;
            renderRoutes();
        }
    });

    var loadSeq = 0;

    async function loadFrame() {
        // Rebuilds can fire several reloads back to back; only the newest wins.
        var mySeq = ++loadSeq;
        var myChannel = mintChannel();
        var res = await fetch('/__quox-dev/frame?channel=' + myChannel);
        if (mySeq !== loadSeq) return;
        if (iframe) { iframe.remove(); iframe = null; }
        channel = myChannel;
        if (!res.ok) {
            var err = await res.json().catch(function () { return {}; });
            showBanner('Build failed: ' + (err.error || res.status) + '. Fix the error; the preview reloads on save.');
            return;
        }
        showBanner('');
        var html = await res.text();
        if (mySeq !== loadSeq) return;
        iframe = document.createElement('iframe');
        // Exactly the host's token set. NEVER add allow-same-origin.
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.setAttribute('title', 'plugin:' + (meta.pluginId || ''));
        iframe.srcdoc = html;
        stage.appendChild(iframe);
        log('frame loaded (sandbox=allow-scripts, CSP connect-src none)');
    }

    async function init() {
        meta = await (await fetch('/__quox-dev/meta.json')).json();
        titleEl.textContent = (meta.name || meta.pluginId || 'plugin') + '  (dev preview, sandboxed)';
        await loadFrame();
        var es = new EventSource('/__quox-dev/events');
        es.onmessage = function (m) {
            if (m.data === 'reload') { log('rebuilt, reloading frame'); loadFrame(); }
        };
        document.getElementById('reload').onclick = function () { loadFrame(); };
    }

    init().catch(function (e) { showBanner('Dev preview failed to start: ' + e.message); });
})();

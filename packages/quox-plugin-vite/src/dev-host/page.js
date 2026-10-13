/** HTML for the dev preview parent page (the "host" around the sandbox frame). */
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildAgentDock(agent) {
    if (!agent) return '';
    const color = /^#[0-9a-fA-F]{3,8}$/.test(agent.color || '') ? agent.color : '#a78bfa';
    return `<div id="agent-dock" data-testid="dev-agent-dock" style="border-color:${color}">
      <div class="dock-title" style="color:${color}">${escapeHtml(String(agent.name || 'Agent').toUpperCase())}</div>
      <div class="dock-role">${escapeHtml(agent.role || '')}</div>
      <p>The Quox host renders your agent sidebar here.</p>
      <p>This is a placeholder so the layout is representative. In Quox the same chat component Quox's own agents use is shown beside your plugin, fed from <code>manifest.agentDefinition</code>. Set <code>"agentSidebar": false</code> in the manifest to opt out.</p>
    </div>`;
}

function buildPreviewPage({ title = 'plugin', agent = null } = {}) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | Quox plugin dev preview</title>
<style>
  html, body { margin: 0; height: 100%; background: #060b1a; color: #fff; font-family: system-ui, sans-serif; }
  #app { display: flex; flex-direction: column; height: 100%; }
  header { display: flex; align-items: center; gap: 12px; padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.25); }
  #title { font-weight: 600; }
  #routes { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
  button { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.4); border-radius: 8px; padding: 4px 10px; cursor: pointer; }
  button.active { background: #1d6fe0; border-color: #6aa8ff; }
  #banner { background: #8a1f1f; padding: 8px 14px; }
  #main { display: flex; flex: 1; min-height: 0; }
  #stage { flex: 1; min-width: 0; background: #0b1226; }
  #stage iframe { width: 100%; height: 100%; border: 0; display: block; }
  #agent-dock { width: 340px; box-sizing: border-box; margin: 8px; padding: 14px; border: 1px dashed; border-radius: 14px; color: #fff; }
  #agent-dock .dock-title { font-weight: 700; letter-spacing: 0.06em; }
  #agent-dock .dock-role { margin-bottom: 10px; }
  aside { width: 340px; border-left: 1px solid rgba(255,255,255,0.25); display: flex; flex-direction: column; min-height: 0; }
  aside h2 { font-size: 13px; margin: 0; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.25); }
  #log { flex: 1; overflow: auto; padding: 8px 12px; font: 12px/1.5 ui-monospace, monospace; }
  #log div { border-bottom: 1px solid rgba(255,255,255,0.12); padding: 2px 0; word-break: break-all; }
  #toasts { position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
  .toast { background: #14325f; border: 1px solid #6aa8ff; border-radius: 8px; padding: 8px 12px; }
  .toast-error { background: #5f1414; border-color: #ff7a7a; }
  .toast-success { background: #14502a; border-color: #5fe08a; }
</style>
</head>
<body>
<div id="app">
  <header><span id="title">${escapeHtml(title)}</span><div id="routes"></div><button id="reload" type="button">Reload frame</button></header>
  <div id="banner" hidden></div>
  <div id="main">
    <div id="stage"></div>
    ${buildAgentDock(agent)}
    <aside><h2>window.quox calls</h2><div id="log"></div></aside>
  </div>
</div>
<div id="toasts"></div>
<script src="/__quox-dev/parent.js"></script>
</body>
</html>`;
}

module.exports = { buildPreviewPage, escapeHtml };

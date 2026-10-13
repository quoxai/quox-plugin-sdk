/**
 * ${displayName} - Backend Service
 *
 * The Quox host proxies window.quox.fetch('/x') to this service's /x (the
 * /collector/api/v1/plugins/<id> prefix is stripped). Serve exactly the paths
 * your views fetch. The views fetch: GET /usage.
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check (manifest.backend.healthPath)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', plugin: '${pluginName}', uptime: process.uptime() });
});

// Usage meters shown by src/views/MainView.jsx. Replace the zeros with real
// numbers. Enforce tier limits here, never in the UI.
app.get('/usage', (req, res) => {
    res.json({ queriesUsed: 0, queriesLimit: 100, storageMb: 0, storageLimitMb: 50 });
});

app.listen(PORT, () => {
    console.log('[${displayName}] Backend running on port ' + PORT);
});

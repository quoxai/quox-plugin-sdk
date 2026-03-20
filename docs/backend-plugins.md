# Backend Plugins (Tier 2)

Some plugins need server-side logic — database access, long-running tasks, external API integrations, or custom agent tools. These "Tier 2" plugins include a backend Docker container that runs alongside QuoxCORE.

## Architecture

```
Browser (Plugin UI)
    ↓ api.fetch('/api/data')
QuoxCORE Collector (proxy)
    ↓ /api/v1/plugins/{pluginId}/api/data
Plugin Container (your backend)
    ↓
Your logic, database, external APIs
```

The collector proxies all requests, adding:
- Rate limiting (default: 60 req/min per plugin)
- Authentication headers (`X-User-Id`, `X-User-Email`)
- Plugin identification (`X-Plugin-Id`)
- Health monitoring

## Creating a Backend Plugin

### 1. Scaffold with backend template

```bash
npx create-quox-plugin my-monitor --template with-backend
```

This adds a `backend` field to your manifest:

```json
{
    "backend": {
        "image": "my-monitor-backend:latest",
        "healthPath": "/health",
        "port": 8080
    }
}
```

### 2. Build your backend

Create a simple HTTP server. Example with Express:

```js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/api/status', (req, res) => {
    const userId = req.headers['x-user-id'];
    res.json({ monitors: 5, alerts: 2, user: userId });
});

app.post('/api/scan', (req, res) => {
    const { target } = req.body;
    // ... your logic
    res.json({ success: true, results: [] });
});

app.listen(8080, () => console.log('Backend running on :8080'));
```

### 3. Containerise

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### 4. Deploy

Add your container to the QuoxCORE Docker network:

```yaml
# docker-compose.override.yml or standalone
services:
  plugin-my-monitor:
    image: my-monitor-backend:latest
    networks: [quox-network]
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256m
          cpus: '0.5'
```

### 5. Register with Collector

```bash
curl -X POST http://localhost:9848/api/v1/admin/plugins/my-monitor/backend \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_INTERNAL_SERVICE_KEY" \
  -d '{
    "url": "http://plugin-my-monitor:8080",
    "healthPath": "/health",
    "rateLimit": 60
  }'
```

### 6. Verify

```bash
# Check health
curl http://localhost:9848/api/v1/admin/plugins/my-monitor/health

# Test proxy
curl http://localhost:9848/api/v1/plugins/my-monitor/api/status
```

## Admin API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/admin/plugins/:id/backend` | Register backend URL + config |
| `DELETE` | `/api/v1/admin/plugins/:id/backend` | Unregister backend |
| `GET` | `/api/v1/admin/plugins/backends` | List all registered backends |
| `GET` | `/api/v1/admin/plugins/:id/health` | Health check specific backend |
| `POST` | `/api/v1/admin/plugins/:id/tools` | Register agent tools |

All admin endpoints require authentication (service key or admin JWT).

## Registering Agent Tools

Your backend can register tools that agents (CommanderQ, etc.) can use:

```bash
curl -X POST http://localhost:9848/api/v1/admin/plugins/my-monitor/tools \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_KEY" \
  -d '{
    "tools": [
      {
        "name": "scan_network",
        "description": "Scan a subnet for active hosts",
        "input_schema": {
          "type": "object",
          "properties": {
            "subnet": { "type": "string", "description": "CIDR notation (e.g. 10.0.0.0/24)" }
          },
          "required": ["subnet"]
        }
      }
    ]
  }'
```

Tools are namespaced: `plugin_my_monitor_scan_network`. The orchestrator agent (QuoxCORE) automatically gets access to registered plugin tools.

When an agent calls the tool, the collector POSTs to `http://your-backend:8080/tools/scan_network` with the input.

## Resource Limits

- **Memory:** Recommended 256MB max per plugin container
- **CPU:** Recommended 0.5 CPU max
- **Rate limit:** Default 60 requests/minute (configurable at registration)
- **Timeout:** 30 seconds per proxied request

## Health Checks

The collector automatically checks your backend's health every 60 seconds. The health endpoint should return HTTP 2xx when healthy.

Health status is visible at `GET /api/v1/admin/plugins/backends`.

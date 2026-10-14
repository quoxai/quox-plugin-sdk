# Backend plugins

Some plugins need server-side logic: a database, long-running work, or calls to
external APIs. Such a plugin ships a backend container image alongside its
sandboxed UI. The Quox host starts the container, isolates it, and proxies the
plugin's `quox.fetch()` calls to it.

## Where backends run today

The host component that starts plugin backends (powers-host) is part of
managed Quox instances. **Self-hosted installs from the public quoxcore release
do not include it yet, so they cannot run any plugin backend, official or
community.** On those installs a plugin with a `backend` still installs and its
UI runs; its backend calls fail until the host gains the component.

## What a community backend needs

A community plugin's backend starts only when every one of these holds, checked
by the host each time the backend is started (and at host boot):

1. **Signature v2.** The bundle was signed with `@quoxai/quox-plugin-vite`
   (or the old `quox-plugin-vite` 0.3.x) via `npx quox-plugin sign`. A v2 signature binds the manifest, so the
   backend image cannot be swapped after signing. A 0.2.0 (v1) signature binds
   the bundle only, and the host refuses to install a v1-signed plugin that
   declares a backend.
2. **A trusted key.** The org admin has trusted your public key
   (`quox plugin trusted-keys add`).
3. **Not revoked.** Neither your signing key nor this bundle digest is on the
   org's revocation list (`quox plugin revocations`). Revoking either stops a
   running backend the next time the host checks it.
4. **A digest-pinned image.** `backend.image` must be content-addressed:
   `registry.example.com/acme/monitor@sha256:<64 hex>`. A tag such as `:latest`
   is refused, because whoever controls the tag could change what runs under
   your valid signature.
5. **Every install agrees.** A backend is one container per plugin id on the
   instance. If any org's install of that id fails these checks, the backend
   does not run for anyone.

```json
{
  "backend": {
    "image": "registry.example.com/acme/monitor@sha256:3f0c...e9a1",
    "port": 8080,
    "healthPath": "/health"
  }
}
```

Get the digest after you push: `docker buildx imagetools inspect <image>:<tag>`
or the `digest:` line `docker push` prints. Re-sign after changing the manifest.

## What the host does with it

```
Browser (plugin UI, sandboxed iframe)
    | quox.fetch('/usage')
Quox collector (gateway, rate limit, identity headers)
    | http://plugin-<id>:<port>/usage
Your backend container
```

- **Pull.** If the image is not present, the host pulls it by digest. A pull is
  bounded by a timeout; a failed pull backs off (1 minute, doubling to 30
  minutes) instead of retrying on every request.
- **Isolation.** The container runs as a non-root user with all capabilities
  dropped, on its own network. It can reach the Quox collector and the public
  internet. It cannot reach other Quox services, other plugins, the host, the
  LAN, a tailnet, or cloud metadata addresses.
- **Limits.** Memory and CPU are capped per container (instance defaults 1 GiB
  and 2 CPUs).
- **Restart.** The container does not auto-restart on its own. After a host
  reboot the host recreates it once its network fence is in place, so there is
  a short window after boot where the backend is not running.
- **Identity.** Each proxied request carries `X-Plugin-Id`, `X-User-Id`,
  `X-Org-Id` (derived from the verified session, never from the client) and
  `X-Quox-Org-Ticket`, a short-lived signed ticket for that org and user.
- **Credential.** The container receives `QUOX_HOST_LLM_URL` and a per-plugin
  credential in `QUOX_HOST_LLM_KEY`. It is accepted only on the host chat and
  evidence routes, and only for an org when you send back the request's
  `X-Quox-Org-Ticket`. Without a ticket it can only write instance-scoped
  evidence. It is never the instance's own service key.

## Not available to community backends yet

- **Agent tools.** A backend's `/tools.json` is loaded into agents only for
  official plugins. Community agent tools need org-scoped registration first.
- **Host memory and `quox.aee.emit` from the UI** still reject with
  `not_available` (see [plugin-api.md](plugin-api.md)).
- **IPv6** is not enabled on plugin networks.

## Build a backend

Scaffold with a template that ships `backend/`:

```bash
npx @quoxai/create-quox-plugin my-monitor --template enterprise-extension
```

Any HTTP server works. Serve `healthPath` with a 2xx once you are ready:

```js
const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/usage', (req, res) => {
  const org = req.headers['x-org-id']; // trust only this header for the org
  res.json({ org, monitors: 5 });
});

app.listen(Number(process.env.PORT) || 8080);
```

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER 1000:1000
CMD ["node", "server.js"]
```

Push the image to a registry the instance can reach, put the digest-pinned
reference in `manifest.json`, then `npm run build` and `npx quox-plugin sign`.
An org admin installs the plugin and trusts your key; the backend starts when a
user opens the plugin.

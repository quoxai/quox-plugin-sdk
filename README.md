# Quox Plugin SDK

Tools for building third-party plugins for [Quox](https://quox.ai), the self-hosted control plane for AI agents. Scaffold a plugin, build it with Vite, validate it, sign it, and install it into a Quox instance.

## How community plugins run

A community plugin is a React bundle that runs inside a sandboxed iframe with an opaque origin (`sandbox="allow-scripts"`) and a Content Security Policy of `connect-src 'none'`. The plugin cannot make network requests, read the host page, or touch other plugins. Quox gives it React, ReactDOM and React Router through `window.__quoxSharedDeps`, and only its own `plugin.css` is loaded: host stylesheets are not present.

Everything else goes through `window.quox`, a promise-based API bridged to the host over `postMessage`: namespaced storage, `fetch` to the plugin's own backend namespace (relative paths only), notifications, navigation and `getUser()`. `memory` and `aee.emit` are exposed but not available to community plugins yet (they reject with `not_available`). If an API is not on that list, it does not exist for a community plugin. Details are in [docs/plugin-api.md](docs/plugin-api.md).

## Packages

| Package | Purpose |
|---------|---------|
| `create-quox-plugin` | Scaffolder: `npx create-quox-plugin my-plugin` |
| `quox-plugin-sdk` | Runtime helpers, TypeScript types, and a mock `window.quox` for tests |
| `quox-plugin-vite` | Vite plugin and the `quox-plugin` CLI (`validate`, `keygen`, `sign`) |
| `eslint-plugin-quox-plugin` | Lint rules that flag code the sandbox will not allow |

## Quick start

```bash
npx create-quox-plugin my-plugin
cd my-plugin
npm install
npm run build      # writes dist/plugin.esm.js and dist/plugin.css (manifest.json stays at the project root)
npm run validate   # checks the manifest and bundle
npm run sign       # writes dist/signature.json using ./.keys/plugin-signing.pem
```

Generate the signing key once with `npx quox-plugin keygen --out .keys`. The scaffold gitignores `.keys/`.

Install through the dashboard (Settings, Plugins), or from the CLI as an org admin:

```bash
quox plugin install \
  --manifest manifest.json \
  --bundle dist/plugin.esm.js \
  --css dist/plugin.css \
  --signature dist/signature.json
```

`--signature` is required when the org has trusted keys configured. Signing is covered in [docs/signing.md](docs/signing.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Getting started](docs/getting-started.md) | First plugin, step by step |
| [Plugin API](docs/plugin-api.md) | What `window.quox` offers and what the sandbox forbids |
| [Templates](docs/templates.md) | Scaffold templates compared |
| [Signing](docs/signing.md) | Ed25519 signatures |
| [Backend plugins](docs/backend-plugins.md) | Adding a backend service |
| [Claude skill](docs/claude-skill.md) | Optional AI-assisted plugin development |

## Developing this repo

```bash
npm install
npm test           # vitest plus node:test (quox-glyph)
npm run check:pack # asserts each tarball matches its files allowlist, no secrets
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues to security@quox.ai ([SECURITY.md](SECURITY.md)).

## Licence

Apache-2.0. See [LICENSE](LICENSE).

# Getting Started

Build, sign and install your first QuoxCORE community plugin.

## Prerequisites

- Node.js 20+
- A QuoxCORE instance you can install plugins into

## 1. Scaffold

```bash
npm create @quoxai/quox-plugin@latest my-first-plugin
# or: npx @quoxai/create-quox-plugin my-first-plugin --template basic
```

Pick a template (see [Templates](./templates.md)); `basic` is the right start. The project looks like:

```
my-first-plugin/
├── manifest.json
├── package.json            # scripts: dev, build, validate, sign
├── vite.config.js          # @quoxai/quox-plugin-vite
├── README.md
├── .gitignore              # node_modules/, dist/, .keys/
├── .claude/skills/quox-plugin/SKILL.md
└── src/
    ├── index.jsx           # registerPlugin(...)
    ├── lib/                # api.js, useLoad.js, ui.jsx, ...
    └── views/MainView.jsx
```

```bash
cd my-first-plugin
npm install
```

## 2. Know the sandbox

Community plugins run in an isolated frame. Inside it you have:

- React, ReactDOM and the router (shared dependencies).
- `getQuox()` from `@quoxai/quox-plugin-sdk`: `storage`, `fetch` (to your own plugin backend only), `notify`, `navigate`, `getUser`. Every method returns a Promise and can fail. `memory` and `aee.emit` exist but are not available to community plugins yet (they reject with `not_available`).
- Your own `plugin.css`, which includes the `qx-*` design-system classes.

You do **not** have: the network (no `fetch`, XHR or WebSocket of your own), host components, host contexts, or host stylesheets. A plugin that touches those fails at runtime. See [Plugin API](./plugin-api.md).

## 3. The entry point

```jsx
import { registerPlugin } from '@quoxai/quox-plugin-sdk';
import MainView from './views/MainView';

registerPlugin('my-first-plugin', {
    routes: { '/plugins/my-first-plugin': MainView },
    sidebar: [{ path: '/plugins/my-first-plugin', label: 'My First Plugin', icon: 'puzzle' }],
});
```

Components are mounted with no props. Get the API with `getQuox()` (or `usePluginApi()`).

## 4. A view

```jsx
import { getQuox } from '@quoxai/quox-plugin-sdk';
import useLoad from '../lib/useLoad';
import { ErrorBanner, Spinner } from '../lib/ui';

export default function MainView() {
    const user = useLoad(() => getQuox().getUser());
    return (
        <div style={{ padding: 24 }}>
            <ErrorBanner error={user.error} onRetry={user.reload} />
            {user.loading && !user.data ? <Spinner /> : user.data && (
                <div className="qx-card" style={{ padding: 24 }}>Hello, {user.data.role}</div>
            )}
        </div>
    );
}
```

Always render the error: an RPC that fails and shows nothing looks like a blank page.

## 5. Dev preview

```bash
npm run dev
```

Starts Vite with the `@quoxai/quox-plugin-vite` dev preview, which mocks the Quox host so your views render locally. It is an approximation, not a QuoxCORE instance: confirm storage, backend calls by installing the built plugin.

## 6. Build, validate, sign

```bash
npm run build       # dist/
npm run validate    # exit 1 on any manifest or bundle problem

npx quox-plugin keygen --out .keys     # one time; .keys/ is gitignored, keep it private
npm run sign        # dist/signature.json from ./.keys/plugin-signing.pem
```

Rebuild and sign again after every change. See [Signing](./signing.md).

## 7. Install

Upload the built plugin from the Quox dashboard plugins page, review the permissions, approve. Declare exactly the permissions your code uses: the host refuses undeclared calls with `permission_denied` (see [Permissions](./plugin-api.md#permissions)). It then appears in the sidebar. Community plugins are labelled unverified unless your org trusts the signing key.

## 8. Test

```js
import { createMockQuox, installMockQuox } from '@quoxai/quox-plugin-sdk/testing';
```

`createMockQuox` is an in-memory stand-in for the host API.

## Monorepo development

Working on the SDK itself? `npx @quoxai/create-quox-plugin my-plugin --local-sdk /path/to/quox-plugin-sdk` writes `file:` dependencies on your checkout. It is never auto-detected.

## Next steps

- [Templates](./templates.md), all 8 compared
- [Plugin API](./plugin-api.md)
- [Backend plugins](./backend-plugins.md)
- [Signing](./signing.md)
- [Claude skill](./claude-skill.md)
- Tutorials: [basic](./tutorials/basic.md), [monitoring](./tutorials/monitoring-dashboard.md), [fleet](./tutorials/fleet-management.md), [service bridge](./tutorials/service-bridge.md), [UI feature](./tutorials/ui-feature.md), [enterprise](./tutorials/enterprise-extension.md), [specialist agent](./tutorials/specialist-agent.md), [agentic team](./tutorials/agentic-team.md)

# Building a Specialist Agent Plugin

An agent status card, tool cards with a parameter form and Run button, and an ask-the-agent panel.

## 1. Scaffold

```bash
npx @quoxai/create-quox-plugin scan-agent --template specialist-agent
cd scan-agent && npm install
```

Files specific to this template: agent/{agentDef,agentPersona,tools}.js, views/*, components/{AgentStatusCard,ToolCard}.jsx, data/mock.js. The chat sidebar is rendered by the Quox host from `manifest.agentDefinition` (no AgentChat component to build). Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const out = await api('/tools/' + tool.name + '/run', { method: 'POST', body: { params } });
```
`window.quox.aee` is coming but is not available to community plugins yet (calls reject with `not_available`), so Run does not emit an envelope and the template does not declare the `aee` permission. Meanwhile, log tool runs in your own plugin backend.

The agent definition, persona and tool schemas are declared in `manifest.json` (and mirrored in `src/agent/`). The plugin is the UI for them.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`GET /agent/status`, `POST /tools/<name>/run`, `POST /agent/chat` -> `{ reply }`. The sandbox cannot run an agent, call a model, or embed the host chat. Anything that needs those goes in your backend or an official plugin.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a fourth tool in `src/agent/tools.js` and in `manifest.json` `toolDefinitions`, named `plugin_<id>_<tool>`.

## 6. Ship it

```bash
npm run build
npm run validate
npx quox-plugin keygen --out .keys     # one time, keep .keys/ private
npm run sign
```

Upload the built plugin from the Quox dashboard plugins page. See [Signing](../signing.md).

## Sandbox reminders

- No direct network. Only `getQuox().fetch('/path')` to your own plugin backend.
- No host components or contexts. Style with `qx-*` classes.
- Components get no props. Use `getQuox()`.
- Design rules: white text on dark, no grey text, buttons use `qx-btn`.

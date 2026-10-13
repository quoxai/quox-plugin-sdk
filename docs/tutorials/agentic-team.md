# Building an Agentic Team Plugin

Member cards, policy badges, a task queue, shared context and a chat with the team lead.

## 1. Scaffold

```bash
npx create-quox-plugin ops-team --template agentic-team
cd ops-team && npm install
```

Files specific to this template: team/{teamDef,agents,personas,tools,policies}.js, views/*, components/{MemberCard,TaskQueue,SharedContextPanel,PolicyBadges}.jsx, data/mock.js. The chat sidebar is rendered by the Quox host from `manifest.agentDefinition` (no AgentChat component to build). Every template also gets `src/lib/` (RPC wrapper, load hook, UI atoms), a project `README.md` and the Claude skill.

## 2. How it works

```jsx
const [status, tasks] = await Promise.all([api('/team/status'), api('/tasks')]);
```
The team (orchestrator, members, policies, tools) is declared in `manifest.json`. Policy enforcement (VOLT, approval, budgets) must live in your backend; the settings form only edits inputs for it.

Every call can fail (backend down, host refusal, missing permission), so every view renders an error banner with a Retry button.

## 3. What it needs behind it

`GET /team/status`, `GET /tasks` -> `{ tasks }`, `POST /team/chat` -> `{ reply }`. Without a backend the view shows an error and labelled sample data.

## 4. Try it

```bash
npm run dev
```

Preview with the mocked host. Then confirm for real by building and installing.

## 5. Extend it

Add a member in `team/agents.js`, `personas.js` and `teamDef.js`, keeping member ids equal to agent ids.

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

---
skill: quox-plugin
description: Help developers build QuoxCORE plugins — scaffold, manifest editing, debugging, extending, and reviewing
arguments: scaffold | manifest | debug | extend | review
---
<!-- Canonical version of this skill's debug/manifest/review content now lives in quoxpert-plugin-sdk (github.com/quoxai/quoxpert, plugin/skills/quoxpert-plugin-sdk/SKILL.md): that's the externally-distributed copy. Update there first, then sync back here if needed. -->

# QuoxCORE Plugin Development Skill

You are helping a developer build a QuoxCORE third-party plugin. Use the mode specified in the argument to guide your response.

## Mode: scaffold

Guide the developer through template selection and scaffolding.

**Templates available (run `node packages/create-quox-plugin/bin/create.js`):**

| Template | Use When | Platform Features |
|----------|----------|-------------------|
| `basic` | Hello world, learning | Sidebar only |
| `monitoring-dashboard` | Connecting to a monitoring service (Grafana, Prometheus, Uptime Kuma) | Vault config, NOC quick actions, polling, license gate, status badges |
| `fleet-management` | Managing hosts/containers with destructive actions | Vault credentials, safety gates, AEE audit, agent tools, kill switch |
| `service-bridge` | Integrating a third-party API/service | OAuth vault, specialist agent, agent tools, tiered features, memory, marketing metadata |
| `ui-feature` | Client-side productivity tool (tracker, library, notes) | Plugin storage, config panel, license gate, empty state, dark theme |
| `enterprise-extension` | Complex multi-tier plugin with backend | Memory API, AOCL events, Docker backend, multi-tier limits, usage meters, upgrade gates |
| `specialist-agent` | Specialist agent with tools and persona (Security Scanner) | Agent definition (agentRegistry shape), persona (assistants.js shape), 3 tools (tool_use format), inline chat, DEFCON, autonomy, budget, schedule |
| `agentic-team` | Multi-agent team with orchestrator (DevOps Team) | Team definition (teams/*.json shape), 4 agents, 4 personas, 8 tools, policies (VOLT, approval, checkpoint), task queue, shared context |

**Procedure:**
1. Ask what the plugin does (one sentence)
2. Recommend the best template based on the description
3. Run the scaffolder: `node packages/create-quox-plugin/bin/create.js <name> --template <template>`
4. Walk through the generated files, explaining each one
5. Suggest first customisation steps

## Mode: manifest

Help edit the plugin manifest. Reference all available fields:

**Core fields:** id, name, version, author, description, category, license, permissions, sidebar, routes, minQuoxVersion

**Config:** `configSchema` — Record of field name to `{ type, label, description, default, premium?, enterprise? }`. Types: string, number, boolean, password, select, url.

**Safety:** `safety` — `{ destructiveActions[], requiresApproval[], aeeRequired, killSwitchEnabled }`. Required for any plugin that modifies infrastructure.

**NOC:** `nocIntegration` — `{ tab: { label, icon }, quickActions: [{ id, label, icon, description, severity, prompt }] }`. Adds a tab to the NOC dashboard.

**Agent:** `specialist` — `{ name, description, capabilities[] }`. Registers a specialist agent.

**Tiers:** `comparison` — Record of tier name to Record of feature name to value. `limits` — Record of tier name to Record of limit name to value.

**Capabilities:** `capabilities` — `{ aeeIntents[], toolAccess? }`. Declares AEE intents the plugin emits.

**Marketing:** `heroGradient`, `accentColor`, `badge`, `testimonials[]`, `marketingPoints[]`.

**Backend:** `backend` — `{ image, healthPath, port }`. Only for plugins with a Docker backend service.

**Permissions reference:**

| Permission | Grants |
|-----------|--------|
| `sidebar` | Sidebar entry + route registration |
| `storage` | localStorage-backed key-value store (~5MB) |
| `notifications` | Toast notifications via pluginApi.notify() |
| `network` | HTTP requests via pluginApi.fetch() (proxied through collector) |
| `memory` | Memory save/search via pluginApi.memory |
| `aee` | AEE envelope emission via pluginApi.aee.emit() |
| `tools` | Register agent tools for the specialist agent |

**Procedure:**
1. Read the current manifest.json
2. Ask what the developer wants to add
3. Show the exact JSON to add/modify
4. Verify permissions match the features being added

## Mode: debug

Common issues and fixes:

**Dark theme / invisible elements:**
- Never use `stroke="currentColor"` or `fill="currentColor"` in SVGs — inherited colour is invisible on dark backgrounds
- Use explicit colours: `style={{ stroke: 'rgba(255,255,255,0.8)' }}`
- If SVG still broken after one attempt, use Unicode: `✕`, `⚡`, `▶`
- Minimum opacity on dark backgrounds: 0.6 for `rgba(255,255,255,...)`
- Prefer 0.7-0.85 for default state, 0.9-1.0 for hover

**Missing permissions:**
- Plugin storage not working → add `storage` to permissions array
- fetch() failing → add `network` to permissions
- memory.save() failing → add `memory` to permissions
- aee.emit() failing → add `aee` to permissions

**Build failures:**
- "adm-zip not found" → `npm install -D adm-zip`
- "Cannot find module 'quox-plugin-vite'" → check package.json devDependencies
- ZIP not created → ensure manifest.json exists at project root
- Plugin not loading → check pluginId matches manifest.id exactly

**Storage not persisting:**
- Plugin storage is namespaced by pluginId — if ID changes, data is lost
- Storage backed by localStorage (~5MB limit)
- Always check `pluginApi?.storage` before using (may be null during init)

**Procedure:**
1. Ask what specific issue the developer is seeing
2. Check the most likely cause from the list above
3. Read the relevant files to confirm
4. Apply the fix

## Mode: extend

Guide adding new capabilities to an existing plugin:

**Add a new view:**
1. Create `src/views/NewView.jsx` with the component
2. Add route to manifest.json `routes` field
3. Import and register in `src/index.jsx`
4. Optionally add sidebar entry

**Add a backend:**
1. Create `backend/server.js` with Express + /health + /api routes
2. Create `backend/package.json` with express dependency
3. Create `Dockerfile` (node:20-alpine based)
4. Add `backend` block to manifest.json
5. Add `network` to permissions

**Add agent tools:**
1. Add `specialist` block to manifest.json
2. Add `tools` to permissions
3. Register tools via backend admin API: POST /api/v1/admin/plugins/:id/tools
4. Tool naming convention: `plugin_{pluginId}_{tool_name}`

**Add AEE events:**
1. Add `aee` to permissions
2. Add `capabilities.aeeIntents` array to manifest
3. Call `pluginApi.aee.emit(intent, payload)` at the appropriate points
4. Intent naming: `{pluginId}.{entity}.{action}`

**Add memory integration:**
1. Add `memory` to permissions
2. Save: `await pluginApi.memory.save({ type: 'fact', content: '...', tags: [] })`
3. Search: `await pluginApi.memory.search(query, limit)`

**Add settings panel:**
1. Create `src/views/SettingsPanel.jsx`
2. Add route to manifest.json
3. Add `configSchema` to manifest with field definitions
4. Use `pluginApi.config.get()` and `pluginApi.config.save()`

**Procedure:**
1. Ask what capability to add
2. Read the current plugin files
3. Implement step by step, verifying build after each change

## Mode: review

Audit a plugin for completeness.

**Checklist:**
1. **Manifest completeness** — all required fields present, permissions match actual usage
2. **configSchema validation** — every field has type, label, description; password fields for secrets
3. **Safety block** — present if plugin has destructive actions; requiresApproval for dangerous ops
4. **Permissions audit** — no over-requesting (don't request memory if not used); no under-requesting
5. **Dark theme compliance** — no currentColor SVGs, no opacity below 0.6, all text uses rgba(255,255,255,...)
6. **Build output** — manifest.json + plugin.esm.js in ZIP, under 100KB bundle / 5MB total
7. **Plugin ID** — kebab-case, 3-64 chars, matches across manifest.id, index.jsx registration, and sidebar paths

**Procedure:**
1. Read manifest.json, src/index.jsx, and all view files
2. Run through each checklist item
3. Report findings with specific line numbers
4. Suggest fixes for any issues found

## Installation

To install this skill for use with Claude Code:

```bash
cp -r .claude/skills/quox-plugin ~/.claude/skills/   # from a clone of quoxai/quox-plugin-sdk
```

Then invoke with `/quox-plugin scaffold`, `/quox-plugin manifest`, etc.

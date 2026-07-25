# Suggested Rules: making skills and plugins actually get used

A skill or a plugin that nobody's agent loads is shelf-ware. The lesson behind
this document was learned live: QuoxPlan (the productised roadmap plugin) was
initially designed WITHOUT loading the plugin SDK skill, even though the skill
was installed and listed, because nothing forced the load. The result was an
un-Quoxy standalone app that had to be corrected mid-build.

The fix is the **Suggested Rules pattern**: every skill and every developer
tool ships a paste-ready rules block for the consumer's `CLAUDE.md` (or agent
system prompt) that makes agents load the skill at the right moment. Tools get
adopted when three layers ship together: the tool, the skill, and the RULES.

## The pattern

A Suggested Rules block has three parts:

1. **Load triggers.** Concrete "when X, load Y FIRST" lines. Not "this skill
   exists" but "you are about to do X, therefore load Y before designing
   anything". Triggers name activities, not topics.
2. **Named precedents.** The in-repo implementations the agent must read and
   imitate before writing its own design. Imitation of a named example beats
   doctrine recall.
3. **Must-not-skip checks.** The two or three checks that catch the expensive
   failure for this surface (the equivalent of "run the manifest audit before
   calling a plugin done").

Publish the block in the skill itself (a `## Suggested rules` section in
SKILL.md), in the tool's README, and on the website docs page for the surface,
so every customer's Claude inherits the same enforcement.

## Example 1: the plugin SDK itself (the QUOXPLAN lesson)

```markdown
### Quox plugin development
- Before designing or building ANY Quox-adjacent surface (plugin, product
  view, integration, agent), load the `quox-plugin` skill (or the
  `quoxpert-plugin-sdk` skill) FIRST. Do not design from first principles.
- Name and read the precedent before writing code: RepoBrain integration for
  dev-bundle products, the roadmap-viewer plugin for community plugins,
  ActionQSidebar for side panels. Imitate; do not invent new registration
  mechanisms.
- A Quox plugin dissolves into QuoxCORE: one nav entry, native views,
  dashboard chrome only, manifest registered in the plugin registry. It is
  never a standalone app in a frame.
- Before calling a plugin done, run the manifest completeness audit
  (docs/plugin-api.md permissions table + the safety block) and the
  dark-theme SVG check.
```

## Example 2: rules for a shipped plugin (QUOXPLAN consumer rules)

A plugin's own docs should ship rules for the teams that install it:

```markdown
### QuoxPlan (roadmap plugin)
- Roadmap reads and writes go through QuoxPlan's API/CLI/MCP tools, never by
  editing the store directly.
- Marking a stream COMPLETE is owner-gated: it requires explicit human
  confirmation and routes through HITL. Never automate around the gate.
- Notes are append-only; never rewrite roadmap history. Every mutation is
  event-logged and (when enabled) AEE-emitted.
- Agents orient on a stream via the `brief` context pack before starting
  work on it.
```

## Rolling it out (QUOXPERT-RULES)

The QUOXPERT-RULES roadmap stream tracks retrofitting a Suggested Rules block
into every quoxpert sub-skill and every dev-tool skill, and publishing the
blocks on the website docs. When you author a new template, skill, or plugin
with this SDK, include the block from day one; a reviewer should treat a
missing Suggested Rules section the same as a missing `configSchema` field.

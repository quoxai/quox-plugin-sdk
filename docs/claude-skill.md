# Claude Skill for Plugin Development

The Plugin SDK includes a Claude Code skill that helps developers build QuoxCORE plugins.

## Installation

Copy the skill to your Claude Code skills directory:

```bash
cp -r .claude/skills/quox-plugin ~/.claude/skills/   # from a clone of quoxai/quox-plugin-sdk
```

## Usage

Invoke the skill with one of five modes:

### Scaffold

```
/quox-plugin scaffold
```

Guides you through template selection and scaffolding. Explains the 8 templates, recommends the best template based on your description, and walks through the generated files.

### Manifest

```
/quox-plugin manifest
```

Helps edit your plugin manifest. Covers all available fields: configSchema, safety blocks, NOC integration, specialist agents, comparison tiers, capabilities, and marketing metadata. Verifies permissions match actual usage.

### Debug

```
/quox-plugin debug
```

Diagnoses common plugin issues:

- Dark theme / invisible elements (currentColor SVGs, low opacity)
- Missing permissions (storage, network)
- Build failures (adm-zip missing, manifest not found)
- Storage not persisting (pluginId mismatch, localStorage limits)

### Extend

```
/quox-plugin extend
```

Guides adding new capabilities to an existing plugin:

- Add views, backend services, agent tools
- Add settings panels, config schemas

### Review

```
/quox-plugin review
```

Audits a plugin for completeness:

1. Manifest field coverage
2. Permission correctness (no over/under-requesting)
3. Dark theme compliance
4. Safety block presence for destructive actions
5. Build output validation
6. Plugin ID consistency

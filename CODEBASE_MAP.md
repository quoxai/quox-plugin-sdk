<!-- Last verified: 2026-03-21 by /codebase-mirror -->

# Quox Plugin SDK — Codebase Map

## Metrics

| Metric | Count |
|--------|-------|
| Version | 0.1.0 |
| Monorepo packages | 3 |
| Templates | 8 |
| Test files | 2 |
| Scripts | 3 |

## Stack

Node.js, Vite (plugin build), Vitest (testing)

## Packages

| Package | Version | Purpose |
|---------|---------|---------|
| quox-plugin-sdk | 0.1.0 | Core types, runtime helpers, testing utilities |
| create-quox-plugin | 0.1.0 | CLI scaffolder for new plugins |
| quox-plugin-vite | 0.1.0 | Vite plugin for building QuoxCORE plugins |

## Key Files

- packages/quox-plugin-sdk/src/index.js — Runtime SDK
- packages/quox-plugin-sdk/src/testing.js — Test utilities
- packages/quox-plugin-sdk/src/types.d.ts — TypeScript type definitions
- packages/quox-plugin-vite/src/index.js — Vite build plugin
- packages/create-quox-plugin/bin/create.js — Scaffolder CLI

## Scripts

- scripts/generate-signing-key.js
- scripts/sign-plugin.js
- scripts/generate-license.js

## Documentation

- docs/getting-started.md
- docs/plugin-api.md
- docs/backend-plugins.md
- docs/signing.md
- docs/claude-skill.md

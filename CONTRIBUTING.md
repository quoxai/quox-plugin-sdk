# Contributing to QuoxCORE Plugin SDK

## Development Setup

```bash
cd quox-plugin-sdk
npm install
```

The monorepo uses npm workspaces with these packages:

| Package | Path | Purpose |
|---------|------|---------|
| `quox-plugin-sdk` | `packages/quox-plugin-sdk/` | Core types, runtime helpers, testing utilities |
| `create-quox-plugin` | `packages/create-quox-plugin/` | Interactive scaffolder CLI |
| `quox-plugin-vite` | `packages/quox-plugin-vite/` | Vite build plugin, `quox-plugin` CLI |
| `eslint-plugin-quox-plugin` | `packages/eslint-plugin-quox-plugin/` | Lint rules for sandbox constraints |

## Running Tests

```bash
npm test           # vitest + node:test
npm run check:pack # tarball contents vs files allowlist
```

Tests use Vitest and cover:

- SDK runtime helpers (getSharedDeps, registerPlugin)
- Testing utilities (createMockPluginApi, setup/teardown)
- Vite plugin configuration (externals, resolveId, output)
- Scaffolder output (file generation, manifest fields per template)

## Adding a New Template

1. **Define the template** in `packages/create-quox-plugin/bin/create.js`:
   - Add entry to the `TEMPLATES` array (name, description, suggestedCategory)
   - Add manifest generation logic in `generateManifest()`
   - Create MainView generator function
   - Create SettingsPanel generator if needed
   - Create any component/hook/mock generators
   - Add files to `getTemplateFiles()` switch case

2. **Add types** if the template uses new manifest fields:
   - Update `packages/quox-plugin-sdk/src/types.d.ts`

3. **Write tests** in `packages/create-quox-plugin/__tests__/create.test.js`:
   - Test file generation (correct files present)
   - Test manifest fields (permissions, configSchema, etc.)

4. **Write tutorial** in `docs/tutorials/<template-name>.md`

5. **Update docs**:
   - Add to `docs/templates.md` comparison table
   
## Code Style

- No TypeScript compilation - all source is plain JS with JSDoc + .d.ts type declarations
- CJS (`require`) for Node.js scripts (scaffolder, Vite plugin, signing scripts)
- ESM (`import/export`) for SDK runtime code (loaded in browser via QuoxCORE)
- Generated plugin code uses JSX (compiled by Vite + React plugin)

## PR Guidelines

- One template per PR if adding new templates
- Include test coverage for new functionality
- Test scaffolding with `node packages/create-quox-plugin/bin/create.js test-plugin --template <name>` and verify the output

By contributing you agree your contribution is licensed under the MIT licence. Security reports: see SECURITY.md.

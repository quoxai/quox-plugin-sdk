# Changelog

## 0.4.0 (unreleased)

### Changed: packages are scoped under @quoxai

Only Quox can publish under `@quoxai`, so the scoped names say the package is
official. The code is the same as 0.3.1.

| Old name (deprecated) | New name |
| --- | --- |
| `quox-plugin-sdk` | `@quoxai/quox-plugin-sdk` |
| `quox-plugin-vite` | `@quoxai/quox-plugin-vite` |
| `eslint-plugin-quox-plugin` | `@quoxai/eslint-plugin` |
| `create-quox-plugin` | `@quoxai/create-quox-plugin` |

Migrating an existing plugin:
- Start a new one with `npm create @quoxai/quox-plugin my-plugin` (or
  `npx @quoxai/create-quox-plugin my-plugin`).
- In package.json, replace `quox-plugin-sdk` and `quox-plugin-vite` with the
  scoped names at `^0.4.0`, and update imports
  (`from '@quoxai/quox-plugin-sdk'`, `'@quoxai/quox-plugin-sdk/testing'`,
  `from '@quoxai/quox-plugin-vite'`).
- ESLint: the plugin is now `@quoxai` and its rules are `@quoxai/<rule>`
  (for example `@quoxai/no-host-only-globals`). Flat config:
  `import quoxai from '@quoxai/eslint-plugin'` then
  `quoxai.configs['flat/recommended']`; eslintrc: `plugins: ['@quoxai']`.
- The `quox-plugin` CLI (keygen, sign, validate, build) keeps its name.

### Fixed
- `@quoxai/eslint-plugin` now also exports `rules`, `configs` and `meta` by
  name, so ESLint 8 (eslintrc) can load it on Node 22+. Before, eslintrc could
  not find `plugin:<name>/recommended` because the package is ESM-only.
- Signatures made with the old packages stay valid.

## 0.3.1 (2026-10-14)

### Added
- `quox-plugin build [--dir <path>]` runs the project's own vite (`vite build`),
  so build, validate and sign live in one CLI. It resolves vite from the
  project, never from this package. `npm run build` keeps working as before.

### Changed
- The dev preview host reports the method set it serves, and a new test in
  `quox-plugin-sdk` pins the typed `window.quox` surface, the permission map,
  the dev preview host and the test mock to one method set, so they cannot
  drift apart unnoticed.

### Docs
- docs/quality-tiers.md: Bronze, Silver, Gold criteria (Gold needs live
  receipts from a real host). Specification only: there is no listing flow yet.
- docs/listing.md: a listing review is not a security review.
- docs/W5-STATUS.md: outside-builder readiness, item by item.

## 0.3.0 (2026-10-14)

All four packages move together: `quox-plugin-sdk`, `quox-plugin-vite`,
`eslint-plugin-quox-plugin`, `create-quox-plugin`.

### Security
- **Signature v2 binds the manifest and every shipped file.** In 0.2.0 the
  signature covered `dist/plugin.esm.js` only, so `manifest.json`
  (permissions, backend image) and `dist/plugin.css` could be changed under a
  valid signature. `quox-plugin sign` now also writes a v2 signature over a
  canonical payload of plugin id, version, the canonical manifest hash and the
  sha256 of `plugin.esm.js` and `plugin.css`. A v2-aware QuoxCORE host
  recomputes all of these from what is installed and refuses any change
  (`manifest_mismatch`, `files_mismatch`). See docs/signing.md.
- The v1 fields (`digest`, `signature`) are still written, so hosts that
  predate v2 keep installing your plugin.
- A plugin signed only with v1 (0.2.0) still installs on a v2-aware host, but
  only if its manifest asks for nothing beyond `sidebar`, `storage` and
  `notifications` and declares no `backend` (`manifest_unbound_permissions`).
  Re-sign with 0.3.0.
- `quox-plugin validate` checks `dist/signature.json` against the current
  manifest and files, and warns on a v1-only signature.
- Docs: org-scoped revocation of a signer key or a bundle digest
  (`quox plugin revocations ...`), served by QuoxCORE hosts that include it.
- `quox-plugin validate` warns when `backend.image` is not digest-pinned
  (`<image>@sha256:<digest>`). Hosts that run community backends refuse an
  unpinned image, because the signature would then not fix what runs.
- Docs: docs/backend-plugins.md rewritten for the community backend rules
  (signature v2, trusted unrevoked key, digest-pinned image, isolation, the
  per-plugin credential) and where backends run today: managed Quox instances;
  self-hosted installs from the public quoxcore release do not run plugin
  backends yet.

### Changed
- `quox-plugin sign` now requires `manifest.json` with a string `id` and
  `version` (the signature binds them).
- New scaffolds depend on `^0.3.0`.

## 0.2.0 (2026-10-13)

First public release (Apache-2.0).

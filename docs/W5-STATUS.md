# W5 Outside builders: status

Audit of SDK-TEAM phase 12 (plan v6, "W5 Outside builders") against the code,
2026-10-14. Paths prefixed `quox:` are in the QuoxCORE dashboard repo (private);
the rest are in this repo. This page says what is true, not what is planned.

| Item | State | Evidence |
|---|---|---|
| SDK matched to the frame model | Done | `window.quox` is the whole surface: `packages/quox-plugin-sdk/src/types.d.ts:324` (QuoxPluginApi); host mediator `quox:src/services/pluginFrameHost.js:260`; dev preview host `packages/quox-plugin-vite/src/dev-host/rpc.js:16` |
| Types = frame API | Done, now CI-pinned | `packages/quox-plugin-sdk/src/__tests__/frame-contract.test.js` pins types, runtime permission map, dev host (`rpc.js:121` method list) and test mock to one method set. `quox:src/services/pluginFrameSdkContract.test.js` pins the production host (`pluginFrameHost.js:431`) to the PUBLISHED quox-plugin-vite map, so a host change fails until the SDK follows |
| qx CSS synced by CI | Done (advisory in CI) | Vendored with source hashes: `packages/quox-plugin-vite/scripts/sync-glass-css.mjs`, self-check `vendored-css.test.js`. Cross-repo: `quox:scripts/check-sdk-qx-css.mjs` rebuilds the snapshot from the dashboard with the SDK's own logic and compares it to the published asset; CI step `quox:.github/workflows/test.yml:54` (continue-on-error, so a CSS change does not block unrelated work). In sync with quox-plugin-vite 0.2.0 on 2026-10-14 |
| Independently installable packages | Done (unscoped) | npm: `quox-plugin-sdk`, `quox-plugin-vite`, `eslint-plugin-quox-plugin`, `create-quox-plugin` at 0.3.0. The plan's `@quoxai/*` scope was not used; the unscoped names are live and stay |
| build, sign, validate | Done (build ships in 0.3.1) | `quox-plugin build|validate|keygen|sign`: `packages/quox-plugin-vite/src/cli/main.js:30-51`. `build` runs the project's own vite; proven on a scaffolded plugin, run from outside the project (`--dir`), then `validate: ok` |
| Signature binds manifest + bundle bytes | Done (0.3.0) | `packages/quox-plugin-vite/src/cli/signature-v2.js:56`; host `quox:services/auth/utils/pluginSignatureV2.js`, `quox:services/auth/utils/plugins.js:557`. Live-proven 2026-10-14 (edited manifest 403 `manifest_mismatch`, edited CSS 403 `files_mismatch`) |
| Community signing separate from official | Done | Official: built-in Quox key ids, `quox:src/services/officialPluginSignature.js:83`. Community: per-org trusted keys, `quox:services/auth/utils/plugins.js:63`, managed with `quox plugin trusted-keys` (`quox:cli/lib/commands/plugin.js:489`). `quox-plugin keygen` makes community keys only |
| Revocation | Done (0.3.0 hosts) | `quox:services/auth/migrations/123-plugin-revocations.sql`, `quox plugin revocations` (`quox:cli/lib/commands/plugin.js:544`). Live-proven 2026-10-14: revoked key refuses install and activation |
| Doctor, third-party profile on an external root | Done as `quox-plugin validate --dir`; DoneEngine profile deferred | `validate` (`packages/quox-plugin-vite/src/cli/validate.js:162`) checks manifest, permissions vs bundle use, signature v2 against current files, image pinning and install size, on any directory. The DoneEngine plugin pack (quox-gauge) still has one profile (native monorepo plugins); a community profile there is deferred until listings exist, because nothing consumes its verdict yet |
| Clean-room conformance on a fresh box | Done | Fresh `node:22` container against the real npm registry, 0.3.0, 2026-10-14: 8 of 8 templates scaffold, install, build, validate, keygen, sign |
| Tiers with Gold needing live receipts | Specification only | [quality-tiers.md](quality-tiers.md). No listing flow exists, so no plugin carries a tier and nothing reads one |
| Listing review stated as not a security review | Done | [listing.md](listing.md) |
| npm 2FA | Done | Publishing account uses a security key for every publish |
| npm provenance | Owner action pending | `.github/workflows/publish.yml` publishes with `--provenance` from a `v*` tag via npm trusted publishing (no stored token). Needs the trusted-publisher setting on npmjs.com for each package. Until then releases are published by hand, without provenance |

# Plugin quality tiers (specification)

**Status: specification only.** There is no marketplace listing flow yet, so no
plugin carries a tier today and nothing in the host reads one. This page fixes
the criteria now so that authors can build toward them, and so that a tier,
once shown, means the same thing every time.

The shape follows Home Assistant's integration quality scale: each tier adds
requirements on top of the one below, and a tier is earned by evidence, never
by self-declaration.

## Bronze: it installs and behaves

- `quox-plugin validate` passes with no errors.
- Signed with signature v2 (`quox-plugin sign`, quox-plugin-vite 0.3.0 or later),
  so the manifest and every shipped file are bound to the signature.
- `manifest.json` declares exactly the permissions the bundle uses
  (validate reports undeclared ones as errors and unused ones as warnings).
- A backend image, if any, is pinned by digest (`image@sha256:...`). Hosts refuse
  to start a community backend from a tag.
- A README that says what the plugin does and what it does not do.

## Silver: it is maintained and tested

Everything in Bronze, plus:

- Automated tests that run in CI, including the plugin against
  `quox-plugin-sdk/testing` (`createMockQuox`) for every `window.quox` call it makes.
- No `validate` warnings left unexplained (each remaining warning is justified in the README).
- A changelog, and semantic versions: a breaking manifest or permission change is a major bump.
- A stated support contact and a security contact.

## Gold: it is proven on a real host

Everything in Silver, plus **live receipts**: evidence produced by a real Quox
host running the plugin, not by the author's own test suite.

- An install receipt from a real host: the signature verified (v2) and the
  install recorded, with the host version.
- A run receipt for each declared permission: the plugin exercised that
  permission on the real host and the call succeeded (or, for a backend, the
  gateway reached it under its own credential).
- Receipts are dated and re-earned on every major version. A Gold tier on an old
  version does not carry over.

A test suite can never earn Gold on its own: Gold exists to say that the plugin
was driven on a real host and the host itself recorded the result.

## What a tier is not

A tier is a quality signal. It is **not** a security review and it is not an
endorsement of the plugin's author. See [Listing](listing.md).

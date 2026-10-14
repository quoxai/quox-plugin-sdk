# Listing a plugin

**There is no community listing flow yet.** Today you install a community plugin
on your own instance (dashboard Settings, Plugins, or `quox plugin install`).
This page states, before any listing opens, what a listing review will and will
not mean.

## A listing review is NOT a security review

When listings open, Quox will review a submission for fit: that it does what its
listing says, that its manifest and permissions match its stated purpose, and
that it meets the tier it claims ([quality tiers](quality-tiers.md)).

That review **does not audit the plugin's code for vulnerabilities or malice**,
and a listed plugin is not certified as safe. Your protection does not come from
the review. It comes from what the host enforces on every community plugin,
listed or not:

- The plugin runs in an isolated sandbox frame with no access to the host page,
  your session or other plugins, and reaches Quox only through `window.quox`.
- Every gated `window.quox` call is checked against the permissions the manifest
  declares, and the admin sees those permissions before installing.
- The signature (v2) binds the manifest and every shipped file, so a changed
  permission or file under an old signature is refused.
- An org admin can revoke a signer key or a specific bundle, which stops the
  plugin on its next activation and refuses reinstalls.
- A community backend, where the host runs them, gets its own credential and an
  isolated network that cannot reach the host's LAN.

Install only plugins whose author you trust, and only grant the permissions you
are comfortable with.

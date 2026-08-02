# ECHO

ECHO turns meetings and team activity into decisions, follow-through, and useful briefs.

The current commercial focus is the **Team decision product**, starting with a meeting→brief wedge. The core experiment works in the founder-operated regime; the target is to carve it from the larger ECHO lab so it can be installed on an onboarded client's Mac and run without the repo or founder's machine.

This repository also contains ECHO's cross-tool context substrate and multi-agent coordination system. Those are internal technical assets, not current standalone products.

## Current Status

- Pain and demand for the Team product are considered proven by the founder; the product will be sold aggressively.
- Product specs and code remain halted until the founder commits the G2 clarity-halt lift at a named SHA. Customer outreach, offer design, and onboarding discovery continue now.
- The client package and onboarding path are not yet shipped end to end.
- The current package still boots lab/internal capabilities and requires local CLI auth for meeting-signal extraction.
- The target carve is a versioned client-machine package with only the meeting→brief dependencies, an API-key brain, local state/health, and documented upgrade/rollback/support boundaries.
- Graduation is `DEV -> INTERNAL LIVE -> QUALIFIED -> CLIENT LIVE`. Today the current candidate is formally DEV, with useful founder-regime evidence from its predecessor; the next gate is an isolated candidate-package run on a team-controlled internal Mac. The generic npm package and CI jobs do not qualify the Team product. See [the graduation pipeline](raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md).

## Developer/Lab Install

The commands below install the current full ECHO package, not the finished Team-product carve:

```bash
TARBALL="$(npm pack --silent)"
npm install -g "./$TARBALL"
echoctl daemon install
echoctl init
echoctl doctor
```

See [docs/echoctl-install.md](docs/echoctl-install.md) for full install, upgrade, reset, and removal instructions.

## Current Lab Package

- Meeting capture, signal extraction, decision/brief components, and `echoctl brief` inside the current lab runtime.
- A local daemon, append-only store, and MCP server.
- Cross-tool adapters and Fleet coordination assets used to develop ECHO.
- The `echoctl` CLI for install, lifecycle, diagnostics, project workflows, and the meeting→brief path.

These contents are not the client-release boundary. The commercial carve will exclude unrelated Machine/Fleet workers from the client runtime and must pass the release qualification matrix before release.

## License

MIT. See [LICENSE](LICENSE).

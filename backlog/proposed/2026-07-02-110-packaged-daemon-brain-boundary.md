---
id: 2026-07-02-110-packaged-daemon-brain-boundary
title: "Packaged daemon boots again — hoist shared brain invocation out of the excluded ceo-slack-responder surface, and add a tarball import-closure guard so the 076 boundary can't be silently crossed again"
status: proposed
priority: HIGH
estimate: 0.5-1d (mechanical hoist + import rewrites are small; the import-closure packaging test is the net-new piece)
created: 2026-07-02
blocked_by: []
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - package.json                                                          # `files` excludes dist/surfaces/ceo-slack-responder/** — the 076 packaged boundary this item must preserve, not reverse
  - backlog/complete/2026-05-26-076-packaged-echoctl-install-boundary.md  # why the responder surface is excluded from the tarball (deployment surface, not CLI product)
  - src/enrich/granola-signals.ts                                         # offender 1 (item 106): value-imports parseBrainName/preflightBrain/runBrain from ../surfaces/ceo-slack-responder/brain.js
  - src/enrich/granola-intake-candidates.ts                               # offender 2 (item 109): value-imports brain.js + intake-seed.js (renderSeedMessage)
  - src/surfaces/ceo-slack-responder/brain.ts                             # the module to hoist (brain runner: parseBrainName, preflightBrain, runBrain, BrainName, IntakeFields)
  - src/surfaces/ceo-slack-responder/intake-seed.ts                       # renderSeedMessage + seed-marker types — the seed-render half of the hoist
  - tests/cli/shell-reachable.test.ts                                     # the failing product-gate test: packaged `echoctl daemon install` health (launchd leg)
  - tests/packaging/packed-manifest.test.ts                               # existing tarball-content snapshot — checks what's IN the tarball, not whether shipped imports resolve; the new guard complements it
  - backlog/complete/2026-06-21-106-granola-meeting-signal-extraction.md  # introduced the first boundary-crossing import (2026-06-21)
  - backlog/complete/2026-07-01-109-granola-meeting-intake-bridge.md      # added the second; its agent_notes correctly flagged the failure as pre-existing from 106
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder confirms paths against the substrate before claiming.
  - src/brain/brain.ts                              # NEW (AC2) — hoisted brain runner (parseBrainName, preflightBrain, runBrain, BrainName, IntakeFields), moved verbatim from the surface
  - src/brain/intake-seed.ts                        # NEW (AC2) — hoisted seed render + marker parse (renderSeedMessage and the types it carries); daemon-side producers and the responder both consume it
  - src/surfaces/ceo-slack-responder/brain.ts       # AC2 — becomes a re-export of src/brain/brain.ts (or importers updated and the file removed — builder picks the smaller diff)
  - src/surfaces/ceo-slack-responder/intake-seed.ts # AC2 — same treatment as brain.ts
  - src/enrich/granola-signals.ts                   # AC1 — import path rewrite to src/brain/
  - src/enrich/granola-intake-candidates.ts         # AC1 — import path rewrite to src/brain/
  - tests/packaging/import-closure.test.ts          # NEW (AC3) — packs the tarball (or walks dist/ against the files rules) and fails if any shipped module's relative import resolves to an excluded path
  - tests/packaging/packed-manifest.test.ts         # snapshot ripple from the new dist/brain/* modules (expected; same pattern as 106/109)
---

# 110 — Packaged daemon boots again (brain hoist across the 076 boundary)

## Problem

Every packaged install since 2026-06-21 ships a daemon that crashes at boot.

`npm pack` excludes `dist/surfaces/ceo-slack-responder/**` (item 076: the responder
is a deployment surface, not part of the CLI product). Item 106 then made the
daemon's enrich pipeline (`src/enrich/granola-signals.ts`, shipped in the tarball)
**value-import** `parseBrainName` / `preflightBrain` / `runBrain` from
`../surfaces/ceo-slack-responder/brain.js`; item 109 added a second offender
(`granola-intake-candidates.ts`, which also pulls `renderSeedMessage` from
`intake-seed.js`). Result on any packaged install:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  .../node_modules/echoctl/dist/surfaces/ceo-slack-responder/brain.js
  imported from .../dist/enrich/granola-intake-candidates.js
```

launchd spawns the daemon, it dies before binding the port, `daemon install`'s
10s health probe fails, and `tests/cli/shell-reachable.test.ts` fails the product
gate. The founder's machine never sees it because the production daemon runs from
the live checkout where the excluded files exist. This blocks the n=1 concierge
install gate: a fresh tarball install cannot produce a healthy daemon.

Root-caused 2026-07-01 by manual packaged-install replication with a kept log dir;
diagnosis artifacts in the session scratchpad. Item 109's agent_notes correctly
identified the failure as pre-existing from 106.

## Design

Hoist, don't reverse the boundary. The brain runner and the seed render/parse
module are shared infrastructure consumed from BOTH sides of the 076 boundary
(daemon enrich workers inside the tarball; responder surface outside it). They
move to a packaged location (`src/brain/`), and the surface either re-exports
them or updates its imports — builder picks whichever produces the smaller diff.
No behavior change anywhere: this is a file-move + import-rewrite.

The lasting piece is the guard: `packed-manifest.test.ts` snapshots what is IN
the tarball but says nothing about whether shipped modules' imports RESOLVE
within it — which is exactly how 106 and 109 both slipped through review. A new
packaging test computes the import closure of shipped `dist/**/*.js` and fails
if any relative import escapes the `files` allowlist.

## Acceptance Criteria

- **AC1 — packaged daemon healthy.** `tests/cli/shell-reachable.test.ts` passes
  including the launchd leg: pack → global-prefix install → `echoctl daemon
  install` reaches healthy within the existing 10s probe budget. No runtime
  import in any tarball-shipped module resolves into an excluded path.
- **AC2 — hoist is behavior-preserving.** `parseBrainName`, `preflightBrain`,
  `runBrain`, `BrainName`, `IntakeFields` (brain) and `renderSeedMessage` + its
  marker types (intake-seed) live under `src/brain/`; the responder surface
  compiles and all its existing tests pass unmodified (test-file diffs limited
  to import paths if the surface files are removed rather than re-exported).
  `dist/surfaces/ceo-slack-responder/**` remains excluded from the tarball.
- **AC3 — import-closure guard.** New packaging test fails on any shipped
  module importing an excluded path. Red-verified: the guard, run against
  current main (pre-fix), must fail on both offenders; it passes post-hoist.
- **AC4 — full verification.** `npm run typecheck`, `npm run lint`, and
  `npm run test:product` all pass. `packed-manifest.test.ts` snapshot updated
  for the new `dist/brain/*` entries.

## Out of Scope (Don't Drift)

- Do NOT ship the responder surface in the tarball or otherwise alter the 076
  boundary semantics (including the coord_invoke graceful-ENOENT contract).
- No behavior/logic changes to brain invocation, enrich workers, or the
  responder — pure move + import rewrite.
- Do NOT touch `tests/mcp/recent-calls-endpoint.test.ts` — that failure is item
  111 (separate root cause).
- No general dead-import linting or wider packaging refactors; the guard covers
  the `files`-exclusion closure only.

## After Completion (Strategist Notes)

- Update `wiki/surfaces/mcp-server.md` (or the packaging page if one exists
  post-076) with the `src/brain/` shared-module location and the import-closure
  guard as a boundary invariant.
- Record in the drift log that both 106 and 109 crossed the packaged boundary
  undetected through full review rounds — the guard, not reviewer attention,
  is the durable fix (pattern: invariant-hardening over flow-vigilance).

---
id: 2026-07-02-110-packaged-daemon-brain-boundary
title: "Packaged daemon boots again — hoist shared brain invocation out of the excluded ceo-slack-responder surface, and add a tarball import-closure guard so the 076 boundary can't be silently crossed again"
status: proposed
priority: HIGH
estimate: 0.5-1d (mechanical hoist + import rewrites are small; the import-closure packaging test is the net-new piece)
created: 2026-07-02
blocked_by: []
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: cd5d11eb9a8932117fd22382c348e5f11baa5e1ff5029a1eda07fddb9d00bfeb
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
  - tests/packaging/import-closure.test.ts          # NEW (AC3) — resolves shipped dist/**/*.js imports against the ACTUAL npm-packed file set (npm pack or shared dry-run manifest; temp cleanup) and fails on any escape
  - tests/packaging/packed-manifest.test.ts         # snapshot ripple from the new dist/brain/* modules (expected; same pattern as 106/109)
  - src/mcp/server.ts                               # AC5 — guarded dynamic import replaces the static propose-decision-tool import (founder-dispositioned escalation 2026-07-02)
  - src/cli/commands/daemon.ts                      # AC6 — launchctl kickstart after successful bootstrap (strategist-dispositioned escalation #2, 2026-07-02)
  - tests/cli/daemon.test.ts                        # AC6 — kickstart expectation in the launchctl call-sequence assertions
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-02T20:22:56Z"
branch: "agent/packaged-daemon-brain-boundary"
worktree: "/Users/zhenye/Desktop/Project_echo--packaged-daemon-brain-boundary"
head_sha: "c94130f25e3b68465231ce615459f40d3dcc4f42"
pr_url: ""
agent_notes: |
  Completed on branch `agent/packaged-daemon-brain-boundary` at `c94130f25e3b68465231ce615459f40d3dcc4f42`. Run 3 implemented AC6 by kickstarting the launchd service target after successful bootstrap and before health probing, with unit coverage for the launchctl sequence and kickstart failure path. Verification: `npm run typecheck`, `npm run lint`, focused daemon/packaging/shell-reachable tests, and `git diff --check` pass. `npm run test:product` has exactly one failure, `tests/mcp/recent-calls-endpoint.test.ts` timeout, which AC4 explicitly carves out while item 111 remains unmerged in `backlog/ready/`.
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

**Third crossing — conditional `propose_decision` registration (builder-found
2026-07-02, founder-dispositioned same day).** The AC3 guard's red run surfaced
a third pre-existing escape beyond the two spec-named offenders:
`dist/mcp/server.js` statically imports
`../surfaces/ceo-slack-responder/propose-decision-tool.js` (the known
[108-merge] follow-up). Unlike brain/intake-seed, that module is genuinely
surface-coupled — it imports `responder.js` + `draft-store.js` to post Slack
draft cards — so hoisting it would drag the responder chain into the tarball
and reverse 076. Founder decision: decouple by **conditional registration**
(AC5). `server.ts` loads the module via a guarded dynamic `import()`: when the
module is present (repo checkout, dogfood/deployed installs), `propose_decision`
registers exactly as today; when absent (packaged customer install), the daemon
logs a single skip line and boots healthy without the tool. This is the
sanctioned seam for surface-owned MCP tools; the AC3 guard covers static
imports, so the seam does not weaken it.

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
- **AC3 — import-closure guard against the ACTUAL packed file set.** New
  packaging test obtains the real npm-packed file list — by running `npm pack`
  (with temp-artifact cleanup) or via the `npm pack --dry-run --json`
  manifest, sharing the mechanism `packed-manifest.test.ts` already uses —
  and resolves every shipped `dist/**/*.js` relative import against that
  packed set, failing on any import that resolves outside it. A live-tree
  walk against `package.json` `files` rules is NOT acceptable: the checkout
  contains the excluded files, and a rules approximation can silently diverge
  from npm's packaging semantics (r1 codex + codex-ops convergent finding).
  Red-verified: run against current main (pre-fix) the guard must fail on
  the static offenders (the enrich→brain/intake-seed imports AND the
  server.js→propose-decision-tool import) precisely because the packed set
  lacks `dist/surfaces/ceo-slack-responder/*.js`; it passes post-fix (hoist
  clears the enrich rows, AC5's dynamic-import decoupling clears the server.js
  row). Guard scope: static `import`/`export ... from` declarations with
  relative specifiers. Dynamic `import()` expressions are outside the static
  closure by design — AC5's guarded dynamic import is the sanctioned escape.
- **AC4 — full verification (with a single explicit carve).** `npm run
  typecheck` and `npm run lint` pass. `npm run test:product` passes with at
  most ONE allowed exception: the pre-existing
  `tests/mcp/recent-calls-endpoint.test.ts` failure tracked by item
  2026-07-02-111-list-task-states-batched-git (r1 codex-ops finding: without
  this carve AC4 is unsatisfiable until 111 lands, and the unattended queue
  stalls on an out-of-scope failure). If 111 has already merged when this
  item is built, the carve is void and the full product suite must pass.
  `tests/cli/shell-reachable.test.ts` must pass in all cases (it is this
  item's regression target). `packed-manifest.test.ts` snapshot updated for
  the new `dist/brain/*` entries.
- **AC5 — conditional `propose_decision` registration (founder-dispositioned
  escalation, 2026-07-02).** `src/mcp/server.ts` carries no static import from
  `src/surfaces/ceo-slack-responder/`; it attempts a guarded dynamic
  `import()` of the propose-decision module at startup. Module loads →
  `propose_decision` registers exactly as today and every existing
  propose_decision test passes unmodified (in-repo the module is always
  present). Module absent → registration is skipped with a single logged line;
  startup does not throw and daemon health is unaffected — the packed
  `shell-reachable` launchd leg (AC1) is the integration proof of the absent
  path, since the packed install genuinely lacks the module. If a focused
  unit test of the skip path is cheap (e.g. the registration helper tolerates
  `ERR_MODULE_NOT_FOUND` without rethrowing), add it; if it needs new harness
  machinery, skip it and note that AC1 covers the path — do not build
  simulation infrastructure for this.
- **AC6 — launchd job actually starts on install (strategist-dispositioned
  escalation #2, 2026-07-02).** Builder's manual repro: `launchctl bootstrap`
  leaves the job at `runs = 0` (`pended nondemand spawn = speculative`)
  despite `RunAtLoad=true` in the plist; the daemon only starts after
  `launchctl kickstart`. Fix: after a successful bootstrap in
  `src/cli/commands/daemon.ts` (`bootstrapAndProbe` is the natural site — it
  covers install/start/restart consistently), issue `launchctl kickstart`
  (`-k` at builder's discretion) on the service target before probing.
  Kickstart failure surfaces the same way bootstrap failure does (error to
  stderr, non-zero exit) — no silent fallthrough to a doomed probe.
  `tests/cli/daemon.test.ts` diffs limited to the new kickstart expectation
  in the launchctl call sequence. This is what makes AC1's launchd leg pass;
  a fresh install must reach healthy within the existing probe budget with
  no reboot and no manual kickstart.

## Out of Scope (Don't Drift)

- Do NOT ship the responder surface in the tarball or otherwise alter the 076
  boundary semantics (including the coord_invoke graceful-ENOENT contract).
- No behavior/logic changes to brain invocation, enrich workers, or the
  responder — pure move + import rewrite.
- Do NOT touch `tests/mcp/recent-calls-endpoint.test.ts` — that failure is item
  111 (separate root cause).
- No general dead-import linting or wider packaging refactors; the guard covers
  the `files`-exclusion closure only.
- Do NOT hoist `propose-decision-tool.ts`, `draft-store.ts`, or `responder.ts`
  into the packaged layer — the propose_decision fix is registration
  decoupling only (AC5), not a move. Those modules stay surface-owned and
  tarball-excluded.

## After Completion (Strategist Notes)

- Update `wiki/surfaces/mcp-server.md` (or the packaging page if one exists
  post-076) with the `src/brain/` shared-module location and the import-closure
  guard as a boundary invariant.
- Record in the drift log that both 106 and 109 crossed the packaged boundary
  undetected through full review rounds — the guard, not reviewer attention,
  is the durable fix (pattern: invariant-hardening over flow-vigilance).

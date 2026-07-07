---
id: 2026-07-07-126-daemon-smoke-test-serialization
title: "Serialize the real-daemon smoke tests — kill the shell-reachable and ceo-slack-brain full-suite load flakes (isolation-pass-only is not green)"
status: proposed
priority: MED
estimate: 0.5d
created: 2026-07-07
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-07T16:32:09Z"
branch: "agent/daemon-smoke-test-serialization"
head_sha: "09ffcd4a5a69132f8bb8d319aa3028cc3303e3b0"
pr_url: ""
agent_notes: |
  ALL ACs MET (re-handed off after review FIXUP + AC3 re-proof). AC1 ✅ AC2 ✅
  AC3 ✅ AC4 ✅.

  REVIEW FIXUP (this round): the reviewer caught shell-reachable flaking at the
  stop→start step, which my earlier AC1 retry did not cover (it wrapped only
  `daemon install`). Two test-file-only fixups:
  (1) commit 685b26bb — bounded-retry the stop→start reachability check + raise
      the packed-smoke timeout 75s→180s (the test measured 82s isolated and 136s
      under full-suite load on this loaded box; 75s/120s were insufficient) +
      fix the misleading retry-arithmetic comment.
  (2) commit 09ffcd4a — the naive `daemon start` retry still thrashed (a run
      failed with 5 attempts all "loaded but unhealthy"): launchd's bootout is
      async, so retrying `start` races it and hits start()'s fast-return-1 with
      no health window. Fixed by using `daemon restart` (synchronous bootout →
      bootstrap = a real fresh ~10s health window each retry) + 500ms settle,
      first attempt still `start`. The daemon's 10s health deadline is
      product-hardcoded and not CLI-settable, so the test can only retry.

  AC1 — race-safe install (bounded-retry on the daemon's own bind+health) AND
  load-tolerant stop→start (restart+settle retries); TOCTOU findFreePort/
  canListen removed; timeout 180s; finally-cleanup guarded (never targets the
  production daemon, verified for the timeout path since spawnSync blocks the
  event loop so all awaits are post-daemonPort-resolution).

  AC2 — unchanged: ceo-slack-brain descendant.pid ENOENT fixed (timeout 200→2000,
  killGrace 50→200, bounded pid-file poll); root cause documented in test file.

  AC3 — RE-PROVEN 5/5 green via exactly `npm run test`
  (V1-V5: 154/157/158/155/161s; 2096 passed, 0 failed each; shell-reachable now
  rock-solid 62-67s every run, no thrash/spike). Timings in run log "Run 3"
  section. (Earlier dependency on item 128 — which killed the unrelated
  intake-terminal date time-bomb, merged 89a06ff5 — still holds; branch has
  128 merged in.)

  AC4 — no product code touched. Out-of-scope observation flagged for strategist
  (NOT fixed, drift-prevention): tests/coord/coord-volume-perf.test.ts (a
  load-sensitive 300ms perf budget) flaked once at 445ms during a machine-load
  spike (~7 leaked echo daemons kept system load ~100); it passed all five
  V-runs and did not block the re-proof — same class as the packaged-boot
  follow-up the reviewer already filed. Full evidence in
  raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md.
blocked_by: []
spec_refs:
  - tests/cli/shell-reachable.test.ts              # the recurring flake: fixed port 47095 health smoke under suite load
  - tests/surfaces/ceo-slack-brain.test.ts         # second load-flake: ENOENT descendant.pid under suite load
  - vitest.config.ts                               # pool/sequence options — the likely fix surface
files_to_modify:
  # PROVISIONAL
  - vitest.config.ts
  - tests/cli/shell-reachable.test.ts
  - tests/surfaces/ceo-slack-brain.test.ts
  - raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md  # AC3 run log: the 5 full-suite runs + per-run timings (standard builder agent-run artifact)
ready_content_sha: 9ad93cd19d720bfdae71d5a7a1bac2472e8d19f6fb94e26417da6a300c8280f8
review_notes: |
  Merged on 2026-07-07 via founder reconciliation.

  Conflicts resolved:
  - none — branch is test-files-only; neither test file touched on main since
    merge-base, so the merge applied cleanly.

  C3.5 cross-vendor consult: none invoked.

  Fixups applied:
  - tests/cli/shell-reachable.test.ts:162 — stale comment word "raised to 120s"
    corrected to "180s" to match the actual 180_000ms timeout at :330
    (founder-delegate pre-approved; zero behavioral effect).

  Fixups deferred to follow-up items:
  - none.

  Item arc (for the record): the builder's initial five-green evidence was
  contradicted by the reviewer's spot-check, which surfaced a residual
  stop→start flake the first AC1 retry didn't cover. The ensuing fixup round
  found the true root cause — launchd's async bootout racing a `daemon start`
  retry into start()'s "loaded but unhealthy" fast-fail path with no health
  window (daemon.ts:857-874 vs restart():892-918). Final mechanism:
  restart-on-retry (synchronous bootout → bootstrap gives each retry a real
  ~10s health window) + 500ms settle, plus a 180s timeout justified by measured
  data (82s isolated / 136s under load). AC3 was then re-proven 5/5 green via
  exact `npm run test` + the reviewer's corroborating spot-check (6/6
  post-fixup). AC4 held throughout: zero product code changed — the blocking
  pre-existing defect was escalated and became item 128 rather than absorbed as
  drift.

  Flaky-test merge exemption RETIRED as of this merge: with 126's fixes in the
  tree, shell-reachable and ceo-slack-brain failures are REAL signals, not
  tolerated flakes. Future merges must treat them as blocking.

  Verify: 2099/2099 tests pass (21 skipped, 1 todo; 0 failed) across 202 test
  files; lint, typecheck, check-coupled-invariants, and sync-skills --check all
  clean post-merge. No shell-reachable / ceo-slack-brain failure fired.

  Follow-up items (non-blocking):
  - retire packaged-boot.test.ts's TOCTOU findFreePort the same way — already
    filed in backlog/_followups.md.
  - coord-volume-perf load-tolerant perf budget — already filed in
    backlog/_followups.md.
  - strategist: retire the flaky-test special-case from merger prompts per this
    item's After Completion — recorded here in review_notes (this merge is the
    retirement point).
---

## Problem

Two real-launchd/process-spawning smoke tests fail intermittently in full-suite
runs while passing in isolation:

- `tests/cli/shell-reachable.test.ts` — "daemon did not become healthy on port
  47095": fixed test port + suite-load contention. Bit the 121 merge verify
  (failed in-suite, passed isolated 23.5s) and the 122 build gate; passed
  clean on the 122 and 123 merges. Every occurrence costs a human
  investigate-or-trust decision during merge verify.
- `tests/surfaces/ceo-slack-brain.test.ts` — "kills a timed-out brain process
  group" ENOENT on descendant.pid under suite load (18/18 in isolation);
  documented at the 116 merge.

"Passes in isolation" is not a green gate — it's a manual exemption that has
now been invoked at least three times (116, 121, 122-build). Fix the tests,
not the exemption.

## Acceptance Criteria

- **AC1 — no fixed-port contention:** the shell-reachable smoke allocates its
  port dynamically per run (ephemeral bind or retry-scan) — the fixed `47095`
  is removed. Port-dynamism is REQUIRED, not optional: serialization within a
  single vitest invocation does not protect the fixed port against overlapping
  worktrees, stale daemons, or concurrent unattended runs, so it cannot be the
  sole fix for this smoke. A serialized vitest group MAY be layered on top for
  the real-daemon smokes (and AC2 may rely on it), but the shell-reachable
  port must be dynamic regardless. The mechanism must be race-safe, not a
  bind-then-release check-then-use: EITHER the daemon binds port `0` and reports
  the OS-chosen port back to the test (preferred), OR the test launches the
  daemon with a candidate port inside a bounded retry loop that treats a bind
  or health failure as a retry (with cleanup of the failed attempt before the
  next). Justify the chosen mechanism in a comment.
- **AC2 — ceo-slack-brain load flake:** the descendant.pid ENOENT race under
  suite load is eliminated by the same serialization/isolation mechanism (or a
  targeted fix if the race is internal to the test's process-group handling —
  diagnose first, document the root cause in the test file).
- **AC3 — proof:** 5 consecutive full-suite runs green locally, each via the
  exact command `npm run test` (the repo's full-suite entry = `vitest run`),
  documented with per-run timings in the run log at
  `raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md`.
  Retiring the flaky-test
  merge-instruction special-case is NOT a builder AC — it edits strategist-owned
  merger prompts (outside this item's files_to_modify by the
  strategist-only-files rule) and is handled at the post-shipment strategist
  pass (see After Completion).
- **AC4 — no product code changes:** this is test-infra only; if diagnosis
  reveals a REAL product bug (e.g., the daemon genuinely can't boot under
  load), STOP and escalate via pending_review with the evidence — do not
  paper over product defects with test serialization.

## Out of Scope (Don't Drift)

- No product/daemon code changes (AC4 escape hatch escalates instead).
- No broad vitest re-architecture; scope to the two named tests / one
  serialized group.
- No CI pipeline changes (the CI-gate orchestration-test split is a separate
  parked item).

## After Completion (Strategist Notes)

- Remove the "known flake" special-case from merge-run instructions (the
  merger prompts have been carrying a founder-authorized exemption for
  shell-reachable — it should die with this item).
- Closes followups: shell-reachable serialization, ceo-slack-brain load flake
  tracking.

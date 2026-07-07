---
id: 2026-07-07-126-daemon-smoke-test-serialization
title: "Serialize the real-daemon smoke tests — kill the shell-reachable and ceo-slack-brain full-suite load flakes (isolation-pass-only is not green)"
status: proposed
priority: MED
estimate: 0.5d
created: 2026-07-07
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

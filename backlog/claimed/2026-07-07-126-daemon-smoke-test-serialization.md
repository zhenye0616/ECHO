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
head_sha: "88061f9e10e750f522cc4ed6a48763c804ff33f5"
pr_url: ""
agent_notes: |
  AC1 ✅ and AC2 ✅ complete and verified robust across 3 full-suite runs under
  load (both target tests green every run). AC3 🔴 BLOCKED and AC4 escape-hatch
  triggered — escalating instead of drifting.

  BLOCKED: AC3 ("5 consecutive green full-suite runs via `npm run test`") cannot
  be met because the full suite is DETERMINISTICALLY red for a reason outside
  this item's scope: `tests/tools/intake-terminal.test.ts` fails 4/8 AC6 tests
  (AC6.1/6.2/6.3a/6.3b, all "0 notes · 0 candidates") on every run and in
  isolation. Root cause = a date time-bomb: `src/enrich/granola-intake-candidates.ts:477`
  computes the freshness cutoff from real `Date.now()` (not the injectable `now`),
  default lookback 7 days, while the tests seed fixtures hardcoded at
  `updated_at: 2026-06-30` and inject `now: 2026-06-30`. The wall clock rolled to
  2026-07-07 DURING this session, pushing the fixture just past the 7-day cutoff
  (now=…T16:42Z, cutoff=2026-06-30T16:42Z, fixture=2026-06-30T10:00Z → filtered).
  On 2026-07-06 it passed (6 days old).

  Tried: fixed AC1 (bounded-retry daemon bind+health as the race-safe port
  signal, TOCTOU findFreePort removed) and AC2 (root-caused the descendant.pid
  ENOENT as a 200ms-timeout-vs-Node-cold-start race, fixed via timeout 200→2000 +
  killGrace 50→200 + bounded pid-file poll; documented in the test file). Both
  pass isolated and across all 3 full-suite runs; the ONLY failures each run are
  the 4 intake-terminal time-bomb tests. My working tree touches only the two
  target test files — the intake-terminal failure is byte-for-byte pre-existing
  on base 3c6ecdd9.

  Best guess if forced: expand scope (or spin a new item) to make the intake
  cutoff use the injectable clock — `new Date(new Date(now()).getTime() -
  config.lookbackMs)` in runGranolaIntakeBridge — which kills the class and makes
  the cutoff testable; alternatively date the intake fixtures relative to `now`.
  Both are outside `files_to_modify` (product code / a third test file).

  Why escalated: AC4 ("test-infra ONLY; if diagnosis reveals a REAL product bug,
  STOP and escalate via pending_review with evidence — do not paper over product
  defects with test serialization") + drift-prevention. AC3's green-suite gate is
  a founder/strategist decision: fix the time-bomb (widen 126 / new item) or
  accept "green except the pre-existing intake-terminal time-bomb." Full evidence
  in raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md.
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

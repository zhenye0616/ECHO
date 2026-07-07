---
id: 2026-07-07-128-intake-cutoff-injectable-clock
title: "Hotfix: intake lookback cutoff uses the injectable clock — defuses the date time-bomb that turned main deterministically red on 2026-07-07"
status: proposed
priority: HIGH
estimate: 0.25d
created: 2026-07-07
blocked_by: []
fast_track: |
  Main is deterministically RED: tests/tools/intake-terminal.test.ts fails 4/8
  in every run and in isolation since ~2026-07-07T09:00Z, blocking every merge
  verify and builder gate repo-wide (discovered by builder-126, whose AC3
  five-green gate is unmeetable until this lands). One-line product defect
  with an unambiguous fix; 121 fast-track precedent. Build + independent
  review + founder-delegated merge gates all still apply.
spec_refs:
  - src/enrich/granola-intake-candidates.ts        # :477-478 — the bug: injectable `now` defined, raw Date.now() used for cutoffIso
  - tests/tools/intake-terminal.test.ts            # the 4 AC6 tests that went red when the calendar crossed fixtures+lookback
  - raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md  # builder-126's full diagnosis
files_to_modify:
  # PROVISIONAL
  - src/enrich/granola-intake-candidates.ts
  - tests/enrich/granola-intake-cutoff-clock.test.ts   # NEW: the AC3 regression test (exact path pinned per r2)
ready_content_sha: 9468ae741a3e550e6a4d732ca0a42ba652ceec4d27526dcebecc8ba996dcd725
---

## Problem

`runGranolaIntakeBridgeOnce` accepts an injectable clock (`deps.now`) and uses
it for timestamps — but computes the lookback cutoff from the REAL wall clock:

```ts
const now = deps.now ?? (() => new Date().toISOString());
const cutoffIso = new Date(Date.now() - config.lookbackMs).toISOString();  // ← Date.now(), not now()
```

Consequence: any test that injects `now` and seeds fixtures at fixed dates is
a time-bomb — green until the wall clock walks past `fixture_date +
lookbackMs`, then deterministically red. This fired 2026-07-07: the AC6 tests
(fixtures pinned 2026-06-30, lookback 7d, injected now=2026-06-30) fail 4/8
everywhere, including isolation, including on untouched main. Production
behavior is also subtly wrong on principle: the cutoff should be relative to
the pipeline's notion of now, not a second clock read.

## Acceptance Criteria

- **AC1 — the fix:** the cutoff derives from the injected clock:
  `new Date(new Date(now()).getTime() - config.lookbackMs).toISOString()` (or
  equivalent single-clock formulation). No other behavior change; default
  (no injected clock) is byte-equivalent to today's real-time behavior.
- **AC2 — red-to-green proof:** the 4 currently-failing
  `tests/tools/intake-terminal.test.ts` AC6 tests go green WITHOUT touching
  their fixtures or the test file — the fixtures' fixed dates plus the
  injected now are now self-consistent forever.
- **AC3 — regression pin:** one new test that injects a synthetic `now` in
  the PAST (r1 correction — a future-dated clock cannot falsify the bug,
  since future fixtures are also newer than the real wall-clock cutoff):
  e.g. injected now `2020-01-08T00:00:00Z` with a fixture dated
  `2020-01-07T00:00:00Z` — inside the injected 7-day lookback but far older
  than any real wall-clock cutoff — asserting the candidate IS seen. Under
  the `Date.now()` bug this test FAILS (fixture older than wall-clock
  cutoff); it passes only when the cutoff follows `deps.now`. A comment names
  the 2026-07-07 time-bomb.
- **AC4 — gate (concrete commands):** red-to-green:
  `npx vitest run tests/tools/intake-terminal.test.ts` → 8/8;
  regression: `npx vitest run tests/enrich/granola-intake-cutoff-clock.test.ts` → green (and demonstrably red
  if the fix is reverted — note the revert-check in the run log);
  full gate: `npm run test` (fully green — that is the point), `npm run
  lint`, `npm run typecheck`.

## Out of Scope (Don't Drift)

- No other intake/bridge/classifier changes; the one expression plus the one
  regression test.
- No changes to lookback semantics, config, or defaults.
- No test-fixture rewrites (AC2 forbids them — fixtures staying untouched IS
  the proof).
- The general "audit other Date.now() vs injectable-clock splits" question is
  a follow-up observation, not this item.

## After Completion (Strategist Notes)

- Unblocks item 126's AC3 five-green gate (builder-126 resumes after this
  merges).
- File the follow-up: grep audit for other injectable-clock/Date.now() splits
  in enrich/ and surfaces/ (same latent class).
- Meta for the retro: this is the second time-bomb class the pipeline has
  caught this week (dashboard phantom rows being the other "lies-by-
  construction" case) — evidence for the "no second clock reads" idiom.

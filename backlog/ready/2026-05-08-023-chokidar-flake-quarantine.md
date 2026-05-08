---
id: 2026-05-08-023-chokidar-flake-quarantine
title: Quarantine the recurring chokidar / capture / daemon-lifecycle flake cluster
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-08
spec_refs:
  - tests/capture/extractors/cursor.test.ts
  - tests/daemon/lifecycle.test.ts
  - vitest.config.ts
  - src/capture/extractors/cursor.ts
  - src/daemon/index.ts
  - backlog/_followups.md
blocked_by: []
acceptance:
  - "**Investigation pass first.** Reproduce the flake locally three times in a row using `npm test` (no flag changes); record per-run failure counts in the run log. Establish a baseline: e.g., `run 1: 4 failures (3 cursor + 1 lifecycle); run 2: 9 failures; run 3: 3 failures`. The existing journal has measurements from items 019/020/021 verifying that 3-14 failures fluctuate per run on `main`."
  - "**Pick one of three resolution paths and document the choice in the run log:**"
  - "  - **Path A (real fix):** identify the underlying FSEvents / chokidar `watcher.close()` race and patch it. Likely candidates: deterministic synchronization via `probeFreshness` handle (already flagged in item 016 followup), or replacing `waitFor(predicate, ms)` with a sentinel-event subscription. Larger scope but eliminates the root cause."
  - "  - **Path B (timeout bump):** raise per-test `testTimeout` from 5000ms to 15000ms ONLY on the affected files (`tests/capture/extractors/cursor.test.ts`, `tests/daemon/lifecycle.test.ts`). Use vitest's `it.concurrent` opt-out or per-file `testTimeout` config so the slow-down doesn't affect the rest of the suite."
  - "  - **Path C (quarantine):** mark the affected `it()` blocks with `.skip()` and add a tracking comment pointing to this item id and the underlying race. Keeps verify steps clean; defers the real fix; keeps the test bodies intact for when someone picks them up."
  - "Whatever path is chosen, the post-fix `npm test` MUST show zero failures across **three consecutive runs**. Record the three counts in the run log."
  - "**No new tests required for Paths B or C** — the existing tests are the subject. Path A requires a regression test asserting the race is fixed."
  - "**Update existing followups to mark this resolved.** Append a `> Resolved (delivered after merge)` block under each of the five places this flake was flagged in `backlog/_followups.md`: 014 section, 016 section, 018 section, 019 section, 020 section, 021 section. Cross-references prevent the next merge from re-flagging it."
  - "`npm run lint`, `npm run typecheck` clean."
  - "Run log at `raw/internal/agent-runs/2026-05-08-2026-05-08-023-chokidar-flake-quarantine.md` with: 3 baseline runs, chosen path + rationale, 3 verification runs."
files_to_modify:
  - tests/capture/extractors/cursor.test.ts
  - tests/daemon/lifecycle.test.ts
  - vitest.config.ts
  - backlog/_followups.md
---

# Quarantine the recurring chokidar / capture / daemon-lifecycle flake cluster

## What

A cluster of 3-14 fluctuating test failures has been re-flagged at the verify step of every merge since item 014 (5 items in `backlog/_followups.md` reference it). All failures are in two files: `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts`. The root cause is a chokidar / FSEvents race during `watcher.close()` that varies with system load. Workaround `--pool=forks --poolOptions.forks.singleFork=true` masks rather than fixes it.

This item picks ONE of three resolution paths (real fix, timeout bump, or skip-with-comment) and ships it.

## Why

The flake has now been flagged five separate times across items 014, 016, 018, 019, 020, and 021 followups. Each time, the verify step's signal-to-noise drops; reviewers and merge-bench operators have to re-derive that "those 4 failures are unrelated to this branch" before approving. That cognitive overhead compounds across every future merge.

The flake is also dangerous as a tolerated noise floor: a real regression in capture or daemon code would land inside the noise band and miss review.

Quarantine (Path C) is the cheapest, fastest restoration of signal. Real fix (Path A) is the right thing if the time budget allows. Timeout bump (Path B) is a middle path. The agent picks based on baseline measurement and time available.

## Recommended path heuristic

- **If 3 baseline runs produce identical failure sets** → Path A is feasible (deterministic), worth attempting.
- **If failure sets fluctuate across runs** (current observed pattern: 3, 4, 6, 9, 14 across days) → Path A is harder; Path B (timeout bump) is the cheapest mitigation; Path C (skip) preserves the test for later.
- **If `--pool=forks` already passes consistently** but default doesn't → Path B is targeted (the chokidar race is real but per-test timeout works around it).

The agent decides based on what the 3 baseline runs show. Document the reasoning.

## Out of Scope (Don't Drift)

- **Rewriting the affected tests.** Path C just skips them; Path B just raises their timeout; Path A only patches the underlying race, not the test logic.
- **Changing chokidar version or vendor.** Out of scope unless Path A specifically requires it.
- **Touching the production fs-watcher / cursor-extractor / daemon code** unless Path A specifically requires it. The bug is in test infrastructure, not product code.
- **Quarantining other test files** that aren't in the two named files. If a different flake appears, file a separate item.
- **Fixing the unrelated `tests/capture/extractors/claude-code.test.ts` 5000ms timeout** flagged in 011's followups — that's a sibling concern, separate spec.
- **Adding new test infrastructure helpers.** Stay inside the existing `vitest.config.ts` knobs and per-test config.
- **Removing `_followups.md` entries other than this flake.** Just close the duplicates of THIS issue across the 5 historical sections.

## After Completion (Strategist Notes)

1. **Watch the next merge's verify step.** If it shows zero failures across two consecutive `npm test` runs, the quarantine held. If a different flake appears, that's a new item — don't reopen 023.
2. **If Path C was chosen,** consider filing a follow-up item to actually fix the underlying race during a quieter sprint. Tracking comment in the skipped test points to that future item.
3. **No wiki promotion required** — this is operational/test-infra, not product surface.

## Acceptance Criteria

- [ ] 3 baseline `npm test` runs recorded in run log.
- [ ] One of three paths chosen with rationale documented.
- [ ] Post-fix `npm test` passes 3 consecutive times.
- [ ] All 5 historical references in `backlog/_followups.md` marked resolved (cross-reference 023).
- [ ] `npm run lint`, `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/2026-05-08-2026-05-08-023-chokidar-flake-quarantine.md`.

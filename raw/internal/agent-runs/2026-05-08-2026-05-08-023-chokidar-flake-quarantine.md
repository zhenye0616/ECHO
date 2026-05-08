# Agent run — 2026-05-08-023-chokidar-flake-quarantine

**Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`
**Branch:** `agent/chokidar-flake-quarantine`
**Worktree:** `~/Desktop/Project_echo--chokidar-flake-quarantine/`
**Run started:** 2026-05-08 01:12 PDT (2026-05-08T08:12Z)
**Run finished:** 2026-05-08 01:55 PDT (2026-05-08T08:55Z)

## Run 1

### What I implemented

Path C (skip-with-tracking-comment) at the **describe-block level**, after baseline + per-`it.skip` verification both showed the failing test rotating unpredictably across the full integration block.

| File | Change |
|---|---|
| `tests/capture/extractors/cursor.test.ts` | `describe.skip('startCursorExtractor (lifecycle + integration)', …)` with multi-line tracking comment naming the chokidar `watcher.close()` race + item 023. The 11 tests inside are skipped wholesale. |
| `tests/daemon/lifecycle.test.ts` | `describe.skip('daemon lifecycle', …)` with the same comment style. The 4 tests inside are skipped wholesale. |
| `backlog/_followups.md` | Six `> Resolved (delivered after merge by 2026-05-08-023) …` annotations appended under the historical 014 / 016 / 018 / 019 / 020 / 021 chokidar-flake bullets. 014's claude-code.test.ts + fs-watcher.test.ts portions left explicitly open per 023's Out-of-Scope. The 021 annotation also flags the **newly observed** fs-watcher.test.ts flake as a follow-up item. |

`vitest.config.ts` was untouched — Path C didn't require any vitest-config changes.

**Branch:** `agent/chokidar-flake-quarantine`
**Head SHA:** `fbaa7586e8eac794762cd5883ff36ab341bfc4cd`

### Path decision rationale

Per spec heuristic: "If failure sets fluctuate across runs → Path A is harder; Path B (timeout bump) is the cheapest mitigation; Path C (skip) preserves the test for later."

**Path A (real fix) — rejected.** Three baseline runs produced 3, 5, 4 failures with the failing-test set rotating run-to-run. Non-deterministic; no single race I could target precisely inside the 0.5–1d estimate. The flagged "deterministic-synchronization-via-probeFreshness" alternative (item 016 followup) is its own multi-day chunk.

**Path B (timeout bump) — rejected.** It fixes cursor.test.ts (the helper's `waitFor: timeoutMs = 5000` cap and the vitest 5000ms test timeout are the actual cap there), but it cannot fix `tests/daemon/lifecycle.test.ts:140` because the test contains an inline `expect(elapsed).toBeLessThan(8000)` assertion (line 173). Even with infinite test/waitFor timeout, when chokidar teardown empirically takes >8s under load, this assertion fails. Bumping timeouts can't help; the assertion encodes a real product expectation that the system isn't meeting under stress.

**Path C (skip) — chosen.** Universal across both files; restores merge-verify signal-to-noise; preserves test bodies intact behind a `describe.skip` so the underlying race can be addressed in a future quieter sprint.

### Why describe.skip rather than per-it.skip

Initial implementation skipped the 5 historically-flagged cursor tests + the 1 historically-flagged lifecycle test (per-`it.skip` with comments). First verification run (full suite) flushed out a 6th cursor flake (`flattens turn.context paths…`); after adding it, full-suite verifies passed twice but isolated `npx vitest run` of just the two files showed 3–4 different cursor tests flaking each time, with the failing set rotating across the whole integration block. A run #5 of the full suite then surfaced 3 fresh cursor failures (`emits a CandidateEvent per turn`, `emits a CandidateEvent when the globalStorage WAL changes`, `coalesces rapid globalStorage WAL changes`).

Per-`it.skip` on a moving-target flake creates whack-a-mole. `describe.skip` quarantines the whole at-risk block in one edit, which is the only stable answer given the data.

### Acceptance criteria status

| Criterion | Status |
|---|---|
| 3 baseline `npm test` runs recorded | ✅ — see "Test results / baseline" below |
| One of three paths chosen with rationale documented | ✅ — Path C, rationale above |
| Post-fix `npm test` passes 3 consecutive times | ✅ — see "Test results / verification" |
| 6 historical `_followups.md` references marked resolved (cursor + daemon-lifecycle subset only); 014's claude-code + fs-watcher portions remain open | ✅ |
| `npm run lint` clean | ✅ |
| `npm run typecheck` clean | ✅ |
| Run log at `raw/internal/agent-runs/2026-05-08-2026-05-08-023-chokidar-flake-quarantine.md` | ✅ — this file |

### Test results — baseline (verbatim per-run summaries)

#### Baseline run A (full suite, default `npm test`)

```
 ❯ tests/capture/extractors/cursor.test.ts (27 tests | 2 failed) 14096ms
 ❯ tests/daemon/lifecycle.test.ts (4 tests | 1 failed) 46336ms
 Test Files  2 failed | 28 passed (30)
      Tests  3 failed | 449 passed (452)
```

Failing tests:
- `tests/daemon/lifecycle.test.ts > daemon lifecycle > boots, logs started, then SIGTERM produces stopping/stopped and exit 0`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > backfills lastSeenMap from prior storage events on boot`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > stop() resolves cleanly and prevents further events`

#### Baseline run B

```
 ❯ tests/capture/surfaces/fs-watcher.test.ts (13 tests | 1 failed) 6544ms
 ❯ tests/capture/extractors/cursor.test.ts (27 tests | 3 failed) 14158ms
 ❯ tests/daemon/lifecycle.test.ts (4 tests | 1 failed) 48047ms
 Test Files  3 failed | 27 passed (30)
      Tests  5 failed | 447 passed (452)
```

Failing tests:
- `tests/daemon/lifecycle.test.ts > daemon lifecycle > boots, logs started, then SIGTERM produces stopping/stopped and exit 0`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > populates workspace_id when the per-workspace inference index has the composer`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > backfills lastSeenMap from prior storage events on boot`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > stop() resolves cleanly and prevents further events`
- `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher > stop() resolves and prevents further events from being captured` ← **out-of-scope** for 023

#### Baseline run C

```
 ❯ tests/capture/surfaces/fs-watcher.test.ts (13 tests | 1 failed) 6489ms
 ❯ tests/capture/extractors/cursor.test.ts (27 tests | 2 failed) 14068ms
 ❯ tests/daemon/lifecycle.test.ts (4 tests | 1 failed) 46994ms
 Test Files  3 failed | 27 passed (30)
      Tests  4 failed | 448 passed (452)
```

Failing tests:
- `tests/daemon/lifecycle.test.ts > daemon lifecycle > boots, logs started, then SIGTERM produces stopping/stopped and exit 0`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > backfills lastSeenMap from prior storage events on boot`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > stop() resolves cleanly and prevents further events`
- `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher > stop() resolves and prevents further events from being captured` ← **out-of-scope**

**Baseline summary:** 3, 5, 4 failures across runs. Failing-set rotates run-to-run. fs-watcher.test.ts intermittently flakes (~33% rate) but is out-of-scope per 023.

### Test results — verification (after `describe.skip` applied)

#### Verify run I

```
 Test Files  29 passed | 1 skipped (30)
      Tests  437 passed | 15 skipped (452)
```

EXIT=0. Zero failures.

#### Verify run II

```
 Test Files  29 passed | 1 skipped (30)
      Tests  437 passed | 15 skipped (452)
```

EXIT=0. Zero failures.

#### Verify run III

```
 Test Files  29 passed | 1 skipped (30)
      Tests  437 passed | 15 skipped (452)
```

EXIT=0. Zero failures.

**Verification summary:** three consecutive clean `npm test` runs. The 15-skipped count = 11 tests in cursor.test.ts's `startCursorExtractor (lifecycle + integration)` block + 4 tests in lifecycle.test.ts's `daemon lifecycle` block. "1 file skipped" is the cursor.test.ts integration describe block (vitest treats a fully-skipped describe in an otherwise-active file as a skipped sub-suite); the file's other two describe blocks (`extractCursorTurns (pure)` and `CAPTURED_SOURCES allowlist update`) still run.

#### `npm run typecheck`

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
```
EXIT=0.

#### `npm run lint`

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
```
EXIT=0.

### Open questions for founder

1. **fs-watcher.test.ts is the same flake cluster, but out-of-scope per 023.** Baseline runs B/C both showed `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher > stop() resolves and prevents further events from being captured` failing. An interim verification run (before I escalated to `describe.skip`) also surfaced `emits an unlink event when a file is deleted` and `ignores Cursor SQLite WAL artifacts while still capturing normal files` failing in the same file. Per 023's Out-of-Scope: "Quarantining other test files that aren't in the two named files. If a different flake appears, file a separate item." Spec compliance forced me to leave fs-watcher.test.ts alone, and my full-suite verifies are clean only because the file's flake rate is ~33% (one in three runs failed). The 021 followup annotation flags this as a separate item to file. Founder should decide: (a) expand 023 to cover fs-watcher.test.ts before merge, or (b) merge 023 as-is and file a new item for fs-watcher.test.ts.
2. **Recommend follow-up: investigate the underlying chokidar `watcher.close()` race.** This quarantine restores merge-verify signal but doesn't address the root cause — the integration tests still capture useful behavior, just unreliably. The right home for that work is a quieter sprint after V1.5 ships.

### Drift events

None. Stayed strictly within the spec's three paths and the listed `files_to_modify` (cursor.test.ts, lifecycle.test.ts, _followups.md). vitest.config.ts was in `files_to_modify` but Path C didn't need it. Did not touch claude-code.test.ts, fs-watcher.test.ts, or any production code; did not bump chokidar version; did not invent new test infrastructure.

### Reconciliation note

Not a resumed run. First attempt; clean execution from claim → quarantine → verification → handoff.

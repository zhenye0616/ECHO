---
backlog_item: 2026-05-14-051-merge-lock-cross-vendor-enforcement
agent_run_started: 2026-05-15T08:23:16Z
agent_run_ended: 2026-05-15T08:35:00Z
status: ready_for_review
test_status: passing
---

# Agent Run: Merge-lock cross-vendor enforcement + push-with-retry `--rebase=merges`

Single attempt. AC1, AC2, AC3 implemented per spec; AC4 (scope-exclusion enumeration) is documentation-only and the spec body already enumerates it; AC5 (exit-0 backoff) is satisfied by AC2's lock-present codepath; AC6 verification gates run below.

050 supersession check at claim time: `backlog/pending_review/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` exists (still in `pending_review/`, not `complete/`) and `skills/merge-and-cleanup.md` still contains the `echo-merge-in-progress` writer convention (line 61). Therefore AC2 + AC3 are still in scope; AC1 ships unconditionally per the spec.

## What I Implemented

### AC1 — `push-with-retry.sh` uses `--rebase=merges`

Single-flag change on line 25 of `tools/review-queue/push-with-retry.sh`: `--rebase` → `--rebase=merges`. No other change. Retry budget, autostash directive, refspec, and `PUSH-RACE-FALLBACK` logging are preserved exactly.

### AC2 — `_run_reviewer.sh` honors `.git/echo-merge-in-progress`

Added two pieces to `tools/review-queue/_run_reviewer.sh`:

1. **`CODEX_BIN` env hook** (alongside the `PATH` export at line 39, mirrors `tools/backlog/run-codex-builder.sh:94`). Defaults to bare `codex`; tests inject a stub script path. Production behavior unchanged.
2. **Lock check inside the `{ … } >> "$LOG_FILE"` block** between the "tick start" echo and the prompt-existence check (so the skip line auto-routes to the rotation log and the codex child is never spawned). Resolves the lock path via `git rev-parse --git-common-dir` so the shared `.git/echo-merge-in-progress` is visible from any worktree (R1 fix — `--git-path` would resolve to `.git/worktrees/<wt>/...` and miss the main checkout's sentinel).
3. **Changed the codex invocation** from `codex exec …` to `"$CODEX_BIN" exec …` (line 78 post-edit) so the test stub is reached when the env var is set.

Behavior on lock present: append `tick skipped: merge in progress (lock=<path>, holder=<holder>)` to `$LOG_FILE`, exit 0. No git operations, no codex spawn. Behavior on lock absent: unchanged from pre-051.

### AC3 — covered transitively by AC2

`run-codex-reviewer.sh` and `run-codex-ops-reviewer.sh` are 5-line `exec env REVIEWER_NAME=<slug> _run_reviewer.sh` drivers — neither was touched. The AC2 lock check inside `_run_reviewer.sh` applies to both. Verification gate (`grep -L echo-merge-in-progress …`) confirms the per-reviewer drivers do not contain the string.

### AC4 — Out-of-Scope enumeration

Documentation-only. The spec body's "Out of Scope (Don't Drift)" section already enumerates: no new lock primitive, no in-script polling, no changes to `merge-and-cleanup.md`, no changes to `commit-reviewer-response.sh`, no `--rebase=merges` outside the one site, no lock deletion, no retro-conversion. The implementation honors every item in the list.

### AC5 — Exit-0-and-wait backoff

Built into the AC2 lock-present codepath. The `{ … }` block's `exit 0` exits the entire script cleanly, returning control to launchd, whose `StartInterval` (~10 min) is the natural retry cadence. No polling loop in-script.

## Files Modified

| File | Lines changed | Branch / SHA |
|---|---|---|
| `tools/review-queue/push-with-retry.sh` | +1 −1 | `agent/merge-lock-cross-vendor-enforcement` @ `545800b` |
| `tools/review-queue/_run_reviewer.sh` | +23 −1 | same |
| `tests/review-queue/push-with-retry-rebase-merges.test.ts` | +148 (new) | same |
| `tests/review-queue/run-reviewer-honors-merge-lock.test.ts` | +190 (new) | same |

Branch tip SHA at end of run: **`545800b02304d4f46df7f83d5943a0c74c02bf4f`**.

## Decisions Made During Implementation

### Decision 1 — Lock-check placement inside the `{ … } >> "$LOG_FILE"` block, not before it

- **Options considered:** (A) before the `{` block, (B) inside the block after the "tick start" echo.
- **Chose:** B.
- **Why:** Inside the block, the skip-line `echo` automatically routes to `$LOG_FILE` via the `>> "$LOG_FILE" 2>&1` redirect, so the operator dashboard (the rotation log) sees both "tick start" and "tick skipped" lines for skipped ticks — easier to interpret than a skip line written outside the rotation log. The `exit 0` inside the `{}` group still exits the whole script (it's a group command, not a subshell), so launchd sees the clean exit. Matches the AC2 prose "Append a single tick-log line to the existing `$LOG_FILE`".

### Decision 2 — `CODEX_BIN` env hook lives near the `PATH` export, not inside the `{ … }` block

- **Options considered:** (A) near `PATH` export (line 40), (B) inside the `{ … }` block.
- **Chose:** A. Matches the spec's "set near the top of the script (alongside the existing `PATH` export)" wording and mirrors `tools/backlog/run-codex-builder.sh:94`.

### Decision 3 — Sanity check that the AC1 test falsifies the bug

After AC1's test passed, I temporarily reverted the script to the buggy `--rebase` form and re-ran the test. It failed with `fatal: ambiguous argument 'origin/main^2': unknown revision` — the exact differential the spec predicts. Restored the fix; final test re-passes. This is verification that the test is not vacuously green.

## Acceptance Criteria Status

| AC | Status | Notes |
|---|---|---|
| AC1 — `push-with-retry.sh` uses `--rebase=merges` | ✅ passing | New test passes; bug-revert sanity check confirms differential |
| AC2 — `_run_reviewer.sh` honors lock | ✅ passing | 4 test variants (codex/codex-ops × present/absent) all green |
| AC3 — lock honored by both headless drivers | ✅ passing | Test parameterized; grep gate confirms no per-driver duplication |
| AC4 — Out-of-Scope enumerated | ✅ documentation-only | Already in spec body; honored throughout |
| AC5 — exit-0 backoff (no polling) | ✅ passing | Implicit in AC2's exit 0 codepath; AC2 test asserts no codex invocation |
| AC6 — builder verification + journal entry | ✅ running | `bash -n` clean on both scripts; grep gate clean; journal entry below |

## Test Results

```
$ npx vitest run tests/review-queue/
 ✓ tests/review-queue/push-with-retry-rebase-merges.test.ts (1 test) 3391ms
 ✓ tests/review-queue/combine.test.ts (21 tests) 3723ms
 ✓ tests/review-queue/run-reviewer-honors-merge-lock.test.ts (4 tests) 3855ms
 ✓ tests/review-queue/045-smoke-gate-fail-closed.test.ts (3 tests) 3991ms
 ✓ tests/review-queue/n-reviewer-framework.test.ts (20 tests) 4170ms
 ✓ tests/review-queue/schemas.test.ts (18 tests) 4595ms
 ✓ tests/review-queue/commit-reviewer-response.test.ts (2 tests) 4624ms
 ✓ tests/review-queue/044-autostash-dirty-tree.test.ts (1 test) 5381ms
 ✓ tests/review-queue/combine-malformed-response.test.ts (2 tests) 5758ms
 (… all other review-queue tests …)

 Test Files  17 passed (17)
      Tests  109 passed (109)
```

Pre-existing 109 tests + new 5 (1 AC1 + 4 AC2/AC3 parameterized) = 109 total passing. (Reconciled: pre-existing was 104; new spec adds 5 ⇒ 109. Verified in run output.)

## AC6 verification gates (verbatim)

```
$ bash -n tools/review-queue/push-with-retry.sh && echo OK
OK
$ bash -n tools/review-queue/_run_reviewer.sh && echo OK
OK
$ grep -rn echo-merge-in-progress tools/review-queue/
tools/review-queue/_run_reviewer.sh:77:  LOCK_PATH="$(git rev-parse --git-common-dir)/echo-merge-in-progress"
$ grep -L echo-merge-in-progress tools/review-queue/run-codex-reviewer.sh tools/review-queue/run-codex-ops-reviewer.sh
tools/review-queue/run-codex-ops-reviewer.sh
tools/review-queue/run-codex-reviewer.sh
$ grep -rn echo-merge-in-progress tools/review-queue/ skills/ .claude/
tools/review-queue/_run_reviewer.sh:77:  LOCK_PATH="$(git rev-parse --git-common-dir)/echo-merge-in-progress"
skills/merge-and-cleanup.md:61:LOCK=".git/echo-merge-in-progress"
.claude/commands/merge-and-cleanup.md:61:LOCK=".git/echo-merge-in-progress"
```

DoD #4 satisfied: writer pair (skills + .claude/commands) + new AC2 reader. No other surfaces.

## Open Questions for Founder

None. Spec was complete; no escalation.

## Drift Events Caught

None. Implementation was strictly bounded to `files_to_modify` plus the two new test files (per spec AC2 + AC1 test paragraphs).

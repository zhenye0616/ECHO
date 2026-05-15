# Run log — 2026-05-14-050-worktree-isolation-for-multi-step-main-writers

- **Agent:** Claude Code (Opus 4.7, 1M context), persona `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`
- **Claimed at:** 2026-05-15T07:30:00Z
- **Branch:** `agent/worktree-isolation-for-multi-step-main-writers`
- **Head SHA at handoff:** `0e7ee057fef533c85a9947d4dc3ab3a0631da460`
- **Worktree:** `~/Desktop/Project_echo--worktree-isolation-for-multi-step-main-writers/`

## What I implemented (this attempt)

Single-commit implementation of all 7 acceptance criteria from the converged
spec (CLAIM-READY at `c1ba5c1`, 4-round trajectory 8→7→4→2).

- **AC1 — `tools/review-queue/_run_reviewer.sh`:** added the full 050 worktree
  lifecycle around the existing reviewer-tick body. Pre-flight in this exact
  order: `git worktree prune` → enumerate `git worktree list --porcelain` →
  `find $TMPDIR -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0` and
  `rm -rf` only unregistered orphans (registered worktrees skipped regardless
  of mtime per AC1 + AC6.4). Per-tick: `git fetch origin main`, hard-fail
  on unset `$TMPDIR`, `WT="$TMPDIR/echo-${REVIEWER_NAME}-$(uuidgen)"`,
  `git worktree add --detach "$WT" origin/main`. Unified cleanup trap on
  ERR + EXIT (and INT/TERM) discards `$WT` via `git worktree remove --force`
  + `git worktree prune`; no push-failure preservation. Child routed with
  ALL FOUR handoffs (per R4 codex F1): `cd "$WT"` + `export
  ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"` + `PROMPT="$WT/.claude/commands/...md"` +
  `codex exec -C "$WT" --sandbox danger-full-access`.

- **AC1 step 5 prose:** added same-reviewer launchd-overlap no-op guard
  (re-fetch origin/main, `git cat-file -e "origin/main:$upstream_path"`,
  exit 0 if present) AND journal-commit-before-cleanup ordering to the
  canonical bodies of `skills/review-queue-codex.md`,
  `skills/review-queue-codex-ops.md`, and `skills/review-queue-cursor.md`.
  Synced to `.claude/commands/` via `tools/sync-skills.sh`.

- **AC2 — `skills/review-queue-watch.md`:** added a new Step 0 that does
  pre-flight hygiene + creates `$TMPDIR/echo-watcher-<uuid>` + installs
  the cleanup trap, then anchors the rest of the tick (combine.py +
  disposition + dispatch-next-round + journal + commits) inside `$WT`.
  Updated Step 1 narration to note the worktree-already-created state.
  Added a Step 4 cleanup ordering note. `dispatch-next-round.py` and
  `combine.py` are already CWD-agnostic via process-relative paths.

- **AC3 — `skills/merge-and-cleanup.md`:** REPLACED the entire Step B
  (lock acquisition) with worktree creation at `$TMPDIR/echo-merger-<uuid>`.
  DELETED every reference to the sentinel-file lock convention from the
  canonical body. Updated C11 to use `git push origin HEAD:main` explicit
  refspec. Removed the "Lock file already exists" row from the failure-modes
  table. Founder-in-loop conflict-resolution pauses (C3) and verify pauses
  (C5) keep the merger worktree registered, so pre-flight in OTHER role
  wrappers never GCs it (AC6.4 invariant).

- **AC4 — `skills/review-queue-cursor.md`:** added a "Binding-specific notes
  — Cursor's Claude (IDE-mode)" section with the identical worktree
  lifecycle prose-encoded for IDE-mode invocation (Cursor reviewer ticks
  bypass `_run_reviewer.sh` per the 043 contract). Same-reviewer-overlap
  guard + journal-before-cleanup ordering applied to cursor.md.

- **AC5 — `tools/review-queue/push-with-retry.sh`:** changed the push to
  `git push origin HEAD:main` (was `git push origin main` — broken under
  detached-HEAD worktrees). Made queue-errors.md path resolution
  CWD-agnostic via `git rev-parse --show-toplevel` (was relative to
  invoking CWD only). The script otherwise unchanged: same 2-attempt
  rebase-and-retry, same exit codes.

- **AC6 — two new test files:**
  - `tests/review-queue/push-with-retry-cwd-agnostic.test.ts` (4 tests)
    covers (a) live-checkout push, (d) detached-worktree push with the
    `HEAD:main` refspec assertion (`git rev-parse origin/main` == WT HEAD),
    (b)+(c) rebase-retry from both CWDs, and the toplevel-resolved
    queue-errors.md path.
  - `tests/review-queue/worktree-isolation.test.ts` (5 tests) covers
    AC6.1 same-round multi-reviewer rebase-clean, AC6.2 reviewer+merger
    concurrent (the 14:02 collision shape) with no cross-contamination,
    AC6.3 watcher+reviewer concurrent, AC6.4 registered worktrees never
    GC'd, AC6.5 sentinel file never created by any flow.

- **AC7 — grep verification:**
  `grep -rn echo-merge-in-progress -- skills/ tools/ .claude/ tests/ wiki/`
  returns ZERO hits after the canonical body edits. `docs/BACKLOG.md`
  retains 2 hits in the row descriptions for 050 + 051 (founder-owned
  tracking-table prose); see "Open questions for founder" below.

## Files modified

| File | Lines | Branch + sha |
|---|---|---|
| `tools/review-queue/_run_reviewer.sh` | +70 / -7 | agent/worktree-isolation-for-multi-step-main-writers @ 0e7ee05 |
| `tools/review-queue/push-with-retry.sh` | +24 / -8 | same |
| `skills/review-queue-codex.md` | +30 / -3 | same |
| `skills/review-queue-codex-ops.md` | +30 / -3 | same |
| `skills/review-queue-cursor.md` | +60 / -2 | same |
| `skills/review-queue-watch.md` | +50 / -2 | same |
| `skills/merge-and-cleanup.md` | +50 / -20 | same |
| `.claude/commands/{merge-and-cleanup, review-queue-{codex,codex-ops,cursor,watch}}.md` | mirror of canonical | same — re-synced via `tools/sync-skills.sh` |
| `tests/review-queue/push-with-retry-cwd-agnostic.test.ts` | NEW, ~180 lines | same |
| `tests/review-queue/worktree-isolation.test.ts` | NEW, ~270 lines | same |

Single commit: `0e7ee05` — "050: worktree isolation for multi-step main writers".

## Decisions made during implementation

1. **`run-codex-reviewer.sh` + `run-codex-ops-reviewer.sh` left untouched.**
   The spec lists them under `files_to_modify` with the comment "ensure
   top-level launchd entrypoint passes through the wrapper path." Inspection
   confirmed both are 5-line drivers that already `exec env REVIEWER_NAME=<x>
   _run_reviewer.sh`. The AC1 changes are inside `_run_reviewer.sh`'s body and
   propagate automatically. Modifying the drivers would have been a no-op.
   Per AGENT_INSTRUCTIONS — `files_to_modify` is an upper bound, not a lower
   bound — skipping a no-op edit is not drift.

2. **AC7 grep on `docs/BACKLOG.md` not enforced.** The strict reading of AC7
   requires zero hits in `docs/`; `docs/BACKLOG.md` has 2 mentions of the
   literal `.git/echo-merge-in-progress` string in the row descriptions for
   item 050 (describing its purpose) and item 051 (describing the interim
   fix the spec deletes). AGENT_INSTRUCTIONS explicitly excludes
   `docs/BACKLOG.md` from agent-writable files. I followed the AGENT_INSTRUCTIONS
   no-write rule rather than violate it to satisfy AC7. Surfaced for founder
   review (see "Open questions").

3. **No new `tools/echo-worktree-doctor.sh`.** Spec §"Out of Scope" line 144
   explicitly defers crashed-registered-worktree cleanup to 050-followup-F.

4. **No `mv`-based worktree rename for push-failure preservation.** Spec
   §"Out of Scope" line 142 explicitly defers push-failure preservation to
   050-followup-D; the AC1 wrapper accepts uniform lost-work-on-failure
   semantics.

5. **Test isolation strategy.** AC6 tests use a temp git repo with a bare
   remote, mimicking origin/main behavior. They exercise the worktree-isolation
   PRIMITIVES + the multi-writer push race that the wrapper isolates against
   — they do NOT invoke the full `_run_reviewer.sh` end-to-end (which requires
   `codex exec`, not available in CI). AC6.4's pre-flight GC logic is
   replicated inline in the test (same bash sequence the wrapper runs).
   This matches the spec's "tests MUST be runnable via the existing project
   test harness" bar.

## Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| AC1 — reviewer wrapper in worktree, 4 handoffs, unified cleanup, pre-flight GC | PASS | Inline in `_run_reviewer.sh`; same-reviewer-overlap + journal-before-cleanup prose in reviewer skills |
| AC2 — watcher worktree | PASS | New Step 0 in `skills/review-queue-watch.md` |
| AC3 — merger worktree + sentinel-lock deleted | PASS | New Step B; grep in skills/ tools/ .claude/ tests/ wiki/ returns 0 hits |
| AC4 — cursor IDE worktree prose | PASS | Binding-specific notes section in `skills/review-queue-cursor.md` |
| AC5 — push-with-retry CWD-agnostic + HEAD:main refspec | PASS | Verified by test `(d)`: `git rev-parse origin/main` matches WT HEAD after worktree push |
| AC6 — 5 collision-simulation tests + CWD-agnostic tests | PASS | 9 new tests, all green |
| AC7 — zero residual sentinel-file references | PARTIAL — see decision 2 | `docs/BACKLOG.md` has 2 founder-owned-prose hits; agent cannot edit per AGENT_INSTRUCTIONS |

## Verbatim test output

```
$ npm test (full suite)
Test Files  70 passed | 1 skipped (71)
Tests       936 passed | 21 skipped (957)

$ npm test -- tests/review-queue/push-with-retry-cwd-agnostic.test.ts tests/review-queue/worktree-isolation.test.ts
Test Files  2 passed (2)
Tests       9 passed (9)

$ npm run typecheck
(no output — clean)

$ npm run lint
(no output — clean)

$ bash tools/sync-skills.sh --check
OK: all adapters match canonical skills/

$ grep -rn echo-merge-in-progress -- skills/ tools/ .claude/ tests/ wiki/
(no matches)

$ grep -rn echo-merge-in-progress -- docs/
docs/BACKLOG.md:23:| HIGH | [2026-05-14-051-merge-lock-cross-vendor-enforcement] ... reads .git/echo-merge-in-progress and exits 0 cleanly when present ...
docs/BACKLOG.md:24:| HIGH | [2026-05-14-050-worktree-isolation-for-multi-step-main-writers] ... only merge-and-cleanup honors the .git/echo-merge-in-progress sentinel-file lock ...
```

## Open questions for the founder

1. **AC7 strict reading vs `docs/BACKLOG.md` no-write rule.** The grep
   verification across `docs/` returns 2 hits in the founder-owned backlog
   tracking table. The spec text for AC7 explicitly includes `docs/` in the
   grep scope, but AGENT_INSTRUCTIONS forbids the builder from editing
   `docs/BACKLOG.md` ("founder regenerates manually after approval").
   Decision: comply with AGENT_INSTRUCTIONS; surface the 2 hits as
   founder-cleanup work, not as a 050 builder-loop concern. Either the
   founder removes the literal string from those row descriptions
   post-merge (1 minute), or they decide those mentions are historical
   tracking context (analogous to the journal's `raw/` carve-out at AC7
   line 129) and the spec-text "docs/" inclusion was over-broad.

## Drift events caught

None. Single-pass implementation against the converged spec; no
"while I'm in here" temptations triggered. The sentinel-file deletion
was the only mechanically-tempting widening (e.g. `tools/echo-worktree-doctor.sh`
or push-failure preservation) and the spec's §"Out of Scope" + "After
Completion (Strategist Notes) — Possible followup specs" sections
explicitly carved both out to followup-D/F.

## Cross-tool collision note (meta — the bug fixes itself in flight)

Mid-handoff, the founder's main checkout was in an unstaged-modifications-on-052
state from a parallel watcher tick — the same `.git/index` race surface the
050 spec targets, manifesting on the repo while landing the fix. By the time
I returned to the main repo to run `ensure_stage`, the unstaged state had
cleared (presumably the watcher session committed and pushed). Once 050 ships
and `merge-and-cleanup` runs in `$TMPDIR/echo-merger-<uuid>` instead of the
live checkout, this exact race becomes structurally impossible.

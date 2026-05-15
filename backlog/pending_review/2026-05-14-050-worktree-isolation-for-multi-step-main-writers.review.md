---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
verdict: merge with founder fixups
reviewed_at: 2026-05-15T08:26:02Z
test_counts: { passed: 936, failed: 0, skipped: 21 }
---

## Verdict

The implementation faithfully realizes the 050 spec across all seven acceptance criteria. The shared bash worktree-lifecycle is well-encapsulated in `tools/review-queue/_run_reviewer.sh` and prose-mirrored in `skills/{review-queue-watch,merge-and-cleanup,review-queue-cursor,review-queue-codex,review-queue-codex-ops}.md`. `push-with-retry.sh` is CWD-agnostic with the load-bearing `HEAD:main` refspec. 9 new tests pass; the full suite is 936 passed / 21 skipped (matches pre-existing baseline). Lint + typecheck clean. `sync-skills.sh --check` passes. No merge conflicts predicted — main has not diverged on any `files_to_modify`. The two residual `echo-merge-in-progress` hits in `docs/BACKLOG.md` are legitimately founder-owned tracking-table prose (row descriptions for items 050 and 051 explaining the convention being deleted), not builder oversight; the additional 4 hits in `tests/review-queue/worktree-isolation.test.ts` are negative assertions for AC6.5 and correctly preserve the literal string as test invariant. Recommend **merge with founder fixups** — the founder removes the two `docs/BACKLOG.md` literal mentions in a 1-minute post-merge edit (or extends AC7's `raw/` carve-out wording in a doc tweak).

## Acceptance status
- AC1 — Met — `tools/review-queue/_run_reviewer.sh:70-145` implements pre-flight prune→enumerate→GC, fail-on-unset-`$TMPDIR`, `git worktree add --detach`, all four child handoffs (`cd "$WT"`, `ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"`, `PROMPT="$WT/.claude/commands/${SLASH_COMMAND}.md"`, `codex exec -C "$WT"`), unified `EXIT`/`ERR`/`INT`/`TERM` cleanup. Same-reviewer overlap guard + journal-before-cleanup encoded in canonical reviewer prose (`skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md`).
- AC2 — Met — `skills/review-queue-watch.md:7-58` adds Step 0 pre-flight + worktree create + traps; rest of watcher steps run in `$WT`. Cleanup ordering documented at end of file.
- AC3 — Met — `skills/merge-and-cleanup.md` Step B rewritten to create `$TMPDIR/echo-merger-<uuid>`; sentinel-lock deletion verified (`grep` returns no skill/tool/.claude hits outside `docs/BACKLOG.md` and test negative-assertion file); C11 push uses `git push origin HEAD:main`; failure-modes table line removed.
- AC4 — Met — `skills/review-queue-cursor.md` body adopts identical worktree lifecycle for Cursor IDE-mode reviewer; binding-specific note section added per 047 precedent (diff +70 lines).
- AC5 — Met — `tools/review-queue/push-with-retry.sh:39-55` resolves toplevel via `git rev-parse --show-toplevel`, uses `git push origin HEAD:main`, writes `queue-errors.md` under invoking toplevel. Test (d) asserts `git rev-parse origin/main` == WT HEAD.
- AC6 — Met — `tests/review-queue/worktree-isolation.test.ts` covers AC6.1–AC6.5; `tests/review-queue/push-with-retry-cwd-agnostic.test.ts` covers AC5 (a)/(b)/(c)/(d); all 9 tests pass.
- AC7 — Partial — `grep -rn echo-merge-in-progress -- skills/ tools/ .claude/ docs/ tests/ wiki/` returns 6 hits: 2 in `docs/BACKLOG.md` (founder-owned tracking-table; agent correctly identified as out-of-builder-scope per AGENT_INSTRUCTIONS), 4 in `tests/review-queue/worktree-isolation.test.ts` (AC6.5 negative-assertions for the very deletion guarantee — removing them would defeat the test). The spec's `MUST return zero hits` language did not anticipate either category. Both are legitimate residuals; founder action recommended for `docs/BACKLOG.md`.

## Drift findings
No drift detected. The diff is tightly scoped to the 14 declared `files_to_modify`. No new Python helper (R2 simplification honored). No `flock`/scheduler/sentinel-retention. No launchd plist changes. No builder-worktree migration. No retro-cleanup of `ec2907f` or `backup/codex-ops-r6-bad-local-merge`. Agent's "scope-conservative decisions" (untouched `run-codex-reviewer.sh`/`run-codex-ops-reviewer.sh`, no `echo-worktree-doctor.sh`, no push-failure preservation, no race-tight launchd-overlap fix) all align with the spec's explicit "Out of Scope" enumeration.

## Design-choice judgments
- Leaving `run-codex-reviewer.sh` + `run-codex-ops-reviewer.sh` untouched — **stand**. They're 5-line drivers that `exec _run_reviewer.sh`; AC1 propagates automatically. Modifying them would add a no-op diff line.
- Filing `echo-worktree-doctor.sh` as 050-followup-F — **stand**. Spec explicitly defers this; AC6.4 verifies the founder-data-loss guard, which is the load-bearing property.
- Filing push-failure preservation as 050-followup-D — **stand**. Spec explicitly defers; R2 simplification rationale documented in body §"Out of Scope" and §"Crash semantics".
- Filing reviewer/watcher origin-aware terminal check as 050-followup-E — **stand**. Pre-existing race, not introduced by 050.
- Filing race-tight same-reviewer launchd-overlap fix as 050-followup-G — **stand**. The R3 pre-commit re-fetch+no-op-exit guard (in `skills/review-queue-codex{,-ops}.md` step 5) narrows the window; the loser's noisy tick re-fires cleanly.
- Two residual `docs/BACKLOG.md` hits flagged as founder-cleanup — **stand**. AGENT_INSTRUCTIONS forbids the builder from editing `docs/BACKLOG.md`; founder removes the literal strings in a 1-minute post-merge edit OR extends AC7 wording to exempt the founder-regenerated tracking table.

## Bugs/risks
- `tools/review-queue/_run_reviewer.sh:122-123` — the `EXIT` and `ERR` traps both call `cleanup`, but bash's `trap '... ; exit 1' ERR` then re-enters cleanup via EXIT, causing `git worktree remove --force` to be called twice on the same path. The second call is best-effort guarded by `|| true`, so this is benign in practice but noisy. Minor; not a merge-blocker.
- `tools/review-queue/_run_reviewer.sh:140` — `codex exec -C "$WT" --sandbox danger-full-access - < "$PROMPT"` runs under `set +e` then `set -e` re-applies; if the prompt file content is empty/malformed, codex's exit code surfaces correctly. OK.
- `skills/review-queue-watch.md` Step 0 — the watcher `cd`s to live checkout for pre-flight, then `cd "$WT"`. If pre-flight fails partway (e.g. find errors), Step 0's traps aren't yet installed (they're set after `git worktree add`). A pre-`worktree add` failure leaves the live checkout in the founder's CWD without cleanup, but no worktree exists so no leak. Acceptable.
- `tools/review-queue/push-with-retry.sh:40` — the loop `for attempt in 1 2` is unchanged from pre-050 behavior; ok. No regression risk.
- AC6.5 test file contains the literal `echo-merge-in-progress` 4 times — necessary for the negative assertion; cannot remove without weakening the test. AC7 grep wording in the spec should have carved out test negative-assertions explicitly.

## Merge-conflict preview
- No merge conflicts expected — main has not diverged on any of the 14 `files_to_modify`. `git merge-base main agent/worktree-isolation-for-multi-step-main-writers` = `f6d4e3b`; commits on main since are all review-queue churn (053 reviewer ticks, 052 dispatch rounds) and none touch the 14 files.

## Suggested fixups
### Pre-merge punch list (blockers)
- (none — verdict is merge with founder fixups; the post-merge `docs/BACKLOG.md` edits below are not strictly blocking)

### Non-blocking follow-ups
- Founder: remove the literal string `echo-merge-in-progress` from the row descriptions for items 050 + 051 in `docs/BACKLOG.md:23-24` (e.g. rephrase as "the sentinel-file lock convention" or quote it as `` `.git/echo-merge-in-progress` `` — though even backticked the grep still hits; rewording is cleanest). Alternative: extend AC7 wording in any future "AC7-style" specs to carve out (a) `docs/BACKLOG.md` row descriptions and (b) test negative-assertions.
- Followups D/E/F/G are pre-recorded in spec body; no action needed at merge time.
- Minor: collapse the duplicate cleanup call in `_run_reviewer.sh` ERR+EXIT trap pair to a sentinel-guarded variant (`[ -n "${CLEANED:-}" ] && return 0; CLEANED=1`) — purely a cosmetic noise reduction in failed-tick log output.

## Test counts observed
- npm test: 936 passed / 0 failed / 21 skipped (71 test files, all green)
- npm run lint: pass (eslint + python task-state lint both clean)
- npm run typecheck: pass (`tsc --noEmit` clean)
- AC7 grep: 6 residual hits — 2 in `docs/BACKLOG.md:23-24` (founder-cleanup, agent flagged), 4 in `tests/review-queue/worktree-isolation.test.ts:360-363` (AC6.5 negative-assertions, legitimate)

---
id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
title: Merge-lock cross-vendor enforcement + push-with-retry --rebase-merges — interim two-prong fix until 050 ships
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-051-merge-lock-cross-vendor-enforcement
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/review-queue/push-with-retry.sh                  # AC1 — switch `git pull --rebase` to `git pull --rebase --rebase-merges` so in-flight merge commits survive the retry rebase
  - tools/review-queue/_run_reviewer.sh                    # AC2 — read .git/echo-merge-in-progress before any reviewer-tick git add/commit; if present, log "merge in progress; skipping tick" and exit 0
  - tools/review-queue/run-codex-reviewer.sh               # AC3 — confirm the codex-side launchd entrypoint inherits the AC2 gate via _run_reviewer.sh (no separate code path)
  - tools/review-queue/run-codex-ops-reviewer.sh           # AC3 — same for codex-ops launchd entrypoint
spec_refs:
  - backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # 051 IS the interim fix; 050 deletes the .git/echo-merge-in-progress sentinel-file lock convention entirely as part of structurally removing the multi-writer race surface. 051 strictly extends today's one-sided lock to the codex-side reviewer launchd ticks AND fixes the rebase-merges flatten in push-with-retry.sh — both fixes become moot once 050 ships and the lock convention is deleted. Builder MUST read 050 §"DELETE `.git/echo-merge-in-progress` convention" (AC3) before touching 051 to confirm: (a) 051 does not introduce any NEW lock primitive (no flock, no scheduler, no broader lock system); (b) 051 only extends the existing one-sided sentinel-file convention to one additional reading surface (codex-side reviewer ticks); (c) the work is throwaway when 050 lands.
  - skills/merge-and-cleanup.md                            # Step B — current writer of `.git/echo-merge-in-progress` (LOCK="$GIT_DIR/echo-merge-in-progress" on line 61). 051 reads this file from the codex-side reviewer wrappers; the file's CONTENTS are not used (just existence), so no schema concerns.
  - tools/review-queue/push-with-retry.sh                  # Current `git -c rebase.autoStash=true pull --rebase origin main && git push origin main` line 25; AC1 changes only the rebase mode, not the autostash, retry budget (2 attempts), refspec, or the queue-errors.md PUSH-RACE-FALLBACK terminal-failure logging.
  - backlog/_followups.md                                  # Lines 754-755 document this as a HIGH recurring-class friction-fix candidate — the 048-morning collision (commit ec2907f) AND 049-evening collision are the same root cause: codex-side reviewer launchd ticks bypass the merge-and-cleanup sentinel-file lock, AND push-with-retry.sh's plain `--rebase` flattens in-flight merge commits.
  - raw/internal/dogfooding/mcp-interactions-journal.md    # 2026-05-14 evidence of the bug class: the 14:02 PDT collision atom (codex reviewer launchd tick PID 69375 swept Claude's staged 048 conflict-resolution into commit ec2907f), and the 049-evening recurrence cited in _followups.md. Both incidents are the same two-prong gap that 051 closes interim.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Merge-lock cross-vendor enforcement + push-with-retry `--rebase-merges`

## Why this spec exists

On **2026-05-14**, the same root cause produced two separate `main`-corruption incidents in one day:

1. **Morning (14:02 PDT, item 048 merge):** A codex-side reviewer launchd tick (`com.echo.review-queue-codex`, PID 69375) ran `git add` + `git commit` against the live `.git/index` while a Claude `merge-and-cleanup` session had Claude's staged 048 conflict-resolution work in flight. The codex commit (`ec2907f review-r6: codex-ops on 2026-05-14-049-codex-skill-adapter`) captured BOTH file sets. Recovery required soft-reset, branch backup (`backup/codex-ops-r6-bad-local-merge`), abandoning the 048 merge cycle for the morning, and a manual main-state cleanup.
2. **Evening (049 merge cycle):** `tools/review-queue/push-with-retry.sh` ran `git pull --rebase origin main` against an in-flight merge commit during the second reviewer / merger overlap. Because the script omits `--rebase-merges`, the rebase **flattened** the in-flight merge commit's structure — a known git semantic where a non-rebase-merges rebase replays the merge's first-parent linear history without preserving the merge node. Same operational outcome: corrupted `main` requiring manual recovery.

`backlog/_followups.md` lines 746 and 754–755 file both incidents under the **same recurring-class HIGH** ("merge-lock cross-vendor gap, SECOND occurrence today"). Two-prong gap diagnosis:

- **Prong 1 (the lock gap):** `skills/merge-and-cleanup.md` writes a sentinel file at `.git/echo-merge-in-progress` to defend against parallel writers (Step B, lines 56–73). `grep -rn echo-merge-in-progress skills/ tools/ .claude/` returns exactly two hits, both inside `merge-and-cleanup.md` itself. **No other binding reads or writes that file.** The codex-side reviewer launchd ticks (`tools/review-queue/_run_reviewer.sh`, invoked by `run-codex-reviewer.sh` + `run-codex-ops-reviewer.sh`) operate on `.git/index` with zero awareness of the convention. The lock is one-sided by construction.
- **Prong 2 (the rebase-merges gap):** `tools/review-queue/push-with-retry.sh` line 25 runs `git -c rebase.autoStash=true pull --rebase origin main && git push origin main` in a 2-attempt retry loop. `git pull --rebase` defaults to non-interactive linear rebase, which destructively flattens any merge commit being rebased over. When a merge commit is in flight on the local branch and `push-with-retry.sh` retries on a non-fast-forward push reject, the rebase silently rewrites the merge as a sequence of non-merge commits (or, worse, drops the merged branch's commits if the conflict-resolution semantic differs).

**This spec ships the minimum interim fix — extending the existing one-sided sentinel-file convention to the codex-side reviewer ticks (one additional reading surface), and fixing the `push-with-retry.sh` rebase-merges flag.** Both fixes are deliberately narrow; both are throwaway when 050 lands.

## Critical context — 050 supersedes 051

`backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` is the **structural fix** for the bug class 051 addresses tactically. 050's AC3 explicitly DELETES the `.git/echo-merge-in-progress` sentinel-file lock convention from `skills/merge-and-cleanup.md` AND `.claude/commands/merge-and-cleanup.md`, and asserts via grep gate (AC7) that zero residual references survive in `skills/`, `tools/`, `.claude/`, `docs/`, `tests/`, or `wiki/`. The 050 architecture is "no automation writes to the founder's live `main` checkout's index or HEAD" via per-tick worktrees — removing the multi-writer race surface entirely rather than coordinating over it.

**051's job is to bridge the gap between today and 050-ship-time.** 050 is a 1–1.5d build with several files modified, multiple new test scenarios, and a test harness that did not previously exercise worktree-isolation collision shapes. 051 is two trivial edits totalling ~10 lines of shell. The expected ordering:

1. 051 lands first (this spec) — closes the bleeding incident class TODAY.
2. 050 lands shortly after — deletes the sentinel-file lock convention; 051's AC2 + AC3 lock-honoring code becomes dead code that 050's grep gate removes.
3. 051's AC1 (`--rebase-merges` flag in `push-with-retry.sh`) **survives 050** because 050 does not modify `push-with-retry.sh`'s rebase semantics. The `--rebase-merges` flag is a permanent improvement orthogonal to the worktree-isolation lock-deletion work.

**Builder MUST verify 050 has not already landed before claiming 051.** If 050 has merged to `main` between this spec being authored and the builder's claim, 051's AC2 + AC3 are no-ops (the file 051 reads no longer exists by spec). In that case: skip AC2 + AC3, ship AC1 (`--rebase-merges`) only, and note in `agent_notes` that "050 superseded AC2/AC3 pre-claim."

## Acceptance Criteria

### AC1 — `push-with-retry.sh` uses `--rebase-merges`

- **Modified file:** `tools/review-queue/push-with-retry.sh` line 25.
- **Change:** `git -c rebase.autoStash=true pull --rebase origin main && git push origin main` becomes `git -c rebase.autoStash=true pull --rebase=merges origin main && git push origin main`. Single-flag-value change (`--rebase` → `--rebase=merges`). The standalone `--rebase-merges` flag is NOT accepted by `git pull` (exits 129 "unknown option rebase-merges"); the supported form is `--rebase=(false|true|merges|interactive)` per `git pull -h`. No other change to the script. (R1 codex F1 fix — codex verified the bad form empirically with exit 129.)
- **Preserved:** the 2-attempt retry budget, the autostash directive, the `git push origin main` refspec, the queue-errors.md `PUSH-RACE-FALLBACK` terminal-failure logging, and the script's exit-1-on-both-attempts-failed contract.
- **Test:** new shell-driven test `tests/review-queue/push-with-retry-rebase-merges.test.ts` (or `.sh` if the existing test harness supports shell tests — verify by reading `package.json` and existing `tests/review-queue/concurrency.test.ts` BEFORE writing). The test sets up:
  1. A throwaway repo with an `origin` remote.
  2. On `main`: an in-flight merge commit (created via `git merge --no-ff feature-branch` against a 2-commit feature branch).
  3. A concurrent push from a sibling clone that lands a non-conflicting commit on `origin/main` first, forcing the local branch into a non-fast-forward state.
  4. Invokes `push-with-retry.sh "test-context"`.
  5. **Asserts:** the merge commit's two-parent shape is preserved on `origin/main` post-push — `git rev-parse origin/main^2` returns non-error (asserting the merge is preserved as a merge), AND the `^2` commit's tree matches the original feature-branch tip's tree (`git rev-parse origin/main^2^{tree}` equals the pre-rebase feature tip's tree). Do NOT assert SHA equality with the pre-rebase feature tip — `--rebase=merges` rewrites the merged side's commits onto the new base, so the `^2` SHA changes even though the tree/content is preserved (R1 codex F2 — empirically reproduced). Without `--rebase=merges` (i.e., under the buggy `--rebase` default), the rebase replays the merge as a single linear commit and `^2` returns "unknown revision" — that is the load-bearing differential the test detects.

### AC2 — Reviewer queue scripts honor `.git/echo-merge-in-progress` before any `git add` / `git commit`

- **Modified file:** `tools/review-queue/_run_reviewer.sh` (the shared headless reviewer wrapper invoked by both `run-codex-reviewer.sh` and `run-codex-ops-reviewer.sh` — single source of truth per 043 AC3, so a single edit covers both reviewers).
- **Lifecycle insertion point:** after the existing `cd "$REPO_ROOT"` + `git rev-parse --git-dir` checks (lines 17–26), AFTER the `_reviewer_gate.py` validation (line 45), AND **AFTER the `LOG_DIR` / `LOG_FILE` / `mkdir -p` / rotation block (lines 47–57)**, but BEFORE the codex child invocation (line 69). The lock check MUST follow log setup because the lock-present branch writes a skip line to `$LOG_FILE`, and `_run_reviewer.sh` runs under `set -euo pipefail` — a lock check at line 46 would hit unbound `$LOG_FILE` and turn the intended `exit 0` skip into a non-zero crash. (R1 codex-ops F1 fix.) The lock check is wrapper-side, not prompt-side, so the codex child never starts when the lock is held — saving the ~10-30s of codex initialization cost AND eliminating any window where the codex child could race the lock between read and `git add`.
- **Lock file path:** `.git/echo-merge-in-progress` resolved via `LOCK_PATH="$(git rev-parse --git-common-dir)/echo-merge-in-progress"`. **`--git-common-dir`, not `--git-path`** — `git rev-parse --git-path echo-merge-in-progress` resolves to `.git/worktrees/<name>/echo-merge-in-progress` inside a linked worktree (R1 codex F3 + codex-ops F2 convergent), which would miss the sentinel that `merge-and-cleanup.md` writes to the main checkout's `.git/echo-merge-in-progress`. `--git-common-dir` resolves to the SHARED `.git` directory from any worktree, so the lock check sees the writer's sentinel regardless of CWD.
- **Behavior on lock present:**
  1. Append a single tick-log line to the existing `$LOG_FILE` (`$HOME/Library/Logs/echo-review-queue-${REVIEWER_NAME}.log`): `[<UTC ISO ts>] tick skipped: merge in progress (lock=<path>, holder=<lock contents>)`. The "holder" is the contents of the lock file (single line: `<id> @ <ts> by <pid>` per `merge-and-cleanup.md` line 69). Logging the holder makes operator debugging trivial when reading the rotation log.
  2. Exit 0 cleanly (NOT non-zero — a merge being in progress is the EXPECTED transient state, not a tick failure; non-zero would pollute launchd's failure-counting and could trigger backoff).
  3. **No git operations are run** (no `git add`, no `git commit`, no `git pull`, no `push-with-retry.sh` invocation). The reviewer prompt body never executes; codex is never spawned.
- **Behavior on lock absent:** the wrapper continues to its existing line 47 (LOG_DIR setup) unchanged.
- **No in-script polling.** The launchd cadence (~10 min for both `com.echo.review-queue-codex` and `com.echo.review-queue-codex-ops`) is the natural retry. If the merge is still in progress on the next tick, the lock check fires again and exits 0 again. A typical merge-and-cleanup session takes 1–3 minutes (rarely up to 10–15 with founder conflict-resolution pauses), so worst-case 1–3 launchd ticks no-op cleanly before the lock releases.
- **Test:** new shell-driven test `tests/review-queue/run-reviewer-honors-merge-lock.test.ts` (or `.sh`):
  1. Set up a throwaway repo with `.git/echo-merge-in-progress` containing `test-id @ <ts> by 12345`.
  2. Set `REVIEWER_NAME=codex` and `ECHO_REVIEW_QUEUE_REPO_ROOT=<test-repo>`.
  3. Stub `codex` on `$PATH` to a script that writes `CODEX_INVOKED=true` to a fixture file when called (so the test can detect any false-positive child invocation).
  4. Invoke `_run_reviewer.sh`.
  5. **Assert:** exit code 0; the fixture file does NOT contain `CODEX_INVOKED=true` (codex was never spawned); the rotation log at `$HOME/Library/Logs/echo-review-queue-codex.log` (use a temp `$HOME` for test isolation) contains a `tick skipped: merge in progress` line with the lock holder string `test-id @ <ts> by 12345`.
  6. Remove the lock file. Re-invoke. **Assert:** the codex stub IS invoked (the wrapper proceeds past the gate when lock absent).

### AC3 — Lock honored by all three headless-reviewer entrypoints

- **No code change required beyond AC2** — `run-codex-reviewer.sh` and `run-codex-ops-reviewer.sh` are 5-line `exec env REVIEWER_NAME=<slug> _run_reviewer.sh` drivers (verified in this spec's authoring; see `tools/review-queue/run-codex-reviewer.sh` and `tools/review-queue/run-codex-ops-reviewer.sh`). The AC2 lock check inside `_run_reviewer.sh` automatically applies to both.
- **Verification gate (must run as part of the build):** `grep -L 'echo-merge-in-progress' tools/review-queue/run-codex-reviewer.sh tools/review-queue/run-codex-ops-reviewer.sh` returns BOTH files (i.e., they do NOT contain the string directly — they get it via `_run_reviewer.sh`). This is a defensive check that no future drift adds a parallel lock-check to the per-reviewer drivers.
- **Test extension of AC2:** the same test from AC2 is parameterized on `REVIEWER_NAME=codex` AND `REVIEWER_NAME=codex-ops`. Both must pass (skip + exit 0 when lock present; codex stub invoked when lock absent).
- **Cursor reviewer is explicitly out of scope for AC3.** Cursor reviewer ticks (`mode: ide` per `reviewers.json`) are not launchd-fired and do not invoke `_run_reviewer.sh` (`_reviewer_gate.py` rejects IDE-mode reviewers per the 043 contract). Adding a lock check to Cursor's IDE-driven reviewer would require editing `skills/review-queue-cursor.md` prose — but per the founder's 2026-05-14 directive ("cursor explicitly excluded — IDE-mode unreliability per 042 gap #6"), Cursor is not part of the in-flight reviewer roster for this spec or any other in-flight spec today. If Cursor reviewer ticks are reactivated in the future, a separate followup spec extends the lock convention to `skills/review-queue-cursor.md` prose — OR by then 050 has shipped and the convention is gone.

### AC4 — Explicit "Out of Scope (Don't Drift)" enumeration

The "Out of Scope (Don't Drift)" section (below) lists, at minimum:

- No new lock primitive (no `flock`, no kernel locks, no system-wide coordination layer, no daemon, no scheduler).
- No retry / polling logic inside `_run_reviewer.sh` for the lock-present case (the launchd cadence IS the retry; in-script polling would deadlock against the strategist's debugger if the lock holds for hours).
- No changes to `merge-and-cleanup.md`'s lock-acquisition logic (Step B, line 61). 051 only adds READING surfaces; the WRITER surface stays untouched.
- No changes to `commit-reviewer-response.sh` (the pre-link / post-link helper invoked by reviewer prompts). The lock check sits in the OUTER wrapper, not the inner per-response helper, so a tick that's already past the lock check doesn't need a re-check inside the response commit step (the worst case — a merge starts AFTER a reviewer tick passed the lock check — is the exact bug class 050 fixes structurally; 051 narrows but does not close that race).
- No `--rebase-merges` change anywhere OTHER than `push-with-retry.sh` line 25. In particular: do NOT add it to `merge-and-cleanup.md`'s C11 push step (that step uses a different push form).
- No deletion of the lock file by 051 — only `merge-and-cleanup.md`'s `trap` (line 70) cleans up the lock. If a launchd reviewer tick ever sees a stale lock (merge died, trap didn't fire), 051's behavior is "skip and exit 0"; the founder's manual `rm .git/echo-merge-in-progress` is the only cleanup path. This matches today's `merge-and-cleanup.md` operator-recovery prose (Step B lines 64–66).
- No retro-conversion of past collision artifacts. `backup/codex-ops-r6-bad-local-merge` and the `ec2907f` historical commit stay as forensic evidence.
- 050 supersession note: when 050 lands, 051's AC2 + AC3 changes become dead code that 050's grep gate (AC7) removes. 051's AC1 (`--rebase-merges`) survives 050.

### AC5 — Backoff behavior is "exit 0 and wait for next launchd cadence"

- **No in-script polling.** AC2's lock-present path exits 0 immediately. The next launchd-fired tick (~10 min later for both codex and codex-ops jobs per their existing plist `StartInterval`) re-checks the lock organically. If the merge is still in progress, that tick also exits 0. No exponential backoff, no max-skip counter, no escalation — just "skip cleanly, the OS scheduler retries."
- **Why not poll in-script:** `merge-and-cleanup.md`'s Step B can pause indefinitely on founder conflict-resolution (the test harness for 045 verified one path waited 6+ minutes). An in-script poll loop in `_run_reviewer.sh` would either (a) block launchd's per-tick concurrency contract (each tick should complete deterministically), or (b) deadlock against the strategist who's editing files in the live checkout. Exit-0-and-wait is the safe default.
- **Operational visibility:** the rotation log accumulates one `tick skipped: merge in progress` line per skipped tick. If the founder ever sees the same lock holder string across 5+ consecutive ticks (~50 minutes), it indicates a dead lock — the rotation log IS the operator dashboard for this case. No new dashboard or alerting infrastructure required.
- **Test (covered by AC2's test):** the AC2 test asserts exit 0 + log line shape; AC5's "exit-0-not-poll" property is implicit in the AC2 test's "no codex child invocation" assertion (a polling loop would either eventually invoke codex when the lock cleared, or hang the test — both detectable).

### AC6 — Builder verification + journal entry on completion

- After AC1–AC5 land, the builder MUST run:
  1. `bash tools/review-queue/push-with-retry.sh --help` (if the script supports it) OR `bash -n tools/review-queue/push-with-retry.sh` to syntax-check the AC1 edit.
  2. `bash -n tools/review-queue/_run_reviewer.sh` to syntax-check the AC2 edit.
  3. The new tests from AC1 + AC2 pass via the project's existing test runner (likely `npm test` per the 045 + 050 precedent — verify by reading `package.json`).
  4. `grep -rn echo-merge-in-progress -- tools/review-queue/` returns exactly the new AC2 reference in `_run_reviewer.sh` PLUS no other reviewer-queue surface.
- **Journal entry on push:** the builder appends an entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per the standard 6-field template, capturing the builder run as the "trigger" and noting whether 050 was already merged at claim time (which determines whether AC2 + AC3 were no-op'd per the supersession clause).

## Out of Scope (Don't Drift)

- **No new lock primitive.** No `flock`, no kernel-level locks, no daemon, no scheduler, no broader coordination layer. The architectural answer is 050 (worktree isolation removes the race surface entirely); 051 is the interim band-aid that extends the existing one-sided convention.
- **No in-script retry loop in `_run_reviewer.sh`.** Lock-present means exit 0 immediately and let the launchd cadence retry. Any in-script polling would deadlock against the strategist's interactive merge-and-cleanup session.
- **No changes to `merge-and-cleanup.md`.** 051 only adds READING surfaces (codex-side reviewer ticks). The WRITER surface (Step B's `echo "$ID @ ..." > "$LOCK"` and the cleanup `trap`) stays untouched. Editing `merge-and-cleanup.md` would conflict structurally with 050's deletion of the same file's lock prose.
- **No changes to `commit-reviewer-response.sh`.** The lock check is wrapper-level, not response-helper-level. A tick that already passed the wrapper lock check completes its response work even if a merge starts mid-tick. This narrows but does not close the race; closing the race is 050's job.
- **No `--rebase-merges` anywhere except `push-with-retry.sh` line 25.** In particular, do NOT add it to `merge-and-cleanup.md`'s C11 push step (that uses a different push form and is on 050's deletion path anyway).
- **No Cursor reviewer changes.** Cursor reviewer is `mode: ide` and does not invoke `_run_reviewer.sh` (`_reviewer_gate.py` rejects IDE-mode reviewers per 043). Cursor is also explicitly excluded from the current in-flight reviewer roster per the 2026-05-14 founder directive. Future Cursor reactivation is a separate followup spec — OR moot once 050 ships.
- **No lock cleanup logic in `_run_reviewer.sh`.** The lock is owned by `merge-and-cleanup.md`'s trap. Stale-lock recovery is operator-manual (`rm .git/echo-merge-in-progress`) per the existing prose.
- **No retro-conversion of collision artifacts.** `backup/codex-ops-r6-bad-local-merge` and `ec2907f` stay as forensic evidence. 051 prevents future collisions of this two-prong shape; it does not rewrite history.
- **No queue-errors.md schema changes.** The `PUSH-RACE-FALLBACK` row format from `push-with-retry.sh` (line 35) is preserved. AC1 changes ONLY the rebase mode flag.
- **No 050 supersession code in 051.** 051 does not include any "if 050 has shipped, no-op AC2/AC3" runtime check. The supersession is handled by 050's grep gate (AC7) deleting the AC2 reference at 050 build time. 051's builder verifies the supersession at CLAIM time (per the spec body's "Critical context" section) and proceeds accordingly.

## Risks / Open Questions

- **Risk R1 — TOCTOU race between AC2 lock check and codex child's git operations.** A merge could START AFTER the wrapper passes the lock check but BEFORE the codex child commits its response. 051 narrows the window from "entire reviewer tick" to "post-lock-check codex initialization + response generation + git add + commit" (~10–60s typical). Closing the residual race requires the structural fix in 050 (worktree isolation eliminates the shared `.git/index`). 051 explicitly accepts this residual race as the price of being a 1-day interim fix vs 050's 1-1.5d structural fix.
- **Risk R2 — `git rev-parse` primitive choice inside future worktrees.** Per the R1 convergent finding (codex F3 + codex-ops F2), `git rev-parse --git-path <name>` resolves to `.git/worktrees/<wt>/<name>` inside a linked worktree, NOT to the shared `.git/<name>` — so the original spec's `--git-path` choice would have silently missed the merge-and-cleanup writer's lock when the wrapper is invoked from a worktree CWD. AC2 now uses `git rev-parse --git-common-dir` plus `/echo-merge-in-progress`, which DOES resolve to the shared `.git/` from any worktree. Operators running `_run_reviewer.sh` interactively from a worktree CWD honor the lock written by the main checkout. (Spec value: R1 caught a real correctness bug before any code was written.)
- **Open Question Q1 — Should AC1's `--rebase-merges` test simulate the actual 049-evening crash, or just assert merge-commit preservation under a rebase-over-fast-forward-reject?** The narrower test (preserves the two-parent shape) is sufficient to falsify the bug. A full crash-replay test would require reproducing the exact merger / reviewer / push-with-retry interleaving, which is closer to the 050 AC6.2 collision-simulation territory. Keep AC1's test narrow; defer integration-shape testing to 050.
- **Open Question Q2 — Should 051's tests live under `tests/review-queue/` or a new `tests/merge-lock/` directory?** Recommendation: `tests/review-queue/` to match the 045 precedent (`tests/review-queue/concurrency.test.ts`, `tests/review-queue/045-pre-link-yaml-validation.test.ts`). New directory adds organizational debt with no benefit; the lock check IS reviewer-queue infrastructure.

## Definition of Done

1. AC1–AC5 implemented per their per-AC test specs.
2. `bash -n` syntax-checks pass on both modified shell scripts.
3. New tests pass; existing `tests/review-queue/*` tests remain green.
4. `grep -rn echo-merge-in-progress -- tools/review-queue/ skills/ .claude/` shows: the `merge-and-cleanup.md` writer references (today's two), AND the new AC2 reference in `_run_reviewer.sh` (one new). NO other surfaces. (Once 050 ships, this grep returns ONLY the AC2 reference, and the 050 builder removes it as part of AC7.)
5. Builder's journal entry on push captures the run AND notes 050's pre-claim merge state.
6. Builder run completes in well under the 0.5d estimate (the implementation is ~10 lines of shell across two files).

## After Completion (Strategist Notes)

- **No new wiki page.** 051 is interim infrastructure; the lock convention it extends is on 050's deletion path. The substantive wiki page about the multi-writer race surface lives under 050's "After Completion" plan (`wiki/operating-model/automation-worktree-isolation.md`). Promoting 051 to its own wiki page would create wiki content that's stale by the time 050 lands.
- **`docs/BACKLOG.md` row** lifecycle: add a Ready row when 051 is created (this spec); move to Pending Review on builder push; move to Complete on merge; delete when 050 ships and 051's AC2/AC3 become dead code (the row's historical reference can move to the BACKLOG retro section if it exists).
- **Manifest update:** none. No new wiki page → no `.manifest.json` change → no `tools/wiki_index.py` regeneration.
- **Possible followups (file under `backlog/_followups.md`, not auto-spec'd):**
  - **051-followup-A — Cursor reviewer lock-check** if Cursor IDE-mode reviewer is ever reactivated AND 050 has not yet landed. Mooted by 050; do not pre-spec.
  - **051-followup-B — Operator runbook entry** documenting the rotation log's `tick skipped: merge in progress` shape so a founder reading `~/Library/Logs/echo-review-queue-*.log` knows the line is benign. Bundle into the next operator-runbook update; not its own spec.
- **Cycle-shape expectation:** 051 is class:narrow, friction-fix, ~10 lines of shell + 2 small tests. Target round count: ≤2 (R1 + R2). Per the 049-retro decay-curve heuristic in `_followups.md`, if HIGH findings do not decrease R1→R2 OR new HIGHs originate from prior-round strategist patches (not the original spec), the strategist SIMPLIFIES and exits — does not iterate further.

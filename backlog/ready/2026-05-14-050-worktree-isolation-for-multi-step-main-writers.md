---
id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
title: Worktree isolation for multi-step main writers — reviewers + watcher + merger move into ephemeral worktrees; delete the one-sided merge-lock convention
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/review-queue/_run_reviewer.sh  # wrap the per-tick work in `git worktree add --detach $TMPDIR/echo-<role>-<uuid> origin/main` + cleanup
  - tools/review-queue/run-codex-reviewer.sh  # ensure top-level launchd entrypoint passes through the wrapper path
  - tools/review-queue/run-codex-ops-reviewer.sh  # same as above for codex-ops launchd target
  - tools/review-queue/push-with-retry.sh  # make CWD-agnostic so it works identically inside a worktree or in the live main checkout
  - skills/review-queue-watch.md  # watcher tick prose: run combine.py + disposition patches + next-round request.py inside `$TMPDIR/echo-watcher-<uuid>`
  - .claude/commands/review-queue-watch.md  # re-synced from canonical after the body change
  - skills/merge-and-cleanup.md  # merge runs inside `$TMPDIR/echo-merger-<uuid>` worktree; DELETE all references to `.git/echo-merge-in-progress` sentinel-file lock
  - .claude/commands/merge-and-cleanup.md  # re-synced from canonical after the body change
  - tools/review-queue/_lib.py  # add `prepare_isolated_worktree(role: str) -> Path` + `cleanup_worktree(path: Path)` helpers (shared by reviewer wrapper + watcher + tests)
  - tests/review-queue/worktree-isolation.test.ts  # NEW — collision-simulation tests (two reviewer ticks racing; reviewer tick during merger tick; watcher tick during reviewer tick; crashed-tick recovery on next start)
  - tests/review-queue/push-with-retry-cwd-agnostic.test.ts  # NEW — exercise push-with-retry.sh from a worktree CWD and from a main-checkout CWD; identical outcomes
spec_refs:
  - skills/merge-and-cleanup.md  # AC3 target — current sentinel-lock convention site (only file in repo that writes `.git/echo-merge-in-progress`); spec deletes that convention
  - tools/review-queue/_run_reviewer.sh  # AC1 target — current "writes directly to live main checkout" reviewer wrapper that caused the 2026-05-14 14:02 PDT collision
  - skills/review-queue-watch.md  # AC2 target — watcher prose; today's watcher writes combined.md + spec patches + next-round request.md all on main in sequence
  - tools/review-queue/push-with-retry.sh  # AC5 target — generalized to CWD-agnostic so worktree-based ticks reuse the same retry logic
  - skills/process-backlog.md  # design precedent — the existing builder pattern uses `~/Desktop/Project_echo--<slug>/` worktrees; 050 generalizes the isolation principle to non-builder roles, with a different path location (TMPDIR) reflecting ephemeral-vs-inspectable lifetime
  - raw/internal/dogfooding/mcp-interactions-journal.md  # live evidence of the bug class: 2026-05-14 14:02 PDT collision atom + 14:48 PDT entry where THIS spec's journal append hit "File has been modified since read" twice because codex was concurrently writing the same file (real-time manifestation of the asymmetric-isolation gap on the very file documenting it)

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

# Worktree isolation for multi-step main writers

## Why this spec exists

On **2026-05-14 14:02 PDT**, a Claude `merge-and-cleanup` session attempting to merge item 048 had its staged 048 conflict-resolution work *swept into a codex-reviewer commit* (`ec2907f review-r6: codex-ops on 2026-05-14-049-codex-skill-adapter`). The cause was structural, not unlucky timing: a parallel codex reviewer launchd-tick (PID 69375) ran `git add` + `git commit` inside the same shared `.git/index` while Claude had unpushed 048 staging in flight. The codex commit captured both file sets. Recovery required soft-reset, lock cleanup, and abandoning the 048 merge cycle for the day.

The merge-and-cleanup skill DOES use a sentinel-file lock at `.git/echo-merge-in-progress` to prevent this — but `grep -rn echo-merge-in-progress skills/ tools/ .claude/` returns exactly two hits, both inside `merge-and-cleanup.md` itself. **No other binding reads or writes that file.** Codex reviewer launchd, watcher, and codex-ops reviewer all operate on `.git/index` with zero awareness of the convention. The lock is one-sided by construction, and adding read-of-lock checks to every other surface multiplies the very prose-as-protocol surface that the collision proved is unreliable.

ECHO's whole design pitch (per `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`) is that `skills/<name>.md` is the *vendor-neutral peer protocol* — Claude Code, Codex, Cursor's Claude all run the same canonical prose. That protocol exists at the skill layer. **It does not exist at the substrate (git index / fs / process) layer.** Multiple bindings reach into the same `.git/index` as unrelated processes, with coordination implemented as prose conventions in one binding's skills. The 14:02 PDT collision is the first incident where this gap caused production damage; the journal entry at 14:48 PDT is a second, real-time instance (codex strategist and Claude strategist concurrently editing the SAME mcp-interactions-journal.md file during the brainstorm of THIS spec, triggering "File has been modified since read" errors on the Edit tool — the bug class manifesting on the file documenting the bug class).

Builders already solved this: `skills/process-backlog.md` puts all code work in `~/Desktop/Project_echo--<slug>/` worktrees with a feature branch. Two builders cannot collide because they share no `.git/index`. **The collision-prone roles are the ones that DIDN'T inherit the worktree discipline**: reviewers (one `<reviewer>.md` write + journal append + push), watcher (multi-step: combined.md + inline spec patches + next-round request.md + journal append), and merger (multi-step: merge commit + post-merge cleanup move + commit + push).

This spec generalizes the worktree-isolation discipline from builders to all roles that do **multi-step writes to `main`**, deletes the obsolete `.git/echo-merge-in-progress` sentinel-file lock, and explicitly does not introduce any new substrate-level coordination primitive (no `flock`, no scheduler, no broader lock system) — the architectural invariant being established is "no automation writes to the founder's live repo index," not "a new locking layer."

**Per codex strategist's cross-tool consult on Q1+Q2 (atom IDs `3dde6d66` + `f2ef7f5c`, ECHO-mediated):** scope locked at `{reviewers, watcher, merger}`; out-of-scope roles `{atomic-claim step, standalone interactive journal commits}` carved out for separate followups (different failure profile / behavioral discipline respectively).

## Architectural invariant

**No automated role writes to the founder's live `main` checkout's index or HEAD.** Any role that performs multi-step writes to `main` (a sequence of `git add` / `git commit` operations within one logical task, plus its `push`) executes those operations inside a per-tick throwaway worktree created with `git worktree add --detach $TMPDIR/echo-<role>-<uuid> origin/main`, pushes the resulting commit(s) to `origin/main` from there via the existing rebase-and-retry helper, and removes the worktree at tick end (success or failure).

Single-fast-commit roles (atomic-claim) and human-driven interactive roles (founder ad-hoc journal commits) are out of scope (see §"Out of Scope (Don't Drift)").

## Acceptance Criteria

### AC1 — Reviewer wrappers operate inside ephemeral worktrees

- **Modified file:** `tools/review-queue/_run_reviewer.sh` (the shared wrapper invoked by all three reviewer launchd entrypoints — `run-codex-reviewer.sh`, `run-codex-ops-reviewer.sh`, and any future per-reviewer wrapper).
- **Per-tick lifecycle (in this exact order):**
  1. In main repo: `git fetch origin main` (read-only — does NOT check out, does NOT touch live index).
  2. Compute `WT="$TMPDIR/echo-${MY_REVIEWER}-$(uuidgen)"`. Hard-fail if `$TMPDIR` is unset or empty (don't fall back to `/tmp` silently — surfacing the unset-env case is more useful than silently working in a different location than expected).
  3. `git worktree add --detach "$WT" origin/main`. Hard-fail and exit non-zero on error.
  4. `cd "$WT"`.
  5. Existing reviewer-tick work (scan `backlog/reviews/**/r*/request.md`, write `<reviewer>.md`, pre-link validate, etc.) executes here. ALL `git add` / `git commit` / `push-with-retry.sh` invocations from this point run inside `$WT` until cleanup. Journal append (`raw/internal/dogfooding/mcp-interactions-journal.md` + HTML regen) also happens in the worktree and is included in the same or a sibling commit, same as today.
  6. On normal exit: `cd` back to main repo, `git worktree remove --force "$WT"`, `git worktree prune`.
  7. On error exit (`trap` on `ERR` and on signal): same cleanup, but propagate the original exit code. Worktree dir is removed even on failure; lost-work is acceptable per §"Crash semantics" below.
- **Pre-flight hygiene (step 0, before step 1):** run `git worktree prune` in main repo, then `find "$TMPDIR" -maxdepth 1 -name 'echo-*' -mmin +60 -type d -exec rm -rf {} + 2>/dev/null || true`. This GCs any orphan dirs left by a crashed prior tick.
- **No behavioral change visible from `origin/main`'s perspective:** the same `<reviewer>.md` content lands at the same path with the same commit message shape via the same `push-with-retry.sh` retry semantics. Only the CWD of the writing process changes.
- **Applies to all three reviewer flavors:** codex (`MY_REVIEWER=codex`), codex-ops (`MY_REVIEWER=codex-ops`), cursor (`MY_REVIEWER=cursor`). Cursor's reviewer ticks are invoked from the IDE rather than launchd, but the skill prose in `skills/review-queue-cursor.md` (per AC4 below) directs them through the same wrapper.

### AC2 — Watcher tick operates inside an ephemeral worktree

- **Modified files:** `skills/review-queue-watch.md` (canonical) + `.claude/commands/review-queue-watch.md` (re-synced via `tools/sync-skills.sh` post-edit; do not hand-edit the .claude/commands copy).
- **Watcher prose updated** so that the entire post-`combine.py` work (in order: combine; on `{proceed*, pushback}` boundary or single-reviewer-timeout escalate-to-founder; otherwise disposition findings inline by editing the spec; run `dispatch-next-round.py` for next round OR declare CLAIM-READY; journal append; commit + push) happens **inside `$TMPDIR/echo-watcher-<uuid>`** with the same `--detach origin/main` + cleanup pattern as AC1.
- **Multi-step write surface is the load-bearing case for AC2:** the watcher writes `combined.md`, then disposition patches to the spec file, then `r<N+1>/request.md` (via `dispatch-next-round.py`), then the journal entry — at minimum three to four distinct commits before the tick exits. Today every one of those goes through the live main `.git/index`; AC2 routes all of them through the worktree.
- **`dispatch-next-round.py` interaction:** the helper currently issues `git add` + writes its own commit logic where invoked; it must remain CWD-agnostic (any directory inside a worktree of the repo) so that running it from `$WT` works without modification. Tests under `tests/review-queue/dispatch-next-round.test.*` are expected to remain green; if they fail because of an undocumented CWD assumption, fix the helper, do not skip the test.

### AC3 — `merge-and-cleanup` runs inside an ephemeral worktree AND the sentinel-file lock is deleted

- **Modified files:** `skills/merge-and-cleanup.md` (canonical) + `.claude/commands/merge-and-cleanup.md` (re-synced post-edit).
- **Lifecycle update:** the entire per-item merge sequence (`merge --no-ff origin/agent/<branch>`, founder-pause-for-conflicts checkpoint, pre-merge fixups, verify, populate `review_notes`, move `pending_review/X.md → complete/X.md`, commit, delete branches local+remote, push) executes inside `$TMPDIR/echo-merger-<uuid>`. The founder-in-loop conflict-resolution checkpoints are preserved unchanged (their semantics — pause for human input on substantive conflicts — apply identically inside a worktree).
- **DELETE `.git/echo-merge-in-progress` convention:** remove every line referencing the sentinel file from the canonical body of `skills/merge-and-cleanup.md` AND from `.claude/commands/merge-and-cleanup.md`. Grep confirms today these are the only two locations; after this change, `grep -rn echo-merge-in-progress skills/ tools/ .claude/` MUST return zero hits. The spec body explains that the worktree pattern obviates the lock by removing the shared `.git/index` race; no defense-in-depth file lock is retained, because retaining one would re-create the prose-as-protocol surface the collision proved unreliable.
- **Migration note for in-flight items:** at merge time of 050 itself, if `.git/echo-merge-in-progress` happens to exist on the live checkout (e.g. founder forgot to clean up after a manual abort), the merger's worktree-mode does not read or care about that file. It is simply orphaned — the cleanup is a one-shot `rm` by the founder. The spec body documents this so future readers understand the file might persist for one cycle.

### AC4 — `skills/review-queue-cursor.md` directs Cursor-binding reviewer ticks through the same wrapper

- **Modified files:** `skills/review-queue-cursor.md` (canonical) + `.claude/commands/review-queue-cursor.md` (re-synced).
- Body updated so a Cursor-side reviewer tick, when invoked interactively from the Cursor IDE, follows the same worktree-tick lifecycle as the launchd-fired codex/codex-ops reviewers: pre-flight prune → `git worktree add --detach $TMPDIR/echo-cursor-<uuid> origin/main` → do the work → push → remove worktree. The cursor-side cannot share `_run_reviewer.sh` directly (Cursor's reviewer is not launchd-fired) but the prose lifecycle is identical.
- **Binding-specific note section** for "Claude Code"/"Cursor's Claude" added at the head of the skill body, mirroring the 047-precedent pattern in `skills/process-backlog.md`, so future bindings see worktree-isolation as a shared invariant rather than a Claude-Code-only quirk.

### AC5 — `push-with-retry.sh` is CWD-agnostic

- **Modified file:** `tools/review-queue/push-with-retry.sh`.
- The script today is invoked from the live main checkout. After AC5 it works identically when invoked from inside a worktree (`$WT` per AC1/AC2/AC3) or from the main checkout. Internal implementation MUST use `git rev-parse --show-toplevel` (or `--git-common-dir` if the script needs to reach into the main repo's `.git/`) to disambiguate; MUST NOT hardcode `~/Desktop/Project_echo`.
- **Push contract unchanged:** still pushes `HEAD:main` to `origin`; on non-fast-forward reject, fetches origin/main, rebases, retries up to N times (preserve today's value of N — do not tune in this spec); on retries-exhausted, exits non-zero with the rebase failure surfaced.
- **New test:** `tests/review-queue/push-with-retry-cwd-agnostic.test.ts` exercises both CWDs (main vs worktree) and asserts identical commit-pushed shape, identical retry behavior under simulated concurrent push, identical exit codes.

### AC6 — Tests exercise the collision-prone surfaces

- **New file:** `tests/review-queue/worktree-isolation.test.ts`. At minimum the following scenarios MUST be covered (use the existing test harness pattern from `tests/review-queue/concurrency.test.ts` for any push-race setup):
  - **AC6.1 — two simultaneous reviewer ticks for the same round** (codex + codex-ops, both pulling the same `r<N>/request.md`): both ticks succeed; each produces its own `<reviewer>.md` at the correct path; no `git add` collision; no rebased-into-other-reviewer-commit sweep (the 2026-05-14 bug). Expected outcome: first push wins, second tick's `push-with-retry.sh` rebases over the first and lands cleanly.
  - **AC6.2 — reviewer tick fires during an in-flight merger tick** (the exact 2026-05-14 14:02 collision shape): both succeed independently; neither's commit captures the other's staged work; final `origin/main` state contains both expected commits (the reviewer's response + the merger's merge commit) in some order, with no cross-contamination.
  - **AC6.3 — watcher tick fires during a reviewer tick:** identical isolation property; watcher's `combined.md` + spec patches + next-round dispatch + journal commits land cleanly; reviewer's response commit lands cleanly; no shared-index race.
  - **AC6.4 — crashed-tick recovery on next start:** simulate a tick that creates a worktree, writes a partial commit, and is killed (SIGKILL) before push or cleanup. Next tick start runs pre-flight prune + finds the >60-min orphan dir → removes it via `find ... -mmin +60 -exec rm -rf {} +` AND runs `git worktree prune` to clean admin data. Both the worktree dir and the `.git/worktrees/<role>-<uuid>/` admin dir are gone after the new tick's pre-flight.
  - **AC6.5 — assertion that `.git/echo-merge-in-progress` is never created by any AC1/AC2/AC3 path.** Run the wrapper flows under test; assert the file does not exist after any successful or failed tick. Closes the AC3 deletion guarantee mechanically.
- Tests MUST be runnable via the existing project test harness (the same `pnpm test` or equivalent path that runs `tests/review-queue/*.test.ts` today — verify by reading `package.json`'s test script and the existing test files BEFORE writing new ones).

### AC7 — Validation gate: zero residual references to the deleted lock convention

- After all AC1-AC6 patches land, the builder MUST verify `grep -rn echo-merge-in-progress -- skills/ tools/ .claude/ docs/ tests/ wiki/` returns ZERO hits. (The file path itself may still appear in `raw/internal/dogfooding/mcp-interactions-journal.md` as historical evidence of the collision — `raw/` is excluded from the grep.)
- The new `tools/review-queue/_lib.py` helper introduced for shared worktree-prep/cleanup MUST be invoked by both the reviewer wrapper (`_run_reviewer.sh` — via shell-out, since `_run_reviewer.sh` is bash) and the Python-side test harness; the helper's surface is `prepare_isolated_worktree(role: str) -> Path` returning the prepared `$WT` path, and `cleanup_worktree(path: Path)` returning None. The bash wrapper invokes them via `python3 -c "from tools.review_queue._lib import ..."` or equivalent — one canonical implementation, two entry points.

## Out of Scope (Don't Drift)

- **Atomic-claim step in `process-backlog`** — the single-commit `os.link no-overwrite + push` operation that moves an item `ready/X.md → claimed/X.md`. Different failure profile (push-race is already protected; no multi-step staging exposure). Filing as `050-followups.md` candidate, not as 050 work.
- **Standalone interactive journal commits** from human-driven Claude Code / Cursor IDE sessions (e.g. the founder appending a one-line note to `mcp-interactions-journal.md` between TDDs). Mostly behavioral discipline rather than procedural; needs a separate "interactive sessions also use a worktree wrapper OR avoid touching live main mid-other-work" rule.
- **No `flock`, no scheduler, no new substrate lock primitive.** The spec explicitly does NOT introduce any new file-based or kernel-based lock. The architectural answer is "remove the race surface (multi-writer shared `.git/index`)," not "add a coordination layer over the race surface."
- **No defense-in-depth retention of `.git/echo-merge-in-progress`.** It is deleted, not relegated. Keeping it would preserve the one-sided-convention failure mode for whichever future binding next ignores it.
- **No migration of builder worktrees** to `$TMPDIR`. Builders deliberately live at `~/Desktop/Project_echo--<slug>/` for founder inspection during multi-day work. The 050 path location (`$TMPDIR/echo-<role>-<uuid>`) reflects ephemeral-per-tick lifetime and machine-only inspection; the two location choices are intentionally different and BOTH correct for their respective roles.
- **No launchd plist changes.** Reviewer plists (`run-codex-reviewer.sh`, `run-codex-ops-reviewer.sh`) still invoke the same wrapper entrypoints. Only the wrapper's *body* changes (it now creates a worktree internally before doing the existing work).
- **No reviewer-side prose changes for the work itself** (what to read, what to write, where to log). Reviewers see the same `r<N>/request.md` → `<reviewer>.md` contract. They just happen to be in a different CWD.
- **No retro-conversion of past collision artifacts.** The local-only commit `ec2907f` and its backup branch `backup/codex-ops-r6-bad-local-merge` stay as historical artifacts. 050 prevents *future* collisions, does not rewrite past ones.

## Crash semantics

- **Crashed work is lost work.** A reviewer/watcher/merger tick that crashes between `git commit` (inside `$WT`) and `push-with-retry.sh` loses the commit. This is correct: the alternative (resuming a half-committed worktree from a later tick) would re-introduce exactly the cross-tick shared state the worktree pattern eliminates. Ticks are designed to be safely re-fireable from scratch (this is already a property of today's reviewer-queue loop — see `skills/review-queue-codex.md`'s "One review per tick. **Do not chain reasoning across ticks.**" instruction).
- **Crashed tick cleanup is opportunistic.** Pre-flight runs `git worktree prune` + `find $TMPDIR -name 'echo-*' -mmin +60 -exec rm -rf {} +` (AC1 pre-flight). Within 60 minutes the orphan stays on disk but does not interfere with new ticks (each tick's `$WT` path has a fresh uuid). 60-min threshold is conservative; tune if dogfooding surfaces a different number.
- **Merger conflict-pause across crashes is unchanged.** If a merger tick pauses for founder conflict-resolution (per existing `skills/merge-and-cleanup.md` checkpoint semantics) and the Claude session crashes during the pause, the worktree is still alive (the founder is presumably looking at conflicts in their editor). The recovery story is the same as today: founder either continues the pause manually in the worktree OR aborts and restarts. AC3 must explicitly preserve this — the worktree pattern does not introduce a new failure mode here, but the spec body must say so.

## Risks / Open Questions

- **Risk R1 — `$TMPDIR` in launchd context.** macOS launchd inherits a per-job `$TMPDIR` that differs from the user's interactive shell `$TMPDIR`. The codex-reviewer launchd plist (per 041) must ensure `$TMPDIR` is set in the job's environment. Mitigation: AC1 step 2 hard-fails if `$TMPDIR` is unset, surfacing the misconfiguration immediately rather than silently writing to `/tmp` and confusing crash-recovery. Builder should verify on real launchd-fired tick during AC6 smoke.
- **Risk R2 — Worktree creation cost.** `git worktree add --detach` is ~50-200ms on a warm filesystem with a fully-cloned repo. Reviewer ticks run every 10 min; the overhead is negligible. Watcher and merger ticks fire less often; overhead irrelevant. No mitigation required; noted for completeness.
- **Risk R3 — `push-with-retry.sh` worktree-mode regression.** Today's script presumably works because of a fixed CWD assumption. AC5's test asserts CWD-agnostic behavior, but a subtle path-bug (e.g. the retry's rebase resolving from the wrong tree's HEAD) could pass narrow tests and fail in production. Mitigation: AC6.1 + AC6.2 are end-to-end collision-simulation tests that exercise the full wrapper → worktree → push-with-retry → cleanup path; if any step has a CWD bug, the integration test catches it.
- **Open question Q1 — Should the `prepare_isolated_worktree` helper take an optional `branch` parameter?** Today the spec assumes always `--detach origin/main`. A future role (e.g. a hypothetical "reviewer that operates on a long-running branch") might want a different base. For 050, the helper signature is `(role: str) -> Path` and always uses `origin/main`. If a future role needs a branch-base option, a followup spec extends the helper signature. The spec explicitly does NOT speculatively add the parameter now (YAGNI).
- **Open question Q2 — Should we delete the `backup/codex-ops-r6-bad-local-merge` branch as part of this spec, since it's a historical artifact of the 2026-05-14 collision?** No. Keeping it for a few weeks as forensic evidence is cheaper than wishing we had it back. A separate end-of-month cleanup pass can prune it.

## After Completion (Strategist Notes)

- **Wiki page to create:** `wiki/operating-model/automation-worktree-isolation.md` documenting the invariant ("no automation writes to live main; multi-step writers operate in ephemeral worktrees") as a load-bearing protocol property. Cross-link from `wiki/architecture/system-architecture.md` if it exists, and from any future wiki page about the cross-tool protocol (per `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`'s vision).
- **Manifest update:** add the new wiki page to `.manifest.json` and regenerate `wiki/index.md` via `tools/wiki_index.py`.
- **Possible followup specs (file under `backlog/_followups.md`, not auto-spec'd):**
  - **051-followup-A — Atomic-claim worktree isolation** (the {5} carve-out from Q2). Lower priority — different failure profile; push-race protection already exists.
  - **051-followup-B — Interactive-session journal-commit discipline** (the {6} carve-out from Q2). Behavioral, not procedural.
  - **051-followup-C — Cross-tool consultant skill** (`skills/cross-tool-strategist-consult.md`) if the ECHO-mediated strategist-consult pattern recurs 3+ times. Observed twice during 050's brainstorm (Q1+Q2 codex consults).
- **Cycle-shape observation:** 050 is a friction-fix spec that originated from a single empirical incident with an instant root-cause diagnosis. Expect a short review cycle (target 2-3 rounds to convergence per the 042/043/044/045 reference shape). If reviewers surface 049-style "operationally rich, every disposition introduces new surface" findings, that's a signal to simplify scope (e.g. drop AC4 cursor-side prose update to a followup) rather than iterate.

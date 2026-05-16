---
status: shipped
topic: Process
subtopic: Automation Worktree Isolation
aliases:
  - Worktree Isolation Invariant
  - Race Surface Elimination
  - No Shared Index Rule
---

# Automation Worktree Isolation

A load-bearing architectural invariant of ECHO's multi-agent coordination: **no automated role writes to the founder's live `main` checkout's `.git/index`.** Every multi-step writer to `main` (reviewer, watcher, merger) operates inside its own ephemeral `$TMPDIR/echo-<role>-<uuid>` worktree pinned to `origin/main`, and discards the worktree at tick end. Shipped by item 050 in response to the 2026-05-14 14:02 PDT collision.

## The invariant

> No automation writes to the founder's live repo index. Multi-step writers to `main` operate in ephemeral, per-tick `git worktree` checkouts and push their result via `tools/review-queue/push-with-retry.sh`.

This is a substrate-level property, not a prose convention. It is enforced by the wrappers (`tools/review-queue/_run_reviewer.sh`) and by the canonical skill bodies of every multi-step writer; it is verifiable by the test suite (`tests/review-queue/worktree-isolation.test.ts`).

## Why it exists — the race surface the invariant eliminates

Before 050, headless reviewers, the strategist watcher, and the merger all reached into the founder's live `~/Desktop/Project_echo/.git/index` to stage and commit. The 2026-05-14 14:02 PDT collision was the load-bearing failure: a `merge-and-cleanup` session staging conflict resolution for item 048 had its work *swept into a codex-ops reviewer commit* (`ec2907f`) when a parallel launchd-fired reviewer tick ran `git add` + `git commit` inside the same shared index. The merger lost its staged changes and had to abandon the 048 merge cycle.

The merger skill DID document a sentinel-file lock at `.git/echo-merge-in-progress`, but `grep` confirmed only the merger itself read or wrote that file — no other binding (reviewer launchd, watcher, codex-ops) was aware of it. The lock was **one-sided by construction**, and the architectural diagnosis was that adding read-of-lock checks to every other surface would just multiply the prose-as-protocol surface that the collision had already proven unreliable.

ECHO's cross-tool peer protocol (per `raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`) lives at the skill layer (`skills/<name>.md`), where Claude Code, Codex, Cursor's Claude all run identical canonical prose. The protocol does NOT exist at the substrate (git index / fs / process) layer — and trying to extend it there via prose conventions had now caused production damage twice (the 14:02 PDT collision; the 14:48 PDT "File has been modified since read" race on the very journal file documenting the bug).

050's resolution was structural: **remove the race surface, don't coordinate over it.** Multiple ticks cannot collide in `.git/index` if no two ticks share `.git/index`. Builders had solved this already (`skills/process-backlog.md`'s `~/Desktop/Project_echo--<slug>/` worktrees); 050 generalizes the discipline to all roles that do multi-step writes to `main`.

## The cleanup-trap pattern

Every covered role follows the identical per-tick lifecycle. The bash shape lives in `tools/review-queue/_run_reviewer.sh` for headless reviewers; the prose shape lives in `skills/review-queue-watch.md`, `skills/merge-and-cleanup.md`, and `skills/review-queue-cursor.md` for the watcher, merger, and IDE-mode reviewer respectively. Both produce byte-equivalent worktree management as observed from `origin/main`.

```
0. Pre-flight (in main checkout, order matters):
     git worktree prune                                 # admin entries for already-removed dirs
     enumerate `git worktree list --porcelain`          # registered = NEVER GC'd (founder-paused merges live here)
     for each $TMPDIR/echo-* NOT in registered set:
         rm -rf if mtime >60min                         # unregistered orphans only

1. git fetch origin main                                # read-only; never touches live index

2. WT="$TMPDIR/echo-<role>-$(uuidgen)"                  # hard-fail if $TMPDIR unset (no /tmp fallback)

3. git worktree add --detach "$WT" origin/main          # hard-fail on error

4. ROUTE THE CHILD INTO $WT — all four handoffs required:
     - cd "$WT"
     - export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"         # prompt's Step 1 lands here
     - PROMPT="$WT/.claude/commands/<slash>.md"         # prompt bytes read from WT
     - codex exec -C "$WT" ... < "$PROMPT"              # child CWD pinned to WT

5. Do the tick's work:
     - All git add / commit / push run inside $WT
     - Journal append is a sibling commit pushed via push-with-retry.sh
       BEFORE the cleanup trap fires (explicit ordering, never "same as today")
     - Same-reviewer overlap guard: re-fetch origin/main before commit;
       if <reviewer>.md already exists upstream for this round, exit 0 (no-op)

6. Cleanup trap (unified across success and failure paths — `trap ERR EXIT`):
     cd "$HOME/Desktop/Project_echo"
     git worktree remove --force "$WT"
     git worktree prune
     # Wrapper propagates child's exit code. NO push-failure-specific preservation.
```

The trap is the load-bearing piece: ERR and EXIT both route through the same cleanup. Any failure mode — child crash, push-retry exhaustion, YAML rejection, kernel panic — discards the worktree and its unpushed work. Uniform lost-work-on-failure semantics. Re-fireability (next tick sees the same `r<N>/request.md` because nothing pushed) is the resilience mechanism, not recovery.

### CWD-agnostic push helper

`tools/review-queue/push-with-retry.sh` was made CWD-agnostic in the same shipment so the pattern works from any worktree. Two contracts:

- **Path resolution** uses `git rev-parse --show-toplevel`; no hardcoded `~/Desktop/Project_echo`.
- **Refspec is explicit:** `git push origin HEAD:main`. The fallback `git push origin main` is forbidden — under detached-HEAD-in-worktree mode it pushes the common repo's `main` ref and leaves the worktree's commit unpushed. Tested at `tests/review-queue/push-with-retry-cwd-agnostic.test.ts`: after a successful push from a detached worktree, `git rev-parse origin/main` MUST equal the worktree's `HEAD`.

## Migration note — no sentinel-file lock retained

`.git/echo-merge-in-progress` is **deleted, not relegated.** `grep -rn echo-merge-in-progress skills/ tools/ .claude/` returns zero hits as of 050's landing. The architectural reasoning: keeping the lock as defense-in-depth would preserve exactly the one-sided-convention failure mode the worktree pattern was introduced to eliminate. Whichever future binding next ignored the convention would re-create the race.

For founders mid-cycle: if `.git/echo-merge-in-progress` happens to exist on the live checkout when 050 lands (e.g. left behind from a manually-aborted merge), the new merger does not read or care about that file. It is simply orphaned — a one-shot `rm` cleans it.

The negative-assertion test at `tests/review-queue/worktree-isolation.test.ts` (AC6.5) verifies that no covered flow ever creates `.git/echo-merge-in-progress`.

## Pre-flight conservatism — registered worktrees are sacred

Pre-flight GCs **only** unregistered `$TMPDIR/echo-*` directories older than 60 minutes. Any worktree in `git worktree list --porcelain` is skipped regardless of mtime. This protects the load-bearing case: a merger that paused for founder conflict-resolution and was left overnight is a registered worktree at `$TMPDIR/echo-merger-<uuid>/`; pre-flight from a separate reviewer tick must not delete it.

Trade-off: crashed registered survivors (a tick whose ERR trap was bypassed by SIGKILL or kernel panic) accumulate indefinitely. Manual cleanup via `git worktree remove --force <path>` is the workaround; `tools/echo-worktree-doctor.sh` (filed as 050-followup-F) is the long-term operator script.

## Scope — what is and isn't covered

**In scope (multi-step writers to `main`):**

- **Headless reviewers** (codex, codex-ops) — `_run_reviewer.sh` wraps the tick body in the worktree pattern.
- **Watcher** — `skills/review-queue-watch.md` prose runs `combine.py`, disposition patches, `dispatch-next-round.py`, and journal append (3-4 commits per tick) inside `$TMPDIR/echo-watcher-<uuid>`.
- **Merger** — `skills/merge-and-cleanup.md` prose runs the entire per-item merge sequence (merge commit, fixups, `review_notes` populate, `pending_review/X.md → complete/X.md`, branch deletion, push) inside `$TMPDIR/echo-merger-<uuid>`.
- **Cursor IDE reviewer** — `skills/review-queue-cursor.md` encodes the identical lifecycle in prose (not via `_run_reviewer.sh`, which `_reviewer_gate.py` rejects for IDE mode per the 043 contract).

**Out of scope (different failure profile or behavioral discipline):**

- **Atomic-claim step in `process-backlog`** — single-commit `os.link no-overwrite + push`; no multi-step staging exposure (filed as 050-followup-A).
- **Standalone interactive journal commits** from founder-driven IDE sessions — behavioral, not procedural (filed as 050-followup-B).
- **Builder worktrees** stay at `~/Desktop/Project_echo--<slug>/`. The path-location split is intentional: builders are multi-day work that the founder inspects; 050 worktrees are ephemeral per-tick automation. Both are correct for their respective lifetimes.

## No new substrate-level coordination primitive

050 deliberately does NOT introduce `flock`, a scheduler, or any new file-based or kernel-based lock. The architectural answer is "remove the race surface (multi-writer shared `.git/index`)," not "add a coordination layer over the race surface." The Python helper script `worktree-helper.py` proposed in 050's R1 disposition was reverted in R2 in favor of inline shell after cross-vendor reviewers (codex F3 + codex-ops F2) surfaced that the helper introduced its own hyphen-vs-underscore import problem and a layer of indirection that obscured what the wrapper actually does.

The 25-line worktree-management section of `_run_reviewer.sh` is the canonical reference. The watcher / merger / Cursor IDE flows mirror its shape in prose.

## Crash semantics

- **Any tick failure loses unpushed work.** Uniform across all failure modes. The existing `push-with-retry.sh` retry budget is the only resilience mechanism for transient push failures; if exhausted, the next tick re-fires from scratch with fresh context.
- **Crashed-tick safety is by re-fireability, not recovery.** Ticks are designed to be re-fireable (already a property of today's reviewer-queue loop — see "One review per tick. Do not chain reasoning across ticks." in `skills/review-queue-codex.md`). The next tick sees the same `r<N>/request.md` because nothing pushed.
- **Merger conflict-pause across crashes is unchanged.** The paused worktree is registered, so pre-flight never GCs it. Founder resumes manually OR aborts and restarts. AC6.4 is the executable test that the new pre-flight does not introduce a worse failure mode here than the pre-050 live-checkout merge.

## Tests as executable spec

`tests/review-queue/worktree-isolation.test.ts` covers:

| Scenario | What it asserts |
|---|---|
| Two simultaneous reviewer ticks for same round | First push wins; loser rebases over and lands cleanly; no `git add` collision |
| Reviewer tick during in-flight merger tick (the 14:02 collision shape) | Both succeed independently; no cross-contamination of staged work |
| Watcher tick during reviewer tick | Watcher's `combined.md` + spec patches + dispatch + journal commits land cleanly; reviewer commit lands cleanly |
| Registered worktrees survive GC regardless of mtime | Founder-paused merger at >60min AND crashed registered reviewer at >60min both survive pre-flight |
| `.git/echo-merge-in-progress` is never created | Mechanical closure of the AC3 deletion guarantee |

`tests/review-queue/push-with-retry-cwd-agnostic.test.ts` covers identical behavior from a live-checkout CWD and a detached-HEAD worktree CWD, plus the `git rev-parse origin/main` == worktree HEAD assertion that catches the `HEAD:main` vs `main` refspec bug.

## Related

- [[review-queue-protocol]] — the file-backed wire protocol whose headless reviewer wrappers and watcher tick this invariant covers
- [[cross-tool-spec-review]] — the multi-reviewer pattern that makes "multiple bindings reach into shared `.git/index`" the load-bearing problem 050 solves

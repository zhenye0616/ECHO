---
id: 2026-05-21-066-process-backlog-handoff-atomicity
title: process-backlog claimed→pending_review handoff is atomic on disk, not just in commit (close the working-tree partial-state window)
status: ready
priority: HIGH
estimate: 0.25-0.5d
created: 2026-05-21
blocked_by: []
task_state_ref: 2026-05-21-066-process-backlog-handoff-atomicity
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - skills/process-backlog.md  # AC1 — reorder E2/E2.5/E2.6 so all three mutations (item frontmatter edit, builder.md patcher, stage rename) accumulate in working tree FIRST, then a single `git mv` (rename) + `git add` (other paths) + `git commit` closes the handoff. Frontmatter edit MUST happen on the source file under `backlog/claimed/<id>.md` BEFORE `git mv`. Patcher runs against `backlog/task-state/<id>/builder.md` (separate path) BEFORE `git mv`. Single commit covers all three (rename-with-edits + builder.md + run log).
  - .claude/commands/process-backlog.md  # AC2 — regenerated via `tools/sync-skills.sh`; never hand-edited. Reviewer confirms `tools/sync-skills.sh --check` is clean post-edit.
  - tests/skills/process-backlog-handoff-atomicity.test.ts  # AC3 — new test file (skill prose can't be unit-tested directly, but the prose's bash IS executable; this test transcribes the canonical sequence from the skill into an executable harness against a throwaway git repo and asserts the four invariants below). The test is the structural pin against future drift in the skill's bash blocks.
spec_refs:
  - skills/process-backlog.md  # E2 line 177-184 (ensure_stage doing git mv FIRST), E2 lines 189-195 (prose-only frontmatter edit AFTER the rename — the load-bearing bug), E2.5 lines 224-252 (patcher writes builder.md, then git add POINTER), E2.6 lines 264-271 (single final commit) — the current ordering puts staged-rename + unstaged-edits in the working tree window between E2's git mv and E2.6's commit
  - tools/task-state/patch-builder-state.py  # the patcher writes to backlog/task-state/<id>/builder.md on disk; this AC pulls its invocation EARLIER in the sequence (before git mv) so the builder.md mutation is also in working tree before any index operation
  - backlog/_followups.md  # PRIORITY 1 entry under "2026-05-21 — harness seam review (strategist + codex consultation)" — the in-the-moment finding that motivates this spec
  - backlog/complete/2026-05-14-048-process-backlog-builder-state-handoff-refresh.md  # the spec that landed E2.5's patcher invocation; this 066 reorder MUST preserve 048's load-bearing invariants (patcher is the only canonical site, lint-fails-as-hard-stop, locked_decisions byte-preserved)
  - raw/internal/decisions/  # if a builder finds the reorder breaks a non-obvious downstream invariant, log the drift-event here per CLAUDE.md's drift-prevention rule

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# process-backlog claimed→pending_review handoff is atomic on disk, not just in commit

## Why this spec exists

`skills/process-backlog.md` claims a single-commit atomicity guarantee for the claimed→pending_review handoff (E2.6 line 264 comment: "this commit captures all three (item move, run log, builder.md refresh) atomically"). The single COMMIT is atomic. The **working-tree window** that produces that commit is not.

Concretely, the current prose orders the three mutations like this:

```
E2.   git mv backlog/claimed/<id>.md backlog/pending_review/<id>.md   ← stages rename
      (prose) edit frontmatter of backlog/pending_review/<id>.md      ← creates UNSTAGED edits
E2.5. patch-builder-state.py builder.md                               ← UNSTAGED disk mutation
      git add backlog/task-state/<id>/builder.md
E2.6. git add backlog/pending_review/ "$LOG"                          ← stages frontmatter edits
      git commit -m "review: <id>"
      git push origin main
```

Between E2's `git mv` and E2.6's `git commit`, the working tree contains: a staged rename + unstaged frontmatter edits on the moved file + (after the patcher fires) unstaged builder.md edits. **Anything that observes or commits the repo state during this window can produce or see a half-finished handoff.**

The concrete failure modes:

1. **Process crash mid-handoff** (signal, kernel kill, `kill -9` on the parent shell, OOM, network blip during patcher's python startup) leaves a staged-rename plus unstaged dirty files. Rerun under the existing prose:
   - `git pull --rebase origin main` (line 187) **aborts** on dirty working tree.
   - Builder must hand-clean: `git restore --staged --worktree backlog/claimed/ backlog/pending_review/ backlog/task-state/<id>/` before retry.
   - `ensure_stage`'s idempotent re-detect (line 180 `ls backlog/*/$item`) sees the file under `pending_review/` (because filesystem rename succeeded) and returns 0 — but the frontmatter is still un-edited and builder.md is unflushed. Next rerun ends up running the prose "edit frontmatter" step on a file that was supposed to be edited last attempt. Builder agents are not idempotent on this path — they will write `head_sha` for the CURRENT attempt, not the prior attempt that died mid-commit.

2. **Parallel-agent racey commit.** Two builders running in two worktrees both call `git commit` against `main`. The atomic-claim flow at the START of process-backlog (skills line ~85-115) prevents two builders from CLAIMING the same item, but the handoff at the END is on a different code path — and if a second agent's prose runs against a working tree that another agent dirtied (e.g., shared main checkout, founder running both in parallel sessions on the same repo), one agent's `git add backlog/pending_review/` can pick up the OTHER agent's unstaged frontmatter mid-edit. The committed file has the wrong agent's `head_sha`, or worse — half of one edit and half of another.

3. **Watcher or external observer reading working-tree state mid-handoff.** Strategist watcher / dispatcher / a parallel `tools/review-queue/_run_reviewer.sh` invocation that reads `backlog/pending_review/<id>.md` between E2 line 183 and E2.6 line 270 sees: file exists at new path, frontmatter has the OLD `claimed_by`/`branch` values (because the edit hasn't happened yet), `head_sha` is empty. A reviewer triggered by this state opens a review against a non-existent commit.

The trigger for this becoming an active exposure: **V1.5 unpause** (`project_v15_cleanup_pause` memory). The current quiet period has masked the seam because the handoff cadence is roughly once a day. Once builder agents resume parallel cycles, every handoff is a live window for one of the three modes above.

## The root cause

The prose ORDERS mutations so that the irreversible state change (`git mv`, which is both a filesystem rename AND a staged index mutation) happens BEFORE the editable working-tree mutations (frontmatter edit + builder.md patch). This forces a working-tree window where the index is dirty in one direction (staged rename) and the working tree is dirty in the other direction (unstaged content edits on the renamed file).

The single-commit comment at E2.6 line 268-269 is true but misleading: it describes the *commit's* atomicity, not the *prose-execution path's* atomicity. The two are not the same thing — the commit is the LAST step; everything before it is observable to other readers/writers of the repo.

The fix is to invert the order. All three mutations accumulate as filesystem-only changes (no `git add`, no `git mv`) until everything is on disk; then a single `git mv` + `git add` + `git commit` sequence closes the window in seconds (no awaiting external work between staging and commit).

## The minimum-viable fix

Reorder E2 / E2.5 / E2.6 so that:

1. **All disk mutations happen first**, all unstaged: frontmatter edit on the source file (still under `backlog/claimed/<id>.md`); patcher writes `backlog/task-state/<id>/builder.md` (its final path). The patcher is called with `--spec-path "backlog/pending_review/<id>.md"` — i.e. the post-rename path — because the patcher records that argument **verbatim** into `canonical_anchors.spec` without reading the file from disk (verified against `tools/task-state/patch-builder-state.py:289-310`).
2. **Then a tight staged-commit block** does, back-to-back with no external waits: `git mv claimed/<id>.md pending_review/<id>.md` (stages the rename at the OLD blob), `git add pending_review/<id>.md` (stages the edited frontmatter at the destination — REQUIRED because `git mv` after working-tree edits stages the rename of the old blob but leaves the destination's edited content as unstaged modification per empirical verification on macOS git 2.x), `git add backlog/task-state/<id>/builder.md $LOG`, `git commit`, `git push`. Four index ops in milliseconds.

The crash-safety property this gives, by configuration:

- **Pre-mutation** (before Step 1): file under `backlog/claimed/`, frontmatter intact, builder.md as last committed, index clean, working tree clean.
- **Mid-prose, pre-`git mv`** (after Step 1 or Step 2): frontmatter edit on `claimed/<id>.md` is in working tree only (unstaged); builder.md edit may also be in working tree only. **Index is still clean.** No `pending_review/` file exists. A crash here is recoverable via `git restore --worktree backlog/claimed/<id>.md backlog/task-state/<id>/builder.md` to revert and rerun from Step 1. **No observable partial handoff** because the file is still at the source path on disk.
- **Mid-`git mv`-to-`git commit` window** (Step 3): staged rename + (after `git add` for destination) staged frontmatter + (after subsequent `git add`s) staged builder.md + staged log. Working tree contents match the index at each substep. The window is bounded by `git add` invocations only — no python startup, no external waits. A crash leaves a partially-staged set of changes; the prose's rerun step (`git pull --rebase origin main`) will abort on dirty index. Documented recovery: `git restore --staged --worktree backlog/claimed/<id>.md backlog/pending_review/<id>.md backlog/task-state/<id>/builder.md "$LOG"` to revert and rerun, OR `git commit -m "review: <id>"` to finish the partial commit if all expected paths are already staged (verify with `git diff --cached --name-only` before deciding which recovery path applies).
- **Post-commit**: file under `backlog/pending_review/` with edited frontmatter, builder.md patched, run log committed, all in one commit on `main`. Working tree clean, index clean. Rerun = idempotent no-op (the prose's `[ -f "$DEST" ] && exit 0` idempotency check at top of E2 detects target-stage presence and exits 0).

## Architectural invariant

**The prose execution has exactly two extended states and one bounded-narrow window. At every observation point, the repo state is one of:**

1. **Pre-Step-3 (extended, may include external waits)**: file under `backlog/claimed/<id>.md`; index is clean (relative to HEAD); working tree may have unstaged edits to `claimed/<id>.md` and `backlog/task-state/<id>/builder.md`. `backlog/pending_review/<id>.md` does NOT exist on disk. The patcher's python startup and any prose-level work (frontmatter edit) happens in this state. A crash here recovers via `git restore --worktree backlog/claimed/<id>.md backlog/task-state/<id>/builder.md` and rerun from Step 1. **No partial handoff is observable** to other readers because the item is still at the source path.

2. **Step-3 bounded window (`git mv` → `git commit`)**: index is progressively-staged across N `git add` calls in milliseconds; no python, no external waits. The window's substates are:
    - **3.a (`git mv` just ran)**: staged rename at OLD blob; destination working-tree contents (edited frontmatter) UNSTAGED on `pending_review/<id>.md`. `builder.md` and `$LOG` UNSTAGED.
    - **3.b (`git add "$DEST"` just ran)**: staged rename + staged edited frontmatter. `builder.md` and `$LOG` still UNSTAGED.
    - **3.c (`git add "$POINTER" "$LOG"` ran)**: all four mutations staged. Working tree clean relative to index. **Recoverable via `git commit -m "review: <id>"` to finish the partial commit**, OR `git restore --staged --worktree backlog/claimed/<id>.md backlog/pending_review/<id>.md backlog/task-state/<id>/builder.md "$LOG"` to revert to state #1.
    - A crash at 3.a or 3.b leaves a partially-staged index. Recovery: `git restore --staged --worktree …` (full path list) to revert to state #1.

3. **Post-commit (extended, stable)**: file under `backlog/pending_review/<id>.md` with edited frontmatter, builder.md patched, run log committed, all in ONE commit on `main`. Working tree clean, index clean. Rerun = idempotent no-op via the top-of-E2 `[ -f "$DEST" ] && [ ! -f "$ITEM_FILE" ] && exit 0` check.

The Step-3 bounded window is the only place a "partial-staged" configuration is observable, and it is constructed to be unobservable in practice: bounded by milliseconds of local `git` invocations with no external waits, no python, no I/O on remote resources. The prose-level discipline that enforces this is "Step 3 runs as one shell block with no inserted commands"; builders that add observability scaffolding or extra checks inside Step 3 violate the invariant.

## Acceptance Criteria

### AC1 — `skills/process-backlog.md` reorders E2 / E2.5 / E2.6 so disk mutations precede index operations

- **Modified file:** `skills/process-backlog.md`. Edit replaces the existing E2 + E2.5 + E2.6 bash blocks (lines ~174-272).
- **New ordering (canonical bash transcript):**

  ```bash
  cd ~/Desktop/Project_echo
  git pull --rebase origin main

  ITEM_FILE="backlog/claimed/$(basename $ITEM_FILE)"   # source path, BEFORE rename
  DEST="backlog/pending_review/$(basename $ITEM_FILE)" # destination path, AFTER rename

  # Idempotency: if a prior partial run already moved the file (or another
  # builder already handed off this item), exit cleanly.
  [ -f "$DEST" ] && [ ! -f "$ITEM_FILE" ] && exit 0

  # Step 1 — frontmatter edit on the source file (still under claimed/).
  # Edit head_sha / pr_url / agent_notes IN-PLACE on $ITEM_FILE.
  # (prose: head_sha=<sha>, pr_url=<url-or-empty>, agent_notes=…)

  # Step 2 — builder-state patcher refresh (scope-detected). The patcher
  # records --spec-path verbatim into canonical_anchors.spec without reading
  # the file from disk; we therefore pass the FINAL destination path here so
  # the committed builder.md's anchor never points at a removed claimed/ path.
  TASK_ID="${ITEM_ID}"
  POINTER="backlog/task-state/$TASK_ID/builder.md"
  HAS_TASK_STATE_REF=$(
    awk '/^---$/{c++; next} c==1 && /^task_state_ref:/{print; exit}' "$ITEM_FILE"
  )
  if [ -n "$HAS_TASK_STATE_REF" ] || [ -f "$POINTER" ]; then
    python3 tools/task-state/patch-builder-state.py \
      --task-id "$TASK_ID" \
      --outcome "$OUTCOME" \
      --spec-path "$DEST" \
      --branch "agent/$SLUG" \
      --head-sha "$HEAD_SHA" \
      --run-log "$LOG"
    if [ -f "$POINTER" ]; then
      python3 tools/task-state/lint.py "$POINTER"   # hard stop on failure
    fi
  fi

  # Step 3 — stage flip + atomic commit. Four index ops in milliseconds, no
  # python startup or external waits in this window:
  #   (a) git mv stages the rename at the OLD blob;
  #   (b) git add $DEST stages the destination's CURRENT contents (the edited
  #       frontmatter), required because git mv on macOS git 2.x leaves the
  #       destination's working-tree edits as unstaged modification — verified
  #       empirically by r1 codex-ops F4 on a throwaway repo;
  #   (c) git add $POINTER + $LOG stages the remaining paths;
  #   (d) git commit captures all four mutations in one commit.
  git mv "$ITEM_FILE" "$DEST"
  git add "$DEST"
  [ -f "$POINTER" ] && git add "$POINTER"
  git add "$LOG"
  git commit -m "review: $ITEM_ID"
  git push origin main
  ```

  Two load-bearing decisions, pinned:

  1. **Patcher's `--spec-path` is the DESTINATION path (`$DEST`), invoked BEFORE `git mv`.** Verified against `tools/task-state/patch-builder-state.py:289-310,403-407`: the patcher writes `--spec-path` verbatim into `canonical_anchors.spec` and does NOT read the file from disk. Passing `$DEST` before the rename produces a builder.md whose anchor is correct AT COMMIT TIME (when the rename completes in the same commit). Builders MUST NOT swap to `$ITEM_FILE` for "consistency" — that breaks cold-start/task-state consumers immediately after handoff (r1 codex-ops F5 HIGH).
  2. **Explicit `git add "$DEST"` after `git mv`.** `git mv` on git 2.x stages the rename of the OLD blob but leaves working-tree edits on the destination unstaged. Without the explicit `git add "$DEST"`, the commit would publish `pending_review/<id>.md` with the pre-edit frontmatter (empty `head_sha` / `pr_url` / `agent_notes`) and leave the edited file as a permanent dirty diff. Builders MUST NOT remove the `git add "$DEST"` line.

- **Lint-failure escalation contract preserved:** the existing rule "lint failure means escalation, not silent shipping" stays verbatim. Crash between lint and `git mv` is recoverable: nothing has been staged yet, so a rerun starts from a clean working tree (modulo the partially-written builder.md, which the patcher overwrites idempotently on rerun).

- **`ensure_stage` helper retired or repurposed.** The helper at lines 177-184 currently does the `git mv` inside a function — the new prose calls `git mv` inline so the rename happens at a known prose-step, not opaquely. If `ensure_stage` is preserved for the BLOCKED/escalated path or for E2.5's scope-detect, the spec MUST justify it in `agent_notes`; otherwise it is removed. The pre-existing idempotency case (re-run already at target stage) is handled inline at the very top of the new prose, BEFORE any edits: `[ -f "$DEST" ] && [ ! -f "$ITEM_FILE" ] && exit 0`. The two-condition form (destination present AND source absent) guards against a partial-prior-run state where both files coexist on disk; in that state the rerun must continue (not exit) to complete or rollback.

- **Comment block update:** the existing comment at E2.6 lines 264-271 ("this commit captures all three … atomically") is replaced with a stronger invariant: "All three mutations are accumulated in the working tree FIRST (steps 1+2); the `git mv` + `git add` + `git commit` (step 3) is the only git index/object work and runs in seconds with no external waits. There is no observable state where some-but-not-all of {rename, frontmatter, builder.md} are partially-staged."

### AC2 — Adapter sync stays clean

- Run `tools/sync-skills.sh` after the canonical edit. The Claude Code adapter at `.claude/commands/process-backlog.md` is rewritten as a byte-identical copy of the canonical.
- Reviewer MUST verify: `tools/sync-skills.sh --check` exits 0 post-edit.
- The Codex adapter installer (`tools/install-echo-codex-skills.sh`) is NOT modified; the user's installed codex-side copy refreshes the next time the founder runs the installer. Out of scope #4 covers this.

### AC3 — `tests/skills/process-backlog-handoff-atomicity.test.ts` pins the four invariants

- **New test file** at `tests/skills/process-backlog-handoff-atomicity.test.ts`. Vitest, in-process, no real git push (uses a throwaway repo via `git init` + local commits only).
- **Test 1 — pre-mutation state is clean.** Create a throwaway repo, add an item under `backlog/claimed/<id>.md` with frontmatter `claimed_by: X, head_sha: ""`, plus `backlog/task-state/<id>/builder.md` with a valid pointer. Assert: `git status --porcelain` is empty. Then execute the new prose's Step 1 + Step 2 (frontmatter edit + patcher). Assert: `git status --porcelain` shows ONLY unstaged modifications to `backlog/claimed/<id>.md` and `backlog/task-state/<id>/builder.md` (NO staged changes, NO renames-in-index). The item file is still at the source path on disk.
- **Test 2 — single-commit atomicity, including destination CONTENT.** Continue Test 1's repo state. Execute Step 3 (`git mv` + `git add "$DEST"` + `git add` for builder.md + `git add` for log + `git commit`). Assert: exactly ONE new commit on HEAD; `git diff-tree -r -M --no-commit-id --name-status HEAD` (the `-r` forces recursion past directory rollups; the `-M` forces rename detection — both required per r1 codex F3/codex-ops F6 MED — `--name-status` without these can collapse to a top-level `M backlog` row or to a D/A pair instead of the expected `R<NNN>` status) shows the rename (R-status with similarity ≥80%) for the item file PLUS a modify (M) for `backlog/task-state/<id>/builder.md` PLUS an add (A) for the run log. Assert: `git status --porcelain` is empty. **Additional load-bearing assertion (r1 codex-ops F4 fix):** read the COMMITTED contents of `backlog/pending_review/<id>.md` via `git show HEAD:backlog/pending_review/<id>.md` and assert that the frontmatter contains the edited `head_sha` value (not the empty pre-edit value). This pins that `git add "$DEST"` actually staged the edited frontmatter — without that line, the test fails here, surfacing the central r1 bug.
- **Test 3 — mid-step-2 crash is recoverable from clean working tree.** Simulate a crash by aborting the prose between Step 1 (frontmatter edited) and the patcher call. Run `git restore --worktree backlog/claimed/<id>.md` to undo. Assert: `git status --porcelain` is empty; rerun from Step 1 succeeds and produces one commit.
- **Test 4 — no staged-index-mutation BEFORE Step 3.** During Step 1 + Step 2 execution, snapshot `git status --porcelain` at each intermediate point (after frontmatter edit; after patcher; before `git mv`). At every snapshot, assert that the index has ZERO staged changes (working tree may be dirty with unstaged edits to `claimed/<id>.md` and `builder.md`; index must be clean). This is the load-bearing pin against future drift that re-introduces a pre-Step-3 staged operation (e.g., a builder "helpfully" adding `git add backlog/task-state/<id>/builder.md` right after the patcher to "stage things as we go" — that creates the partial-staged window the spec is trying to eliminate). The narrowed invariant (per the §Architectural invariant rewrite above) makes the Step-3 window the SOLE legitimate place for staged-index changes; this test is the structural gate.

The four tests run via `npm test`; they share a per-test throwaway repo (created in `os.tmpdir()`, cleaned in `afterEach`). No CI changes; vitest picks up the file by default.

## Out of Scope (Don't Drift)

1. **Restructuring the atomic-claim flow at the start of process-backlog** (lines ~85-115). This spec is the HANDOFF window only. The claim window has its own atomicity rules (single commit, push-rejected-detects-race) that are out of scope.
2. **Adding a builder-side retry-on-push-rejected loop in the handoff.** Push rejection in handoff means another agent committed first; the existing prose at E2.6 line 271 already does `git push origin main` and a failed push surfaces as a shell error. No retry, no rebase loop. (This is symmetric with 059's no-retry-on-rejection rule.)
3. **Auto-correcting partial-staged states detected at rerun.** If a builder reruns into a dirty index from a crashed prior attempt, the prose surfaces the dirty state (via `git pull --rebase`'s abort) and the builder hand-cleans. No auto-`git restore`, no auto-`git stash`. Auto-correction would mask the underlying bug the reorder is trying to prevent.
4. **Modifying the Codex adapter copy of the skill.** `tools/install-echo-codex-skills.sh` regenerates the codex-side copy on next install; the founder's machine will pick up the new canonical at the next install run. No direct edit to the codex-side rendered file.
5. **Touching `tools/task-state/patch-builder-state.py`.** The patcher's contract is fixed (lint-failure-as-hard-stop, locked_decisions byte-preserved). If the reorder reveals a hidden coupling (e.g., patcher requires the spec file to be at a specific path), file a follow-on spec — don't widen 066. AC1's parenthetical about `--spec-path` already pins the calling convention; reviewers MUST verify against current patcher code.
6. **End-to-end test against a real `git push origin main`.** All Tests 1-4 run against a throwaway local repo. The launchd / production / multi-agent race tests are explicitly out of scope; the AC4 "no observable partial-staged state" invariant is the structural gate.
7. **Adding a `--strict` or `--check-clean-before-commit` flag to any tool.** The new prose is a discipline change in the skill, not a guardrail added to a script. Out of scope #3 (no auto-correction) covers the symmetric concern.
8. **Refactoring `ensure_stage` into a shared helper used across stages.** If retained, it stays scoped to its current use; no extraction into `_lib.sh` or similar. The reorder may make the helper unnecessary — that's a deletion, not a refactor.
9. **Changing the commit message format.** `review: <id>` stays verbatim. The reviewer-side parsers (`combine.py`, `dispatch-next-round.py`, watcher consumers) match on this string; changing it would silently break downstream tooling.
10. **Documenting the working-tree window in `wiki/`.** Per CLAUDE.md, wiki edits happen AFTER items land in `complete/`. The After-Completion section below names which page to update post-shipment.

## Risks

- **R1 — patcher's `--spec-path` is verbatim-recorded (NOT a runtime read).** Verified r1 by codex F1 + codex-ops F5 against `tools/task-state/patch-builder-state.py:289-310,403-407`: the patcher writes `--spec-path` verbatim into `canonical_anchors.spec` without reading the file at that path. The canonical transcript exploits this by passing `$DEST` (the destination path) BEFORE `git mv` has run. At commit time the rename completes in the same commit, so the anchor and the on-disk path are consistent. **If a future patcher refactor changes this contract** (e.g. starts reading spec frontmatter from `--spec-path`), this AC breaks immediately — the spec MUST be re-reviewed before that refactor lands. Out of Scope #5 already forbids modifying the patcher in this spec; this risk note is the explicit interlock for the symmetric direction.

- **R2 — `git mv` does NOT stage destination working-tree edits.** Empirically verified r1 (codex-ops F4 HIGH on a throwaway repo, codex's reproducer for F1/F2/F3): `git mv src dst` AFTER editing `src` produces a staged R100-ish rename at the OLD blob plus an unstaged modification on `dst`. The earlier draft of this risk note claimed the opposite — that claim was wrong. The fix is an explicit `git add "$DEST"` immediately after `git mv` (Step 3.b in the canonical transcript). The two commands run back-to-back with no external waits; the index-dirty window between them is bounded by `git add`'s execution time (milliseconds). Test 2 explicitly asserts the COMMITTED destination file contains the edited frontmatter, which fails loudly if a future builder removes the `git add "$DEST"` line.

- **R3 — vitest harness for skill-prose execution.** The tests transcribe the skill's bash into TypeScript-driven `spawnSync('bash', …)` calls. Drift between the skill's actual bash and the test transcription is a risk. Mitigation: the test file's header comment SHALL include a line-range reference to the canonical skill block (e.g., `// transcribed from skills/process-backlog.md:174-272 — UPDATE this test alongside any prose change`). Reviewer recommends this be enforced via a pre-commit hook in a follow-on spec; not 066's scope.

- **R4 — `tools/sync-skills.sh` drift if the canonical changes shape.** The sync script does a byte-identical copy; no transformation. Risk is zero if the script runs after every canonical edit. AC2 explicitly requires the post-edit `--check` to confirm.

- **R5 — operator already-running prose during the spec rollout.** A builder mid-handoff at the moment 066 lands could be on the old prose. Mitigation: the new prose's first line is the idempotent stage-detect (Test 1's setup); a builder on old prose that completes won't trigger this spec's path. If a builder is BLOCKED mid-old-prose at landing time, the founder runs the hand-cleanup recipe in AC1's "rerun" paragraph manually. One-time, low-frequency.

## Tests

All test changes land in **`tests/skills/process-backlog-handoff-atomicity.test.ts`** (new file).

**Four cases, in this order:**

1. **Pre-mutation state is clean** (per AC3 Test 1).
2. **Single-commit atomicity** (per AC3 Test 2).
3. **Mid-step-2 crash recoverable from clean working tree** (per AC3 Test 3).
4. **No observable partial-staged state during steps 1 and 2** (per AC3 Test 4 — the load-bearing structural pin).

**Test discipline / no-regression invariants:**

- Tests use throwaway repos in `os.tmpdir()` via `node:fs/promises`. No real network, no real `git push`. The skill's `git push origin main` step is OMITTED from the test transcription — the AC pins atomicity through the `git commit`, and push is an unrelated concern.
- Each test asserts on `git status --porcelain` output (textual; exact-match expected to be either empty or a specific shape per the documented invariant).
- Tests do NOT assert on absolute paths or timestamps in commit metadata; they assert on file-name-status (rename vs modify vs add) via `git diff-tree -r -M --no-commit-id --name-status HEAD`. The `-r` and `-M` flags are non-negotiable — without them the diff-tree output collapses to directory-level rows or to D/A pairs that miss rename detection (r1 codex F3 + codex-ops F6 MED, both verified on throwaway repos).
- The four tests run independently; failures localize to which invariant broke.

**Out of scope for tests:**

- Bash-unit-level testing of the skill's `awk`/`grep` pipelines. The end-to-end-through-git-commit assertions exercise them.
- Concurrency tests (two builders racing on one item). The atomic-claim flow at the start of process-backlog covers that; 066 is the handoff-end window.
- Property-based tests on the JSON shape of `backlog/task-state/<id>/builder.md`. The patcher has its own tests (`tools/task-state/lint.py` is the schema gate); 066's tests check ATOMICITY, not patcher-content correctness.

## Definition of Done

- AC1: `skills/process-backlog.md` reordered per the canonical bash transcript; all three mutations precede the first git index operation; ensure_stage is removed or inlined per the AC1 paragraph; comment block updated to state the working-tree-clean invariant.
- AC2: `.claude/commands/process-backlog.md` is byte-identical to `skills/process-backlog.md` post-sync; `tools/sync-skills.sh --check` exits 0.
- AC3: `tests/skills/process-backlog-handoff-atomicity.test.ts` exists, four cases pass via `npm test`.
- All ACs verified locally before pushing the feature branch (per founder memory on commit + push discipline).
- `npm run lint`, `npm run typecheck` clean.

## After Completion (Strategist Notes)

- **No new wiki page.** This is a discipline-fix on a shipped operating-model surface (skills/process-backlog.md). The cross-tool protocol is already documented in CLAUDE.md's "Cross-tool protocol lives in `skills/`" section.
- **Optional one-paragraph update to `wiki/operating-model/wave-1-2-3-retrospective.md`** (if a "drift-prevention" subsection exists post-promotion) recording the working-tree-window-as-bug pattern. Only if a natural insertion point exists; don't restructure.
- **Update `backlog/_followups.md`** — when the spec lands in `complete/`, strike the PRIORITY 1 entry under the 2026-05-21 harness seam review section and add a one-line back-reference to the 066 spec.
- **Do NOT promote a new principle page** about working-tree atomicity. One spec is not a pattern; if a *second* spec in the same class lands (e.g., the same pattern in `skills/merge-and-cleanup.md` or `skills/review-pending.md`), that's the trigger.
- **If the patcher behavior surfaces a hidden coupling** (R1), file a follow-on item refining `tools/task-state/patch-builder-state.py`'s `--spec-path` contract.

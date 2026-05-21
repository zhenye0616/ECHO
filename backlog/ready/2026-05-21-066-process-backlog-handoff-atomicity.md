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

1. **All disk mutations happen first**, on the source file's path (still under `backlog/claimed/<id>.md`), and on `backlog/task-state/<id>/builder.md` (which is in its final path anyway — the patcher always writes to that location).
2. **Then a single staged commit** does: `git mv` (renames + stages with the edits already baked in, because `git mv` after working-tree edits stages the rename + content together in one index operation), `git add` for the patched builder.md path + the run log, `git commit`, `git push`.

The crash-safety property this gives: at every point in the prose execution, the repo state is one of two clean configurations:

- **Pre-mutation**: file under `backlog/claimed/`, frontmatter intact, builder.md as last committed. Rerun = re-run the prose from E2 step 1.
- **Post-commit**: file under `backlog/pending_review/` with edited frontmatter, builder.md patched, run log committed, all in one commit. Rerun = idempotent no-op (the prose's ensure_stage at line 180 detects target stage and returns 0).

The only crash window that doesn't fall into either bucket: between the `git mv` and the `git commit` (which is now seconds, not minutes — no patcher, no python startup, no prose-edit work in this window). A crash here leaves a staged rename + staged builder.md add + staged log add, and an unfinished commit. Rerun: `git status` shows three staged paths; the prose's rerun step at line 187 (`git pull --rebase origin main`) still aborts on dirty index, but the recovery is now trivial: `git commit -m "review: <id>"` finishes the partial commit. This is documented as the rerun path in the new prose.

## Architectural invariant

**At every observation point in `skills/process-backlog.md`'s E2 / E2.5 / E2.6 prose, the repo state is one of three configurations:**

1. **Clean / pre-handoff**: item under `backlog/claimed/`, frontmatter shows pre-handoff fields, builder.md (if present) is the last committed version. Index is clean (relative to HEAD). Working tree may have unstaged edits to the item file and builder.md.
2. **Staged / mid-commit**: item rename + frontmatter edit + builder.md edit + log are all in the index. Working tree is clean (relative to index). Recoverable via `git commit -m "review: <id>"`.
3. **Clean / post-handoff**: item under `backlog/pending_review/` with handoff frontmatter, builder.md patched, run log committed, all in ONE commit on `main`. Working tree clean, index clean.

There is NO observable configuration where some-but-not-all of {rename, frontmatter, builder.md} are in working tree but not staged. The prose enforces this by ordering all disk mutations BEFORE the first `git` index/object operation.

## Acceptance Criteria

### AC1 — `skills/process-backlog.md` reorders E2 / E2.5 / E2.6 so disk mutations precede index operations

- **Modified file:** `skills/process-backlog.md`. Edit replaces the existing E2 + E2.5 + E2.6 bash blocks (lines ~174-272).
- **New ordering (canonical bash transcript):**

  ```bash
  cd ~/Desktop/Project_echo
  git pull --rebase origin main

  ITEM_FILE="backlog/claimed/$(basename $ITEM_FILE)"   # source path, BEFORE rename

  # Step 1 — frontmatter edit on the source file (still under claimed/).
  # Edit head_sha / pr_url / agent_notes IN-PLACE on $ITEM_FILE.
  # (prose: head_sha=<sha>, pr_url=<url-or-empty>, agent_notes=…)

  # Step 2 — builder-state patcher refresh (scope-detected as today).
  TASK_ID="${ITEM_ID}"
  POINTER="backlog/task-state/$TASK_ID/builder.md"
  HAS_TASK_STATE_REF=$(
    awk '/^---$/{c++; next} c==1 && /^task_state_ref:/{print; exit}' "$ITEM_FILE"
  )
  if [ -n "$HAS_TASK_STATE_REF" ] || [ -f "$POINTER" ]; then
    python3 tools/task-state/patch-builder-state.py \
      --task-id "$TASK_ID" \
      --outcome "$OUTCOME" \
      --spec-path "$ITEM_FILE" \
      --branch "agent/$SLUG" \
      --head-sha "$HEAD_SHA" \
      --run-log "$LOG"
    if [ -f "$POINTER" ]; then
      python3 tools/task-state/lint.py "$POINTER"   # hard stop on failure
    fi
  fi

  # Step 3 — atomic stage flip: git mv stages "rename + edits" in one index op;
  # git add stages the patched POINTER (if present) + the run log; one commit.
  git mv "$ITEM_FILE" "backlog/pending_review/$(basename $ITEM_FILE)"
  [ -f "$POINTER" ] && git add "$POINTER"
  git add "$LOG"
  git commit -m "review: $ITEM_ID"
  git push origin main
  ```

  Note the load-bearing reorder: the `git mv` is the FIRST git index operation, and it happens AFTER the frontmatter edit AND the patcher. The patcher's `--spec-path` argument now points at the source path (`backlog/claimed/<id>.md`), not the destination path. The patcher writes the spec path into `builder.md`'s `canonical_anchors.spec` field; the prose now updates that section explicitly to record `backlog/pending_review/<id>.md` AFTER the `git mv` succeeds — OR the patcher is invoked with the post-rename path (`backlog/pending_review/<id>.md`) which works because the file doesn't have to exist when the patcher runs (it writes builder.md, reads spec frontmatter via the path). **Reviewer MUST verify** with the patcher implementation (`tools/task-state/patch-builder-state.py`) which option is supported; if the patcher reads spec-frontmatter from disk at the path given, the path must be the source (claimed/); the spec-anchor field it writes can still be the destination (pending_review/) because patcher arg `--spec-path` is independent of where it RECORDS the anchor. The new prose pins the calling convention explicitly so a future patcher refactor doesn't break the reorder.

- **Lint-failure escalation contract preserved:** the existing rule "lint failure means escalation, not silent shipping" stays verbatim. Crash between lint and `git mv` is recoverable: nothing has been staged yet, so a rerun starts from a clean working tree (modulo the partially-written builder.md, which the patcher overwrites idempotently on rerun).

- **`ensure_stage` helper retired or repurposed.** The helper at lines 177-184 currently does the `git mv` inside a function — the new prose calls `git mv` inline so the rename happens at a known prose-step, not opaquely. If `ensure_stage` is preserved for the BLOCKED/escalated path or for E2.5's scope-detect, the spec MUST justify it in `agent_notes`; otherwise it is removed. The pre-existing idempotency case (re-run already at target stage) is handled inline: `[ -f "backlog/pending_review/$(basename $ITEM_FILE)" ] && exit 0` (or equivalent) at the very top of the new prose, BEFORE any edits.

- **Comment block update:** the existing comment at E2.6 lines 264-271 ("this commit captures all three … atomically") is replaced with a stronger invariant: "All three mutations are accumulated in the working tree FIRST (steps 1+2); the `git mv` + `git add` + `git commit` (step 3) is the only git index/object work and runs in seconds with no external waits. There is no observable state where some-but-not-all of {rename, frontmatter, builder.md} are partially-staged."

### AC2 — Adapter sync stays clean

- Run `tools/sync-skills.sh` after the canonical edit. The Claude Code adapter at `.claude/commands/process-backlog.md` is rewritten as a byte-identical copy of the canonical.
- Reviewer MUST verify: `tools/sync-skills.sh --check` exits 0 post-edit.
- The Codex adapter installer (`tools/install-echo-codex-skills.sh`) is NOT modified; the user's installed codex-side copy refreshes the next time the founder runs the installer. Out of scope #4 covers this.

### AC3 — `tests/skills/process-backlog-handoff-atomicity.test.ts` pins the four invariants

- **New test file** at `tests/skills/process-backlog-handoff-atomicity.test.ts`. Vitest, in-process, no real git push (uses a throwaway repo via `git init` + local commits only).
- **Test 1 — pre-mutation state is clean.** Create a throwaway repo, add an item under `backlog/claimed/<id>.md` with frontmatter `claimed_by: X, head_sha: ""`, plus `backlog/task-state/<id>/builder.md` with a valid pointer. Assert: `git status --porcelain` is empty. Then execute the new prose's Step 1 + Step 2 (frontmatter edit + patcher). Assert: `git status --porcelain` shows ONLY unstaged modifications to `backlog/claimed/<id>.md` and `backlog/task-state/<id>/builder.md` (NO staged changes, NO renames-in-index). The item file is still at the source path on disk.
- **Test 2 — single-commit atomicity.** Continue Test 1's repo state. Execute Step 3 (`git mv` + `git add` + `git commit`). Assert: exactly ONE new commit on HEAD; `git diff-tree --no-commit-id --name-status HEAD` shows the rename (R-status) for the item file PLUS a modify (M) for `backlog/task-state/<id>/builder.md` PLUS an add (A) for the run log. Assert: `git status --porcelain` is empty.
- **Test 3 — mid-step-2 crash is recoverable from clean working tree.** Simulate a crash by aborting the prose between Step 1 (frontmatter edited) and the patcher call. Run `git restore --worktree backlog/claimed/<id>.md` to undo. Assert: `git status --porcelain` is empty; rerun from Step 1 succeeds and produces one commit.
- **Test 4 — no observable partial-staged state.** During Step 1 + Step 2 execution, snapshot `git status --porcelain` at each intermediate point (after frontmatter edit; after patcher; before `git mv`). At every snapshot, assert that the index has ZERO staged changes (working tree may be dirty, index must be clean). This is the load-bearing pin against future drift that re-introduces a staged-rename window.

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

- **R1 — patcher's `--spec-path` argument coupling.** The patcher writes builder.md based on the spec path it's given. If it reads spec frontmatter from that path at runtime, the reorder must pass the SOURCE path (`backlog/claimed/<id>.md`) because the rename hasn't happened yet. If it only writes the path as a string into `canonical_anchors.spec`, either source or destination works. AC1's parenthetical pins this — reviewer MUST verify against current patcher behavior. Mitigation: if the patcher requires the destination path, the prose moves the patcher invocation to AFTER the `git mv` but BEFORE the final `git add` + `git commit`; this preserves AC1's invariant (all mutations are still in working tree before any commit, because `git mv` has only updated the index — the working tree is consistent). The invariant is preserved either way; only the prose layout shifts.

- **R2 — `git mv` after unstaged edits.** Behavior: `git mv src dst` after editing `src` produces a staged rename WITH the edits baked in (because git mv = filesystem rename + `git add dst` + `git rm src`, and `git add dst` captures current contents). Confirmed standard git semantics. Reviewer MUST verify with a manual run on a throwaway repo before approving — if a corner case exists (e.g., line-ending normalization quirks on macOS), the spec needs a `git update-index --add` workaround.

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
- Tests do NOT assert on absolute paths or timestamps in commit metadata; they assert on file-name-status (rename vs modify vs add) via `git diff-tree --no-commit-id --name-status HEAD`.
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

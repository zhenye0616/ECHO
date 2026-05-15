---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
verdict: merge as-is
reviewed_at: 2026-05-15T09:15:00Z
test_counts: { passed: 109, failed: 0 }
---

## Verdict

The implementation is two crisp shell edits (~10 lines net) plus 316 lines of high-quality vitest coverage. All 109 review-queue tests pass, lint + typecheck clean, `bash -n` clean, AC1–AC6 all Met, drift zero, and every R1–R4 fix-lineage decision (`--rebase=merges` equals-form syntax, `--git-common-dir` over `--git-path`, lock check positioned after `LOG_FILE` setup under `set -euo pipefail`, `CODEX_BIN` env hook over PATH-shadow, `^2`-existence-only assertion, prompt fixtures for both reviewers) is correctly applied. Merge order vs item 050 matters — **051 should merge FIRST**, then 050. Founder must re-apply `--rebase=merges` to 050's rewritten `push-with-retry.sh` push line at 050-merge time (textual merge will drop it).

## Acceptance status

- **AC1** — Met — `tools/review-queue/push-with-retry.sh:25` uses `pull --rebase=merges` (single-flag-value form); retry budget, autostash, refspec, `PUSH-RACE-FALLBACK` row format preserved (`push-with-retry.sh:21-37`).
- **AC2** — Met — Lock check at `_run_reviewer.sh:77-82` sits after `LOG_DIR`/`LOG_FILE`/`mkdir`/rotation (lines 53-63) and before `codex exec` invocation (line 91); uses `git rev-parse --git-common-dir`; emits `tick skipped: merge in progress (lock=…, holder=…)`; exits 0 cleanly. `CODEX_BIN` env hook at line 45.
- **AC3** — Met — `run-codex-reviewer.sh` / `run-codex-ops-reviewer.sh` not touched (5-line drivers exec `_run_reviewer.sh`); test parameterizes across `REVIEWER_NAME=codex` AND `codex-ops` (`run-reviewer-honors-merge-lock.test.ts:120`).
- **AC4** — Met — "Out of Scope" section honored: no new lock primitive, no in-script polling, no `merge-and-cleanup.md` edits, no `commit-reviewer-response.sh` edits, no Cursor changes, no `--rebase=merges` outside `push-with-retry.sh:25`.
- **AC5** — Met — `_run_reviewer.sh:81` is `exit 0`; no poll loop; "codex-stub-not-invoked when lock present" assertion falsifies any hidden polling.
- **AC6** — Met — `bash -n` clean on both files; `npm test tests/review-queue/` → 109 passed; DoD #4 grep returns exactly 3 hits (2 writers in `skills/` + `.claude/commands/` mirror, 1 reader in `_run_reviewer.sh:77`).

## Drift findings

No drift detected. Files touched: `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_run_reviewer.sh`, plus two new test files under `tests/review-queue/`. All within the spec's `files_to_modify` permission. The two `run-codex*-reviewer.sh` entries are no-touch-by-design per AC3 — correctly left alone.

## Design-choice judgments

- **`--rebase=merges` (equals form) instead of `--rebase-merges`** — **stand**. R1 codex F1 confirmed the bare-flag form crashes `git pull` with exit 129.
- **`--git-common-dir` instead of `--git-path`** — **stand**. R1 convergent finding (codex F3 + codex-ops F2). `--git-path` silently resolves to per-worktree path inside linked worktrees and would miss the writer's sentinel.
- **Lock check positioned after `LOG_FILE` block, inside redirected `{ … } >> "$LOG_FILE" 2>&1`** — **stand**. Under `set -euo pipefail`, earlier check would crash on unbound `$LOG_FILE`; placement also captures the skip line to rotation log per AC2.
- **`CODEX_BIN` env hook instead of `$PATH` shadow** — **stand**. Wrapper prepends `/opt/homebrew/bin:...` to PATH and would shadow PATH-resolved stubs; explicit env hook is the only reliable test seam. Mirrors `run-codex-builder.sh:94`.
- **`^2`-existence-only assertion (no tree-equality)** — **stand**. R4 codex F1 demonstrated tree-equality fails because the rebased second parent inherits the sibling clone's tree; existence-of-`^2` is the minimal falsifying differential.
- **Both reviewer-prompt fixtures copied in test setup** — **stand**. R3 codex F1 + R4 codex F2: without both, the `[ -f "$PROMPT" ]` guard short-circuits to `tick abort: prompt missing` before reaching the codex stub.

## Bugs/risks

- `_run_reviewer.sh:79` — `HOLDER=$(cat "$LOCK_PATH" 2>/dev/null | head -1)`: minor stylistic noise (useless-use-of-cat, redundant 2>/dev/null behind the line-78 existence guard). Not a bug.
- `_run_reviewer.sh:78` — TOCTOU between `[ -f "$LOCK_PATH" ]` and the codex child's eventual `git add`. Spec body Risk R1 explicitly acknowledges; defers to 050 for structural fix. Acceptable per spec.
- No security or concurrency vulnerabilities introduced.

## Merge-conflict preview

- **vs current `main`**: zero conflicts predicted. `git log main..HEAD` shows only the two builder commits; no recent main commits touch `_run_reviewer.sh` or `push-with-retry.sh`.
- **vs item 050 (other pending_review)**: HEAVY conflict if 051 lands AFTER 050.
  - 050 rewrites `_run_reviewer.sh` (+77 lines, lifecycle wrapper) and `push-with-retry.sh` (+30 lines, CWD-agnostic refspec).
  - 050's AC3 + AC7 grep gate delete the entire `echo-merge-in-progress` convention.
  - If 050 merges first: 051's AC2 lock-check would need hand-deletion (convention is gone), AND AC1's `--rebase=merges` flag must be hand-re-applied onto 050's rewritten line 40 of `push-with-retry.sh`.
  - If **051 merges FIRST** (matches spec's stated intent): 050's subsequent merge encounters conflicts at the same two files, but 050's diff explicitly REPLACES those regions. Resolution path: "take 050's side wholesale at `_run_reviewer.sh` (051's lock check becomes dead code per spec), and at `push-with-retry.sh` re-apply `--rebase=merges` onto 050's rewritten line 40." Both 050 and 051 specs already anticipate this path.
- **Recommended order**: merge **051 FIRST**, then 050.

## Suggested fixups

**Pre-merge punch list (blocking):** None. Merge as-is.

**Non-blocking follow-ups:**
- At 050-merge time, founder MUST re-apply `--rebase=merges` to 050's rewritten `push-with-retry.sh` push line (textual merge will drop it). File as 050-followup-H if missed.
- Cosmetic: collapse `$(cat … | head -1)` on `_run_reviewer.sh:79` to `head -1 "$LOCK_PATH"`. Pure noise; skip.
- The reviewer-stub test inherits `process.env` wholesale (includes developer's real PATH). Works today via explicit `CODEX_BIN`, but a future revert to PATH-based codex resolution would silently invoke real codex. Add env-scrubbing comment or pin `PATH=/usr/bin:/bin` in test env. Non-blocking.

## Test counts observed

- `npx vitest run tests/review-queue/` → **17 files, 109 tests, all green** (matches `agent_notes`).
- `npm run lint` → clean (eslint + python task-state lint).
- `npm run typecheck` → clean (`tsc --noEmit`).
- `bash -n push-with-retry.sh && bash -n _run_reviewer.sh` → SYNTAX OK.
- DoD #4 grep `grep -rn echo-merge-in-progress tools/review-queue/ skills/ .claude/` → exactly 3 hits.

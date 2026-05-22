# 2026-05-21-066-process-backlog-handoff-atomicity — agent run log

- **Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Claude Code, in-session via /process-backlog)
- **Branch:** `agent/process-backlog-handoff-atomicity`
- **Worktree:** `~/Desktop/Project_echo--process-backlog-handoff-atomicity`
- **Head SHA at handoff:** `e6822d7f85a2e099013a2cf439ae8cf10deb5c33`

## Run 1 (2026-05-21)

### What I implemented

AC1, AC2, AC3 of `2026-05-21-066-process-backlog-handoff-atomicity` ("P1 — Atomic state transition, consumer: process-backlog work-item stage move"):

- **AC1 (reusable P1 harness):** added `tests/skills/atomic-state-transition-harness.test.ts` defining `P1ConsumerFixture` (matching the spec's interface), a generic harness asserting P1 invariants 1–7, and two harness-only neutral fixtures:
  - Fixture A: target-not-visible-before-publish, `kind: "git-commit"`, `observerScope: "local"` — proves the contract works for the simplest substrate.
  - Fixture B: target-visible-before-publish, `kind: "pushed-ref"`, `observerScope: "remote"`, implements `finishUnpublishedTransition()` — proves the contract supports the finish path.
  - Plus a prefix-guard rejection test and a key-scoped concurrency test (two distinct `transitionKey` fixtures run concurrently without interfering).
- **AC2 (skill transcript):** rewrote Step E2 of `skills/process-backlog.md` to the canonical P1 transcript:
  - `recover_p1_stage_move` (strictly rollback-only) — prefix guard, idempotent boundary-already-published early return, post-commit-pre-push deferral to caller finish path, per-surface dispatch, documented return codes 2/4/5.
  - Caller-side finish-path block — runs `tools/review-queue/push-with-retry.sh` + boundary verification when `p1_local_commit_unpushed` is true; finishes the local commit rather than rolling it back.
  - `git -c rebase.autoStash=true pull --rebase origin main` for the post-recovery pull so tracked-dirty `$LOG` / `raw/internal/queue-errors.md` don't abort rebase.
  - Step 3 publish block: `git mv` + explicit `git add "$DEST"` + conditional pointer/log stage + `git commit` + `push-with-retry.sh` + final boundary verification.
  - Task-state patcher invoked with `--spec-path "$DEST"` BEFORE the rename (verbatim into `canonical_anchors.spec`).
  - Generated adapter `.claude/commands/process-backlog.md` refreshed via `tools/sync-skills.sh`; `tools/sync-skills.sh --check` passes.
- **AC3 (current-consumer specialization):** 14 tests in the same file using a local bare repo as `origin` (no real-network) — pre-publish exposure, durable boundary (local + remote), committed destination contents, recovery for crash-after-metadata-edit and crash-after-`git mv`, prefix-guard rejection of unsafe surfaces, no-op after publish, partial pre-`git mv` per-surface dispatch, caller-side finish path after commit-but-not-push, `$LOG` preservation through recovery, return-code blocks publish (sub-cases for 2, 4, 5), untracked-cleanup real-error surfacing, --autostash for tracked-dirty `$LOG` and `queue-errors.md`. All 32 tests pass.

### Decisions made during implementation

1. **`recover_p1_stage_move` per-surface dispatch filter — broadened from "in HEAD" to "tracked (HEAD or index)".** The r2 codex-ops F4 correction filtered by `git cat-file -e "HEAD:$path"` to avoid `git restore` aborts on pathspecs not known to git. I confirmed empirically that `git restore --staged --worktree` only aborts when a path is in NEITHER HEAD NOR the index — for staged-but-not-in-HEAD paths (e.g., the destination of a `git mv` before the crash, exactly the AC3 test 5 scenario) the restore works correctly. The original filter excluded staged-but-not-in-HEAD paths and routed them to `git rm --cached --ignore-unmatch`, which refuses (without `-f`) when the staged blob differs from both HEAD and worktree — the exact post-`git mv` crash state, leading to return 4 and AC3 test 5 failure. The broadened filter (`git cat-file -e "HEAD:$path" || git ls-files --error-unmatch -- "$path"`) preserves r2's intent (avoid `git restore` aborts on unknown paths) while fixing the test-5 gap. The skill comment block calls this out explicitly so future readers see the rationale.
2. **Step 1 (metadata edit) is agent-driven prose, not bash.** The canonical transcript keeps the existing Step 1 comment block ("Edit head_sha / pr_url / agent_notes in place on $ITEM_FILE — agent-driven, performed via Edit/Write tools, not via bash"). The test harness splits the script invocation into `PHASE=recover` and `PHASE=publish` so the test can apply the metadata edit between them (mirroring what a real agent does), without changing the skill's single-transcript narrative.
3. **Return-code-5 test uses a PATH-injected fake `git`.** The post-rollback dirty check (`git diff --quiet ... || return 5`) is a safety net that's genuinely unreachable through normal repo manipulation — `git restore --staged --worktree` either succeeds (returning a clean state) or returns non-zero (caught earlier as return 4). To exercise return 5 deterministically, AC3 test 11b injects a fake `git` wrapper on `PATH` that returns 1 on `git diff --quiet` while delegating everything else to real git. This pins the safety-net code path without requiring a structural-only assertion.
4. **Bootstrap leaves `$LOG` untracked.** In the real flow, the run log is written by E1 just before E2 and is brand-new at publish time — the publish block's `git add "$LOG"` introduces it as an "A" entry in the commit. The test fixture matches this by NOT committing `$LOG` at bootstrap; tests that need `$LOG` tracked (e.g., AC3 test 13) commit it explicitly as setup.
5. **`backlog/pending_review/.gitkeep` in the test fixture.** Tracked content under `backlog/pending_review/` is needed so the directory survives `git restore` (which can remove the dir along with the file). Without this, AC3 test 5's replay fails with ENOENT on the second `git mv`. The real repo has tracked content there; the fixture mirrors that.

### Files modified

| File | Change | Lines |
|---|---|---|
| `skills/process-backlog.md` | Replaced Step E2 (`ensure_stage`/E2.5/E2.6) with the canonical P1 transcript | +210 / -75 |
| `.claude/commands/process-backlog.md` | Refreshed via `tools/sync-skills.sh` (byte-equivalent to canonical) | +210 / -75 |
| `tests/skills/atomic-state-transition-harness.test.ts` | New file — AC1 harness + neutral fixtures + AC3 14 tests + skill marker pin | +1158 / 0 |

Head SHA on `agent/process-backlog-handoff-atomicity` at push: `e6822d7f85a2e099013a2cf439ae8cf10deb5c33`.

### Acceptance status

| Criterion | Status |
|---|---|
| AC1 — reusable P1 harness with `P1ConsumerFixture` interface; generic assertions 1–7; two neutral fixtures (target-visible-false + target-visible-true with finish path) | ✅ Pass — 4 AC1 tests pass (2 fixture harness runs, prefix rejection, key-scoped concurrency) |
| AC2 — `skills/process-backlog.md` current-consumer transcript with prefix guard, rollback-only recovery, caller-side finish path, --autostash pull, explicit `git add "$DEST"`, patcher with `--spec-path "$DEST"`, push-with-retry + final boundary verification; `tools/sync-skills.sh --check` passes | ✅ Pass — sync-check returns 0; canonical and adapter are byte-equivalent |
| AC3 — current-consumer harness instantiation with all 14 required tests; local bare repo as origin; rename-detecting commit-shape assertion; committed-content assertion via `git show HEAD:path` and `origin/main:path` | ✅ Pass — 14 AC3 tests pass; plus 12 structural skill-marker pins; total 32 tests pass in the file |

### Verbatim test output

```
$ npx vitest run tests/skills/atomic-state-transition-harness.test.ts
...
 ✓ tests/skills/atomic-state-transition-harness.test.ts (32 tests) 61.92s

 Test Files  1 passed (1)
      Tests  32 passed (32)
   Duration  62.82s
```

Verification commands from the spec's "Tests" section:

```
$ npm test -- tests/skills/atomic-state-transition-harness.test.ts
   (32 tests passed, see above)
$ tools/sync-skills.sh --check
OK: all Claude command adapters match canonical skills/
$ git diff --check
(no output — no whitespace issues)
```

### Open questions for founder

None. AC1, AC2, AC3 are met. The single judgment call (Decision #1 — broadening the per-surface dispatch filter from "in HEAD" to "tracked") is documented in the skill text and in the rationale above; it deviates from the literal r2 codex-ops F4 wording but matches the spec's stated intent (no operator decision; reliable recovery for the named crash scenarios including AC3 test 5).

### Drift events caught

None. All work stayed inside `files_to_modify` (`skills/process-backlog.md`, `.claude/commands/process-backlog.md`, `tests/skills/atomic-state-transition-harness.test.ts`). No edits to `wiki/`, `tools/task-state/patch-builder-state.py`, `skills/merge-and-cleanup.md`, or any "Out of Scope" surface.

One incident worth noting (NOT drift, but worth recording for future runs): early in the run I accidentally edited `skills/process-backlog.md` in the main repo on `main` rather than in the worktree. I caught it before commit, restored the main-repo copy from HEAD, and re-applied the edit in the worktree. Main repo was left clean; worktree commit landed cleanly on `agent/process-backlog-handoff-atomicity`.

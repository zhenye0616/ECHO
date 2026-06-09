---
item_id: 2026-06-08-099-code-owned-sidecar-writer
verdict: "merge as-is"
reviewed_at: "2026-06-09T07:20:59Z"
test_counts:
  passed: 4
  failed: 0
producer: review-pending-orchestrator
---

## Verdict

**merge as-is.** Independent review by a Claude code-reviewer subagent (builder = codex; reviewer = distinct Claude subagent — reviewer-independence satisfied) against the agent branch at `d1c2a344`. All seven acceptance criteria pass; the implementation is correct, complete, and in scope.

Per-AC: AC1 (writer derives target from item_id, stamps producer/reviewed_at, rejects conflicting/forbidden keys, validates-before-finalize) ✅; AC2 (same-dir temp → validate → atomic no-clobber `os.link`; `os.replace` only under `--replace`; existing target untouched on reject, no stray temp) ✅; AC3 (`_sidecar_validate.py` import-safe, both CLIs import it, no duplication/shell-out, validate-sidecar CLI contract unchanged) ✅; AC4 (schema `producer` collapsed to const `review-pending-orchestrator`; two retired values fail) ✅; AC5 (`check_pending_review_sidecars()` over `git ls-files` pending_review sidecars, repo-tracked, no HOME dep) ✅; AC6 (transcription site retired; repo-root-resolved cwd-independent invocation; adapter in sync) ✅; AC7 (standalone `test-emit-sidecar.sh` covers writer + gate cases in a disposable temp git repo with cleanup trap; `test-validate-sidecar.sh` updated so only orchestrator validates) ✅.

## Pre-merge fixups

None. No fixups required.

## Expected merge conflicts

None expected. The agent branch forked from `bb426677`/`04f73b77` (the promote + amend commits); main has not advanced on any of the touched paths since (the only intervening commits are 099's own claim/builder/review bookkeeping, already on the branch's history). Touched files: `tools/review-queue/{emit-sidecar.py,_sidecar_validate.py,validate-sidecar.py,check-coupled-invariants.sh,test-emit-sidecar.sh,test-validate-sidecar.sh}`, `tools/review-queue/schemas/review-sidecar.schema.json`, `skills/review-pending.md`, `.claude/commands/review-pending.md`, plus backlog/task-state bookkeeping.

## Follow-up items (defer, do not block merge)

- Strategist post-merge: update `backlog/_followups.md` R6.adapter_freshness — mark the emit-sidecar.py writer + validate-sidecar CI gate bullet resolved by 099; note 100 (proposed) carries the Codex-adapter detection half.
- Strategist post-merge: also fold in the R6.reviewer_orchestration binding-validator fix (commit `0689d1bb`, `validate_request_binding` robust frontmatter parse) and the R6.pipeline_lifecycle note that `promote.py` does not validate `priority` enum (the `MEDIUM`→`MED` slip blocked global builder selection until corrected).
- Non-blocking observation (not a fixup): emit-sidecar.py renders `reviewed_at` as a quoted scalar while the live-template path is unquoted; both validate (schema pattern + datetime coercion accept both).

## Verification (reviewer-run, in worktree @ d1c2a344)

- `bash tools/review-queue/test-emit-sidecar.sh` → rc=0
- `bash tools/review-queue/test-validate-sidecar.sh` → rc=0
- `tools/review-queue/check-coupled-invariants.sh` → rc=0
- `tools/sync-skills.sh --check` → rc=0
- Worktree stayed clean before/after (no stray sidecar artifacts); direct emit-sidecar sanity checks (valid write; conflicting-producer/supplied-reviewed_at/target_path/missing-field all rejected with no write; no-clobber leaves existing file byte-identical; `--replace` overwrites) all confirmed.

test_counts reflects the four green verification gates the reviewer ran (the change touches no TypeScript; the merge's own C5 `npm test` will record the full suite count).

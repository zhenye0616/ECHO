---
item_id: 2026-06-18-104-granola-meeting-capture
verdict: merge with founder fixups
reviewed_at: '2026-06-21T21:44:33Z'
test_counts:
  passed: 1767
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Independent code review of branch agent/granola-meeting-capture @ df9bd0ea (worktree ground-truth matched recorded head_sha). All four amended ACs are Met with file:line evidence: append-only two-atom ingest-once shape with dedupe_key in metadata (no storage upsert), api:granola surface + source_app enum ripple, crash-safe atomic checkpoint with ingested-note-id skip + advance-after-durable-write + single-in-flight + bounded timeout + operator-visible errors, and env->os.homedir() config precedence with launchd no-shell-env startup self-disable. typecheck clean, lint clean, 1767 tests pass. The only two full-suite failures are pre-existing/flaky and NOT caused by 104: tests/cli/shell-reachable.test.ts (fails on clean main; daemon/bash-env) and tests/mcp/recent-calls-endpoint.test.ts (passes in isolation 2/2; load-timeout flake). src/storage/* and src/capture/pipeline.ts are untouched (the constraint that blocked attempt #1 is respected). One blocking fixup: a 15th touched file is undeclared in files_to_modify.

## Pre-merge fixups
- [ ] Add `tests/capture/sources.test.ts` to the item's `files_to_modify` frontmatter (the diff touches 15 files; 14 are declared). It is a legitimate ripple of the `sources.ts` `apis:['granola']` change (updates the `apis:[]` / `isAllowedApi` pins at sources.test.ts:22-23,114-120), but the binding list must match the diff per the atomic-claim contract. No code change.

## Expected merge conflicts
- None expected. Branch was cut from current `origin/main` (HEAD == recorded head_sha); enum/description edits (`source-app.ts`, `search-memories.ts`, `wait-for-new-turns.ts`, `echo-resolve-mru.ts`, `sources.ts`, `daemon/index.ts`) are append-style on stable lines; new files (`granola-poller.ts`, `granola.ts`, new tests) add cleanly; pinned tests only add Granola rows. Expect a clean `--no-ff` merge.

## Follow-up items (defer, do not block merge)
- Coalesce partial-checkpoint writes (write every K notes or only on the final note) if first-sync batches ever get large — pure optimization, not needed at n=1/n=2 volume.
- Optionally skip writing an empty summary atom when both `summary_markdown` and `summary_text` are absent (granola-poller.ts:513).
- Strategist (post-merge): create the wiki `capture/` Granola surface page + `capture/per-app/granola-collected-data` ref per the item's 'After Completion' notes.

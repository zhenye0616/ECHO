---
item_id: 2026-05-25-072-adapter-sync-engine
verdict: merge with founder fixups
reviewed_at: 2026-05-26T03:15:02Z
test_counts: { passed: 1297, failed: 0, skipped: 21 }
---

## Verdict
Core engine shape is good and all required verification commands pass, but this should merge only after founder-approved fixups. The pre-merge concern is correctness around false success: Claude Code skill fan-out can report success even when every command-file copy is skipped. The TOML parse-error diagnostic also misses the spec's requested byte-offset detail.

## Pre-merge fixups
- [ ] `src/echo-home/adapter-sync.ts:793` - In `handleClaudeSkills`, if `syncClaudeSkills()` returns zero copied files, add an `AdapterError` and make the Claude Code agent `ok: false`; otherwise a `commandsDir` full of symlinked targets can falsely pass.
- [ ] `tests/echo-home/adapter-sync.test.ts` - Add a regression test for "all command targets skipped -> claude-code ok:false / overallOk:false".
- [ ] `src/echo-home/adapters/codex-config.ts:203` and `src/echo-home/adapter-sync.ts:838` - Include TOML parse byte offset in the surfaced parse error, or explicitly adjust the contract if the offset is not available.

## Expected merge conflicts
- None observed. `git merge-tree $(git merge-base main HEAD) main HEAD` reported no conflicts; the branch is additive under `src/echo-home/adapters/`, `tests/echo-home/`, and `src/echo-home/adapter-sync.ts`, with only the task-state pointer touching an existing file.

## Follow-up items (defer, do not block merge)
- Founder product call on R6: keep fully ECHO-owned Claude command files, or spec a future marker-merge migration.

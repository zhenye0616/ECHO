---
task_id: 2026-05-21-067-mcp-request-log-shutdown-flush
role: builder
writer: codex-builder
last_updated: 2026-05-22T05:39:50Z
---

## current_thesis

Claim of 2026-05-21-067-mcp-request-log-shutdown-flush. Implement the narrow graceful-shutdown request-log flush: add `killed_during_shutdown`, expose a synchronous tmp-then-rename JSONL flush, wire it into daemon shutdown after `mcp.stop()` and before extractor/watcher teardown, and add only the specified unit/integration coverage.

## locked_decisions

- AC1 is limited to `src/mcp/request-log.ts` and `src/mcp/server.ts`: widen the status union, add `flushRecentMcpCallLog(path, now?)`, accept the new status filter, and preserve steady-state begin/finish/fail/read/instrument behavior.
- AC1 flush semantics are locked: rewrite pending entries in place, stamp nonnegative `duration_ms`, write `''` for an empty ring, write newline-terminated JSONL for a non-empty ring, use `writeFileSync(path + '.tmp', body)` then `renameSync(path + '.tmp', path)`, and best-effort unlink the tmp sibling on error.
- AC2 is limited to `src/daemon/index.ts`: use the canonical data dir for `mcp-shutdown.jsonl`, call the flush after `await mcp.stop()`, isolate flush failures with inline try/catch + stderr, then continue extractor/watcher/storage teardown.
- AC3 extends only `tests/mcp/request-log.test.ts` with mixed-status, empty-ring, and repeated-overwrite coverage.
- AC4 adds only `tests/daemon/lifecycle-shutdown-flush.test.ts` with in-process stop+flush tests, source-text assertion for production wiring, and a local closure proving flush failure does not skip teardown.

## open_questions

- None blocking at claim. If the allowed file list proves insufficient, escalate rather than widening scope.

## dont_touch

- No `src/daemon/lifecycle.ts` interface changes.
- No generic `src/daemon/shutdown-flush.ts` helper.
- No `coord_emit`, P10 coordination artifact, or structured inter-agent handoff for this forensic JSONL file.
- No next-boot banner, shutdown JSONL reader, live ring rehydration, SQLite persistence, status MCP tool, config flag, rotation/archive, or write-on-every-call shadow log.
- No edits to `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, or `docs/NORTH_STAR.md`.

## canonical_anchors

- spec: backlog/claimed/2026-05-21-067-mcp-request-log-shutdown-flush.md

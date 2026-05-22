---
task_id: 2026-05-21-067-mcp-request-log-shutdown-flush
role: builder
writer: claude-code-builder
last_updated: 2026-05-21T20:30:00Z
---

## current_thesis

Claimed 067 as Claude Code builder. AC1 adds `killed_during_shutdown` status + `flushRecentMcpCallLog(path, now?)` with atomic tmp-then-rename in `src/mcp/request-log.ts`, and widens `parseStatusParam` in `src/mcp/server.ts`. AC2 wires the flush into the existing `src/daemon/index.ts:54-66` onShutdown closure after `await mcp.stop()` and before extractor/watcher teardown, isolated by inline try/catch + stderr write per AC2 failure-isolation contract. AC3 extends `tests/mcp/request-log.test.ts` with four cases (mixed-status, empty-ring, repeated-flush, atomic-write mechanism via writeFileSync/renameSync spies). AC4 adds new `tests/daemon/lifecycle-shutdown-flush.test.ts` with Tests i/ii (in-process stop+flush), iii (source-text assertion of daemon wiring — replaces r1 surrogate runtime test per r2 dispositioning), iv (flush-failure isolation via direct closure mirror). No `src/daemon/lifecycle.ts` interface change.

## locked_decisions

- AC1 atomic write is mandatory: tmp-then-rename, not direct `writeFileSync`. AC3 includes a mechanism-assertion test (spy on `writeFileSync`/`renameSync`) so the contract can't regress to direct write.
- AC1 keeps the flush helper local to `src/mcp/request-log.ts`. Do NOT extract a `src/daemon/shutdown-flush.ts` in 067 — second-occurrence rule remains the trigger.
- AC2 binds dataDir once via `resolveDataDir()` (already used at `daemon/index.ts:40`) and reuses that same value for the flush path; no `lifecycle.ts` interface change.
- AC2 wraps `flushRecentMcpCallLog(...)` in inline try/catch with stderr write so a flush throw cannot short-circuit subsequent extractor/watcher/dispose teardown. The lifecycle module's outer try/catch alone is insufficient because a throw would skip the remaining `await` chain.
- AC4 Test (iii) is source-text assertion only — no `process.emit('SIGTERM')`, no `startLifecycle` invocation. Removes the r1 lifecycle-state-leak failure mode codex F2 (r2) identified.
- AC4 Test (iv) builds a direct closure that mirrors `daemon/index.ts:58-66` shape (no signal handlers installed, no lifecycle module touched).
- Tests use per-case temp paths with cleanup; shared request-log state reset via `resetRecentMcpCallLogForTests()`.
- No new dependencies beyond stdlib (`node:fs`, `node:path`, `node:os`) and existing test utilities (`vitest`, `vi.spyOn`, `MemoryStorage`).

## open_questions

- None blocking. Spec is fully self-contained through r4.

## dont_touch

- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md` — read-only for builder.
- `src/daemon/lifecycle.ts` — no interface change; the flush belongs in `daemon/index.ts`'s onShutdown closure.
- `beginRecentMcpCall`, `finishRecentMcpCall`, `failRecentMcpCall`, `readRecentMcpCalls`, `instrumentMcpServer` steady-state behavior — AC1 only adds the new export and widens the status union.
- Out-of-scope items per spec §"Out of Scope (Dispositioned)" 1–11: rotation/archival, JSONL-read-on-boot, `tail-mcp.sh` banner (split to 068), write-on-every-call shadow log, SQLite persistence, `mcp_status` tool, second JSONL size cap, `flushOnSIGTERM` config flag, CLAUDE.md journal discipline edits, `/mcp/recent-calls` reading the shutdown JSONL, and extractor/watcher generalization.

## canonical_anchors

- spec: backlog/claimed/2026-05-21-067-mcp-request-log-shutdown-flush.md
- reviews: backlog/reviews/2026-05-21-067-mcp-request-log-shutdown-flush/

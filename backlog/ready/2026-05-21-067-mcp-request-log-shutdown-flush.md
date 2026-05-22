---
id: 2026-05-21-067-mcp-request-log-shutdown-flush
title: MCP request log persists in-flight calls on SIGTERM (close the silent-loss window during graceful daemon restart)
status: ready
priority: HIGH
estimate: 0.25-0.5d
created: 2026-05-21
blocked_by: []
task_state_ref: 2026-05-21-067-mcp-request-log-shutdown-flush
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/mcp/request-log.ts  # AC1 — extend RecentMcpCallStatus with 'killed_during_shutdown'; add flushRecentMcpCallLog(path, now?) that rewrites still-pending entries, synchronously writes the current ring as JSONL, and leaves steady-state begin/finish/fail/read/instrument paths unchanged.
  - src/mcp/server.ts  # AC1 — extend parseStatusParam at lines 157-160 so '/mcp/recent-calls?status=killed_during_shutdown' is accepted once the status exists.
  - src/daemon/index.ts  # AC2 — onShutdown hook at lines 54-66 calls flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl')) after mcp.stop() and before watcher/extractor teardown; no lifecycle.ts interface change required.
  - tests/mcp/request-log.test.ts  # AC3 — add mixed-status flush, empty-ring flush, and repeated-flush overwrite/idempotency coverage.
  - tests/daemon/lifecycle-shutdown-flush.test.ts  # AC4 — new integration test for the same in-process stop+flush sequence the shutdown hook uses; no real SIGTERM.

spec_refs:
  - src/mcp/request-log.ts  # lines 31-34 are the process-memory ring; lines 51-61 finalize only when the wrapped callback returns/throws; lines 79-103 finish/fail no-op if the entry has already disappeared.
  - src/daemon/lifecycle.ts  # lines 18-22 define the canonical dataDir; lines 70-87 run the shutdown hook; lines 96-131 show the lifecycle handle already exposes dataDir.
  - src/daemon/index.ts  # lines 40 and 54-66 are the current pid-lock/dataDir and onShutdown wiring; the flush belongs inside this closure after mcp.stop().
  - src/mcp/server.ts  # lines 157-160 parse recent-call status filters; lines 363-374 stop the server by close() then closeAllConnections?.().
  - backlog/_followups.md  # lines 886, 904, 943, and 968-974 define P2, P10, the P2 postmortem mechanism for merge-pause recovery, and surfaced sibling spec candidates.
  - CLAUDE.md  # lines 203-207 warn against strategist drift by patching deeper instead of removing/re-scoping.
  - skills/review-queue-watch.md  # lines 101-116 are the disposition discipline: prefer dropping or splitting recently-added mechanism over patching deeper.

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

# MCP request log persists in-flight calls on SIGTERM

## Why this spec exists

`src/mcp/request-log.ts` is the daemon's live audit trail for MCP tool calls, but it is currently only an in-process ring buffer (`src/mcp/request-log.ts:31-34`). During graceful daemon shutdown, `src/daemon/lifecycle.ts:70-87` runs the onShutdown hook; `src/daemon/index.ts:54-66` stops MCP; and `src/mcp/server.ts:363-374` closes the HTTP server plus active connections. Any wrapped tool callback that has not returned by then can remain `pending`, and the entire ring disappears when the process exits.

067 exists to close that controllable, common loss window for the current P2 consumer: the in-process MCP request log. It does not attempt to solve every restart-observability case in the harness. The narrow fix is to synchronously write the current request-log ring to `<dataDir>/mcp-shutdown.jsonl` during graceful shutdown, rewriting any still-`pending` entry to `killed_during_shutdown` so the dying process leaves an explicit forensic artifact.

## Mapping to harness primitives

**P2 — In-flight observability across restart.** P2's contract at `backlog/_followups.md:886` says any `pending` / in-flight operation at process shutdown MUST surface on the next boot. 067 satisfies the daemon-side durable-artifact half for the current in-process tool-call-log consumer under graceful SIGTERM/SIGINT. It deliberately does not claim full P2 closure: operator-visible next-boot surfacing is split to sibling stub `2026-05-21-068-tail-mcp-shutdown-banner`, and non-graceful death is an accepted contract limit recorded below.

**P8 — Attributable audit trail.** The flushed JSONL strengthens P8 for daemon MCP calls by preserving tool name, projected arg/result shape, timing, and final shutdown status across restart. It complements, but does not replace, CLAUDE.md's dogfooding journal discipline for AI-client-side MCP calls.

**P10 — Structured inter-agent messages.** P10 is considered and rejected for 067. This artifact is not an inter-agent handoff; no downstream agent is expected to parse prose or infer meaning from filesystem layout. It is a structured operator-forensic JSONL file at a documented daemon-owned path. The P2 postmortem row at `backlog/_followups.md:943` proposed `coord_emit` + daemon storage for merge-pause recovery because that case is an inter-agent coordination event. Different consumers, different mechanisms.

## Why JSONL-on-disk, not `coord_emit`

`coord_emit` is the right mechanism when one actor needs to hand typed state to another actor across a restart, such as `merge_paused` / `merge_blocked`. The MCP shutdown log has a different consumer: an operator investigating what the daemon served before it died. JSONL-on-disk keeps the artifact local, inspectable with shell tools, bounded by the existing 1000-entry ring, and independent of the coord substrate. If a future workflow needs agents to consume shutdown records as coordination events, that is a new P10-facing spec, not hidden scope in 067.

## Root cause and minimum viable fix

The request-log module was built as a live debug aid: `beginRecentMcpCall` appends to memory, and `finishRecentMcpCall` / `failRecentMcpCall` update entries only after the wrapped callback returns or throws. The daemon shutdown path has no request-log hook, so graceful restarts lose both completed entries and still-pending entries.

The minimum viable fix is one request-log export plus one daemon hook:

1. Add status value `killed_during_shutdown`.
2. Add `flushRecentMcpCallLog(path: string, now = Date.now()): void`.
3. In `src/daemon/index.ts`, call the flush after `await mcp.stop()` and before extractor/watcher teardown.
4. Keep the implementation request-log-local. Do not add a generic shutdown-flush helper in 067; the second occurrence rule remains the trigger for extracting shared extractor/watcher support.

## Architectural invariant

After graceful SIGTERM/SIGINT, every entry that was visible to `readRecentMcpCalls()` during the dying daemon's lifetime is recoverable from `<dataDir>/mcp-shutdown.jsonl`. Entries that completed before shutdown preserve their `ok` / `error` status. Entries still `pending` at flush time are rewritten in-place to `killed_during_shutdown` and receive a `duration_ms` measured from their original `ts` to the flush time.

**Explicit accepted gap against P2:** this invariant does not cover SIGKILL, OOM kill, process panic before the hook runs, or host power loss. Those cases provide no shutdown execution window, so 067 cannot flush. A write-on-every-call shadow log is the only mechanism that can close that gap; it is deferred until ops evidence shows the extra latency and surface area are justified.

## Acceptance Criteria

### AC1 — `src/mcp/request-log.ts` gains `killed_during_shutdown` status + `flushRecentMcpCallLog` export

- **Modified files:** `src/mcp/request-log.ts`, `src/mcp/server.ts`.
- `RecentMcpCallStatus` at `src/mcp/request-log.ts:4` becomes `'pending' | 'ok' | 'error' | 'killed_during_shutdown'`.
- `flushRecentMcpCallLog(path: string, now = Date.now()): void`:
  - rewrites every still-`pending` entry to `killed_during_shutdown`;
  - stamps `duration_ms = Math.max(0, now - entry.ts)` on rewritten entries;
  - writes one `JSON.stringify(publicClone(entry))` line per ring entry;
  - writes `''` for an empty ring and `lines.join('\n') + '\n'` for a non-empty ring;
  - uses `writeFileSync` intentionally because shutdown may drain the event loop immediately after the hook returns;
  - **writes atomically via tmp-then-rename** (r1 codex-ops F4): `writeFileSync(path + '.tmp', body); renameSync(path + '.tmp', path)`. POSIX `rename(2)` is atomic, so any consumer reading `<dataDir>/mcp-shutdown.jsonl` sees either the prior complete file or the new complete file — never an empty or truncated file produced by a SIGKILL during the write. Best-effort cleanup of the `.tmp` sibling on error (try/catch around `unlinkSync(path + '.tmp')`); leaking the tmp file is acceptable, destroying the prior breadcrumb is not.
- No changes to `beginRecentMcpCall`, `finishRecentMcpCall`, `failRecentMcpCall`, `readRecentMcpCalls`, or `instrumentMcpServer` steady-state behavior.
- `parseStatusParam` at `src/mcp/server.ts:157-160` accepts `killed_during_shutdown` as a valid status filter.
- Add a short module comment documenting the graceful-shutdown contract and the explicit non-graceful-death gap.
- **Gap 3 decision:** do not add `src/daemon/shutdown-flush.ts` in 067. Keep the transform/write loop simple and local so a later extractor/watcher spec can extract it cleanly on second occurrence.

### AC2 — `src/daemon/index.ts` onShutdown hook calls the flush

- **Modified file:** `src/daemon/index.ts`.
- Bind the canonical data dir once from `resolveDataDir()` and use that same value for the pid lock and shutdown flush path, or consume `startLifecycle()`'s existing `dataDir` handle without changing `src/daemon/lifecycle.ts`.
- Import `flushRecentMcpCallLog` from `../mcp/request-log.js`.
- In the onShutdown closure at `src/daemon/index.ts:58-66`, call:

  ```ts
  await mcp.stop();
  try {
    flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'));
  } catch (err) {
    process.stderr.write(`[daemon] mcp-shutdown-flush failed: ${(err as Error).message}\n`);
  }
  await cursorExtractor.stop();
  ```

- The ordering is load-bearing: `mcp.stop()` first closes/rips active MCP connections; the flush then records the coherent ring snapshot; extractor/watcher teardown follows.
- **Flush failure isolation (r1 codex F1 + codex-ops F3 HIGH).** `src/daemon/lifecycle.ts:73-78` wraps the entire `onShutdownHook` in a single try/catch, so an unhandled throw from the flush would short-circuit every subsequent `cursorExtractor.stop()` / `codexExtractor.stop()` / `claudeCodeExtractor.stop()` / `gitWatcher.stop()` / `fsWatcher.stop()` / `dispose()` call. An observability flush MUST NOT be allowed to leave handles open or storage undisposed. The inline try/catch above isolates the failure: write the error to stderr (visible in launchd logs) and continue teardown. AC4 Test (iv) below proves a thrown-flush does not skip subsequent teardown steps.
- No changes to extractor startup, watcher startup, storage initialization, or lifecycle interface definitions.

### AC3 — Unit tests in `tests/mcp/request-log.test.ts`

- Extend the existing test file; do not create a second unit-test file.
- Add a mixed-status flush case: begin three calls, finish one `ok`, fail one `error`, leave one `pending`, flush to a temp JSONL path, and assert three lines with statuses `ok`, `error`, `killed_during_shutdown`. Also assert the pending entry's `duration_ms` is non-null and `readRecentMcpCalls()` now shows the in-place killed status.
- Add an empty-ring case: `flushRecentMcpCallLog(tmpPath)` creates the file with exactly `''` contents.
- Add an idempotent overwrite case: flush once with one pending call, add a second pending call, flush again, and assert the file contains the full current ring of two killed entries rather than an appended delta.
- Tests use per-case temp paths and remove them in cleanup.

### AC4 — Integration test in `tests/daemon/lifecycle-shutdown-flush.test.ts`

- New Vitest file that exercises the same in-process stop+flush sequence used by the shutdown hook; no real SIGTERM or child process.
- **Correct `startMcpServer` signature (r1 codex F2).** Every server boot in this file uses `startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false })` — the installed API is `startMcpServer(storage, options)`, not `startMcpServer(options)`. Mirrors `tests/mcp/recent-calls-endpoint.test.ts:110` and `tests/mcp/server.test.ts:52` for consistency.
- Test (i): start `startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false })`, make one completed `echo_ping` call, start one long-enough MCP call and verify it is visible as `pending` via `readRecentMcpCalls()`, then run `await mcp.stop()` followed by `flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'))`. Assert the completed call is present as `ok` and the in-flight call is present as `killed_during_shutdown`.
- Test (ii): with the same fixture shape, assert the flush file exists at exactly `join(dataDir, 'mcp-shutdown.jsonl')` and contains the expected tool name.
- **Test (iii) — daemon entrypoint source assertion (r2 codex F1 + codex-ops F1 convergent; replaces the r1 surrogate runtime test).** The r1 patch tried to prove production wiring by importing `startLifecycle` and building a test-local onShutdown closure. r2 reviewers correctly observed that this proves only that `startLifecycle` can run a hook — a builder could leave `src/daemon/index.ts` unchanged and the surrogate test would still pass. The r1 mechanism is also leaky: `process.emit('SIGTERM')` installs lifecycle module SIGTERM/SIGINT listeners and sets the module-global `shuttingDown` flag, which contaminates subsequent tests in the same file. **Per the watcher's "removal over deeper patching" discipline, drop the surrogate runtime test in favor of a source-text assertion** that is narrower, falsifiable, and free of lifecycle-state leak:
  - Read `src/daemon/index.ts` as text via `fs.readFileSync`.
  - Assert the file contains `flushRecentMcpCallLog(` exactly once.
  - Assert the call is wrapped in a `try { flushRecentMcpCallLog(...) } catch` block.
  - Assert the call's path argument is `join(dataDir, 'mcp-shutdown.jsonl')` (or the canonical equivalent the builder picks per AC2's dataDir binding) — i.e. the literal `'mcp-shutdown.jsonl'` substring is present in the same lexical block as the flush call.
  - Assert ordering: the `flushRecentMcpCallLog(` substring's byte offset is greater than the `await mcp.stop()` substring's byte offset and less than the first extractor `.stop()` substring's byte offset within the `onShutdown:` closure literal. A simple regex on the closure body is sufficient; full AST parsing is not required.
  - These five assertions together close the unwired-daemon-passes-AC4 gap without introducing process-signal mocking or lifecycle module state leak. Future moves of the wiring to a different file simply update the path in this test; runtime correctness is still proven by Tests (i)/(ii)/(iv).
- **Test (iv) — flush failure does not skip teardown (r1 codex F1 + codex-ops F3 from r1).** Construct a test-local closure that mirrors the `daemon/index.ts:58-66` shape exactly: `await mcp.stop(); try { flushRecentMcpCallLog(badPath); } catch (err) { process.stderr.write(...); } await extractorA.stop(); ... dispose();`. Pass a `badPath` that forces a synchronous throw from `writeFileSync` (e.g. a path inside a non-existent directory that cannot be created) OR stub `flushRecentMcpCallLog` via `vi.spyOn` to throw a fixed error. Build extractor/watcher/dispose stubs as `vi.fn()` returning resolved promises. Invoke the closure directly (no `startLifecycle`, no `process.emit`, no signal handlers installed). Assert every extractor/watcher `stop` and `dispose` was called exactly once despite the flush throwing, and assert the stderr write happened (`vi.spyOn(process.stderr, 'write')`). Pins the failure-isolation contract from AC2 without touching the lifecycle module's process-global state.
- Cleanup stops the server if needed (Tests i/ii) and removes the temp data dir; restores any `vi.spyOn` stubs. Shared request-log state is reset between tests via `resetRecentMcpCallLogForTests()`. No `process.emit` or `startLifecycle` invocation in any AC4 test — that removes the inter-test contamination concern codex F2 (r2) raised at lifecycle.ts:70-87/125-128.

## Out of Scope (Dispositioned)

1. **[keep as OoS] Rotating or archiving `mcp-shutdown.jsonl`.** Each shutdown overwrites the most recent dying-process artifact.
2. **[keep as OoS] Reading JSONL back into the live ring on next boot.** The next daemon's ring remains live-process state only.
3. **[promoted to sibling spec: 2026-05-21-068-tail-mcp-shutdown-banner] `tail-mcp.sh` next-boot banner.** This is the operator-awareness half of P2 and should be specced separately against `tools/tail-mcp.sh`.
4. **[keep as OoS] Write-on-every-call shadow log for SIGKILL/OOM/panic survival.** The accepted contract limit is recorded in the Architectural Invariant, not buried here.
5. **[keep as OoS] Persisting request-log entries to SQLite.** SQLite is the durable atom substrate; making every MCP call a DB write is a separate latency/concurrency design.
6. **[keep as OoS] Adding an `mcp_status` MCP tool.** `/mcp/recent-calls` already exposes the live ring.
7. **[keep as OoS] Adding a second JSONL size cap.** The 1000-entry ring and projected/redacted shapes bound the file for V1.
8. **[keep as OoS] Adding a `flushOnSIGTERM` config flag.** Graceful shutdown flush is always on.
9. **[keep as OoS] Changing CLAUDE.md journal discipline.** Client-side dogfooding journal and daemon-side request log remain independent audit trails.
10. **[keep as OoS] Teaching `/mcp/recent-calls` to read the shutdown JSONL.** The endpoint serves the live ring only.
11. **[keep as OoS] Generalizing shutdown flush to extractors/watchers.** 067 must not block future extraction, but the second concrete consumer should trigger the shared helper.

## Risks

- **R1 — Stop/flush race.** A callback may finalize cleanly during `mcp.stop()` or remain pending until flush. The invariant is not exact killed-vs-error timing; it is that no visible ring entry is absent or left pending after graceful shutdown.
- **R2 — Synchronous disk write during shutdown.** `writeFileSync` can block on slow storage. The atomic tmp-then-rename pattern (AC1) ensures any consumer reading `<dataDir>/mcp-shutdown.jsonl` sees either the prior complete file or the new complete file — never a truncated mid-write artifact. A SIGKILL during the tmp-file write loses the new breadcrumb but preserves the prior one; that is the worst-case the architectural invariant accepts.
- **R3 — DataDir plumbing drift.** `src/daemon/index.ts` already calls `resolveDataDir()` at line 40 while lifecycle resolves it again internally. The implementation should bind one canonical value for the pid lock and flush path, or consume the lifecycle handle; it should not introduce a third path resolver.
- **R4 — Scope creep into P10 coordination.** Do not emit coord events in 067. The merge-pause postmortem needs typed events; the request-log forensic artifact does not.

## Tests

Run the focused tests added by AC3/AC4, then the repo-standard checks:

- `npm test -- tests/mcp/request-log.test.ts tests/daemon/lifecycle-shutdown-flush.test.ts`
- `npm test`
- `npm run lint`
- `npm run typecheck`

No test should spawn a real daemon child process, send OS signals, write outside temp dirs, or require live network beyond loopback ephemeral ports.

## Definition of Done

- AC1: `flushRecentMcpCallLog` exists; status includes `killed_during_shutdown`; `/mcp/recent-calls` accepts the widened status filter; module comment documents the contract.
- AC2: the daemon shutdown hook flushes to `<dataDir>/mcp-shutdown.jsonl` after `mcp.stop()` and before extractor/watcher teardown.
- AC3: request-log unit tests cover mixed, empty, and repeated flush behavior.
- AC4: lifecycle integration test proves the stop+flush path writes the expected file and does not leave the in-flight call pending or absent.
- No `src/daemon/lifecycle.ts` interface change is required.
- `npm test`, `npm run lint`, and `npm run typecheck` pass before the builder moves 067 to review.

## After Completion (Strategist Notes)

- No wiki edit during build. If this later ships and there is a natural insertion point, the strategist may add one sentence to the MCP server/storage architecture docs noting the graceful-shutdown request-log artifact.
- When 067 moves to `complete/`, update `backlog/_followups.md` to mark the request-log graceful-SIGTERM portion of P2 as shipped, while leaving the next-boot banner and non-graceful shadow-log gaps explicit.
- If extractor/watcher shutdown queues produce a second concrete occurrence, spec the shared helper then; do not pre-build it in 067.

## Sibling specs surfaced during respec

- `2026-05-21-068-tail-mcp-shutdown-banner` — teach `tools/tail-mcp.sh` to surface `<dataDir>/mcp-shutdown.jsonl` on next daemon boot, including a count of entries rewritten to `killed_during_shutdown`. This closes the operator-awareness half of P2 that 067 intentionally splits out.

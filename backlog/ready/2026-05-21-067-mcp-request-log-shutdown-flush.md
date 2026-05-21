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
  - src/mcp/request-log.ts  # AC1 — extend RecentMcpCallStatus to include 'killed_during_shutdown'; add flushRecentMcpCallLog(path: string): Promise<void> that (a) marks every still-`pending` entry's status to 'killed_during_shutdown' and stamps duration_ms = (now - ts) for visibility, (b) writes the full ring buffer as JSONL to <path> via writeFileSync (synchronous to survive imminent process exit), (c) returns after the write completes. Existing readRecentMcpCalls / instrumentMcpServer signatures unchanged.
  - src/daemon/index.ts  # AC2 — onShutdown hook (lines 58-66) calls `await flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'))` AFTER `mcp.stop()` returns and BEFORE the watcher stops + dispose. dataDir is the value lifecycle.ts:18-22 returns (`resolveDataDir()`); reuse via existing handle plumbing.
  - src/daemon/lifecycle.ts  # AC2 — minor: expose dataDir on LifecycleHandle (already returned via `{ storage, dataDir }` at line 131; daemon/index.ts currently discards it via destructuring on line 54 — the spec extends the destructure to capture and pass it to the onShutdown closure).
  - tests/mcp/request-log.test.ts  # AC3 — extend with THREE new cases: (i) flush with mixed pending + ok + error entries → JSONL file exists, has correct line count, pending entries are rewritten to 'killed_during_shutdown', ok/error preserved verbatim; (ii) flush on empty ring → file is created and empty (zero lines); (iii) flush is idempotent on repeated call → second call overwrites file with current ring contents (which may differ if the ring was mutated between calls).
  - tests/daemon/lifecycle-shutdown-flush.test.ts  # AC4 — new test file: starts an MCP server via startMcpServer({port: 0}), fires a few real tool calls (echo_ping), starts one tool call but cancels mid-flight via aborting the HTTP client, then triggers the onShutdown hook directly and asserts the shutdown JSONL exists at the expected path with the in-flight entry marked 'killed_during_shutdown'.

spec_refs:
  - src/mcp/request-log.ts  # the in-memory ring buffer + finalize-on-callback-return pattern that loses pending entries on process exit; lines 31-34 (calls[] is process-memory), 51-61 (status transition only on cb return/throw), 79-103 (finishRecentMcpCall / failRecentMcpCall — both no-ops if the entry id is missing)
  - src/daemon/lifecycle.ts  # shutdown() at lines 70-87 calls onShutdownHook then releasePidLock + clearInterval; the hook is the only operator-side flush point; resolveDataDir at lines 18-22 owns the canonical path for `<dataDir>/mcp-shutdown.jsonl`
  - src/daemon/index.ts  # lines 58-66 — the onShutdown closure that stops MCP + watchers; the spec inserts the flush AFTER mcp.stop and BEFORE watcher stops, so any in-flight callback torn down by `httpServer.closeAllConnections()` has its `pending` entry visible to the flush
  - src/mcp/server.ts  # lines 363-375 — `stop()` calls `httpServer.close()` (graceful wait) then `closeAllConnections?.()` (rip TCP); this is the moment the in-flight callback's connection dies; the callback itself may continue executing for some short time, but the wrapper's finishRecentMcpCall may not fire if the event loop is drained before the callback yields
  - backlog/_followups.md  # PRIORITY 2 entry under "2026-05-21 — harness seam review" — the in-the-moment finding that motivates this spec
  - CLAUDE.md  # "Dogfooding journal discipline" section — every `mcp__echo__*` call must be journaled; the same audit-grade rationale applies to the daemon's own internal log of which calls fired during the now-ending process lifetime

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

`src/mcp/request-log.ts` is the daemon's internal audit trail of every MCP tool call — what was invoked, with what arg-shape, when, and how it finished. `tools/tail-mcp.sh` consumes it for live operator visibility. The journal discipline in CLAUDE.md treats every `mcp__echo__*` invocation as audit-grade signal that the dogfooding loop depends on.

But the ring buffer is **process memory only** (line 34, `const calls: MutableRecentMcpCall[] = []`). It has no persistence layer. Three failure modes lose data:

1. **Graceful SIGTERM during in-flight calls.** A launchd restart, a `kill <pid>`, a `Ctrl-C` on the daemon, an OS update — all fire SIGTERM. `src/daemon/lifecycle.ts:70-87` runs the shutdown sequence; `src/daemon/index.ts:58-66` stops MCP via `mcp.stop()` which calls `httpServer.close()` followed immediately by `httpServer.closeAllConnections?.()` (`src/mcp/server.ts:367-372`). Any tool callback running at that moment has its connection ripped out, then the event loop drains and node exits — the callback's `finishRecentMcpCall` / `failRecentMcpCall` may never get to run. The corresponding entry stays `pending` forever. **It is also lost entirely** because the buffer is in-memory and the process is about to exit. The operator looking at `tail-mcp.sh` sees "daemon back online" once the new process starts; there is no breadcrumb of what was killed.

2. **All previously-completed entries are also lost.** Even for tool calls that DID complete (`ok` / `error`) before SIGTERM, the ring buffer goes away with the process. Operators investigating "did the daemon serve that request before the restart?" have no way to check — they see only post-restart entries.

3. **Crash / panic / SIGKILL.** Identical loss of all entries; this is accepted as the worst case (no opportunity to flush). But the graceful SIGTERM path — which is by far the most common and the only one currently producing silent data loss in a controllable way — has no excuse.

The trigger for closing this seam: the project is moving toward more unattended / launchd-driven cycles (review-queue reviewer ticks, periodic merges, eventual cron-style schedule). Every restart of those processes will lose the in-flight request log unless this fix lands. The exposure scales with daemon-restart frequency.

## The root cause

The request-log module was designed as an **in-process debug aide**, not as an audit trail. The ring buffer is sized at 1000 entries, sharded against process lifetime, with no on-disk shadow. The shutdown path in `lifecycle.ts:70-87` and `daemon/index.ts:58-66` has no hook into the request log — `shutdown()` calls the onShutdownHook (which stops watchers + MCP) and `releasePidLock()`, but the request log is invisible to both.

The mismatch: the dogfooding journal discipline (CLAUDE.md) requires every MCP call be logged in-the-moment as audit-grade signal. The daemon's own internal log of the same events is NOT audit-grade — it disappears at every restart. Future tooling (a "what did the daemon serve between restart X and restart Y?" forensic query) cannot be built on top of a log that disappears.

The narrowest fix: a single new export `flushRecentMcpCallLog(path: string)` that the onShutdown hook calls AFTER `mcp.stop()` returns. After `mcp.stop()`, the HTTP server is closed and connections are ripped — so any callback still running has lost its ability to respond and is unlikely to call `finishRecentMcpCall`. Flush at this point: mark all `pending` entries with status `killed_during_shutdown`, write the full ring as JSONL to disk, and the operator has a deterministic record of the dying process's last 1000 calls plus an explicit accounting of which were torn down mid-flight.

## The minimum-viable fix

1. **New `RecentMcpCallStatus` value: `'killed_during_shutdown'`.** This is the load-bearing distinction — operators reading the shutdown JSONL must be able to tell, per entry, whether the call completed cleanly before death, errored cleanly before death, or was torn down by shutdown. The new status does NOT appear in steady-state (the ring buffer transitions are `pending → ok` or `pending → error` only); it appears only in the flushed JSONL.

2. **New `flushRecentMcpCallLog(path: string)` export.** Synchronous write (uses `node:fs.writeFileSync`) to survive imminent event-loop drain. One JSONL line per entry in the ring buffer. Status field reflects current state at flush time — `pending` entries are rewritten to `killed_during_shutdown` AS PART OF THE FLUSH (in-memory mutation; the ring buffer is dying anyway, but the test asserts the rewritten state to pin the behavior). Each line includes ts (epoch ms), tool, args_shape, result_shape, duration_ms, status.

3. **Wire into `src/daemon/index.ts` onShutdown hook.** The flush call goes AFTER `mcp.stop()` returns (so HTTP is closed; in-flight callbacks are torn down OR have completed) and BEFORE watcher stops (which is unrelated and shouldn't be blocked by the flush). The flush path is `<dataDir>/mcp-shutdown.jsonl`, overwritten on each shutdown (no rotation — operators check the file post-restart; one file is sufficient for V1).

4. **Lifecycle handle plumbs `dataDir`.** Currently `src/daemon/index.ts` line 54 destructures `{ storage, backend, dispose }` from `createStorage()` but ignores the `dataDir` value `startLifecycle` returns (lifecycle.ts:131 returns `{ storage, dataDir }`). The spec extends the destructure to capture `dataDir` and pass it into the onShutdown closure for the flush path. Minor change; preserves the existing lifecycle contract.

## Architectural invariant

**Every entry that was visible to `readRecentMcpCalls()` during the daemon's lifetime is recoverable from `<dataDir>/mcp-shutdown.jsonl` after a graceful SIGTERM.** No entry is lost without operator-visible signal. Entries that were `pending` at shutdown time are explicitly tagged `killed_during_shutdown` so operators can distinguish "completed-before-death" from "torn-down-by-shutdown" at a glance.

The invariant **does NOT cover SIGKILL / panic / OOM**. Those failure modes are accepted as worst-case (no flush opportunity); operators investigating those scenarios have to rely on launchd's own restart logs + any external mirror. V1 scope is graceful SIGTERM.

## Acceptance Criteria

### AC1 — `src/mcp/request-log.ts` gains `killed_during_shutdown` status + `flushRecentMcpCallLog` export

- **Modified file:** `src/mcp/request-log.ts`.
- **New status:** `RecentMcpCallStatus` type at line 4 extends to `'pending' | 'ok' | 'error' | 'killed_during_shutdown'`.
- **New export:**

  ```ts
  export function flushRecentMcpCallLog(path: string, now: number = Date.now()): void {
    // Pre-flush: rewrite every still-pending entry to killed_during_shutdown
    // and stamp duration_ms for visibility (now - entry.ts). The ring buffer
    // is about to die with the process; this in-place mutation makes the
    // dying state explicit in the flushed JSONL.
    for (const entry of calls) {
      if (entry.status === 'pending') {
        entry.status = 'killed_during_shutdown';
        entry.duration_ms = Math.max(0, now - entry.ts);
      }
    }
    // Synchronous write — must survive imminent event-loop drain on SIGTERM.
    // One JSONL line per entry; trailing newline; no JSON-array wrapper (so a
    // partial write at least leaves valid leading lines parseable).
    const lines = calls.map((entry) => JSON.stringify(publicClone(entry)));
    const body = lines.length === 0 ? '' : lines.join('\n') + '\n';
    writeFileSync(path, body);
  }
  ```

  Synchronous on purpose. Async fs would race the event-loop drain — `await` on a write to a slow disk could be cancelled by node's exit, partially writing the file or skipping the write entirely. `writeFileSync` blocks the thread until the write completes, which is what we want.

- **No changes** to `beginRecentMcpCall`, `finishRecentMcpCall`, `failRecentMcpCall`, `readRecentMcpCalls`, `instrumentMcpServer`. Steady-state code paths are untouched.
- **`parseStatusParam` in `src/mcp/server.ts:157-161` extends** to accept `'killed_during_shutdown'` as a valid query param value. Operators may want to query the live ring for that status (it won't appear during normal operation, but the API surface should accept it for consistency once the flush has run on a previous boot and an operator imports the JSONL into a new context). This is a one-line addition.
- **Header / module comment update:** add a paragraph documenting the new shutdown-flush contract: "On graceful SIGTERM, `flushRecentMcpCallLog` is invoked by the daemon's onShutdown hook AFTER `mcp.stop()` returns. The flush writes every ring-buffer entry as JSONL to `<dataDir>/mcp-shutdown.jsonl` (overwritten each shutdown). Entries that were still `pending` at flush time are rewritten in-place to `killed_during_shutdown`. SIGKILL / panic / OOM bypass the flush; those failure modes accept full ring-buffer loss as worst-case."

### AC2 — `src/daemon/index.ts` onShutdown hook calls the flush

- **Modified files:** `src/daemon/index.ts`, `src/daemon/lifecycle.ts` (minor — expose `dataDir` on the lifecycle handle, already returned, so just plumbing it through the destructure).

- **`src/daemon/lifecycle.ts`:** the `LifecycleHandle` interface already includes `dataDir: string` (line 98). No interface change; the existing return value is now consumed. The spec MUST verify no other consumer is silently broken (a `grep` for `startLifecycle(` should turn up only `src/daemon/index.ts`).

- **`src/daemon/index.ts`:** import `flushRecentMcpCallLog` from `../mcp/request-log.js`. Capture `dataDir` from the `startLifecycle` return:

  ```ts
  const lifecycle = await startLifecycle({
    storage,
    storageBackend: backend,
    extraPayload: { mcp_port: mcp.port, mcp_url: mcp.url },
    onShutdown: async () => {
      await mcp.stop();
      flushRecentMcpCallLog(join(lifecycle.dataDir, 'mcp-shutdown.jsonl'));
      await cursorExtractor.stop();
      await codexExtractor.stop();
      await claudeCodeExtractor.stop();
      await gitWatcher.stop();
      await fsWatcher.stop();
      dispose();
    },
  });
  ```

  Note the **closure ordering**: `mcp.stop()` runs FIRST (HTTP closes, connections rip, callbacks tear down). Then `flushRecentMcpCallLog` runs (captures the current ring state, including any callback that just got torn down without finalization). Then watchers stop + dispose. The order is load-bearing — flushing before `mcp.stop` would miss the killed-during-shutdown entries; flushing after watchers would risk a watcher's own exit handler racing the write.

  **Captured closure variable (`lifecycle`).** TypeScript hoisting: `lifecycle` is declared in the same statement that consumes it inside the closure. ESLint may flag this as use-before-define; the closure doesn't execute until shutdown time, so the reference is safe. If the linter flags it, the alternative is a two-step `const dataDir = resolveDataDir(); … onShutdown: async () => { … flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl')); … }` — both work; reviewer picks.

- **No changes** to `extractors`, `watchers`, `storage` initialization, or the `acquirePidLockOrExit` call at line 40.

### AC3 — Unit tests in `tests/mcp/request-log.test.ts`

- **Extend existing test file** (do NOT create a new file for unit-level coverage). Three new cases:

- **Test (i) — flush with mixed pending + ok + error entries.** Setup: `resetRecentMcpCallLogForTests()`; begin three calls (`beginRecentMcpCall(tool='a', …)`, `beginRecentMcpCall('b', …)`, `beginRecentMcpCall('c', …)`); finish two of them (one `ok`, one `error`); leave the third `pending`. Call `flushRecentMcpCallLog(tmpPath)`. Assert:
  - `fs.readFileSync(tmpPath, 'utf8')` parses as three JSON lines.
  - Line 1 has `status === 'ok'`; line 2 has `status === 'error'`; line 3 has `status === 'killed_during_shutdown'`.
  - Line 3's `duration_ms` is non-null (the flush stamped it).
  - Ring buffer post-flush: `readRecentMcpCalls()` shows the third entry's status is now `'killed_during_shutdown'` (in-place mutation visible to in-process readers).

- **Test (ii) — flush with empty ring.** Setup: `resetRecentMcpCallLogForTests()`; call `flushRecentMcpCallLog(tmpPath)` with no entries. Assert:
  - File exists at `tmpPath`.
  - File contents are exactly the empty string (zero bytes) — NOT a newline-only file. This pins the body-construction to `lines.length === 0 ? '' : lines.join('\n') + '\n'`; a future refactor that writes `\n` unconditionally fails here.

- **Test (iii) — flush is idempotent on repeated call.** Setup: `resetRecentMcpCallLogForTests()`; begin one call (pending); flush; begin a second call (also pending); flush again. Assert:
  - First flush wrote one line with `status: 'killed_during_shutdown'`.
  - Second flush wrote two lines, both `status: 'killed_during_shutdown'` (the first entry was already killed; the second was pending at the second flush and gets rewritten).
  - File contents are overwritten, not appended (second flush is the full current ring, not a delta).

- All tests use `os.tmpdir()` + `path.join(tmpdir, 'mcp-shutdown-test-' + uuid + '.jsonl')`; `afterEach` deletes the temp file. No shared state across cases.

### AC4 — Integration test in `tests/daemon/lifecycle-shutdown-flush.test.ts`

- **New test file.** Vitest, in-process, exercises the full server-lifecycle flush path.

- **Test (i) — real shutdown flushes in-flight call as killed_during_shutdown.** Setup:
  1. Create a throwaway dataDir (`os.tmpdir()/echo-test-<uuid>`).
  2. Call `startMcpServer({port: 0, …})` to get an ephemeral MCP server.
  3. Fire one synchronous tool call (`echo_ping`) and await its result — verify it transitions `pending → ok` cleanly.
  4. Fire a second tool call (`wait_for_new_turns` with a short timeout, OR `echo_ping` — pick one that produces a detectable in-flight `pending` window). Abort the HTTP request mid-flight via `AbortController.abort()`.
  5. While the second call is still in `pending` state in the ring (verify via `readRecentMcpCalls`), invoke the equivalent of the onShutdown closure manually: `await mcp.stop()` then `flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'))`.
  6. Read the JSONL file. Assert:
     - It has at least two lines (the completed `echo_ping` + the aborted call).
     - The completed call's line has `status: 'ok'`.
     - The aborted call's line has `status: 'killed_during_shutdown'` (the wrapper's `failRecentMcpCall` may or may not have fired before the abort; the flush guarantees the killed status either way IF the entry was still pending — if `failRecentMcpCall` did fire and the status is `'error'`, the test should accept either as a pass since both are "deterministic, audit-grade" outcomes; what fails the test is the entry remaining `'pending'` post-flush or being absent entirely). **Reviewer MUST decide** whether to assert exactly `'killed_during_shutdown'` (strict — but may be flaky if `failRecentMcpCall` wins the race) OR accept `'killed_during_shutdown' OR 'error'` (more robust). The narrowest correct assertion is: status is NOT `'pending'` and NOT absent.

- **Test (ii) — flush file lives at the expected dataDir path.** Setup: same as Test (i). Fire one tool call; let it complete; manually invoke the flush. Assert: `fs.existsSync(join(dataDir, 'mcp-shutdown.jsonl'))` returns true. Parse the file; assert the entry's tool name matches what was called.

- Both AC4 tests use vitest's `afterEach` to call `mcp.stop()` (if not already stopped) and `fs.rm(dataDir, {recursive: true, force: true})` to clean up. No shared state.

- **No real SIGTERM in the test.** The AC4 tests directly invoke `mcp.stop()` + `flushRecentMcpCallLog` — they exercise the same code path that the SIGTERM handler invokes via the onShutdown hook, without spawning a child process and sending a signal. This is symmetric with how `tests/coord/coord-emit-wrapper-transport.test.ts` uses in-process fixtures (per item 059's AC3 test discipline).

## Out of Scope (Don't Drift)

1. **Rotating / archiving `mcp-shutdown.jsonl` across restarts.** Each shutdown overwrites the file; the operator sees the MOST RECENT dying breath, not historical ones. If a workflow needs the prior shutdown's log, the operator can copy the file before the next restart. Rotation is V1.5+ scope.

2. **Reading the JSONL back into the ring buffer on next boot.** Out of scope — the next process's ring starts empty. Operators inspect `mcp-shutdown.jsonl` separately; the live ring is the live ring. If future tooling wants a "merge prior shutdown into live ring on boot" feature, it gets its own spec.

3. **`tail-mcp.sh` banner integration ("Previous shutdown lost N calls").** The followup naming P2 mentioned `tail-mcp.sh:36-55` could emit a banner on daemon-restart detection; that's a follow-on. 067's scope is the daemon-side flush only. The file path is documented; tail-mcp.sh integration is a small follow-on spec.

4. **SIGKILL / OOM / panic survival.** Those failure modes bypass the onShutdown hook entirely (the kernel rips the process). No spec can write a file from a SIGKILL'd process. Documented as accepted worst-case in the architectural invariant. If future ops experience makes this a real problem, a write-on-every-call shadow log is the V2+ design — out of scope.

5. **Persisting to SQLite (the existing daemon storage backend).** The ring buffer is per-process diagnostic state; SQLite is for atoms (the cross-restart durable substrate). Conflating the two would mean every tool call writes to SQLite, which is a substantial latency + concurrency change. JSONL on shutdown is the narrow fix; SQLite-shadow is a separate design.

6. **Adding a `mcp_status` MCP tool that exposes the current ring.** The `/mcp/recent-calls` HTTP endpoint at `src/mcp/server.ts:130-148` already serves this; no new MCP tool. (Per `tail-mcp.sh`'s existence.)

7. **Bounding the JSONL file size.** The ring buffer is capped at 1000 entries (line 31, `MAX_CALLS`); each entry's `args_shape` / `result_shape` is the projected/redacted shape, not raw payloads (lines 135-238). The flushed file is bounded by `MAX_CALLS * max-line-size ≈ 1000 * 2KB = 2MB`. No additional size cap.

8. **Adding a `flushOnSIGTERM` config flag.** The flush is always-on for SIGTERM. No opt-out. Out of scope #4 covers the SIGKILL case (no opt-in needed — kernel rips us).

9. **Augmenting the journal discipline in CLAUDE.md.** The journal is operator-side (every AI client must log MCP calls). 067 is daemon-side (daemon logs its own view of MCP calls). The two are independent audit trails with different consumers. Out of scope to merge.

10. **Modifying `/mcp/recent-calls` endpoint to read from the JSONL.** The endpoint serves the live ring; if a future operator UI wants "show me what was killed in the last shutdown", it reads the file directly. No endpoint changes.

11. **Generalizing the flush pattern to extractors / watchers.** Each capture surface has its own audit-trail design (the jsonl shards, the SQLite atoms). 067's flush is request-log-specific. Out of scope to flush the watchers' in-memory state on shutdown.

## Risks

- **R1 — Race between `mcp.stop()` and `flushRecentMcpCallLog`.** `mcp.stop()` calls `httpServer.close()` (waits for in-flight connections to drain naturally; bounded by node's HTTP default keep-alive timeout) followed by `httpServer.closeAllConnections?.()` (rips the rest). Between those two, a callback may finalize cleanly (status → `'ok'`) OR be torn down mid-execution (status stays `'pending'`, becomes `'killed_during_shutdown'` at flush). **The race is not deterministic**, but the flush captures a coherent snapshot of whatever state the ring is in at flush time. Test (i) under AC4 acknowledges this — the strict-vs-lenient assertion is reviewer's call.

- **R2 — `writeFileSync` on slow disk during shutdown.** Synchronous write blocks the event loop until disk acks. macOS SSD: microseconds. Spinning disk / network-mounted disk: potentially seconds. If launchd's stop timeout is short (default 20s for SIGTERM before SIGKILL), the flush might be cut off mid-write. **Mitigation:** the JSONL format is line-oriented; a partial write leaves valid leading lines parseable. Operator can recover any successfully-written entries. This is acceptable for V1 — the alternative (async with no shutdown wait) loses entries silently, which is exactly what 067 closes.

- **R3 — TypeScript closure capture of `lifecycle` in `daemon/index.ts`.** AC2 captures `lifecycle.dataDir` inside an arrow closure whose declaration is in the same `await startLifecycle({ … onShutdown: async () => { … lifecycle.dataDir … } })` expression. Hoisting / temporal dead zone: the closure executes at shutdown time, not at definition time, so `lifecycle` is bound by then. ESLint's `no-use-before-define` may flag this; the alternative (precompute `const dataDir = resolveDataDir(...)` before the call and use that in the closure) sidesteps the lint flag and the type system entirely. Either works; reviewer picks.

- **R4 — `flushRecentMcpCallLog` being called twice in rapid succession.** If shutdown fires SIGINT then SIGTERM (rare but possible from a frustrated operator), `shutdown()`'s `shuttingDown` guard at lifecycle.ts line 71 prevents re-entry. The flush runs once. Even if it didn't, `writeFileSync` with the same path just overwrites; idempotency is preserved by file-system semantics. Tested in AC3 Test (iii).

- **R5 — Behavior change in `parseStatusParam`.** Adding `'killed_during_shutdown'` as an accepted query param is a non-breaking widening (previously the value would have been rejected; now it's accepted). No existing client expects it to be rejected (the value cannot appear in a live ring under steady-state operation; only after a flush has happened and the next daemon imported it, which is out of scope for 067 anyway). Documented as a one-liner in AC1.

- **R6 — `now` parameter on `flushRecentMcpCallLog`.** Mirrors the same pattern in `beginRecentMcpCall` / `finishRecentMcpCall` / `failRecentMcpCall` (lines 64, 79, 96) — a `now = Date.now()` default lets tests inject deterministic timestamps. Reviewer should confirm the default-argument shape matches the existing style.

## Tests

All test changes:

1. **`tests/mcp/request-log.test.ts`** — extended with three new cases per AC3.
2. **`tests/daemon/lifecycle-shutdown-flush.test.ts`** — new file with two cases per AC4.

**Test discipline / no-regression invariants:**

- All existing tests in `tests/mcp/request-log.test.ts` continue to pass (line 11's `resetRecentMcpCallLogForTests()` is unchanged; the new `killed_during_shutdown` status does not appear in any existing assertion).
- AC4's integration test uses an ephemeral port (`port: 0`) and an ephemeral dataDir (`os.tmpdir()`). No interference with any running daemon or shared state.
- No live-network test; no real launchd / system SIGTERM. The flush is exercised by direct function call in the test, which is the same code path the SIGTERM handler invokes (per AC2's closure ordering).

**Out of scope for tests:**

- Process-level test where a child Node process is spawned, sent SIGTERM, and the child's `mcp-shutdown.jsonl` is inspected. AC2 + AC4's in-process tests cover the wiring; the SIGTERM-handler-runs-onShutdown path is covered by lifecycle.ts's existing tests if any (reviewer to verify; `grep -r "SIGTERM" tests/`). Spawning a real child + signaling is overkill for V1.
- Property-based tests on JSON-shape of the flushed file. The three AC3 cases pin the file format precisely.
- Tests on slow-disk behavior (R2). Disk-speed mocking is out of scope.

## Definition of Done

- AC1: `src/mcp/request-log.ts` exports `flushRecentMcpCallLog`; `RecentMcpCallStatus` includes `'killed_during_shutdown'`; module comment documents the new contract.
- AC2: `src/daemon/index.ts` calls `flushRecentMcpCallLog(join(lifecycle.dataDir, 'mcp-shutdown.jsonl'))` after `mcp.stop()` and before watcher stops; `src/daemon/lifecycle.ts` requires no interface change (handle already exposes `dataDir`).
- AC3: `tests/mcp/request-log.test.ts` has three new passing cases.
- AC4: `tests/daemon/lifecycle-shutdown-flush.test.ts` exists with two passing cases.
- `npm test`, `npm run lint`, `npm run typecheck` all clean.
- All ACs verified locally before pushing the feature branch.

## After Completion (Strategist Notes)

- **No new wiki page.** This is a daemon-internal observability fix; no end-user-facing surface changes. The MCP server architecture page (`wiki/surfaces/mcp-server.md` or equivalent) already documents the request-log; this is an implementation detail under that surface.

- **Optional one-paragraph update to `wiki/architecture/storage.md`** (or `wiki/surfaces/mcp-server.md` if more appropriate) recording that the request log now flushes to `<dataDir>/mcp-shutdown.jsonl` on graceful SIGTERM. Land only if a natural insertion point exists; don't restructure.

- **Update `backlog/_followups.md`** — when the spec lands in `complete/`, strike the PRIORITY 2 entry under the 2026-05-21 harness seam review section and add a one-line back-reference to the 067 spec.

- **Trigger for `tail-mcp.sh` banner spec.** Out of Scope #3 deferred the operator-facing banner. If founder journals an entry like "I had to manually `cat ~/Library/Application Support/ECHO/mcp-shutdown.jsonl` to figure out what was killed during the last restart", file a follow-on spec adding the banner to `tail-mcp.sh`.

- **Do NOT promote a new principle page** about persistence-on-shutdown. One spec is not a pattern; if a second flush-on-shutdown spec lands (e.g., for extractor in-memory state, watcher pending queues), that's the trigger.

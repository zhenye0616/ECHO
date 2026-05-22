# Agent run — 2026-05-21-067-mcp-request-log-shutdown-flush

- **Agent:** Claude Code builder (persona `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`)
- **Claim commit:** `a32ae25` on `main`
- **Branch:** `agent/mcp-request-log-shutdown-flush`
- **Head SHA at handoff:** `4e17baa6cbd0f6ee4a087c6a1afb0612a01d01eb`
- **Worktree:** `~/Desktop/Project_echo--mcp-request-log-shutdown-flush/`

## What I implemented

All four ACs of the r4-converged spec, plus the protocol-required initial
+ final `builder.md` writes.

### AC1 — `src/mcp/request-log.ts` + `src/mcp/server.ts`

- Widened `RecentMcpCallStatus` to include `'killed_during_shutdown'`.
- Added module-level comment documenting the graceful-shutdown contract
  and the accepted non-graceful-death gap (SIGKILL/OOM/panic/power loss
  cannot flush).
- Exported `flushRecentMcpCallLog(path: string, now = Date.now()): void`:
  - Walks the ring, rewriting every `pending` entry to
    `killed_during_shutdown` with `duration_ms = Math.max(0, now - ts)`.
  - Builds the body as `''` for an empty ring, otherwise
    `lines.join('\n') + '\n'`. Each line is `JSON.stringify(publicClone(entry))`.
  - Writes atomically: `writeFileSync(path + '.tmp', body); renameSync(path + '.tmp', path)`.
    Best-effort `unlinkSync(path + '.tmp')` cleanup in the catch path; the
    error is re-thrown so the daemon's onShutdown can log via stderr.
- Steady-state `beginRecentMcpCall`, `finishRecentMcpCall`,
  `failRecentMcpCall`, `readRecentMcpCalls`, and `instrumentMcpServer`
  unchanged.
- `parseStatusParam` widened by adding the `killed_during_shutdown`
  literal to the alternation; reformatted as a multi-line `if` for
  readability.

### AC2 — `src/daemon/index.ts`

- Imported `flushRecentMcpCallLog` from `../mcp/request-log.js`.
- Bound `const dataDir = resolveDataDir();` at module scope (line 40);
  passed it to `acquirePidLockOrExit(dataDir)` AND reused it inside the
  onShutdown closure for the flush path. No `lifecycle.ts` interface
  change.
- Inserted the flush call between `await mcp.stop()` and
  `await cursorExtractor.stop()` inside an inline try/catch. The catch
  writes a single line to `process.stderr`; the rest of the teardown
  chain proceeds unconditionally.

### AC3 — `tests/mcp/request-log.test.ts`

Four new cases inside a new `describe('flushRecentMcpCallLog', …)`
block:

1. **Mixed-status flush.** Begin three calls; finish one `ok`, fail one
   `error`, leave one `pending`. Flush at `now=500`. Assert the JSONL
   file has three lines in `ok, error, killed_during_shutdown` order,
   that the killed entry's `duration_ms` is `300` (500 - 200), and that
   the in-memory ring is rewritten in place (`readRecentMcpCalls()[2].status === 'killed_during_shutdown'`).
2. **Empty-ring flush.** `flushRecentMcpCallLog(path)` creates the file
   with exactly `''` contents.
3. **Repeated-flush overwrite.** Flush with one pending call, add a
   second pending call, flush again — assert the file contains the full
   current ring of two killed entries (not an appended delta) and that
   each entry's `duration_ms` reflects its first-kill measurement.
4. **Atomic-write mechanism pin.** Wrap `node:fs.writeFileSync` and
   `node:fs.renameSync` with `vi.mock('node:fs', factory)` (the `node:fs`
   ESM namespace is non-configurable in Node 22, so `vi.spyOn` throws
   "Cannot redefine property" — the spec's "or equivalent module-level
   spy" wording permits the `vi.mock` factory). Clear the spies before
   the flush, then assert (a) `writeFileSync` first arg ends in `.tmp`,
   (b) `renameSync` was called with `(path + '.tmp', path)` AFTER the
   `writeFileSync` invocation order, and (c) the final file at `path`
   contains the expected JSONL row.

Test-file imports were updated to pull `writeFileSync`/`renameSync` (now
mocked), `existsSync`/`mkdtempSync`/`readFileSync`/`rmSync` (pass-through
via `...actual` in the factory). `afterEach` adds `vi.clearAllMocks()`
in addition to the existing `resetRecentMcpCallLogForTests()`.

### AC4 — `tests/daemon/lifecycle-shutdown-flush.test.ts`

New file. Four tests, each isolating its own temp `dataDir` via
`mkdtempSync(tmpdir(), 'echo-lifecycle-shutdown-flush-')`:

1. **Test (i)** — Start `startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false })`,
   make one wrapped `echo_ping` MCP call (so the wrapper records `ok`),
   then call `beginRecentMcpCall('search_memories', { query: 'in-flight' }, 1000)`
   directly to seed an in-flight entry. Verify the ring shows `pending`,
   then `await handle.stop(); flushRecentMcpCallLog(flushPath, 1500)`.
   Assert the echo entry is `ok` and the search entry is
   `killed_during_shutdown` with `duration_ms === 500`.
2. **Test (ii)** — Same fixture shape; assert the file lands at exactly
   `join(dataDir, 'mcp-shutdown.jsonl')` and the raw contents contain
   `"echo_ping"`.
3. **Test (iii) — source-text assertion** (replaces the r1 surrogate
   runtime test per r2 dispositioning):
   - read `src/daemon/index.ts` via `fs.readFileSync`,
   - assert `flushRecentMcpCallLog(` appears exactly once,
   - assert the call is wrapped in `try { ... } catch` via a regex on
     the literal pattern,
   - extract the call's lexical block and assert the
     `'mcp-shutdown.jsonl'` substring is present in the path argument,
   - locate the `onShutdown:` closure and assert ordering: the flush
     call's byte offset is strictly greater than `await mcp.stop()` and
     strictly less than the first `cursorExtractor.stop()` reference.
   No `process.emit`, no `startLifecycle`, no signal-handler install.
4. **Test (iv) — flush-failure isolation.** Build extractor / watcher /
   dispose / mcp stubs as `vi.fn(async () => undefined)`; pass a `badPath`
   pointing into a nonexistent subdir of the temp dataDir (forces
   `writeFileSync` to throw `ENOENT`); spy on `process.stderr.write`;
   call a direct closure that mirrors `daemon/index.ts:58-71` shape
   exactly. Assert every stub was called once despite the throw, and
   that the stderr write happened with the `[daemon] mcp-shutdown-flush failed`
   marker substring.

Cleanup stops the server if needed (Tests i/ii), `rmSync`s the temp
dataDir, resets the request log, and restores all mocks.

## Files modified (with line counts)

| File | New / changed | Net lines |
|---|---|---|
| `src/mcp/request-log.ts` | edit (status union widened; flush function + comments) | +50 |
| `src/mcp/server.ts` | edit (parseStatusParam alternation widened) | +6 / -1 |
| `src/daemon/index.ts` | edit (dataDir binding, flush import, try/catch wiring) | +9 / -1 |
| `tests/mcp/request-log.test.ts` | edit (4 new cases + `vi.mock` factory) | +143 / -2 |
| `tests/daemon/lifecycle-shutdown-flush.test.ts` | NEW | +186 |

Branch: `agent/mcp-request-log-shutdown-flush` @ `4e17baa6cbd0f6ee4a087c6a1afb0612a01d01eb`.

## Decisions made during implementation

- **`vi.mock('node:fs', factory)` instead of `vi.spyOn(fs, 'writeFileSync')`.**
  Node 22 ESM marks `node:fs` namespace properties non-configurable;
  `vi.spyOn` throws "Cannot redefine property". The spec ("or equivalent
  module-level spy") permits this. The factory spreads `...actual` so
  every other fs function is the real implementation; only
  `writeFileSync` and `renameSync` are wrapped as `vi.fn(actual.xxx)`
  pass-throughs that record invocations. Per-test `mockClear()` keeps
  the assertion narrow. Documented inline in the test file.

- **Test (i) seeds the in-flight call directly via `beginRecentMcpCall`
  rather than racing an MCP request against `mcp.stop()`.** The wrapper
  installed by `instrumentMcpServer` always begin/finish/fail-s around
  the callback, so an MCP-driven `pending` state requires either a
  hanging tool (no exit window) or interrupting `httpServer.close()` mid-
  response (timing-flaky). The direct-API seam exercises the SAME
  in-process stop+flush sequence the shutdown hook uses, which is
  exactly what AC4 specifies, without timing flake.

- **AC2 dataDir binding via `resolveDataDir()` at module scope, not via
  `startLifecycle()`'s returned `dataDir` handle.** Spec offered both;
  the module-scope binding is the smaller change (no Promise unwrap, no
  forward-reference dance, no `lifecycle.ts` interface change). The
  `dataDir` const is now consumed by `acquirePidLockOrExit(dataDir)` AND
  the flush path inside the onShutdown closure — single canonical value
  per R3.

- **No new `src/daemon/shutdown-flush.ts` helper.** AC1's "Gap 3 decision"
  explicitly forbids extracting the transform/write loop in 067; the
  second concrete occurrence (an extractor/watcher shutdown queue) is
  the trigger. Kept the body local to `request-log.ts`.

## Acceptance status

| AC | Status | Notes |
|---|---|---|
| AC1 | ✅ | Status widened; `flushRecentMcpCallLog` exported with atomic tmp-then-rename. `parseStatusParam` accepts the new filter. Module comment present. No steady-state behavior change. |
| AC2 | ✅ | dataDir bound once; flush wired inside inline try/catch between `mcp.stop()` and extractor teardown; stderr write on failure. |
| AC3 | ✅ | 4 new cases pass; atomic-write mechanism pin uses `vi.mock` factory ("equivalent module-level spy" per spec). |
| AC4 | ✅ | 4 tests pass; source-text assertion (Test iii) replaces the r1 surrogate runtime test per r2 dispositioning; no lifecycle module state leak. |

## Test results (verbatim summaries)

`npm test -- tests/mcp/request-log.test.ts tests/daemon/lifecycle-shutdown-flush.test.ts`:

```
 ✓ tests/mcp/request-log.test.ts (11 tests) 18ms
 ✓ tests/daemon/lifecycle-shutdown-flush.test.ts (4 tests) 166ms

 Test Files  2 passed (2)
      Tests  15 passed (15)
```

`npm test` (full suite):

```
 Test Files  101 passed | 1 skipped (102)
      Tests  1142 passed | 21 skipped (1163)
   Duration  29.92s
```

`npm run typecheck`: clean (no output beyond the tsc invocation).

`npm run lint`: clean (eslint + `tools/task-state/lint.py` both pass).

## Open questions for founder

- None. Spec was fully self-contained through r4. The atomic-write
  mechanism test's use of `vi.mock` (over the spec-literal `vi.spyOn`)
  is the only judgment call; documented inline and in the run-log
  decisions section.

## Drift events caught

- None. Each touched file is in `files_to_modify`; no new deps; no
  scope expansion; no wiki edits; no item-body edits.

## ECHO MCP usage

This run made **zero `mcp__echo__*` calls** — pure implementation work
from a fully-self-contained spec. Per CLAUDE.md "Skip-rule for
zero-MCP-call entries," no journal entry is required.

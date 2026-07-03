# `tests/daemon/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 3 files.

### `tests/daemon/granola-intake-schedule.test.ts` — scheduling/config-gating tests for the Granola intake bridge

**Purpose:** Exercises `startGranolaIntakeBridge` and `loadGranolaIntakeConfig` from `src/enrich/granola-intake-candidates.js`: verifies the bridge is disabled by default, fails closed with a structured `GranolaIntakeConfigError` (and claims zero seed records) when misconfigured, and that a full run executes signal extraction, classification, and posting in the correct order.

**Depends on:** src/enrich/granola-intake-candidates.js, src/enrich/granola-intake-seed-store.js, src/storage/memory.js; external: vitest, node:fs/promises, node:os, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tempSeedStore()` | function | `tests/daemon/granola-intake-schedule.test.ts:21` | Creates a temp directory and returns a `FileGranolaIntakeSeedStore` backed by a `seeds.json` file inside it, tracking the dir for cleanup. |
| `enabledConfig(overrides)` | function | `tests/daemon/granola-intake-schedule.test.ts:27` | Builds a default enabled `GranolaIntakeConfig` fixture (lookback window, owner map, channel/bot token, per-note cap, max retries) with override support. |
| `describe: "startGranolaIntakeBridge scheduling"` | describe block | `tests/daemon/granola-intake-schedule.test.ts:42` | Covers disabled-by-default no-op behavior, fail-closed structured config errors with zero seed claims, and correct signals→classify→post execution order on a full run. |

### `tests/daemon/lifecycle-shutdown-flush.test.ts` — MCP shutdown flush-log behavior tests

**Purpose:** Verifies the daemon's shutdown-time flush of the recent-MCP-call ring buffer to `mcp-shutdown.jsonl`: correct status rewriting for in-flight vs completed calls, exact output file path/content, source-text assertions that `src/daemon/index.ts` wires the flush in the right order/safety, and that a thrown flush doesn't block subsequent teardown steps.

**Depends on:** src/mcp/request-log.js, src/mcp/server.js, src/storage/memory.js, src/daemon/index.ts (read as source text); external: @modelcontextprotocol/sdk (Client, StreamableHTTPClientTransport), vitest, node:fs, node:os, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `readJsonLines(path)` | function | `tests/daemon/lifecycle-shutdown-flush.test.ts:19` | Reads a file and parses each non-empty line as JSON, returning an array of records. |
| `callEchoPing(url, message)` | function | `tests/daemon/lifecycle-shutdown-flush.test.ts:28` | Connects an MCP `StreamableHTTPClientTransport` client to `url` and calls the `echo_ping` tool with `message`, then closes the client. |
| `describe: "lifecycle shutdown flush"` | describe block | `tests/daemon/lifecycle-shutdown-flush.test.ts:39` | Covers: (i) stop+flush preserves `ok` status for completed calls and rewrites pending ones to `killed_during_shutdown` with correct duration; (ii) flush file lands exactly at `dataDir/mcp-shutdown.jsonl` and contains expected tool name; (iii) source-text assertions on `src/daemon/index.ts` confirming single flush call, try/catch wrapping, literal `'mcp-shutdown.jsonl'` path, and correct ordering (after `mcp.stop()`, before extractor `.stop()` calls) inside the `onShutdown` closure; (iv) a thrown flush (ENOENT from a missing directory) is caught and logged to stderr without skipping subsequent extractor/watcher stop calls and `dispose()`. |

### `tests/daemon/lifecycle.test.ts` — full daemon process boot/shutdown/PID-lock integration tests (quarantined)

**Purpose:** Spawns the real daemon (`src/daemon/index.ts` via vite-node) as a child process to test end-to-end lifecycle: boot logging, graceful SIGTERM/SIGINT shutdown, refusal to start when another instance holds the PID file, and stale-PID-file overwrite on restart. The entire `describe` block is currently skipped (`describe.skip`) due to a chokidar/FSEvents shutdown-timing flake on macOS, tracked by backlog item 2026-05-08-023.

**Depends on:** src/daemon/index.ts (spawned as external process, not imported); external: node:child_process, node:fs, node:os, node:path, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `spawnDaemon(dataDir)` | function | `tests/daemon/lifecycle.test.ts:31` | Spawns the daemon entrypoint via `vite-node` with `ECHO_DATA_DIR`/`ECHO_LOG_LEVEL`/`ECHO_STORAGE`/`ECHO_MCP_PORT` env vars, buffering stdout/stderr into lines and returning a `DaemonProcess` handle with `parsed()`, `waitFor()`, and `waitForStderr()` helpers plus an `exitInfo` promise. |
| `DaemonProcess.parsed()` | method | `tests/daemon/lifecycle.test.ts:75` | Parses accumulated stdout lines as JSON `LogLine` records, silently skipping non-JSON noise (e.g. vite-node banners). |
| `DaemonProcess.waitFor(predicate, timeoutMs)` | method | `tests/daemon/lifecycle.test.ts:88` | Polls `parsed()` every 25ms until a line matches `predicate` or `timeoutMs` (default 8000) elapses, throwing with captured stdout/stderr on timeout. |
| `DaemonProcess.waitForStderr(predicate, timeoutMs)` | method | `tests/daemon/lifecycle.test.ts:103` | Polls raw stderr lines every 25ms until `predicate` matches or `timeoutMs` (default 8000) elapses, throwing with captured stderr on timeout. |
| `describe: "daemon lifecycle"` | describe block | `tests/daemon/lifecycle.test.ts:130` | (Skipped) Covers: boot logs `started` with pid/storage_backend/data_dir/version and writes `daemon.pid`, then SIGTERM produces `stopping`→`stopped` logs, exit code 0, and PID file removal within 8s; SIGINT triggers the same graceful shutdown; a second daemon instance refuses to start (exit code 1, "already running" stderr) while the first is running; a stale PID file (dead process) is overwritten with the new daemon's real PID on boot. |

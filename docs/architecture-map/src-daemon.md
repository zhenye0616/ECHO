# `src/daemon/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `src/daemon/index.ts` — daemon process entrypoint / wiring

**Purpose:** Top-level executable module that boots the ECHO daemon: sets up storage, echo-home scaffolding, starts all capture surfaces/extractors, enrichment dispatch, the Granola intake bridge, and the MCP server, then hands control to the lifecycle manager including an orchestrated shutdown sequence.

**Depends on:** `src/capture/extractors/claude-code.js`, `src/capture/extractors/codex.js`, `src/capture/extractors/cursor.js`, `src/capture/sources.js`, `src/capture/surfaces/fs-watcher.js`, `src/capture/surfaces/git-watcher.js`, `src/capture/surfaces/granola-poller.js`, `src/enrich/dispatch.js`, `src/enrich/granola-intake-candidates.js`, `src/echo-home/scaffold.js`, `src/logging/index.js`, `src/mcp/request-log.js`, `src/mcp/server.js`, `src/storage/interface.js`, `src/storage/memory.js`, `src/storage/sqlite.js`, `src/daemon/lifecycle.js`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `resolveMcpPort()` | function | `src/daemon/index.ts:25` | Parses `ECHO_MCP_PORT` env var into a valid port integer (0-65535), defaulting to 38478 if unset or invalid. |
| `createStorage()` | function | `src/daemon/index.ts:33` | Chooses storage backend based on `ECHO_STORAGE` env var, returning an in-memory `MemoryStorage` or a `SqliteStorage` at the resolved DB path plus a `dispose` callback. |
| `process.on('unhandledRejection', ...)` | event handler | `src/daemon/index.ts:46` | Last-resort catch-all logging any unhandled promise rejection via the structured logger instead of crashing the daemon. |
| module init sequence | top-level script | `src/daemon/index.ts:52` | Resolves data dir, acquires the PID lock, ensures the ECHO home directory scaffold exists (logging created dirs/files or init failure). |
| `Promise.all([...])` capture-surface startup | top-level script | `src/daemon/index.ts:72` | Concurrently starts fs-watcher, git-watcher, Granola poller, enrichment dispatch, the three IDE/CLI extractors (Claude Code, Codex, Cursor), and the MCP server, collecting their handles. |
| `startGranolaIntakeBridge(...)` call | top-level script | `src/daemon/index.ts:96` | Wires the Granola→Slack intake bridge (item 109), driven by `runSignalsFirst` which triggers `enrichment.granolaSignals.run()` before seed extraction. |
| `startLifecycle({...})` call | top-level script | `src/daemon/index.ts:100` | Registers the shutdown hook that stops the MCP server, flushes the recent MCP call log to `mcp-shutdown.jsonl`, then stops each extractor/poller/watcher in dependency order and disposes storage. |

### `src/daemon/lifecycle.ts` — daemon lifecycle, data-dir resolution, PID locking, shutdown

**Purpose:** Provides platform-aware resolution of ECHO's data directory and DB path, single-instance PID-file locking, and the daemon's start/keep-alive/signal-handled graceful shutdown sequence, shared by the daemon entrypoint and any embedding host.

**Depends on:** `src/guards.js`, `src/logging/index.js`, `src/storage/memory.js`, `src/storage/interface.js`, `node:fs`, `node:os`, `node:path`, `node:url`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DataDirOptions` | interface | `src/daemon/lifecycle.ts:18` | Injectable overrides (`platform`, `env`, `homeDir`) used to make data-dir resolution testable across platforms. |
| `pathResolve(platform, path)` | function | `src/daemon/lifecycle.ts:24` | Resolves an absolute path using `win32.resolve` on Windows or POSIX `resolve` otherwise. |
| `pathJoin(platform, ...parts)` | function | `src/daemon/lifecycle.ts:28` | Joins path segments using `win32.join` on Windows or POSIX `join` otherwise. |
| `resolveDataDir(opts)` | function | `src/daemon/lifecycle.ts:32` | Computes the ECHO data directory: `ECHO_DATA_DIR` env override, else Windows `%LOCALAPPDATA%/ECHO` (or `AppData/Local/ECHO` fallback), else macOS `~/Library/Application Support/ECHO`, else XDG-compliant `~/.local/share/ECHO` on Linux. |
| `resolveDbPath(opts)` | function | `src/daemon/lifecycle.ts:51` | Resolves the SQLite DB file path: `ECHO_DB_PATH` env override, else `<dataDir>/echo.db`. |
| `acquirePidLockOrExit(dataDir)` | function | `src/daemon/lifecycle.ts:59` | Public entrypoint to acquire the PID lock exactly once (idempotent via module-level `pidLockPath` guard). |
| `readVersion()` | function | `src/daemon/lifecycle.ts:64` | Reads the package version from `package.json` two directories up from this module's compiled location, defaulting to `'0.0.0'`. |
| `isProcessAlive(pid)` | function | `src/daemon/lifecycle.ts:71` | Checks whether a PID is a live process by sending signal 0 via `process.kill`, catching ESRCH/EPERM as "not alive". |
| `acquirePidLock(dataDir)` | function | `src/daemon/lifecycle.ts:80` | Ensures `dataDir` exists, reads any existing `daemon.pid`, exits the process with an error if another live PID holds the lock, otherwise writes the current PID and returns the lock file path. |
| `releasePidLock()` | function | `src/daemon/lifecycle.ts:95` | Deletes the PID lock file if held, best-effort swallowing ENOENT/EACCES errors, and clears the module-level `pidLockPath`. |
| `shutdown(signal)` | function | `src/daemon/lifecycle.ts:105` | Idempotent (guarded by `shuttingDown`) graceful shutdown: invokes the registered `onShutdownHook` (logging failures), releases the PID lock, clears the keep-alive interval, and logs stop events. |
| `LifecycleOptions` | interface | `src/daemon/lifecycle.ts:124` | Options accepted by `startLifecycle`: optional `storage`, `storageBackend` label, `extraPayload` for structured start-log fields, and `onShutdown` hook. |
| `LifecycleHandle` | interface | `src/daemon/lifecycle.ts:131` | Return shape of `startLifecycle`: the active `storage` instance and resolved `dataDir`. |
| `startLifecycle(options)` | function | `src/daemon/lifecycle.ts:136` | Acquires the PID lock if not already held, selects storage (defaulting to `MemoryStorage`), starts a no-op keep-alive interval to hold the event loop open, logs a structured `started` event with pid/version/backend/data_dir/extra payload, and binds `SIGTERM`/`SIGINT` handlers to `shutdown` exactly once. |

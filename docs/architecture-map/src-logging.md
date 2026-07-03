# `src/logging/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `src/logging/index.ts` — structured JSON logger factory

**Purpose:** Provides a lightweight, dependency-free structured logger used across ECHO's server/daemon code; writes newline-delimited JSON log entries to stdout, filtered by a configurable severity threshold read from `ECHO_LOG_LEVEL`.

**Depends on:** none (uses only Node's global `process`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `LogLevel` | type | `src/logging/index.ts:1` | Union of the four supported severities: `'debug' \| 'info' \| 'warn' \| 'error'`. |
| `LogEntry` | interface | `src/logging/index.ts:3` | Shape of a single log record: timestamp, level, source, message, optional payload map. |
| `Logger` | interface | `src/logging/index.ts:11` | Public logger API exposing `debug`/`info`/`warn`/`error` methods each taking a message and optional payload. |
| `LEVEL_ORDER` | const | `src/logging/index.ts:18` | Maps each `LogLevel` to a numeric rank (debug=0 … error=3) used for threshold comparisons. |
| `resolveThreshold()` | function | `src/logging/index.ts:25` | Reads `process.env.ECHO_LOG_LEVEL`, validates it against `LEVEL_ORDER`, and falls back to `'info'` if unset/invalid. |
| `THRESHOLD` | const | `src/logging/index.ts:33` | Module-level cached result of `resolveThreshold()`, fixed at module load time. |
| `emit(entry)` | function | `src/logging/index.ts:35` | Drops the entry if its level ranks below `THRESHOLD`; otherwise writes it to stdout as a single JSON line. |
| `createLogger(source)` | function | `src/logging/index.ts:42` | Factory returning a `Logger` bound to `source`; its inner `log()` builds a `LogEntry` (timestamp via `new Date().toISOString()`, optional payload) and calls `emit()`, with `debug`/`info`/`warn`/`error` as thin wrappers over `log()`. |

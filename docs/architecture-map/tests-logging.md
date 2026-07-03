# `tests/logging/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/logging/index.test.ts` — unit tests for the JSON-line logger

**Purpose:** Exercises `src/logging/index.js`'s `createLogger` factory, verifying level filtering via `ECHO_LOG_LEVEL`, JSON line shape (single object + trailing newline), source attribution, payload preservation/omission, and UTC ISO timestamp stamping.

**Depends on:** `tests/fixtures/stdout.js` (captureStdout), `src/logging/index.js` (dynamically imported per-test as `LoggerModule`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `loadLogger(level)` | function | `tests/logging/index.test.ts:10` | Sets or deletes `process.env.ECHO_LOG_LEVEL`, resets the module registry via `vi.resetModules()`, and re-imports `src/logging/index.js` so the logger picks up the new env-driven threshold. |
| `describe: "logger"` | describe block | `tests/logging/index.test.ts:20` | Covers: emitting all four levels at debug threshold; suppressing below-threshold entries at warn threshold; defaulting to info when unset; falling back to info on malformed level values; source attribution from `createLogger` argument; nested payload preservation through JSON; single-object-per-call output terminated by exactly one newline; UTC ISO 8601 timestamp stamping; and omission of the `payload` key when no payload is supplied. Uses `beforeEach`/`afterEach` to snapshot/restore `ECHO_LOG_LEVEL` and to install/restore stdout capture via `captureStdout()`. |

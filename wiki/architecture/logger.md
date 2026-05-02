---
status: shipped
topic: Architecture
subtopic: Observability
aliases:
  - Logger
  - createLogger
  - Structured Logger
---

# Logger

## Definition

The logger (`src/logging/index.ts`) is the single sanctioned way every component inside the ECHO daemon emits log output. It produces structured JSON-per-line on stdout, with one `LogEntry` per line. There is no other in-process logging API — every subsystem (gate, pipeline, storage, extractors, watchers, MCP server, lifecycle) calls `createLogger('subsystem.name')` and writes through it.

## Public Contract

```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;        // ISO 8601, UTC, stamped by the logger
  level: LogLevel;
  source: string;           // e.g., 'capture.gate', 'storage.sqlite'
  message: string;
  payload?: Record<string, unknown>;
}

interface Logger {
  debug(message: string, payload?: Record<string, unknown>): void;
  info(message: string, payload?: Record<string, unknown>): void;
  warn(message: string, payload?: Record<string, unknown>): void;
  error(message: string, payload?: Record<string, unknown>): void;
}

function createLogger(source: string): Logger;
```

Four methods, one per level. No other surface area.

## The Output Format

One log call writes exactly one line to stdout:

```
process.stdout.write(JSON.stringify(entry) + '\n')
```

This means a daemon log stream is line-delimited JSON — directly pipeable into `jq`, `grep`, or any structured-log consumer. There is no pretty-printer, no color mode, no alternative format. JSON-per-line is it.

The logger always stamps `timestamp` with `new Date().toISOString()` at emit time. Callers cannot supply their own timestamp; this prevents drift between modules and removes a class of bugs.

## The Source Convention

`createLogger(source)` binds a logger instance to a single `source` string. Every entry that logger emits carries that exact string in its `source` field. The convention across the codebase is `subsystem.component`, e.g.:

- `capture.gate`
- `capture.pipeline`
- `capture.fs-watcher`
- `capture.cursor-extractor`
- `storage.sqlite`
- `mcp.server`
- `daemon.lifecycle`

The `source` field is *the* identifier across the codebase — audit-page filters, log search, and reject-reason aggregation all key on it. Adding a new subsystem means picking its source string and using it consistently.

## Level Filtering

The threshold reads `process.env.ECHO_LOG_LEVEL` once at module load. Default is `info`. Order is `debug < info < warn < error`. Entries strictly below threshold are dropped silently — no buffering, no late delivery. Unknown values fall back to `info`.

| `ECHO_LOG_LEVEL` | Emitted |
|---|---|
| unset / `info` | info, warn, error |
| `debug` | all four |
| `warn` | warn, error |
| `error` | error only |

The threshold is process-wide; there is no per-source override. Two reasons: it keeps the API to four methods, and a unified threshold across the daemon makes log streams legible.

## What the Logger Doesn't Do

By design — these are out-of-scope:

- **No file output, no rotation.** Stdout only. A process supervisor (or `tee`) handles file capture if needed.
- **No remote log shipping** (Datadog, Sentry, Loki). V2+.
- **No pretty-printing or color codes.** JSON-only; consistency wins over readability at the source.
- **No async or buffered I/O.** Synchronous stdout writes; the daemon is not high-throughput.
- **No sampling, rate-limiting, or deduplication.** Each call emits or is dropped by level — that's it.
- **No trace IDs or OpenTelemetry hooks.** V2+.
- **No custom serializers or circular-reference handling.** Callers pass JSON-serializable payloads; that's the contract.
- **No external dependency.** ~60 lines of bespoke code, no winston / pino / bunyan.

## Related

- [[capture-gate]] — emits one info/warn line per call via `createLogger('capture.gate')`
- [[capture-pipeline]] — inherits gate's log line; adds none of its own
- [[storage]] — backends log boot/shutdown via `createLogger('storage.sqlite')`
- [[local-daemon]] — host process; each subsystem creates its own logger
- [[audit-page]] — downstream consumer of the structured log stream

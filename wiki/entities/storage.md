---
topic: Architecture
subtopic: Storage
aliases:
  - Storage
  - Storage Interface
  - MemoryStorage
  - SqliteStorage
---

# Storage

## Definition

The storage layer defines *where captured events go* after the [[capture-gate]] accepts them. It ships as an abstract `Storage` interface (`src/storage/interface.ts`) with two implementations: a no-op `MemoryStorage` (`src/storage/memory.ts`) used as a test fixture, and `SqliteStorage` (`src/storage/sqlite.ts`) — the production backend. The daemon defaults to SQLite; setting `ECHO_STORAGE=memory` in the environment selects the in-memory backend (see `src/daemon/index.ts`).

## The Contract

```ts
interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
}

interface CaptureEvent {
  id: EventId;
  source: string;       // e.g., 'fs:cursor-workspace', 'api:github'
  timestamp: string;    // ISO 8601, UTC
  content: string;      // captured payload (caller-defined shape)
  metadata?: Record<string, unknown>;
  embedding?: number[]; // populated later by an embedding pipeline
}

interface QueryFilter {
  source?: string;        // exact match
  source_prefix?: string; // prefix match; mutually exclusive with `source`
  since?: string;         // ISO 8601; events with timestamp >= since (inclusive)
  until?: string;         // ISO 8601; events with timestamp < until (exclusive)
  limit?: number;
}
```

Three operations, no others. There is no `update`, no `delete`. Forgetting (when it ships) will be implemented as a tombstone row, not as in-place deletion.

`source_prefix` was added in wave 3 to support [[mcp-search-memories]], which needs to filter by family of sources (e.g., `domain:` vs `app:` vs `fs:`). It is mutually exclusive with `source` — supplying both throws. Both implementations honor the field with the same semantics: the event's `source` string must `startsWith` the filter value.

## The Append-Only Commitment

Storage is append-only. This is a deliberate architectural commitment, not an artifact of the in-memory implementation:

1. **Audit.** Events can be inspected and forgotten via the audit page, but never silently rewritten. The append-only property is what makes the audit trail trustworthy.
2. **Security.** A compromised process cannot retroactively edit ECHO's record of what it saw. It can only add — and additions are visible.
3. **Simplicity.** No reconciliation, no concurrent-update semantics, no schema for "this row replaces that row." The system gets smaller, not larger, as it scales.

This pattern is borrowed wholesale from the AIE wiki's `[[append-only-ledger]]` substrate. The `Storage` interface is a faithful subset — `count()` is added for convenience, but no mutation operations are introduced.

## Why Interface First

Splitting the interface from the implementation unblocks parallel work. Future items — the capture-pipeline wire-up that ties [[capture-gate]] → storage, the MCP-server retrieval path, the audit-page reader — can all be built against `Storage` and tested with `MemoryStorage`. When SQLite ships, only one new file is added; nothing else changes.

## Implementations

Two implementations ship today. Both honor the same `Storage` contract; consumers are written against the interface and never reach for a backend directly.

### MemoryStorage (`src/storage/memory.ts`)

The in-memory test fixture. Its scope is narrow:

- Holds events in a private `CaptureEvent[]`. Append-only at runtime; no truncation, no GC, no retention.
- IDs are `crypto.randomUUID()`. No new dependency required (Node built-in).
- `query` is a single-pass linear scan with early-break on `limit`. Filters compose: `source` (or `source_prefix`) + `since` + `until` + `limit` are applied together.
- All methods are `async` for interface compatibility but resolve synchronously.

What it's *not*: production storage. Unbounded growth is intentional for a fixture; retention, indexing, and durability are SQLite's concern.

### SqliteStorage (`src/storage/sqlite.ts`)

The production backend. One SQLite database file (default `~/Library/Application Support/ECHO/echo.db`; overridable via `ECHO_DB_PATH` / `ECHO_DATA_DIR`). Backed by `better-sqlite3` for synchronous in-process access.

Operational properties:

- **WAL mode.** `PRAGMA journal_mode = WAL` is set at construction so MCP reads can run concurrently with capture-surface appends.
- **NORMAL synchronous mode.** `PRAGMA synchronous = NORMAL` is set under WAL — SQLite-recommended for app workloads, avoids per-append `fsync`, and remains crash-safe.
- **Migration runner.** Schema lives in `src/storage/migrations/` as numbered SQL files (`0001_initial.sql`, etc.). `migrate()` reads them in order, applies any whose version exceeds `PRAGMA user_version`, and bumps `user_version` inside the same transaction. Sequence gaps are a hard error at boot.
- **`close()` for graceful shutdown.** The `Storage` interface itself does not require `close()`; `SqliteStorage` adds it as a method, and the daemon's lifecycle scaffold calls it during shutdown to flush WAL and release the file handle.
- **Buffer-encoded embeddings.** The `embedding` column is `BLOB` — a `Float32Array` written via `Buffer.from(new Float32Array(arr).buffer)` on append, reconstructed via `new Float32Array(buf.buffer, buf.byteOffset, ...)` on read. No JSON, no precision loss.
- **Indexed for the queries the MCP tool actually makes.** `CREATE INDEX` on `source` and on `timestamp`; results returned `ORDER BY timestamp ASC`.

Backend selection happens once at daemon boot (`src/daemon/index.ts`): `ECHO_STORAGE=memory` selects `MemoryStorage`; anything else (including unset) selects `SqliteStorage`.

## Timestamp Semantics

Timestamps are ISO 8601 UTC strings. Comparisons in `query` are lexicographic, which works correctly for UTC strings of consistent precision. `since` is inclusive; `until` is exclusive — i.e., `[since, until)`. This matches the standard half-open-interval convention and avoids off-by-one bugs at boundaries.

## What's Out of Scope (and Where It Lives Instead)

- **Embedding generation** — the `embedding` field is populated by a pipeline that runs after persistence; V1.5
- **Indexing / fulltext search** — `query` is filter-only for V1
- **Encryption-at-rest** — V1.5+
- **Tombstones / forget-with-audit** — separate later item once the audit page exists
- **Pagination beyond `limit`** — no cursors, no offsets, for V1
- **Concurrent-access semantics** — single-writer assumption for V1

## Related

- [[capture-gate]] — the chokepoint upstream of every `append`
- [[capture-pipeline]] — the seam that calls `Storage.append` on accept
- [[capture-allowlist]] — what the gate checks against before accepting an event
- [[sandboxed-capture]] — the architectural reason storage receives only allowlisted events
- [[local-daemon]] — host process; owns the `Storage` instance
- [[mcp-search-memories]] — consumer of `Storage.query`, including the `source_prefix` filter
- [[audit-page]] — consumer of `query()` for "see memories" and "forget" operations

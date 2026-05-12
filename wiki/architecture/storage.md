---
status: shipped
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
  source?: string;                     // exact match
  source_prefix?: string;              // prefix match; mutually exclusive with `source`
  since?: string;                      // ISO 8601; events with timestamp >= since (inclusive)
  until?: string;                      // ISO 8601; events with timestamp < until (exclusive)
  limit?: number;
  order?: 'asc' | 'desc';              // default 'desc' — keeps newest when limit is hit (item 021)
  exclude_metadata_surface?: string[]; // drop rows whose metadata.surface ∈ this set (item 022)
  before?: { timestamp: string; id: string }; // descending-only page boundary (item 025)
  repo_path?: string;                  // item 037 — AND-filter on metadata.repo_root === normalize(repo_path)
  metadata_match?: { [key: string]: string }; // item 038 — AND-joined equality filter on whitelisted keys
}
```

Three operations, no others. There is no `update`, no `delete`. Forgetting (when it ships) will be implemented as a tombstone row, not as in-place deletion.

`source_prefix` was added in wave 3 to support [[mcp-search-memories]], which needs to filter by family of sources (e.g., `domain:` vs `app:` vs `fs:`). It is mutually exclusive with `source` — supplying both throws. Both implementations honor the field with the same semantics: the event's `source` string must `startsWith` the filter value.

`repo_path` (added in item 037) is the work-artifact scoping predicate. When set, the storage layer AND-filters rows by `metadata.repo_root === normalize(repo_path)` via SQL `json_extract` (sqlite) or array predicate (memory). Implements the substrate-side half of [[work-artifact-first-class]]; cross-project bleed is structurally impossible when this filter is passed.

`metadata_match` (added in item 038) is the arbitrary-key metadata-equality predicate, AND-joined across keys. **`METADATA_MATCH_KEY_WHITELIST`** restricts allowed keys to `workspace_id`, `composer_id`, `session_id`, and `repo_root` (added by item 037). Non-whitelisted keys → caller-layer isError (the storage seam itself accepts any keys; the MCP tool layer enforces the whitelist before reaching storage to prevent dynamic-interpolation attacks). The Cursor Phase 2 legacy fallback path in [[mcp-echo-resolve-mru|`echo_resolve_mru`]] uses `{composer_id: <resolved>}` WITHOUT `repo_path` (legacy atoms predate the repo_root capture write); the descriptor encodes `phase: 'cursor_legacy'` so consumers can tell.

**Conflict rule:** passing both `repo_path` and `metadata_match.repo_root` with conflicting values throws synchronously at the storage seam. Same value is fine. The sqlite implementation uses prepared-statement caching keyed on SQL text (which includes the whitelisted metadata_match keys, NOT values), so the prepared-statement pool size is bounded by `2^|whitelist|` regardless of dataset size.

`order` (added in item 021) defaulted to ASC pre-021, which silently dropped the **newest** events when `limit` was hit — every existing caller's intent was "give me the recent N events," but ASC + LIMIT returned the oldest N. The default is now `'desc'` (newest-first selection); callers that genuinely need oldest-first (e.g., turn-pair reconstruction in extractors) pass `order: 'asc'` explicitly. Trace-layer callers re-sort ASC in memory after fetch since cluster determinism and forward-only resolution scans require ascending order. See [[work-trace]] for the trace-side adjustment.

Item 025 added a deterministic secondary tie-break on `id` in the same direction as `timestamp` — the SQL ordering is `ORDER BY timestamp ${dir}, id ${dir}` (parallel directions, never mixed). Pre-025, same-millisecond rows had non-deterministic order and a naïve `oldest_minus_1ms` cursor would silently skip ties. Post-025, the composite key is stable, the `before` filter (above) can use it as a precise page boundary, and tests assert deterministic `id DESC` ordering across 10 consecutive runs over a same-ms-tied fixture. The composite-key sort is now a property the rest of the substrate depends on (cursor pagination, future range queries).

`exclude_metadata_surface` (added in item 022) lets the trace tool drop raw fs-watcher change events (`metadata.surface === 'fs'`) at the storage layer. Codex measured these dominating storage's newest 1000 rows at 96.6% on busy days; without the filter the trace tool's overfetch budget was spent on rows the [[normalization|normalizer]] throws away. `search_memories` does NOT pass this filter — those raw rows stay searchable for forensic use. Both implementations apply the filter via SQL `AND COALESCE(json_extract(metadata, '$.surface'), '') NOT IN (...)` (sqlite) or array predicate (memory).

`before` (added in item 025) is the page-boundary filter that powers the [[mcp-search-memories|`search_memories`]] cursor. It carries a composite `{timestamp, id}` key and applies as a row-value comparison: `(timestamp, id) < (@before_ts, @before_id)` in sqlite (`WHERE` clause uses SQLite's row-value tuple syntax, supported since 3.0); the memory adapter uses an equivalent JS predicate. `before` is **defined for descending queries only** — the only direction the cursor pagination flow exercises. Passing `before` together with `order: 'asc'` throws synchronously at the storage seam (a single early `RangeError`-style throw before SQL prep, no silent inversion). The asymmetry is documented inline in `interface.ts` so the next caller doesn't accidentally invert the cursor direction. Cursor encoding (opaque base64 of the JSON `{timestamp, id}`) lives in the MCP tool layer; storage only sees the decoded composite key.

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
- **Timestamp canonicalization migration on startup (item 022).** `canonicalizeTimestamps()` runs in the SqliteStorage constructor at every daemon boot; it rewrites any row whose `timestamp` lacks a trailing `Z` to canonical UTC `Z` form via `new Date(row.timestamp).toISOString()` inside a single transaction. Idempotent (the `WHERE timestamp NOT LIKE '%Z'` clause excludes already-canonicalized rows on re-runs); millisecond-preserving (Node's `Date` round-trip preserves all ms the original carried, unlike SQLite's `datetime()` which truncates to seconds). The migration verifies before exit that no non-`Z` rows remain, and logs `{message: 'canonicalized_timestamps', payload: {converted: N}}` when N > 0. See [[timestamp-canonicalization]] for the capture-side guarantee that prevents new mixed-form rows landing.
- **`close()` for graceful shutdown.** The `Storage` interface itself does not require `close()`; `SqliteStorage` adds it as a method, and the daemon's lifecycle scaffold calls it during shutdown to flush WAL and release the file handle.
- **Buffer-encoded embeddings.** The `embedding` column is `BLOB` — a `Float32Array` written via `Buffer.from(new Float32Array(arr).buffer)` on append, reconstructed via `new Float32Array(buf.buffer, buf.byteOffset, ...)` on read. No JSON, no precision loss.
- **Indexed for the queries the MCP tool actually makes.** `CREATE INDEX` on `source` and on `timestamp`; results returned `ORDER BY timestamp ${dir}, id ${dir}` since item 025 (parallel directions, default DESC since item 021). The composite key is deterministic across same-ms ties, which the [[mcp-search-memories|`search_memories`]] cursor depends on. The single timestamp index serves both directions efficiently; the `id` tie-break is satisfied by the primary key.

Backend selection happens once at daemon boot (`src/daemon/index.ts`): `ECHO_STORAGE=memory` selects `MemoryStorage`; anything else (including unset) selects `SqliteStorage`.

## Timestamp Semantics

Timestamps are ISO 8601 UTC strings in canonical `Z` form (e.g., `2026-05-08T07:30:00.000Z`). Comparisons in `query` are lexicographic, which works correctly for UTC strings of consistent precision. `since` is inclusive; `until` is exclusive — i.e., `[since, until)`. This matches the standard half-open-interval convention and avoids off-by-one bugs at boundaries.

The single-form invariant is non-negotiable. Before item 022, the git-watcher emitted `±HH:MM` offset-bearing strings while the JSONL extractors emitted `Z` form; the lex compare in `WHERE timestamp >= ?` then silently dropped git events from time windows. The fix lives at the [[capture-pipeline|capture chokepoint]] (canonicalize once, never per-source) plus a one-time migration of legacy rows on daemon startup. See [[timestamp-canonicalization]].

## What's Out of Scope (and Where It Lives Instead)

- **Embedding generation** — the `embedding` field is populated by a pipeline that runs after persistence; V1.5
- **Indexing / fulltext search** — `query` is filter-only for V1
- **Encryption-at-rest** — V1.5+
- **Tombstones / forget-with-audit** — separate later item once the audit page exists
- **Server-side pagination state / offsets** — storage exposes `before: { timestamp, id }` as a primitive (item 025); cursor opacity, encoding, and consumer contract live in the MCP tool layer, not here
- **Concurrent-access semantics** — single-writer assumption for V1

## Related

- [[capture-gate]] — the chokepoint upstream of every `append`
- [[capture-pipeline]] — the seam that calls `Storage.append` on accept
- [[capture-allowlist]] — what the gate checks against before accepting an event
- [[sandboxed-capture]] — the architectural reason storage receives only allowlisted events
- [[local-daemon]] — host process; owns the `Storage` instance
- [[mcp-search-memories]] — consumer of `Storage.query`, including the `source_prefix` filter
- [[mcp-recent-work-context]] — consumer of `Storage.query` with `exclude_metadata_surface` + `order: 'desc'`
- [[timestamp-canonicalization]] — capture-time + migration-time guarantee that all rows are canonical `Z` form
- [[audit-page]] — consumer of `query()` for "see memories" and "forget" operations

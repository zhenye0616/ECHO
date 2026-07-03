# `src/storage/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 5 files.

### `src/storage/interface.ts` — Storage interface + core types

**Purpose:** Defines the core `CaptureEvent`/`QueryFilter`/`Storage` contract implemented by both storage backends (SQLite and in-memory), plus the coord-atom append-order iteration seam used by 057a's deadline tracker.

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EventId` | type | `src/storage/interface.ts:1` | Alias for string event identifiers. |
| `CaptureEvent` | interface | `src/storage/interface.ts:3` | Canonical shape of a stored atom: id, source, timestamp, content, optional metadata/embedding. |
| `QueryFilter` | interface | `src/storage/interface.ts:12` | Query options for `Storage.query`: source/source_prefix, since/until, limit, order, exclude_metadata_surface, metadata_match, and composite `before` cursor. |
| `METADATA_MATCH_KEY_WHITELIST` | const | `src/storage/interface.ts:57` | Set of metadata keys (`workspace_id`, `composer_id`, `session_id`, `repo_root`) callers may filter on via `metadata_match`, enforced by both storage adapters. |
| `Storage` | interface | `src/storage/interface.ts:64` | Contract: append, query, count, getByIds (order-preserving), iterateCoordAtomsByAppendOrder, getCurrentCoordSequence. |
| `CoordAtomIterationRecord` | interface | `src/storage/interface.ts:106` | `CaptureEvent` extended with an opaque monotonic `sequence_id` for durable append-order replay of coord atoms. |

### `src/storage/memory.ts` — In-memory Storage implementation

**Purpose:** Implements the `Storage` interface entirely in-process (array-backed) for tests and non-persistent use, mirroring SqliteStorage's filtering/ordering/whitelist semantics exactly so both adapters behave identically.

**Depends on:** `src/storage/interface.ts`, `src/storage/source-match.ts`, `src/util/timestamp.ts`; external: `node:crypto`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `InternalEvent` | interface | `src/storage/memory.ts:17` | `CaptureEvent` plus internal `_seq` monotonic insertion counter. |
| `stripSeq(e)` | function | `src/storage/memory.ts:21` | Reconstructs a plain `CaptureEvent` from an `InternalEvent`, dropping the internal `_seq` field. |
| `MemoryStorage` | class | `src/storage/memory.ts:37` | Array-backed `Storage` implementation with a per-instance insertion sequence counter. |
| `MemoryStorage.append(event)` | method | `src/storage/memory.ts:41` | Generates a UUID, increments `seqCounter`, pushes the event into the in-memory array. |
| `MemoryStorage.query(filter)` | method | `src/storage/memory.ts:48` | Validates mutually-exclusive/whitelist constraints, canonicalizes since/until, filters by source/prefix/time/before-cursor/excluded-surface/metadata_match, sorts by (timestamp, id) per `order`, then truncates to `limit`. |
| `MemoryStorage.count()` | method | `src/storage/memory.ts:134` | Returns total number of stored events. |
| `MemoryStorage.getByIds(ids)` | method | `src/storage/memory.ts:138` | Returns events matching the given ids, re-ordered to match input id order; missing ids silently dropped. |
| `MemoryStorage.iterateCoordAtomsByAppendOrder(opts)` | method | `src/storage/memory.ts:157` | Iterates events in insertion order, filters to `source` starting with `coord:` and `_seq >= sinceSeq`, exposes `sequence_id`, honors optional `limit`. |
| `MemoryStorage.getCurrentCoordSequence()` | method | `src/storage/memory.ts:178` | Returns the max `_seq` among all `coord:`-prefixed events, or 0 if none exist. |

### `src/storage/migrate.ts` — SQLite schema migration + timestamp canonicalization

**Purpose:** Loads and applies versioned `.sql` migration files against the SQLite database using `PRAGMA user_version` as the applied-version marker, and provides a one-time idempotent pass to rewrite legacy non-UTC timestamps to canonical `Z`-suffixed ISO form.

**Depends on:** none (internal); external: `node:fs`, `node:path`, `better-sqlite3` (type only)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FILENAME_PATTERN` | regex | `src/storage/migrate.ts:5` | Matches migration filenames of form `NNNN_name.sql` and captures the 4-digit version. |
| `Migration` | interface | `src/storage/migrate.ts:7` | Shape of a loaded migration: version, filename, sql text. |
| `loadMigrations(migrationsDir)` | function | `src/storage/migrate.ts:13` | Reads all matching `.sql` files in a directory, parses version numbers, sorts ascending, and validates the sequence is contiguous starting at 1 (throws on gaps/duplicates). |
| `migrate(db, migrationsDir)` | function | `src/storage/migrate.ts:36` | Loads migrations, reads current `user_version`, applies each unapplied migration's SQL inside a transaction and bumps `user_version`, returns the final applied version. |
| `TZ_MARKER_RE` | regex | `src/storage/migrate.ts:53` | Detects whether a timestamp string already carries a `Z` or numeric UTC-offset suffix. |
| `canonicalizeTimestamps(db)` | function | `src/storage/migrate.ts:61` | Selects all `events` rows whose `timestamp` doesn't end in `Z`, rewrites each via `Date.toISOString()` (preserving sub-second precision that SQLite's `datetime()` would truncate) inside a transaction, verifies no non-Z rows remain, and returns the count converted. |

### `src/storage/source-match.ts` — Cross-platform source string matching

**Purpose:** Provides shared, cross-platform-safe equality/prefix matching semantics for `CaptureEvent.source` strings (handling Windows backslashes, drive letters, case-folding, trailing slashes, and prefix scheme like `git:`/`fs:`), used identically by both `MemoryStorage` (as the authoritative JS predicate) and `SqliteStorage` (as a superset SQL prefilter plus JS post-filter).

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `stripTrailingSlash(value)` | function | `src/storage/source-match.ts:9` | Removes trailing `/` characters from a string, keeping at least one character. |
| `pathStartIndex(value)` | function | `src/storage/source-match.ts:15` | Determines the index where a filesystem path begins within a source string (after an optional scheme prefix like `git:`), handling Windows drive letters, `/`, `~/`, and backslashes; returns null if not path-like. |
| `normalizePathLikeSource(value)` | function | `src/storage/source-match.ts:32` | Normalizes a path-like source string: strips scheme, converts backslashes to slashes, strips trailing slash, lowercases if Windows-like; returns null for non-path-like sources. |
| `sourceEquals(left, right)` | function | `src/storage/source-match.ts:42` | Compares two source strings for equality using path-aware normalization when both are path-like, else falls back to raw string equality. |
| `sourceHasPrefix(source, prefix)` | function | `src/storage/source-match.ts:50` | Checks whether a normalized source starts with a normalized prefix at a path-component boundary, falling back to raw `startsWith` for non-path-like values. |
| `likePrefilterChunk(value)` | function | `src/storage/source-match.ts:78` | Extracts the pre-path-separator chunk of a source/prefix value (e.g. `fs:` from `fs:/a/b`) for use as a provably-superset SQL `LIKE` prefilter; returns null when unsafe (leading separator or non-ASCII chunk). |

### `src/storage/sqlite.ts` — SQLite-backed Storage implementation

**Purpose:** Implements the `Storage` interface on top of `better-sqlite3`, running migrations and timestamp canonicalization at construction, storing metadata as JSON and embeddings as packed Float32 blobs, and combining SQL prefiltering with JS post-filtering for cross-platform-correct source matching.

**Depends on:** `src/storage/interface.ts`, `src/storage/migrate.ts`, `src/storage/source-match.ts`, `src/logging/index.ts`, `src/util/timestamp.ts`; external: `better-sqlite3`, `node:crypto`, `node:fs`, `node:path`, `node:url`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `MIGRATIONS_DIR` | const | `src/storage/sqlite.ts:24` | Resolved filesystem path to the `migrations/` directory colocated with this module. |
| `EventRow` | interface | `src/storage/sqlite.ts:28` | Raw SQLite row shape for the `events` table (metadata as JSON text, embedding as Buffer). |
| `rowToEvent(row)` | function | `src/storage/sqlite.ts:37` | Converts an `EventRow` into a `CaptureEvent`, parsing metadata JSON and decoding the embedding Buffer into a `number[]` via `Float32Array`. |
| `SqliteStorage` | class | `src/storage/sqlite.ts:56` | `Storage` implementation backed by a `better-sqlite3` database file (or `:memory:`), with WAL journaling and a prepared-statement cache for `query`. |
| `SqliteStorage.constructor(dbPath)` | method | `src/storage/sqlite.ts:62` | Opens/creates the DB file, sets WAL/synchronous=NORMAL/foreign_keys pragmas, runs `migrate()` and `canonicalizeTimestamps()`, prepares insert/count statements. |
| `SqliteStorage.append(event)` | method | `src/storage/sqlite.ts:84` | Generates a UUID, serializes metadata to JSON and embedding to a Float32 Buffer, inserts a row. |
| `SqliteStorage.query(filter)` | method | `src/storage/sqlite.ts:100` | Builds a parameterized SQL query combining source/prefix matching (SQL LIKE prefilter + JS predicate fallback via source-match.ts), since/until bounds, composite `before` cursor, whitelisted metadata_match via `json_extract`, exclude_metadata_surface NOT IN clause, and ORDER BY/LIMIT — moving LIMIT to JS when a JS source predicate is active to avoid short pages; caches prepared statements by SQL text. |
| `SqliteStorage.count()` | method | `src/storage/sqlite.ts:242` | Returns total row count from the `events` table. |
| `SqliteStorage.getByIds(ids)` | method | `src/storage/sqlite.ts:247` | Runs a positional `WHERE id IN (...)` query and re-orders results to match the input id list; missing ids dropped. |
| `SqliteStorage.iterateCoordAtomsByAppendOrder(opts)` | method | `src/storage/sqlite.ts:278` | Selects rows with `source LIKE 'coord:%'` and `rowid >= sinceSeq`, ordered by rowid ascending with optional LIMIT, exposing `rowid` as `sequence_id`. |
| `SqliteStorage.getCurrentCoordSequence()` | method | `src/storage/sqlite.ts:301` | Returns `MAX(rowid)` (or 0) over rows with `source LIKE 'coord:%'`. |
| `SqliteStorage.close()` | method | `src/storage/sqlite.ts:308` | Closes the underlying database handle if open. |
</content>

---
id: 2026-04-30-008-sqlite-storage
title: SQLite Storage implementation (better-sqlite3)
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - wiki/entities/storage.md
blocked_by: []
acceptance:
  - "`SqliteStorage` class in `src/storage/sqlite.ts` implements `Storage` interface"
  - "Constructor `new SqliteStorage(dbPath)` opens-or-creates the DB, runs migrations, returns instance"
  - "Schema: `events(id TEXT PRIMARY KEY, source TEXT NOT NULL, timestamp TEXT NOT NULL, content TEXT NOT NULL, metadata TEXT, embedding BLOB)`"
  - "Indexes on `events(source)` and `events(timestamp)`"
  - "WAL mode enabled (`PRAGMA journal_mode = WAL`)"
  - "All methods use prepared statements"
  - "Migration runner at `src/storage/migrate.ts`: reads `src/storage/migrations/*.sql` numbered files, applies unapplied via `PRAGMA user_version`"
  - "First migration `migrations/0001_initial.sql` creates the schema + indexes"
  - "Tests in `tests/storage/sqlite.test.ts` cover the same suite as `MemoryStorage` (append+query roundtrip, distinct ids across many appends, source/since/until/limit filters, count) using `:memory:` databases"
  - "One additional test: write to a tempfile DB, close, reopen, assert all events read back identically (durability check)"
  - "Daemon (`src/daemon/index.ts`) updated to use `SqliteStorage` by default at `~/Library/Application Support/ECHO/echo.db`"
  - "Daemon falls back to `MemoryStorage` when env `ECHO_STORAGE=memory`"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/storage/sqlite.ts
  - src/storage/migrate.ts
  - src/storage/migrations/0001_initial.sql
  - src/daemon/index.ts
  - package.json
  - tests/storage/sqlite.test.ts

claimed_by: "Mac.attlocal.net-zhenye"
claimed_at: "2026-04-30T21:30:00Z"
branch: "agent/008-sqlite-storage"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: |
  BLOCKED: spec gap. Two acceptance criteria require editing src/daemon/lifecycle.ts, but lifecycle.ts is NOT in files_to_modify.

  Specifically these two acceptance items can't be satisfied without lifecycle.ts edits:
    (a) "Daemon's startup log payload now shows storage_backend: 'sqlite'" — the log line is emitted inside startLifecycle() with a hardcoded STORAGE_BACKEND constant in lifecycle.ts (item 007 shipped). To make it 'sqlite', lifecycle.ts must learn the backend from a parameter or env, which means editing it.
    (b) "Daemon's lifecycle calls storage.close() on graceful shutdown" — shutdown() lives in lifecycle.ts. Without editing it, there's no clean place to wire close() in (any process.on('SIGTERM') registered from index.ts could call close, but that's a layering-violation workaround, not what the spec describes).

  Tried: I considered making index.ts register its own SIGTERM/SIGINT handler ahead of lifecycle's, but this duplicates the lifecycle abstraction and doesn't fix (a) — the started log fires inside startLifecycle and is hardcoded. I also considered duplicating lifecycle's logic into index.ts, but that's an immediate regression of item 007's clean separation.

  Best-guess answer: add src/daemon/lifecycle.ts to files_to_modify and:
    - parameterize startLifecycle to accept { storage, storageBackend, onShutdown } (or similar) so index.ts owns instantiation and decides the backend label
    - have shutdown() invoke onShutdown before clearing the keep-alive interval (so storage.close() runs before exit)
    - keep the existing MemoryStorage default if no storage is passed (back-compat for any future caller)
  Confidence: high that this is the intended path, since the acceptance criteria are explicit. Roughly 30 lines added to lifecycle.ts.

  Why I escalated rather than guessing: this is exactly the "ambiguity not resolved by spec" pattern that drift rule 8 covers, and rule 4 forbids file creation/modification outside files_to_modify. The fix is small and obvious; I want a one-word "yes proceed" before touching lifecycle.ts so the spec→build trail stays honest. No code was written for this item; no agent branch was pushed. After founder confirms, this can be reclaimed and shipped quickly.
review_notes: ""
---

# SQLite Storage implementation (better-sqlite3)

## What

A persistent `Storage` implementation using `better-sqlite3`, drop-in behind the existing `Storage` interface. Plus a minimal home-rolled migration runner so future schema changes have a clean evolution path.

```ts
// src/storage/sqlite.ts
export class SqliteStorage implements Storage {
  constructor(dbPath: string);
  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  async query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  async count(): Promise<number>;
  close(): void;  // explicit close for graceful daemon shutdown
}
```

```sql
-- src/storage/migrations/0001_initial.sql
CREATE TABLE events (
  id        TEXT PRIMARY KEY,
  source    TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  content   TEXT NOT NULL,
  metadata  TEXT,         -- JSON-serialized; NULL when absent
  embedding BLOB          -- Float32Array bytes; NULL until embedding pipeline
);
CREATE INDEX idx_events_source    ON events(source);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

```ts
// src/storage/migrate.ts (~30 lines)
export function migrate(db: Database, migrationsDir: string): void;
```

The migrator:
1. Reads `PRAGMA user_version` (defaults to 0 on a fresh DB)
2. Lists `migrationsDir` for `*.sql` files matching `NNNN_*.sql`
3. Applies any with version > current_user_version, in numeric order
4. Sets `PRAGMA user_version` to the highest applied
5. Runs each migration in a transaction

The daemon's storage instantiation (`src/daemon/index.ts`) gets a one-line swap:

```ts
const storage: Storage =
  process.env.ECHO_STORAGE === 'memory'
    ? new MemoryStorage()
    : new SqliteStorage(process.env.ECHO_DB_PATH ?? defaultDbPath);
```

## Why

`MemoryStorage` (item 005) is sufficient for tests and downstream code's compile-time integration, but it loses everything on every restart. The killer demo requires recall across days; SQLite is what makes that real. Per [[storage]]'s rationale, SQLite is the right call: single-file, embeddable, ACID, indexed, append-friendly, battle-tested.

Splitting interface (005) from implementation (008) was deliberate so other items could be built against `Storage` without waiting. Now that 006 (pipeline) is shipping in parallel and 009 (FS watcher) needs to land somewhere, swapping in real persistence becomes the next compounding move.

The migration runner is overkill for a single migration today, but every future schema change (adding a column, adding an index, changing a constraint) becomes a new file and an automatic version bump. The pattern is well-trodden; reinventing it adds zero risk.

## Acceptance Criteria

- [ ] `package.json` declares `better-sqlite3` in `dependencies` (NOT devDependencies — this is runtime) and `@types/better-sqlite3` in `devDependencies`
- [ ] `src/storage/sqlite.ts` exports `SqliteStorage implements Storage` plus a `close()` method
- [ ] `SqliteStorage(dbPath)` constructor:
  - Creates the parent directory if it doesn't exist
  - Opens (or creates) the SQLite DB
  - Sets `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`
  - Calls the migration runner
- [ ] All `Storage` methods implemented with prepared statements (parameterized; no string concatenation into SQL)
- [ ] `append`: generates id via `crypto.randomUUID()` (matches `MemoryStorage`); inserts; returns id
- [ ] `query`: dynamic WHERE assembly using prepared parameters; supports `source`, `since`, `until`, `limit`; orders by `timestamp ASC`
- [ ] `count`: `SELECT COUNT(*) FROM events`
- [ ] `metadata` is JSON-stringified on insert and JSON-parsed on read; NULL → `undefined`
- [ ] `embedding` is read as a Buffer when present, returned as `Float32Array` if non-null; NULL → `undefined`
- [ ] `close()` releases the DB handle; calling it twice is safe
- [ ] `src/storage/migrate.ts` exports `migrate(db, migrationsDir)`; idempotent (re-running on an up-to-date DB is a no-op)
- [ ] `src/storage/migrations/0001_initial.sql` exists with the schema above
- [ ] Tests in `tests/storage/sqlite.test.ts` cover:
  - All cases from `tests/storage/memory.test.ts` (port them, parameterized over both implementations if convenient)
  - Append+query roundtrip preserves all fields including metadata and embedding
  - Distinct ids across 100 appends
  - source / since / until / limit filters compose correctly
  - count is accurate
  - Durability: write to tempfile, close, reopen, read back identically
  - Migration runner: starts at version 0, applies 0001, ends at version 1; running again is a no-op
- [ ] All tests use `:memory:` DBs except the one durability test (uses `mkdtempSync` for cleanup)
- [ ] `src/daemon/index.ts` updated:
  - Default storage = `SqliteStorage` at `~/Library/Application Support/ECHO/echo.db`
  - `ECHO_STORAGE=memory` opt-out for `MemoryStorage`
  - `ECHO_DB_PATH=<path>` overrides default db path
  - Daemon's lifecycle calls `storage.close()` on graceful shutdown
- [ ] Daemon's startup log payload now shows `storage_backend: 'sqlite'` (or `'memory'` for the opt-out)
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean
- [ ] `npm install` succeeds (verify `better-sqlite3` builds on the founder's macOS — it has a native build step)

## Out of Scope (Don't Drift)

- **Encryption at rest** — V1.5+; not in this item
- **Backup/restore CLI** — separate later item
- **Query enhancements** beyond the existing `Storage` interface (no fulltext, no JSON1 metadata queries, no aggregations)
- **Embedding generation pipeline** — separate later item; the BLOB column stays NULL on insert, populated by a future async job
- **Tombstones / forget-with-audit** — depends on audit page existing first
- **Pagination beyond `limit`** — no cursors, no offsets, V1
- **Concurrent-writer semantics** — single-writer assumption (daemon is the only writer); WAL mode allows concurrent readers
- **Schema beyond the events table** — no second table in this item; future items add tables behind their own migrations
- **Modifying the `Storage` interface** — interface stays as item 005 shipped it; SQLite implements it as-is
- **Removing or modifying `MemoryStorage`** — it stays as the in-process fixture for tests
- **Adding any dependency beyond `better-sqlite3` + `@types/better-sqlite3`** — no migration framework, no ORM, no query builder

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Update `wiki/entities/storage.md`:
   - Add a "Implementations" section listing `MemoryStorage` (test fixture) and `SqliteStorage` (production)
   - Document the schema, the WAL-mode commitment, the migration runner pattern (numbered SQL files + `PRAGMA user_version`)
   - Document the `close()` extension to the interface contract (not on `Storage` itself; available on the SQLite impl for graceful shutdown)
2. Update `wiki/entities/local-daemon.md` to reflect the storage swap (default = SQLite, override via `ECHO_STORAGE=memory`)
3. Add a brief note in `docs/AGENT_INSTRUCTIONS.md` or in `backlog/README.md`'s Spec Authoring Lessons section: **"runtime deps land in `dependencies`, not `devDependencies` — `better-sqlite3` is runtime; `@types/*` are devDeps"** (so future items don't accidentally put runtime deps in the wrong section)
4. Update manifest + index for any new sections

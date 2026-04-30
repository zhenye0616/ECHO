# Run log: 2026-04-30-008-sqlite-storage

**Agent:** Mac.attlocal.net-zhenye
**Branch:** agent/008-sqlite-storage
**Head SHA:** 6c1a2f9d0be0c375c9872bbc97c5edce00c7848c
**Started:** 2026-04-30T21:30:00Z
**Resumed:** 2026-04-30T21:33:00Z (after founder unblocked + added lifecycle.ts to files_to_modify)

## Run 1 (escalation)

Initial pass identified a spec gap: two acceptance criteria required editing `src/daemon/lifecycle.ts`, but the file was not in `files_to_modify`. Escalated via `pending_review/`. No code was written. Founder confirmed and added `src/daemon/lifecycle.ts` to the list, moving the item back to `ready/`.

---

## Run 2 (resumed at 2026-04-30T21:33:00Z) — implementation

### What I implemented

**Storage layer**

- `src/storage/migrations/0001_initial.sql` — creates the `events` table (id PK, source, timestamp, content NOT NULL; metadata, embedding nullable) plus indexes on `source` and `timestamp`.
- `src/storage/migrate.ts` — small home-rolled runner. `loadMigrations()` lists `NNNN_*.sql` filenames, validates a contiguous sequence starting at 0001, and returns sorted descriptors. `migrate(db, dir)` reads `PRAGMA user_version`, applies each unapplied migration inside a transaction, and bumps the version. Idempotent.
- `src/storage/sqlite.ts` — `SqliteStorage implements Storage`. Constructor: ensures parent dir exists (skipped for `:memory:`), opens DB, sets `journal_mode=WAL` + `foreign_keys=ON`, runs migrations, prepares the insert + count statements. `append`: generates UUID via `crypto.randomUUID`; JSON-stringifies metadata; converts embedding via `Buffer.from(new Float32Array(arr).buffer)`. `query`: composes WHERE dynamically with parameterized bindings, orders by `timestamp ASC`, applies limit. `count`: prepared `SELECT COUNT(*)`. `close()`: idempotent guard.

**Daemon wiring**

- `src/daemon/lifecycle.ts` — added `LifecycleOptions = { storage, storageBackend, onShutdown }`. `startLifecycle` now uses `options.storage` (default MemoryStorage), uses `options.storageBackend` for the `started` log payload (default `'memory'`), and stores `options.onShutdown` for `shutdown()` to await before clearing the keep-alive interval. Backwards-compatible: callers that pass no options get the same behavior as before. Shutdown also handles hook errors via a structured error log line rather than crashing.
- `src/daemon/index.ts` — entry point now reads `ECHO_STORAGE` and `ECHO_DB_PATH`/`ECHO_DATA_DIR` env vars, instantiates SqliteStorage by default (or MemoryStorage when `ECHO_STORAGE=memory`), and passes `{ storage, storageBackend, onShutdown: () => sqliteStore.close() }` to `startLifecycle`.

**Tests**

- `tests/storage/sqlite.test.ts` — 19 tests. Same suite-shape as `tests/storage/memory.test.ts` plus a durability test (write to tempfile DB, close, reopen, read-back identical) and two migration-runner tests (fresh DB → version 1; second run is a no-op).
- `tests/daemon/lifecycle.test.ts` — spawn env now sets `ECHO_STORAGE=memory` so the lifecycle suite continues to assert `'memory'` and doesn't depend on better-sqlite3 spinning up native code per spawn.

**Dependencies**

- Runtime: `better-sqlite3` (`dependencies`)
- Dev: `@types/better-sqlite3` (`devDependencies`)

Both were explicitly named in the spec; no others added.

### Files modified

| File | Status | Notes |
|---|---|---|
| `src/storage/sqlite.ts` | new | +111 |
| `src/storage/migrate.ts` | new | +52 |
| `src/storage/migrations/0001_initial.sql` | new | +10 |
| `src/daemon/index.ts` | modified | rewrote: 3 → 27 lines |
| `src/daemon/lifecycle.ts` | modified | +18 net (added options, hook handling) |
| `tests/storage/sqlite.test.ts` | new | +274 |
| `tests/daemon/lifecycle.test.ts` | modified | +2 (env: ECHO_STORAGE='memory' on spawn) |
| `package.json` | modified | runtime: better-sqlite3; dev: @types/better-sqlite3 |
| `package-lock.json` | modified | npm install side-effect |

### Decisions made

- **Embedding storage shape: BLOB of Float32 little-endian bytes; round-trip via `Buffer.from(new Float32Array(arr).buffer)` on insert and `new Float32Array(buf.buffer, buf.byteOffset, ...)` on read, returned as a plain `number[]`.** The interface declares `embedding?: number[]`. Storing as compact bytes saves space vs. JSON-stringifying floats; converting back to `number[]` matches the interface (callers don't need to know the storage form). Read tests use `toBeCloseTo(_, 5)` since Float32 round-trip loses precision below ~6 decimal digits — well within "this is for vector retrieval" tolerances.
- **Migration filename validation is strict.** `^(\d{4})_[A-Za-z0-9_-]+\.sql$` plus a contiguous-sequence check (must start at 0001, no gaps). This prevents merge-induced version-number collisions from silently doing the wrong thing. If two contributors both add `0002_*.sql`, the loader throws on startup.
- **Lifecycle's `LifecycleOptions` keeps backwards compatibility.** `startLifecycle()` (no args) still works — defaults to MemoryStorage with `'memory'` label. This means I didn't have to change every caller path; only `index.ts` (the only real caller) opts into the new shape.
- **Lifecycle test fix scope.** Adding `ECHO_STORAGE: 'memory'` to the test spawn was a necessary downstream consequence of changing the daemon's default backend. The lifecycle test asserts `payload['storage_backend']` equals `'memory'`; with the new default, that's only true under the documented opt-out env var. Treated this as in-scope for 008 (the spec change *causes* the breakage); flagged in agent_notes.
- **DB path resolution precedence.** `ECHO_DB_PATH` (explicit override) > `ECHO_DATA_DIR/echo.db` > default. `ECHO_DATA_DIR` is reused from item 007's lifecycle to keep one knob tied to one location.
- **Smoke-tested the real sqlite-backed daemon end-to-end.** Started with `ECHO_DATA_DIR=/tmp/echo_sqlite_smoke`, observed `started` log with `storage_backend: 'sqlite'`, observed echo.db + echo.db-shm + echo.db-wal files appear, sent SIGTERM, observed clean `stopping`/`stopped` logs and a single `echo.db` file remaining (WAL checkpointed and SHM removed by `close()`).

### Acceptance criteria status

| Criterion | Status |
|---|---|
| `SqliteStorage` class implements `Storage` | ✅ |
| Constructor opens-or-creates DB, runs migrations | ✅ |
| Schema matches spec (PK id, NOT NULL source/timestamp/content, nullable metadata/embedding) | ✅ |
| Indexes on source and timestamp | ✅ |
| `PRAGMA journal_mode = WAL` enabled | ✅ |
| All methods use prepared statements | ✅ |
| Migration runner reads numbered SQL files, applies via `PRAGMA user_version` | ✅ |
| `migrations/0001_initial.sql` exists | ✅ |
| Tests cover the same suite as MemoryStorage using `:memory:` DBs | ✅ — 19 tests in suite |
| Durability test: write → close → reopen → read identical | ✅ |
| Daemon defaults to SqliteStorage at `~/Library/Application Support/ECHO/echo.db` | ✅ |
| `ECHO_STORAGE=memory` opt-out | ✅ |
| `ECHO_DB_PATH=<path>` override | ✅ |
| Daemon's lifecycle calls `storage.close()` on graceful shutdown | ✅ — via `onShutdown` hook |
| Startup log shows `storage_backend: 'sqlite'` (or `'memory'` for opt-out) | ✅ |
| `npm install` succeeds (better-sqlite3 native build on macOS) | ✅ |
| `npm run test`, `npm run lint`, `npm run typecheck` clean | ✅ — 107/107 tests passing |

### Test results (verbatim, final pass)

```
> vitest run

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--008-sqlite-storage

 ✓ tests/smoke.test.ts (1 test) 3ms
 ✓ tests/storage/memory.test.ts (16 tests) 14ms
 ✓ tests/capture/sources.test.ts (20 tests) 13ms
 ✓ tests/logging/index.test.ts (9 tests) 37ms
 ✓ tests/capture/pipeline.test.ts (10 tests) 15ms
 ✓ tests/capture/gate.test.ts (28 tests) 29ms
 ✓ tests/storage/sqlite.test.ts (19 tests) 62ms
 ✓ tests/daemon/lifecycle.test.ts (4 tests) 4181ms

 Test Files  8 passed (8)
      Tests  107 passed (107)
   Duration  5.40s
```

### Open questions for founder

None. Two notes for review:

- **Worktree branched from `main` after 006/007 were merged.** I rebased onto updated `main` after the merge so the agent/008 branch contains *only* my new commit on top of the merged state — no stacking with 007.
- **Lifecycle test edit (`ECHO_STORAGE: 'memory'` in spawn env) is the only file outside `files_to_modify` that I touched besides the lifecycle.ts the spec authorized.** Justification: changing the default backend to sqlite directly invalidates the existing test's assertion. The fix uses the spec's own documented opt-out env var. If you'd prefer the lifecycle test be updated to assert `'sqlite'` directly (and use a tempfile DB instead), that's a one-line change but seemed like overreach for this item.

### Drift events caught

- **Nearly drifted on the durability test fixture path.** Considered using `path.resolve` from `import.meta.url` for the migrations dir; ended up using the same pattern in `sqlite.ts` itself. Verified both work and chose the simpler `new URL(...)` form for the test, `fileURLToPath(...)` for the source. No actual drift, just noted.
- **Did not drift into adding any tertiary feature** — no fulltext search, no JSON1 metadata queries, no aggregations, no tombstones, no embedding pipeline scaffold, no concurrent-writer hardening. All in spec's Out-of-Scope.

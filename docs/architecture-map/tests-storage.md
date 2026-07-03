# `tests/storage/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 7 files.

### `tests/storage/get-by-ids.test.ts` — parity suite for Storage.getByIds

**Purpose:** Runs the same `getByIds` contract suite against both `MemoryStorage` and `SqliteStorage` — empty input, request-order preservation, missing-id-drop, field fidelity (metadata/embedding), and duplicate-id handling. Backs the V1.6 `get_atoms` MCP tool (item 030) which depends on this seam.

**Depends on:** `src/storage/interface.js` (CaptureEvent, Storage), `src/storage/memory.js` (MemoryStorage), `src/storage/sqlite.js` (SqliteStorage)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `eventInput(overrides)` | function | `tests/storage/get-by-ids.test.ts:10` | Builds a default `CaptureEvent` input (source/timestamp/content) merged with overrides. |
| `describe: "${backend.name}.getByIds"` | describe block | `tests/storage/get-by-ids.test.ts:32` | Parameterized over `MemoryStorage`/`SqliteStorage`; asserts empty-input no-op, request-order-not-insertion-order return, silent drop of missing ids, order preservation with missing ids mixed in, full field round-trip (metadata + close embedding match), and duplicate-id expansion. |

### `tests/storage/iterate-coord-by-append-order.test.ts` — parity suite for coord-atom append-order iteration

**Purpose:** Exercises `Storage.iterateCoordAtomsByAppendOrder` and `Storage.getCurrentCoordSequence` across both backends per 057a AC3/AC8: append-order (not emitted_at) ordering, `sinceSeq` half-open filtering, `limit` capping, non-coord row exclusion, and a watermark boundary-safety case guarding against skip/re-deliver bugs.

**Depends on:** `src/storage/memory.js` (MemoryStorage), `src/storage/sqlite.js` (SqliteStorage), `src/storage/interface.js` (Storage), `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `backends()` | function | `tests/storage/iterate-coord-by-append-order.test.ts:39` | Returns the two-backend fixture list (MemoryStorage in-process; SqliteStorage backed by a temp-dir file), each with a `cleanup` no-op (real close handled inline). |
| `describe: "AC3 storage seam — ${backend.name}"` | describe block | `tests/storage/iterate-coord-by-append-order.test.ts:59` | Covers: empty-ledger zero sequence, coord-vs-non-coord filtering with monotonic sequence_id, `sinceSeq` half-open slicing, `limit` capping, same-timestamp replay-in-append-order, out-of-order `emitted_at` not affecting iteration order, `getCurrentCoordSequence` tracking only coord rows, and watermark+1 boundary safety (no skip, no re-deliver). |

### `tests/storage/memory.test.ts` — unit suite for MemoryStorage

**Purpose:** Exercises `MemoryStorage`'s in-process implementation of the `Storage` interface: append/query round-trips, id uniqueness, count, source filtering, time-range filtering (including timezone-offset and naive-timestamp canonicalization), limit, combined filters, append-only immutability, and composite-key (timestamp,id) cursor pagination (item 025).

**Depends on:** `src/storage/memory.js` (MemoryStorage), `src/storage/interface.js` (CaptureEvent)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `eventInput(overrides)` | function | `tests/storage/memory.test.ts:5` | Builds a default `CaptureEvent` input merged with overrides. |
| `describe: "MemoryStorage"` | describe block | `tests/storage/memory.test.ts:14` | Top-level suite; instantiates a fresh `MemoryStorage` per test via `beforeEach`. |
| `describe: "append + query roundtrip"` | describe block | `tests/storage/memory.test.ts:21` | Verifies full field preservation, optional-field omission, and default DESC vs explicit ASC timestamp ordering. |
| `describe: "id uniqueness"` | describe block | `tests/storage/memory.test.ts:65` | Asserts 100 appends yield 100 distinct ids. |
| `describe: "count"` | describe block | `tests/storage/memory.test.ts:75` | Asserts `count()` starts at 0 and tracks appends accurately. |
| `describe: "source filter"` | describe block | `tests/storage/memory.test.ts:88` | Asserts exact-source matching and empty-result on non-matching source. |
| `describe: "time-range filter"` | describe block | `tests/storage/memory.test.ts:104` | Verifies `since` inclusive / `until` exclusive / combined bounds, timezone-offset (-07:00, +0900) window equivalence, missing-milliseconds Z windows, naive-timestamp local-time canonicalization, and invalid-timestamp rejection. |
| `describe: "limit filter"` | describe block | `tests/storage/memory.test.ts:188` | Verifies limit caps under DESC (newest N) and ASC (oldest N) order, and no-op when limit exceeds total. |
| `describe: "combined filters"` | describe block | `tests/storage/memory.test.ts:217` | Verifies source+since+limit composition under DESC order and source+until range rejection. |
| `describe: "append-only"` | describe block | `tests/storage/memory.test.ts:254` | Asserts repeated queries return consistent results (no in-place mutation of stored data affecting later reads). |
| `describe: "composite-key ordering + cursor pagination (item 025)"` | describe block | `tests/storage/memory.test.ts:267` | Verifies deterministic id-DESC/id-ASC tie-break ordering for same-millisecond rows across repeated runs, `before` cursor filtering (strictly older than (timestamp,id)), and synchronous rejection of `before` combined with `order: "asc"`. |
| `seedSameMs(ts, count)` | function | `tests/storage/memory.test.ts:268` | Nested helper (inside the composite-key describe) that appends `count` events sharing one timestamp and returns their ids. |

### `tests/storage/metadata-match.test.ts` — parity suite for QueryFilter.metadata_match

**Purpose:** Runs a shared `metadata_match` query-filter conformance suite against `MemoryStorage` and `SqliteStorage`: single-key equality, multi-key AND semantics, whitelist rejection of arbitrary keys, empty-object no-op, and skip-on-absent/non-string metadata.

**Depends on:** `src/storage/interface.js` (CaptureEvent, Storage), `src/storage/memory.js` (MemoryStorage), `src/storage/sqlite.js` (SqliteStorage)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `seed(events)` | function | `tests/storage/metadata-match.test.ts:35` | Appends a list of `CaptureEvent` inputs sequentially into the current `store`. |
| `describe: "QueryFilter.metadata_match parity ($name)"` | describe block | `tests/storage/metadata-match.test.ts:24` | Parameterized via `describe.each(ADAPTERS)`; asserts single-key match returns newest-first, multi-key match is AND'd across keys, non-whitelisted metadata keys throw at the storage seam, `metadata_match: {}` is a no-op equal to the baseline query, and rows lacking the matched key are skipped. |

### `tests/storage/migrate.test.ts` — unit suite for canonicalizeTimestamps + migrate

**Purpose:** Exercises `src/storage/migrate.js`'s `canonicalizeTimestamps` (item 022 Bug A) directly against a raw `better-sqlite3` `Database`, seeding rows with mixed timestamp offset forms and asserting UTC ("Z") rewriting, millisecond precision preservation, idempotency, and non-timestamp column integrity.

**Depends on:** `src/storage/migrate.js` (canonicalizeTimestamps, migrate), `better-sqlite3`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `seed(db, rows)` | function | `tests/storage/migrate.test.ts:12` | Inserts raw rows into the `events` table via a prepared `INSERT` with fixed `source='git:test'`/`content='x'`. |
| `readAll(db)` | function | `tests/storage/migrate.test.ts:19` | Selects `id, timestamp` from `events` ordered by id, returned as `Row[]`. |
| `describe: "canonicalizeTimestamps (item 022 Bug A migration)"` | describe block | `tests/storage/migrate.test.ts:25` | Runs `migrate()` to set up schema then tests: rewriting -07:00-offset rows to Z form, millisecond precision preservation, a 6-row mixed-offset fixture (Z/+HH:MM/-HH:MM) converting exactly the non-Z rows, idempotency across two runs, a no-op `converted: 0` result on an already-canonical store, and that non-timestamp columns (source/content) are left untouched. |

### `tests/storage/source-match-conformance.test.ts` — parity suite for source/source_prefix query matching

**Purpose:** Runs a shared conformance table of `source`/`source_prefix` matching cases against `MemoryStorage` and `SqliteStorage`, asserting `SqliteStorage` reproduces `src/storage/source-match.ts`'s normalization semantics (backslash→slash, trailing-slash strip, Windows case-folding, component-boundary prefix matching) rather than raw `source = ?` / ASCII-insensitive `LIKE prefix%`.

**Depends on:** `src/storage/interface.js` (CaptureEvent, Storage), `src/storage/memory.js` (MemoryStorage), `src/storage/sqlite.js` (SqliteStorage)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `eventInput(overrides)` | function | `tests/storage/source-match-conformance.test.ts:6` | Builds a default `CaptureEvent` input merged with overrides. |
| `describe: "source matching conformance — $name"` | describe block | `tests/storage/source-match-conformance.test.ts:26` | Parameterized via `describe.each(backends)`; top-level test asserts `source` + `source_prefix` together throws as mutually exclusive. |
| `describe: "path-like normalization (divergence class: Windows separators + case)"` | describe block | `tests/storage/source-match-conformance.test.ts:50` | Verifies backslash-stored Windows sources match forward-slash prefixes and exact sources, and drive-letter case-folding on both sides of a prefix match. |
| `describe: "component-boundary prefix matching (divergence class: raw LIKE prefix%)"` | describe block | `tests/storage/source-match-conformance.test.ts:76` | Verifies `source_prefix "fs:/a/b"` does not match sibling `"fs:/a/bc"` (component-boundary enforcement, not raw LIKE). |
| `describe: "case sensitivity for non-path-like prefixes (divergence class: ASCII-insensitive LIKE)"` | describe block | `tests/storage/source-match-conformance.test.ts:91` | Verifies `"GIT:"` prefix does not case-insensitively match a `"git:..."` source. |
| `describe: "trailing-slash equality (divergence class: raw source = ?)"` | describe block | `tests/storage/source-match-conformance.test.ts:98` | Verifies a trailing-slash-stored source matches the slashless exact-source query. |
| `describe: "limit composes with source_prefix matching (page must not run short)"` | describe block | `tests/storage/source-match-conformance.test.ts:106` | Verifies `limit` counts only rows the prefix predicate accepts, guarding against LIMIT applied over a raw LIKE superset before the real predicate. |
| `describe: "canonical inputs (regression anchors — already pass on both adapters)"` | describe block | `tests/storage/source-match-conformance.test.ts:133` | Regression anchors: exact non-path-like source match, case-sensitive `"coord:"` scheme prefix match, and canonical forward-slash deep-path prefix match. |

### `tests/storage/sqlite.test.ts` — unit + durability + migration suite for SqliteStorage

**Purpose:** Exercises `SqliteStorage` end-to-end: append/query round-trip and ordering, id uniqueness, count, source filter, time-range filter (incl. timezone offsets and naive-window canonicalization), limit, combined filters, `close()` idempotency, on-disk write→close→reopen durability, the schema migration runner (`migrate`), the item-022 Bug A timestamp-canonicalization migration triggered on construction, the item-022 Bug C `exclude_metadata_surface` filter, and item-025 composite-key (timestamp,id) cursor pagination/ordering determinism.

**Depends on:** `src/storage/migrate.js` (migrate), `src/storage/sqlite.js` (SqliteStorage), `src/storage/interface.js` (CaptureEvent), `better-sqlite3`, `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `eventInput(overrides)` | function | `tests/storage/sqlite.test.ts:12` | Builds a default `CaptureEvent` input merged with overrides. |
| `describe: "SqliteStorage"` | describe block | `tests/storage/sqlite.test.ts:21` | Top-level suite over an in-memory `SqliteStorage(':memory:')`, covering append/query roundtrip (field fidelity + DESC/ASC ordering), id uniqueness, count, source filter, time-range filter (incl. offset/naive-window canonicalization and invalid-timestamp rejection), limit filter, combined filters, and `close()` double-call safety. |
| `describe: "SqliteStorage durability"` | describe block | `tests/storage/sqlite.test.ts:300` | Verifies a write→close→reopen cycle against a temp-dir-backed file preserves all rows, ids, metadata, and embeddings. |
| `describe: "migration runner"` | describe block | `tests/storage/sqlite.test.ts:341` | Verifies `migrate()` moves a fresh DB from `user_version` 0 to 1, creates the `events` table, and is a no-op when already at the latest version. |
| `describe: "SqliteStorage timestamp canonicalization migration (item 022 Bug A)"` | describe block | `tests/storage/sqlite.test.ts:365` | Verifies a raw -07:00-offset row inserted before a canonicalizing reopen is excluded from a Z-form time window pre-migration and included (rewritten to Z) post-migration. |
| `describe: "SqliteStorage exclude_metadata_surface filter (item 022 Bug C)"` | describe block | `tests/storage/sqlite.test.ts:410` | Verifies rows whose `metadata.surface` is in the exclusion list are filtered out, that `fs:`-sourced conversation atoms without `surface=fs` are preserved, and that an empty exclusion list is a no-op. |
| `describe: "SqliteStorage composite-key ordering + cursor pagination (item 025)"` | describe block | `tests/storage/sqlite.test.ts:471` | Verifies deterministic id-DESC/id-ASC tie-break ordering for same-millisecond rows across repeated runs, `before` cursor filtering (strictly older than (timestamp,id)), and synchronous rejection of `before` combined with `order: "asc"`. |
| `seedSameMs(ts, count)` | function | `tests/storage/sqlite.test.ts:482` | Nested helper (inside the composite-key describe) that appends `count` events sharing one timestamp into `SqliteStorage` and returns their ids. |

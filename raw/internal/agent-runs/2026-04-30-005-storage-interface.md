---
item: 2026-04-30-005-storage-interface
agent: MacBook-Pro.local-zhenye
branch: agent/storage-interface
head_sha: a8350f346b231cd380278c58726739a04ec52c34
status: ready_for_review
---

# Run Log — 2026-04-30-005-storage-interface

## What I implemented

`src/storage/interface.ts` (24 lines):

- `EventId` (opaque string), `CaptureEvent` (id/source/timestamp/content +
  optional metadata + optional embedding), `QueryFilter` (source/since/
  until/limit), `Storage` interface with `append/query/count` — all
  async.

`src/storage/memory.ts` (38 lines):

- `MemoryStorage implements Storage`. Private append-only `events: CaptureEvent[]`.
- `append`: generates `crypto.randomUUID()`, spreads input + id, pushes,
  returns id.
- `query`: linear pass over the events array filtering by source (exact
  match), since (inclusive), until (exclusive), and limit (early-exit).
  Returns matches in insertion order.
- `count`: returns array length.
- All methods declared async; resolve synchronously.

`tests/storage/memory.test.ts` (189 lines, 16 cases):

- Roundtrip: full-shape preservation incl. metadata + embedding.
- Optional fields omitted when not supplied.
- Insertion order across 5 appends.
- ID uniqueness across 100 appends.
- count: 0 on empty, 7 after seven appends.
- source filter: exact match returns subset; non-match returns empty.
- time-range filter: since inclusive, until exclusive, combined range.
- limit: caps result; returns all when over total.
- combined filters: source + since + limit, source + until.
- append-only invariant: array length stable across queries.

## Files modified

| File | Lines | Status |
|---|---|---|
| `src/storage/interface.ts` | +24 | new |
| `src/storage/memory.ts` | +38 | new |
| `tests/storage/memory.test.ts` | +189 | new |

Branch: `agent/storage-interface` @ `a8350f346b231cd380278c58726739a04ec52c34`.

## Decisions made during implementation

- **`crypto.randomUUID()` for IDs.** Spec says "implementation-defined,
  e.g., crypto.randomUUID()" — I used the example. `node:crypto` is a
  Node builtin (not a new dep).
- **Filter ordering: per-event short-circuit.** Iteration walks the
  array once, applies each predicate as a continue, and pushes on
  match; limit triggers an early break. This satisfies all behavior
  requirements with O(n) worst case and avoids intermediate arrays.
- **`since` inclusive, `until` exclusive.** Spec is explicit; tests
  pin this.
- **Timestamp comparison via string `<` on ISO 8601.** ISO 8601 in UTC
  with the same precision sorts lexicographically. All test fixtures
  use millisecond-precision UTC; production callers should too. (No
  Date parsing — keeps it simple and avoids tz pitfalls.)
- **No deep-copy on append/query.** The interface contract is "events
  are appended; query returns events." If a caller mutates a returned
  object's fields, that mutation is visible on subsequent queries
  (since we hand back references). For an in-memory test fixture,
  this is acceptable; the SQLite implementation will naturally serialize
  copies. Documented obliquely via the append-only invariant test.

## Acceptance status

| Criterion | Status |
|---|---|
| `Storage` interface exported from `src/storage/interface.ts` | ✅ |
| `CaptureEvent` type defined and exported | ✅ |
| `MemoryStorage implements Storage` in `src/storage/memory.ts` | ✅ |
| `append/query/count` methods present | ✅ |
| `append` assigns and returns a unique `EventId` | ✅ |
| Query filters by source (exact match) and time range (since/until) | ✅ |
| Tests cover roundtrip, count, filters, ID uniqueness, combined filters | ✅ |
| `npm run test`, `npm run lint`, `npm run typecheck` clean | ✅ |

## Test results (verbatim)

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
(no output — clean)
```

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
(no output — clean)
```

```
> echo-daemon@0.0.0 test
> vitest run

 RUN  v2.1.9 /Users/zhenye/Desktop/echo_wiki--storage-interface

 ✓ tests/smoke.test.ts (1 test) 2ms
 ✓ tests/storage/memory.test.ts (16 tests) 10ms
 ✓ tests/logging/index.test.ts (9 tests) 27ms

 Test Files  3 passed (3)
      Tests  26 passed (26)
```

## Open questions

None.

## Drift events

None. Strict adherence to `files_to_modify`. Out-of-scope items
(SQLite, embedding generation, indexing, encryption, tombstones,
pagination, concurrency locks, retention) all correctly deferred.

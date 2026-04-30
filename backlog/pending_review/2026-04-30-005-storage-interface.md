---
id: 2026-04-30-005-storage-interface
title: Storage interface + in-memory implementation
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs: []
blocked_by:
  - 2026-04-30-001-repo-bootstrap
acceptance:
  - "`Storage` interface exported from `src/storage/interface.ts`"
  - "`CaptureEvent` type defined and exported from `src/storage/interface.ts`"
  - "`MemoryStorage` class in `src/storage/memory.ts` implements `Storage`"
  - "Methods: `append(event): Promise<EventId>`, `query(filter): Promise<CaptureEvent[]>`, `count(): Promise<number>`"
  - "Append assigns and returns a unique `EventId`"
  - "Query supports filtering by source (string match) and time range (since/until)"
  - "Tests cover: append+query roundtrip, count accuracy, filter correctness, ID uniqueness"
files_to_modify:
  - src/storage/interface.ts
  - src/storage/memory.ts
  - tests/storage/memory.test.ts

claimed_by: "MacBook-Pro.local-zhenye"
claimed_at: "2026-04-30T09:55:43Z"
branch: "agent/storage-interface"
worktree: "/Users/zhenye/Desktop/echo_wiki--storage-interface"
head_sha: "a8350f346b231cd380278c58726739a04ec52c34"
pr_url: ""
agent_notes: |
  All acceptance criteria met. typecheck/lint/test all clean (26/26 tests).

  Implementation:
  - src/storage/interface.ts (24 lines): EventId, CaptureEvent,
    QueryFilter, Storage interface.
  - src/storage/memory.ts (38 lines): MemoryStorage implements Storage.
    Private append-only array; randomUUID() ids; query() filters by
    source (exact), since (inclusive), until (exclusive), limit (early
    break); count() returns array length.
  - tests/storage/memory.test.ts (189 lines, 16 cases): roundtrip with
    optional fields, insertion order, 100 distinct ids, count accuracy,
    source filter, since/until ranges, limit caps, combined filters
    (source+since+limit, source+until), append-only invariant.

  Notable decisions:
  - crypto.randomUUID() (Node builtin, no new dep).
  - ISO 8601 string comparison for timestamps (lexicographic sort works
    for UTC strings of same precision).
  - No deep-copy on query; references shared with caller. Acceptable
    for in-memory fixture; SQLite naturally serializes copies later.

  See: raw/internal/agent-runs/2026-04-30-005-storage-interface.md
review_notes: ""
---

# Storage interface + in-memory implementation

## What

The abstract type contract for "where captured events go," paired with a no-op in-memory implementation. Downstream items (capture-gate wire-up, MCP server, audit page) can be built against the `Storage` interface immediately for their tests, without waiting for a real SQLite implementation.

The interface is what matters; SQLite is a *later* item that drops in cleanly behind the same interface.

Public shape:

```ts
// src/storage/interface.ts
export type EventId = string;   // opaque; implementation-defined

export interface CaptureEvent {
  id: EventId;
  source: string;             // e.g., 'slack:app.slack.com', 'fs:cursor-workspace', 'api:github'
  timestamp: string;          // ISO 8601, UTC
  content: string;            // the captured text/payload (caller-defined shape)
  metadata?: Record<string, unknown>;
  embedding?: number[];       // nullable; populated later by an embedding pipeline
}

export interface QueryFilter {
  source?: string;            // exact match
  since?: string;             // ISO 8601; events with timestamp >= since
  until?: string;             // ISO 8601; events with timestamp < until
  limit?: number;             // max results returned
}

export interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
}
```

```ts
// src/storage/memory.ts
import type { Storage, CaptureEvent, EventId, QueryFilter } from './interface.js';

export class MemoryStorage implements Storage {
  // append-only array, no persistence
}
```

Behavior of `MemoryStorage`:

- Holds events in a private array. Append-only: no update, no delete.
- `append` generates an ID (e.g., `crypto.randomUUID()`), stamps it, pushes, returns the ID.
- `query` returns events matching the filter, in insertion order. Empty filter returns all.
- `count` returns the array length.
- All methods are `async` for interface compatibility but resolve synchronously.

## Why

Splitting interface from implementation unblocks parallel work. Future items — wiring the capture gate to write events, implementing MCP-server pull, building the audit page — can all be built against `Storage` and tested with `MemoryStorage`. When SQLite lands later, only one new file needs to ship.

This pattern aligns with the AIE wiki's `[[append-only-ledger]]` substrate: append, query, no mutation. The interface is a faithful subset (we add `count()` for convenience but no update/delete) so the SQLite implementation drops in cleanly when it ships.

Append-only is also a security/audit property: events can be inspected and forgotten via the audit page, but not silently rewritten. (Forgetting is implemented later as a tombstone, not as in-place deletion.)

## Acceptance Criteria

- [ ] `src/storage/interface.ts` exports `Storage`, `CaptureEvent`, `EventId`, `QueryFilter` per the spec above
- [ ] `src/storage/memory.ts` exports `MemoryStorage implements Storage`
- [ ] `append` returns a unique `EventId`; two appends never produce the same ID
- [ ] `query()` (no filter) returns all events in insertion order
- [ ] `query({ source: 'X' })` returns only events whose `source === 'X'`
- [ ] `query({ since, until })` correctly bounds by timestamp (`since` inclusive, `until` exclusive)
- [ ] `query({ limit: N })` returns at most N events
- [ ] `count()` returns the total number of appended events
- [ ] Tests in `tests/storage/memory.test.ts` cover:
  - Append → query roundtrip preserves all fields
  - Multiple appends produce distinct IDs (assert across e.g., 100 appends)
  - Source filter, time-range filter, limit filter each behave correctly
  - Count is accurate after a sequence of appends
  - Combined filters compose correctly (source + since + limit)
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` all clean

## Out of Scope (Don't Drift)

- **SQLite implementation** — separate later item; this one establishes the interface only
- **Embedding generation** — `embedding` field is nullable; wiring an embedding pipeline is V1.5
- **Indexing / fulltext search** — `query` is filter-only for V1
- **Migration / schema versioning** — only relevant when SQLite lands
- **Encryption-at-rest** — V1.5+
- **Tombstones / forget-with-audit-trail** — separate later item once we have the audit page
- **Pagination beyond `limit`** — no cursors / offsets for V1
- **Concurrent-access semantics / locking** — single-writer assumption for V1; revisit when multiple capture surfaces are wired
- **Compaction, GC, retention policy** — V2+
- **Adding any storage dependency** (better-sqlite3, etc.) — that's the later SQLite item

## After Completion (Strategist Notes)

Once shipped, create `wiki/entities/storage.md` documenting:

- The `Storage` interface contract
- The append-only commitment and why (audit, security, simplicity)
- Cross-reference to the AIE wiki's `[[append-only-ledger]]` pattern as the source pattern
- A pointer to the (future) SQLite implementation item ID once that ships

If both this item and the gate item (004) ship together, also note in the wiki that gate + storage form the substrate's read-write contract.

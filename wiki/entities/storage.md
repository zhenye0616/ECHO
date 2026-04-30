---
topic: Architecture
subtopic: Storage
aliases:
  - Storage
  - Storage Interface
  - MemoryStorage
---

# Storage

## Definition

The storage layer defines *where captured events go* after the [[capture-gate]] accepts them. It ships in two parts: an abstract `Storage` interface (`src/storage/interface.ts`) and a no-op `MemoryStorage` implementation (`src/storage/memory.ts`). The interface is the contract; SQLite is a later item that drops in cleanly behind the same interface.

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
  source?: string;      // exact match
  since?: string;       // ISO 8601; events with timestamp >= since (inclusive)
  until?: string;       // ISO 8601; events with timestamp < until (exclusive)
  limit?: number;
}
```

Three operations, no others. There is no `update`, no `delete`. Forgetting (when it ships) will be implemented as a tombstone row, not as in-place deletion.

## The Append-Only Commitment

Storage is append-only. This is a deliberate architectural commitment, not an artifact of the in-memory implementation:

1. **Audit.** Events can be inspected and forgotten via the audit page, but never silently rewritten. The append-only property is what makes the audit trail trustworthy.
2. **Security.** A compromised process cannot retroactively edit ECHO's record of what it saw. It can only add — and additions are visible.
3. **Simplicity.** No reconciliation, no concurrent-update semantics, no schema for "this row replaces that row." The system gets smaller, not larger, as it scales.

This pattern is borrowed wholesale from the AIE wiki's `[[append-only-ledger]]` substrate. The `Storage` interface is a faithful subset — `count()` is added for convenience, but no mutation operations are introduced.

## Why Interface First

Splitting the interface from the implementation unblocks parallel work. Future items — the capture-pipeline wire-up that ties [[capture-gate]] → storage, the MCP-server retrieval path, the audit-page reader — can all be built against `Storage` and tested with `MemoryStorage`. When SQLite ships, only one new file is added; nothing else changes.

## MemoryStorage: What It Is and Isn't

`MemoryStorage` exists to enable testing and downstream development. Its scope is narrow:

- Holds events in a private `CaptureEvent[]`. Append-only at runtime; no truncation, no GC, no retention.
- IDs are `crypto.randomUUID()`. No new dependency required (Node built-in).
- `query` is a single-pass linear scan with early-break on `limit`. Filters compose: `source` + `since` + `until` + `limit` are applied together.
- All methods are `async` for interface compatibility but resolve synchronously.

What it's *not*: production storage. Unbounded growth is intentional for a fixture; retention, indexing, and durability are explicitly the SQLite implementation's concern (later item).

## Timestamp Semantics

Timestamps are ISO 8601 UTC strings. Comparisons in `query` are lexicographic, which works correctly for UTC strings of consistent precision. `since` is inclusive; `until` is exclusive — i.e., `[since, until)`. This matches the standard half-open-interval convention and avoids off-by-one bugs at boundaries.

## What's Out of Scope (and Where It Lives Instead)

- **SQLite implementation** — separate later item; same interface
- **Embedding generation** — the `embedding` field is populated by a pipeline that runs after persistence; V1.5
- **Indexing / fulltext search** — `query` is filter-only for V1
- **Encryption-at-rest** — V1.5+
- **Tombstones / forget-with-audit** — separate later item once the audit page exists
- **Pagination beyond `limit`** — no cursors, no offsets, for V1
- **Concurrent-access semantics** — single-writer assumption for V1

## Related

- [[capture-gate]] — the chokepoint upstream of every `append`
- [[capture-allowlist]] — what the gate checks against before accepting an event
- [[sandboxed-capture]] — the architectural reason storage receives only allowlisted events
- [[local-daemon]] — host process; owns the `Storage` instance
- [[audit-page]] — consumer of `query()` for "see memories" and "forget" operations

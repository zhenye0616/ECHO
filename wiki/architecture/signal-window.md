---
status: shipped
topic: Architecture
subtopic: Retrieval Composition
aliases:
  - Signal Window
  - getSignalWindow
  - SignalWindowEntry
---

# Signal Window (`getSignalWindow`)

## Definition

`getSignalWindow` is the internal "one door" for reading a window of context — one function, one ordered list, full fidelity. It lives at `src/trace/signal-window.ts` and implements Fork 2 of the capture→signals seam decision (`raw/internal/decisions/2026-07-04-seam-v0-decision.md`): every internal reader of raw + derived context (today: the drift sweep, [[drift-alert]]; tomorrow: any other correlation-layer consumer) opens the same door instead of hand-rolling its own storage query. The [[mcp-server|MCP tools]] (`cluster-engine.ts`) are a *separate*, wire-shape-capped projection that this module deliberately does not import from and is not built on top of — the relationship runs the other way in spirit (internal readers get full fidelity; MCP is the trimmed-at-the-doorway external view), even though today they're sibling consumers of the same underlying [[storage]] rather than one literally wrapping the other.

## The Contract

```ts
function getSignalWindow(storage: Storage, opts: SignalWindowOpts): Promise<SignalWindowEntry[]>;

interface SignalWindowOpts {
  since?: string;                  // event-time lower bound, inclusive
  until?: string;                  // event-time upper bound, exclusive
  cursor?: { sinceSeq: number };   // when set, switches to append-order mode
  scope: 'machine' | 'company';
  loop?: string;                   // dumb string-equality filter on metadata.canonical_subject
  limit?: number;                  // applied LAST, after every other predicate + the ordering
}

interface SignalWindowEntry {
  id: EventId;
  sequence_id: number;             // durable append position — see "Two Orderings" below
  source: string;
  timestamp: string;
  content: string;                 // full, untruncated
  metadata?: Record<string, unknown>; // full, untruncated
  normalized: NormalizedContextEvent | null; // reuses existing source adapters; null if none registered
}
```

One call returns the **union** of (a) normalized raw events via the existing source adapters, unchanged, and (b) derived atoms (`derived:granola-signals`, `derived:team-decisions`) — in one ordering, one budget, so no caller ever builds on half the picture (seam decision #9). No wire-shape truncation caps live anywhere in this path — an import-closure test (`tests/trace/signal-window-import-closure.test.ts`) asserts the module's transitive imports contain no `src/mcp/internal` path and no `runBrain` symbol, enforcing both "no capped adapter leaks in" and "nothing in this module ever calls an AI" (seam decision #19).

## Two Orderings, and Why Both Exist

A cron-style consumer cursoring on event time silently skips late-arriving atoms: if the daemon is down during a meeting, that meeting's notes get ingested hours later carrying their *original* old timestamp, so an event-time cursor that already advanced past that timestamp never sees them. This is exactly the kind of atom a drift sweep most needs to catch.

- **Event-time mode** (`cursor` absent): the existing storage `(timestamp DESC, id DESC)` ordering — good for "what happened in this human time window."
- **Append-order (cursor) mode** (`cursor.sinceSeq` set): durable order over `sequence_id`, half-open `[sinceSeq, +∞)` — `sinceSeq` omitted means "from the beginning of the ledger." This generalizes the coord-only append-order seam (`iterateCoordAtomsByAppendOrder`, shipped for coord atoms) into `Storage.iterateAtomsByAppendOrder` / `Storage.getCurrentSequence`, both now accepting an optional `sourcePrefixes` restriction. `sequence_id` is the SQLite events-table `rowid` (memory backend: an insertion counter) — durable across restart because the table is append-only, single-writer, and never `VACUUM`ed; if that invariant ever changes (deletes, tombstones, VACUUM), the cursor contract must migrate to an explicit sequence column.

**Cursor advancement is caller-derived, not returned.** `getSignalWindow` never computes or returns a next-cursor — a cursor-mode consumer advances by `max(entry.sequence_id) + 1` over the page it actually received. This is inherently `limit`-safe (you only advance past rows you saw) and safe under concurrent appends (an atom appended after the read is simply picked up next poll). On an **empty** page the cursor does not move — re-polling from the same `sinceSeq` is the idempotent, safe behavior; moving it forward to a separately-observed watermark is exactly the skip bug this design avoids. A consumer needing a bootstrap watermark calls `getCurrentSequence()` explicitly.

**Sort + composition contract:** cursor mode sorts `sequence_id ASC`, filtered `sequence_id >= sinceSeq`, intersected (AND) with any `since`/`until`/`scope`/`loop`; event-time mode uses the existing DESC ordering filtered the same way. `limit` is applied **last**, after every predicate and the ordering — an eligible later row is never hidden behind filtered-out leading rows.

## Scope: `machine` vs `company`

One exported table (`SCOPE_SOURCE_PREFIXES` in `src/trace/signal-window.ts`) is the single place a future scope value gets added — a one-line edit, not a redesign (seam decision #17, the "fractal" bet: team/department scopes later become more values of the same parameter):

| scope | source prefixes | meaning |
|---|---|---|
| `machine` | `fs:`, `git:` | code sessions, commits |
| `company` | `api:granola`, `derived:` | meetings + every derived-fact namespace |

`company`'s `derived:` prefix is intentionally broad — it includes signals, team decisions, and any future `derived:*` namespace with a one-line addition, per the additive-expansion invariant. One exclusion carves out bookkeeping: `derived:granola-signals-index` (the extractor's dedupe **manifest**, not context) is filtered ahead of all predicates via `SCOPE_EXCLUDED_SOURCE_PREFIXES`, so manifest atoms never leak into a company-scope window (a reviewer finding fixed pre-merge). See [[signal-formation]] for what the manifest atom is.

## Loop Filter — Dumb by Contract

`loop` filters entries to those whose `metadata.canonical_subject` (the [[storage|unified subject key]] from item 112) string-equals it; entries with no such key are excluded when `loop` is set. No fuzzy or semantic matching, no normalization applied to the `loop` argument itself — it is compared as a raw string. Seam decision #18/#19: topic filtering starts dumb and honest; alias grouping, if it ever earns its keep, is a below-the-seam persisted fact, and fuzzy AI matching, if ever, is strictly above the seam — never inside this module.

## Currentness Is a Separate, Opt-In Concern (item 115)

`getSignalWindow` does **not** filter superseded signal runs — it returns the raw union, including any signal atom orphaned by a failed manifest append or superseded by a later extraction. Current-run resolution is [[signal-formation|`filterToCurrentSignalRuns`]], a separate one-call composition consumers apply themselves. This is a pinned, deliberate contract gap (recorded in the station-2 lock-in's codex review, F1/F6/F7): any consumer of signal atoms through this window **must** resolve current runs, or explicitly accept fail-open behavior. Today only [[mcp-search-memories|`search_memories`]] applies the filter; the drift sweep ([[drift-alert]]) and intake are recorded followups to adopt it when each is next touched, not automatic.

## Determinism

Same `opts` against the same store state returns deep-equal results — tested across repeated reads and after an unrelated-scope append. This is what makes drift-sweep false alerts debuggable and extraction-quality A/B-able (seam decision #11).

## Out of Scope (and Where It Lives Instead)

- **No caching, memoization, or materialized views** — measured slowness triggers this, not predicted slowness (seam decision #12); the manifest/supersede pattern is the template if a cache is ever needed.
- **No new MCP tool** exposing this externally — internal seam only.
- **No refactor of existing MCP tools onto this interface** — a post-V0 alignment item; `cluster-engine.ts`'s wire caps are untouched.
- **No alias table or semantic loop matching** — see "Loop Filter" above.
- **Event-time SQL pushdown** — the event-time mode currently materializes the in-scope ledger and filters in JS; pushing `since`/`until` into the SQL `WHERE` clause is a recorded followup once the ledger grows.

## Related

- [[storage]] — the substrate this seam reads; see "Derived-Signal Currentness" for the append-order seam's storage-layer half and "Subject-Key Unification" for the `loop` filter's join key
- [[signal-formation]] — the extractor whose signal + manifest atoms flow through this window; owns `filterToCurrentSignalRuns`
- [[drift-alert]] — the standing consumer this seam was built for; reads `scope: 'company'` in cursor mode
- [[mcp-search-memories]] — sibling consumer of the underlying storage; the one existing consumer of `filterToCurrentSignalRuns`
- [[work-trace]] — a different, pre-existing `src/trace/` module (clustering); unrelated contract, same directory

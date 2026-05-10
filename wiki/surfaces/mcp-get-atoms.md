---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - get_atoms
  - MCP get_atoms tool
  - Get Atoms
  - Targeted body fetch
---

# MCP `get_atoms` Tool

## Definition

`get_atoms` is the **targeted body-fetch** primitive in the V1.6 atomic MCP toolkit. It takes a list of atom IDs (≤50 per call) and returns their bodies — projected through the same wire-shape pipeline as [[mcp-search-memories|`search_memories`]] and [[mcp-tail-session|`tail_session`]], with per-content cap and per-key metadata cap. Lives at `src/mcp/tools/get-atoms.ts`. Shipped 2026-05-10 as item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] (V1.6); resume-call usage (`prefer='newest_first'` + missing-ID position semantics) added by item [[2026-05-10-032-m2-first-call-reliability|032]].

## Why It Exists

Pairs with [[mcp-find-clusters|`find_clusters`]]: the discovery primitive returns `atom_ids[]` lists; `get_atoms` materializes their bodies. Before 030, the combined "cluster + body" envelope in `get_recent_work_context` ([[mcp-recent-work-context|deprecated]]) bundled both purposes — and routinely blew the 25 kB envelope even with `format='skeleton'`. The split lets consumers pay only for what they read.

## Public Contract

**Tool name:** `get_atoms`

**Input schema** (zod):

```ts
{
  atom_ids:  string[],          // REQUIRED. Non-empty, ≤50. Returned in REQUESTED ORDER (by default).
  fields?:   string[],          // optional projection — only listed top-level fields are returned per atom
                                //   (always-on: id, source, timestamp, truncations)
  format?:   'minimal',         // V1.6 only ships 'minimal' (WIRE_SHAPE_CAPS applied)
  prefer?:   'as_requested' | 'newest_first',  // item 032 — atom-order policy (default: 'as_requested')
}
```

**Output envelope** (`schema_version: 1`):

```ts
{
  schema_version: 1,
  tool: 'get_atoms',
  atoms: [
    { id, source, timestamp, content, metadata?, truncations: string[], ... }, ...
  ],
  atoms_dropped:     number,
  atoms_dropped_ids: string[],     // missing IDs + envelope-overflow drops (see below)
  warnings:          string[],
}
```

## The `truncations` Trust Signal (item 030)

Every returned atom carries `truncations: string[]`. `[]` ⟺ everything verbatim. `["content"]` ⟺ content was clipped to the wire-shape cap. `["metadata.<key>"]` ⟺ per-key cap fired (LOSSY — opaqued out). `["metadata.<key>:projected"]` ⟺ projector reshaped (REFORMATTED, not clipped — e.g., `tool_calls` → `trajectory`). `["fields_omitted"]` ⟺ caller passed `fields[]` excluding some.

This is the load-bearing trust contract the consumer reads to know whether the body it sees is what's actually stored. When `truncations` contains `"content"`, consumers should reach for `get_atom(id)` (item [[2026-05-10-033-full-atom-recovery|033]], when shipped) for verbatim recovery.

## Envelope Ceiling — Deterministic Prefix-Drop

Hard envelope ceiling: 25 kB. When the response would exceed it, **deterministic prefix-drop** applies: atoms are appended in returned order (see `prefer` below) until the next atom would push the envelope over the ceiling; **that atom AND every remaining atom are dropped** (NOT a hole in the middle). `atoms_dropped: N` + `atoms_dropped_ids: string[]` carry the omitted IDs in returned order. Missing IDs (not in storage) also appear in `atoms_dropped_ids`.

If even a single projected atom alone would exceed 25 kB, the response is `{atoms: [], atoms_dropped: input_count, atoms_dropped_ids: [all]}` plus a warning telling the caller to retry with a narrower `fields[]` projection.

## Resume-Call Usage (item 032)

The resume-call shape — `find_clusters().clusters[0].atom_ids[]` → `get_atoms(atom_ids, prefer='newest_first')` — needs the newest atom of the picked cluster to ALWAYS land in the response, even when the cluster's atom_ids list exceeds the envelope. Item 032 added two policies:

### `prefer='newest_first'`

Sorts the fetched atoms by `CaptureEvent.timestamp` DESC **before** the prefix-drop loop runs, so newest atoms land first; if drops occur, they're at the oldest end. Default `'as_requested'` preserves the existing requested-order contract.

The two-layer disambiguation matters: AC1's cluster-rank predicate (the normalized-cluster layer) uses `NormalizedContextEvent.time.occurred_at`; AC2's `get_atoms` sort (the storage layer) uses `CaptureEvent.timestamp`. Same physical instant, different per-layer canonical name.

### Missing-ID position + duplicate-collapse asymmetry

- **Missing IDs** (ID not in storage) are appended at the **end** of the response in input order, preserving relative order among themselves. Position-wise they appear last so envelope drops don't preferentially eat real atoms.
- **Duplicate IDs in input** behave differently per mode:
  - `prefer='as_requested'` (default) — preserves the **existing** `getByIds` contract: duplicates return duplicates (request `[A, B, A]` returns three atoms, A appears twice).
  - `prefer='newest_first'` — **NEW opt-in behavior**: duplicates collapse to first occurrence (request `[A, B, A]` returns two atoms, A appears once, sorted by timestamp). The asymmetry is documented in the tool description.

## Cost Contract

- **Medium.** Each returned atom passes through wire-shape projection.
- **Hard envelope ceiling: 25 kB.** Deterministic prefix-drop on overflow.
- **`atom_ids` ≤ 50 per call.** Larger lists must be chunked client-side.

## Canonical Recipe (resume-after-gap)

```ts
const c = await find_clusters();                            // no args; auto-expand handles gaps
const picked = c.clusters[0];                               // top rank — after 032 demotion, real prior work
const a = await get_atoms({ atom_ids: picked.atom_ids,
                            prefer: 'newest_first' });      // newest atoms land in envelope first
// If picked.atom_ids.length > 50, chunk client-side and concat.
```

For full verbatim atom recovery (when `truncations` reports content was clipped), use `get_atom(id)` (item [[2026-05-10-033-full-atom-recovery|033]], when shipped) — the escape hatch.

## What `get_atoms` Does NOT Do

- **No discovery.** That's [[mcp-find-clusters|`find_clusters`]].
- **No verbatim recovery.** That's `get_atom(id)` — item 033's in-MCP escape hatch (pre-merge today).
- **No write.** Pure read against [[storage]].
- **No clustering or labels.** That's the trace layer.

## Related

- [[mcp-server]] — the host transport
- [[mcp-find-clusters]] — the discovery counterpart
- [[mcp-recent-work-context]] — the deprecated V1.5 predecessor (`get_recent_work_context`)
- [[mcp-tail-session]] — sibling cheap exact-fetch primitive (by source instead of by ID list)
- [[mcp-search-memories]] — sibling substring search
- [[storage]] — the substrate `getByIds` queries
- [[normalized-context-event]] — the atom shape

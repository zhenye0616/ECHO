---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - get_atom
  - MCP get_atom tool
  - Get Atom
  - Verbatim escape hatch
  - Full-atom recovery
---

# MCP `get_atom` Tool

## Definition

`get_atom` is the **verbatim escape hatch** in the V1.6 MCP toolkit — the singular-atom counterpart to [[mcp-get-atoms|`get_atoms`]] (plural). Given one atom ID, it returns the atom with **content verbatim** (no wire-shape `match_content` clip), metadata projected (per-key cap + `tool_calls` reshape via `projectMatch`), and embedding excluded. Lives at `src/mcp/tools/get-atom.ts`. Shipped 2026-05-10 as item [[2026-05-10-033-full-atom-recovery|033]] (V1.6.1) — closes Magic Moment M1-3 (long-turn elision recovery without shell or composer-id context).

## Why It Exists

Item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] added the `truncations: string[]` trust signal so consumers could KNOW their response was clipped. But it didn't add a way to RECOVER the full content through MCP — the documented mitigation was "read JSONL/SQLite directly," which works for the strategist (shell access + composer-id from prior dogfooding entries) but does NOT work for:

- AI client subagents with only MCP access (can't shell out)
- Group-session participants who don't know the source path
- Builder agents claiming items where the spec references elided content

Magic Moment M1-3 (long-turn elision still requires JSONL fallback for full-text recovery) fired **six times in the 24h window 2026-05-09 to 2026-05-10**, including once during the very session that produced 033's R2 review of the M1-3 fix. `get_atom` is the in-MCP escape hatch that closes M1-3 end-to-end.

## Public Contract

**Tool name:** `get_atom` (singular — distinct from [[mcp-get-atoms|`get_atoms`]] plural).

**Input schema** (zod):

```ts
{
  id: string,        // REQUIRED. The atom's EventId (UUID v4 string).
}
```

**No other parameters.** No `atom_ids[]` (use [[mcp-get-atoms|`get_atoms`]] for batch), no `format` (this tool has exactly one shape), no `fields[]` (projection defeats the purpose of the escape hatch).

**Output shape (success):**

```ts
{
  schema_version: 1,
  tool: 'get_atom',
  atom: {
    id, source, timestamp,
    content:  '<VERBATIM full content from storage, no clipping>',
    metadata: { /* projected metadata — per-key cap + tool_calls reshape */ },
    truncations: string[],  // 'content' is NEVER present here (see R2 truncations-correctness fix);
                            // 'metadata.<key>:projected' or 'metadata.<key>' may be present
  },
  atom_size_bytes: number,   // JSON.stringify(atom).length
  warnings: string[],
}
```

**Output shape (atom-too-large error):**

```ts
{
  schema_version: 1,
  tool: 'get_atom',
  atom: null,
  atom_size_bytes: number,        // actual size — e.g. 87_345
  error_code: 'atom_too_large_for_wire',
  source: 'fs:/Users/.../rollout-*.jsonl',  // populated so consumer can read JSONL directly
  warnings: ['Atom JSON exceeds 25_000-byte MCP envelope ceiling even with metadata projection; cannot transmit over MCP. Read source path directly to recover full content.'],
}
```

**Output shape (atom-not-found error):**

```ts
{
  schema_version: 1,
  tool: 'get_atom',
  atom: null,
  atom_size_bytes: 0,
  error_code: 'atom_not_found',
  source: null,
  warnings: ['No atom with id=<uuid> exists in storage. Verify the id was obtained from a current find_clusters / search_memories / get_atoms / tail_session response — atom IDs are storage row IDs and cannot be guessed.'],
}
```

## Scope of "Verbatim" (the load-bearing contract)

The contract is **"content verbatim, metadata projected, embedding excluded."**

- **`content`: verbatim** — no `WIRE_SHAPE_CAPS.match_content` clip. This is the load-bearing fix for M1-3 (the elided field is always `content`).
- **`metadata`: PROJECTED** — uses the existing `projectMatch` pipeline (`WIRE_SHAPE_CAPS.metadata_value` per-key cap + `tool_calls` → `trajectory` reshape). Why: Codex extractor stores `metadata.tool_calls` at **120-130KB per atom**; verbatim metadata would force the atom-too-large error path on every Codex atom — the exact M1-3 case `get_atom` was supposed to fix. The R1 cycle of 033's cross-tool review caught this load-bearing contract gap; the revised contract makes the Codex-realistic case (≈10KB content + ≈130KB raw tool_calls metadata) succeed.
- **`embedding`: EXCLUDED** — `CaptureEvent` carries optional `embedding?: number[]` (1-2KB+); embeddings are rarely useful for recovery and not what a consumer needs when they see `truncations: ["content"]`.

A consumer who needs verbatim metadata is in a different use case (rare; out of scope for V1.6 — V2+ if real demand surfaces).

## Truncations Correctness (R2 fix)

After overwriting the projected content with verbatim content, the implementation **filters `"content"` out of `match.truncations`** before returning — because the content is no longer truncated, leaving `"content"` in the array would be a lie to the consumer. The remaining entries (e.g., `"metadata.tool_calls:projected"`) carry over correctly. This was load-bearing for R2: if the builder had skipped the filter step, the trust signal added in 030 would have been a lie on the very tool meant to recover from it. Unit tests + integration test all assert `"content"` is NOT in returned `truncations`, even when the underlying content would have been clipped by `projectMatch`.

## Canonical Recovery Pattern

```ts
const r = await get_atom({ id });
if (r.error_code === 'atom_too_large_for_wire') {
  /* read r.source directly — atom DOES exist, just doesn't fit the wire */
} else if (r.error_code === 'atom_not_found') {
  /* ID is stale or wrong; abort. Do NOT retry. */
} else {
  /* r.atom.content is the verbatim recovery; r.atom.metadata is projected */
}
```

`atom_too_large_for_wire` and `atom_not_found` are distinct error classes. Consumers must branch on `error_code` to distinguish "the atom exists but doesn't fit" from "the ID is wrong."

## Cost Contract

- **HIGH cost.** Each call materializes one atom's full content + projected metadata through MCP.
- **Hard envelope ceiling: 25 kB.** Pre-flight `JSON.stringify(envelope).length` check; if > 25k, returns `atom_too_large_for_wire` instead of silently clipping.
- **Single ID per call.** Use [[mcp-get-atoms|`get_atoms`]] for batch (≤50 IDs) when verbatim isn't required.

After the R1 contract revision (content verbatim + metadata projected + embedding excluded), the `atom_too_large_for_wire` error path fires only when **content alone exceeds ~24KB** — rare for typical chat turns (5-15KB content).

## When to Call `get_atom`

Use ONLY when you observed **non-empty `truncations`** (especially `["content"]`) on a prior `search_memories` / `tail_session` / `get_atoms` / `wait_for_new_turns` response AND you need the verbatim content for that specific atom.

Do NOT call `get_atom` in a tight loop — it's the escape hatch, not the discovery primitive. Pair with [[mcp-find-clusters|`find_clusters`]] + [[mcp-get-atoms|`get_atoms`]] for routine discovery and body-fetch, reach for `get_atom` only when recovery is required.

## What `get_atom` Does NOT Do

- **No batch.** That's [[mcp-get-atoms|`get_atoms`]].
- **No verbatim metadata.** Metadata is always projected (`projectMatch` pipeline). Out of scope for V1.6.
- **No range / offset / chunked download.** If the atom is too large for the envelope, return the error shape and let the caller read the source path. Chunked download is V2+ if real demand surfaces.
- **No `fields[]` projection.** The escape hatch returns the full atom (minus embedding).
- **No silent truncation.** Hard 25k ceiling; if it doesn't fit, returns explicit error.

## Related

- [[mcp-server]] — the host transport
- [[mcp-get-atoms]] — the batch counterpart (with caps)
- [[mcp-find-clusters]] — the discovery primitive that produces atom IDs
- [[mcp-search-memories]] + [[mcp-tail-session]] + [[mcp-wait-for-new-turns]] — sibling atom-bearing tools that carry the `truncations` trust signal pointing here
- [[cross-tool-spec-review]] — the operating-model pattern this tool unblocks (no more JSONL fallback for elision recovery)

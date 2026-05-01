---
topic: Form Factor
subtopic: MCP Server
aliases:
  - search_memories
  - MCP search_memories tool
  - Search Memories
---

# MCP `search_memories` Tool

## Definition

`search_memories` is the MCP tool through which AI clients retrieve captured ECHO context. It lives at `src/mcp/tools/search-memories.ts`, is registered against the [[mcp-server|local MCP server]] at session-creation time, and is the V1 realization of the Pull side of [[clipboard-and-launch]] — when Cursor or Claude Code decides it needs the user's prior thinking, this is the call that returns it.

## Public Contract (Stable)

The tool's name, description, input schema, and output shape are now a contract that AI clients depend on. Changes are breaking.

**Tool name:** `search_memories`

**Description (verbatim, what AI clients see):**

> "Search the user's captured ECHO memories (Cursor + Claude Code conversations, git commits) by free-text query, source prefix, or time range. Returns the most recent matching events."

**Input schema** (zod; all fields optional):

```ts
{
  query?:         string,    // case-insensitive substring match on content
  source_prefix?: string,    // e.g. 'cursor-chat:', 'claude-code:', 'git:'
  since?:         ISO8601,   // events with timestamp >= since
  until?:         ISO8601,   // events with timestamp <  until
  limit?:         number,    // default 10, clamped to [1, 50]
}
```

**Output envelope:**

```ts
{
  matches: [
    { id, source, timestamp, content, metadata? },
    ...
  ],
  total_returned: number,
  limit_applied:  number,
  query_echo: { query, source_prefix, since, until, limit },
}
```

The `query_echo` field returns the inputs the tool actually used after defaulting and clamping — useful for clients that want to log or surface what was searched.

## Defaults, Clamping, Validation

- **`limit`** defaults to `10`. Provided values are floored (non-integers like `2.7` become `2`), then clamped to `[1, 50]`. Asking for `limit: 1000` returns at most 50.
- **`since` / `until`** are validated by a structural ISO 8601 regex (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`). The check is structural, not full RFC; malformed timestamps are rejected by zod before the handler runs.
- **`query` / `source_prefix`** have no length cap and no normalization beyond `toLowerCase()` for `query` matching.

## Retrieval Behavior

The implementation is intentionally simple — no scoring, no embeddings:

1. Build a [[storage|`QueryFilter`]] from `source_prefix` / `since` / `until` (note: `limit` is **not** pushed down to storage).
2. `await storage.query(filter)` — pulls every event matching the time / source filters.
3. Sort the result DESC by `timestamp` in the tool.
4. Take the top `min(limit * 4, 200)` as the **overfetch pool**.
5. If `query` is set, filter the pool by `content.toLowerCase().includes(query.toLowerCase())`.
6. Return the first `limit` survivors.

The output is already DESC by timestamp because the candidate slice was. There is no secondary ranking.

## The Overfetch Pattern

Step 4 — taking `limit * 4` candidates after the DESC sort — is the load-bearing trick. The substring filter at step 5 may reject most candidates, so we need a pool wider than `limit` for the filter to have anything to chew on. `limit * 4` (capped at 200) is the heuristic: wide enough that meaningfully-matching content survives, narrow enough that we're not paying to filter the whole table on every call.

This pattern only works because the dataset is small in V1. It is *not* a general retrieval primitive — see "Known V1 Limitation" below.

## Substring V1, Embeddings V1.5

V1 retrieval is `String.prototype.includes` against the lowercased content. This is a deliberate floor:

- **It works because users are stable in their phrasing.** When the founder asks Cursor "why did we choose TS over Rust", the previous Claude Code session that decided it almost certainly contains the words "TS" and "Rust". Substring catches the literal-vocabulary case that dominates real usage.
- **It's a clean upgrade path.** When dogfooding shows substring missing semantically-related results, embeddings replace step 5 — the same MCP tool surface, the same input/output, the same client integrations. Nothing AI clients depend on changes.
- **It avoids a premature dependency.** Embeddings mean a model, model-loading code, an embedding column populated on append, and a vector index. Each of those is a V1.5 decision we don't need to make to ship the killer demo.

## Known V1 Limitation

Because `limit` is not passed to `storage.query` and the DESC sort happens in the tool, storage may scan and return the entire matching set before the tool slices off the top. This is fine at V1 dataset sizes (tens of thousands of events on one Mac) and lets [[storage|`MemoryStorage`]] and `SqliteStorage` share an `ASC`-by-default contract.

V1.5 should add `order: 'asc' | 'desc'` to `QueryFilter` and push the sort + limit down to storage so the in-tool overfetch becomes a SQL `LIMIT`. Tracked in `backlog/_followups.md`.

## What it does NOT do

- **No relevance scoring.** Results are ordered by timestamp DESC only. There is no recency-decay, no TF-IDF, no rerank.
- **No pagination.** No cursor, no offset. Clients page by narrowing `since` / `until`.
- **No embeddings, no FTS5, no fuzzy match.** Exact case-insensitive substring on `content`.
- **No write surface.** `search_memories` is read-only against [[storage]]. Forget / redact / delete are separate (V1.5+) tools.
- **No auth.** Loopback-only is the V1 boundary; the [[mcp-server]] handles binding.
- **No mutation of metadata.** What [[capture-pipeline|capture]] wrote is exactly what's returned.

## Related

- [[mcp-server]] — the host this tool is registered on
- [[storage]] — the substrate it queries
- [[capture-pipeline]] — produces the events this tool retrieves
- [[clipboard-and-launch]] — the Pull side of which this is the V1 realization

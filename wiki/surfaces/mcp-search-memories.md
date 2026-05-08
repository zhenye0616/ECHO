---
status: shipped
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

> "Search the user's captured ECHO memories (Cursor + Claude Code conversations, git commits) by free-text query, source prefix, or time range. Returns the most recent matching events. Free-text query is matched as a case-insensitive literal substring against the event content; this is NOT a semantic / KNN search. Use exact tokens (file paths, SHAs, error codes) rather than paraphrased questions."

The substring-not-semantic clarification was added in item 022 after dogfooding showed AI clients sending paraphrased queries against the implementation's literal-match contract and getting empty results — the original "free-text query" wording read as semantic search.

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

The implementation is intentionally simple — no scoring, no embeddings. Two paths, depending on whether `query` is set:

**Recency-only path (`query` undefined):**

1. Build a [[storage|`QueryFilter`]] from `source_prefix` / `since` / `until` + `limit: limitApplied` (safe to push down — no post-storage filter can drop rows).
2. `await storage.query(filter)` — storage returns DESC by default since item 021.
3. Return the first `limitApplied`.

**Content-filter path (`query` is set):**

1. Build a [[storage|`QueryFilter`]] from `source_prefix` / `since` / `until` (no `limit` — see below).
2. `await storage.query(filter)` — pulls every event matching the time / source filters.
3. Sort DESC by `timestamp` in the tool.
4. Filter by `content.toLowerCase().includes(query.toLowerCase())`.
5. Return the first `limitApplied` survivors.

The output is already DESC by timestamp. There is no secondary ranking.

### Filter-before-slice (item 022)

Pre-022, the content-filter path sliced to `limit * 4` (capped at 200) **before** the substring filter ran. A literal match in the 201st-newest row was silently invisible. Item 022 reordered the steps: filter first, slice last. The fix sounds trivial but the wrong-version-of-it (pushing `limit: MAX_OVERFETCH` into `storage.query`) just relocates the bug into the storage layer — a substring living in row 201 is still dropped if storage caps at 200. The correct V1.5 stance is:

- **`query` undefined** → push `limit: limitApplied` into `storage.query`. Safe.
- **`query` defined** → don't push `limit` into `storage.query`; load all matching rows, filter, then slice. Pays a memory cost bounded by the existing per-source / time-range filters.

The proper long-term fix — server-side `WHERE content LIKE ?` in `QueryFilter` — is deferred to V1.5.3 once a real content-filter contract is added. The current pattern works because V1 datasets are small (tens of thousands of events on one Mac).

## Substring V1, Embeddings V1.5

V1 retrieval is `String.prototype.includes` against the lowercased content. This is a deliberate floor:

- **It works because users are stable in their phrasing.** When the founder asks Cursor "why did we choose TS over Rust", the previous Claude Code session that decided it almost certainly contains the words "TS" and "Rust". Substring catches the literal-vocabulary case that dominates real usage.
- **It's a clean upgrade path.** When dogfooding shows substring missing semantically-related results, embeddings replace step 5 — the same MCP tool surface, the same input/output, the same client integrations. Nothing AI clients depend on changes.
- **It avoids a premature dependency.** Embeddings mean a model, model-loading code, an embedding column populated on append, and a vector index. Each of those is a V1.5 decision we don't need to make to ship the killer demo.

## Known V1 Limitation

On the content-filter path, `limit` is intentionally not passed to `storage.query` (see "Filter-before-slice" above). Storage may scan and return the entire matching time-range / source-prefix set before the tool slices off the top after substring filtering. This is fine at V1 dataset sizes (tens of thousands of events on one Mac).

The clean long-term fix — server-side `content_contains` in `QueryFilter` so the substring filter pushes into the SQL `WHERE` clause — is deferred to V1.5.3 (queued in `backlog/_followups.md`). Item 021 added `QueryFilter.order: 'asc' | 'desc'` to [[storage]] (default DESC); item 022 added `exclude_metadata_surface` for the trace tool's noise-filter need. The next storage-side feature `search_memories` actually wants is content-filter pushdown.

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

---
id: 2026-04-30-014-mcp-search-memories
title: MCP `search_memories` tool — retrieval over captured events
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - wiki/entities/mcp-server.md
  - wiki/entities/storage.md
blocked_by:
  - 2026-04-30-013-mcp-server-skeleton
  - 2026-04-30-010-cursor-extractor
  - 2026-04-30-011-claude-code-extractor
acceptance:
  - "MCP tool `search_memories` registered on the MCP server (item 013's scaffold)"
  - "Input schema: `{ query?: string, source_prefix?: string, since?: ISO8601, until?: ISO8601, limit?: number }`"
  - "All inputs optional. Defaults: limit=10, no time bounds, no source filter, no query."
  - "Behavior: queries `Storage.query({source: source_prefix exact-match if provided, since, until, limit: limit*4})`, then if `query` is provided, filters results by case-insensitive substring match on `content`, returns top `limit` results sorted by `timestamp DESC`"
  - "Returns: `{ matches: [{ id, source, timestamp, content, metadata }], total_returned: N, limit_applied: M, query_echo: { ... } }`"
  - "MCP tool description well-written for AI clients to know when to call it: `\"Search the user's captured ECHO memories (Cursor + Claude Code conversations, git commits) by free-text query, source prefix, or time range. Returns the most recent matching events.\"`"
  - "Tests cover: empty query returns most recent N events; query=substring filters; source_prefix='cursor-chat:' returns only Cursor events; since/until bounds work; limit applied"
  - "End-to-end test: seed `MemoryStorage` with a mix of cursor-chat, claude-code, and git events; invoke the tool via MCP; assert filtering correctness"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/mcp/tools/search-memories.ts
  - src/mcp/server.ts
  - tests/mcp/tools/search-memories.test.ts

claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-04-30T20:05:00Z"
branch: "agent/mcp-search-memories"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# MCP `search_memories` tool — retrieval over captured events

## What

The first real MCP tool — and the one that closes the killer-demo loop. AI clients (Cursor, Claude Code) call this to retrieve relevant captured context. ECHO does simple, fast retrieval and returns the events.

```ts
// MCP tool definition (registered on item 013's server)
{
  name: 'search_memories',
  description: "Search the user's captured ECHO memories (Cursor + Claude Code conversations, git commits) by free-text query, source prefix, or time range. Returns the most recent matching events.",
  inputSchema: {
    query?: string,           // case-insensitive substring match on content
    source_prefix?: string,   // exact prefix match on source (e.g., 'cursor-chat:', 'git:', 'claude-code:')
    since?: ISO8601,          // events with timestamp >= since
    until?: ISO8601,          // events with timestamp < until
    limit?: number,           // max results (default 10, max 50)
  },
}
```

Behavior:

1. Read query params; apply defaults (`limit=10`, max=50; clamp).
2. Translate to `Storage.query({...})`. If `source_prefix` is provided, do an exact-prefix scan via storage's `source` filter — for V1 SQLite, this is `WHERE source LIKE '<prefix>%'` (extend `QueryFilter` if needed). Otherwise no source filter.
3. Pull `limit * 4` candidates ordered by `timestamp DESC` (overfetch to give the in-memory query filter room).
4. If `query` is provided: filter candidates by `content.toLowerCase().includes(query.toLowerCase())`. (Substring match. Future V1.5: replace with embedding-based semantic search.)
5. Truncate to `limit`. Sort already DESC by timestamp.
6. Return as MCP tool result.

Output shape (returned via the SDK's tool-call response):

```json
{
  "matches": [
    {
      "id": "abc...",
      "source": "cursor-chat:workspace-xyz",
      "timestamp": "2026-04-29T14:23:00Z",
      "content": "USER: ...\\n\\nA: ...",
      "metadata": { "workspace_id": "...", "thread_id": "...", "turn_id": "..." }
    },
    ...
  ],
  "total_returned": 7,
  "limit_applied": 10,
  "query_echo": { "query": "pricing", "source_prefix": null, "since": null, "until": null, "limit": 10 }
}
```

## Why

This is where the demo arc lands:

> *"In Cursor, the user types: 'How did we end up choosing TS over Rust?'. Cursor's MCP integration calls `search_memories({ query: 'TS Rust stack decision' })`. ECHO returns three Claude Code conversation turns from last week where the founder weighed the options. Cursor's response now includes that context, not from training data, but from the user's actual thinking."*

To make that real, we need:
1. ✓ Captured data (items 010, 011, 012 producing events)
2. ✓ A retrievable shape (the unified `CaptureEvent` envelope)
3. ✓ MCP server scaffold (item 013)
4. **The tool that connects them** ← this item

V1 retrieval is intentionally simple — substring match + filters. Embedding-based retrieval is V1.5. The simple retrieval will surface real signal because the user's queries will tend to use the same vocabulary as their prior conversations (people are stable in how they phrase things). When dogfooding shows the quality bar isn't met, embeddings are a clean upgrade behind the same MCP tool surface.

## Acceptance Criteria

- [ ] `src/mcp/tools/search-memories.ts` exports a tool definition object compatible with the MCP SDK's tool-registration API used in item 013
- [ ] Input schema: all five fields optional; `limit` clamped to `[1, 50]`; ISO8601 strings validated structurally (basic format check, not full RFC validation)
- [ ] Implementation:
  - Build a `QueryFilter` from input (`source` left undefined unless `source_prefix` provided AND the storage's `query` supports prefix; if not, do post-filter)
  - Pull `Math.min(limit * 4, 200)` candidates from `Storage.query`
  - If `query` provided: filter by `content.toLowerCase().includes(query.toLowerCase())`
  - Take top `limit`, return
- [ ] **`Storage.query` extension if needed:** if the existing interface doesn't support prefix matching on `source`, extend `QueryFilter` with `source_prefix?: string` (mutually exclusive with `source`). Update `MemoryStorage` and `SqliteStorage` to honor it. Document the extension in `agent_notes`.
- [ ] Output shape: matches per the spec above, JSON-serializable, returned via the SDK's tool-result mechanism
- [ ] Server registers the tool: update `src/mcp/server.ts` to register `search_memories` alongside the existing `echo_ping` stub
- [ ] Tests in `tests/mcp/tools/search-memories.test.ts`:
  - Seed `MemoryStorage` with a known set: 3 cursor-chat events, 3 claude-code events, 2 git events, varied timestamps and content
  - Empty query → returns 8 most recent (or `limit` if smaller)
  - `query: 'something_only_in_one_event'` → returns just that one
  - `source_prefix: 'cursor-chat:'` → returns 3
  - `source_prefix: 'git:'` → returns 2
  - `since` + `until` bounding works
  - `limit: 2` → returns 2 (most recent)
  - Combined: `query` + `source_prefix` + `limit` → correct intersection
  - Edge cases: `limit: 100` → clamped to 50; malformed timestamps → tool error response (NOT crash)
- [ ] End-to-end MCP test (using item 013's server): boot server with seeded storage, send `tools/call` for `search_memories` over HTTP, assert response correctness
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean

## Out of Scope (Don't Drift)

- **Embedding-based retrieval** — V1.5; `embedding` column stays unused for now
- **Full-text search via SQLite FTS5** — V1.5 if substring proves insufficient
- **Ranking beyond timestamp DESC** — no relevance scoring, no recency-decay weighting; simple ordering wins for V1
- **Pagination beyond `limit`** — no cursors, no offsets; clients ask for a different `since`/`until` window
- **Aggregations / digests** — separate later items (e.g., "summarize this week's commits")
- **Other MCP tools** (forget, redact, list_sources) — separate items, V1.5+
- **Auth on tool calls** — loopback-only is the V1 boundary
- **Redaction / privacy filtering before return** — V1.5+; for now, return what storage has
- **Tool-call audit logging back into storage** — interesting V2 audit feature; out of scope
- **Modifying capture surfaces** — extractors/git-watcher already produce the right envelope
- **Adding any new dependency** — uses existing `@modelcontextprotocol/sdk` from item 013

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Create `wiki/entities/mcp-search-memories.md` documenting:
   - Tool input/output schema (this is now a stable contract; AI clients will rely on it)
   - The "substring V1, embeddings V1.5" path
   - The overfetch pattern (`limit * 4` from storage, then in-memory filter)
   - Cross-references to [[mcp-server]], [[storage]], [[capture-pipeline]]
2. Update `wiki/entities/mcp-server.md`: now serves two tools (`echo_ping` + `search_memories`)
3. Update `wiki/sources/v1-spec.md`: the L3-summoned-response (Pull mode) commitment is now realized for the AI-MCP-client pull path. Cross-reference this tool as the V1 implementation.
4. Add a Spec Authoring Lesson if the `Storage.query` extension was needed: "Storage filter design choices to think about when adding new query patterns"
5. Update manifest + index

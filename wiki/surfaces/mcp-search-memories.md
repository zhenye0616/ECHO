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

**Description (verbatim, what AI clients see — composed across items 022 + 025):**

> "Search the user's captured ECHO memories (Cursor + Claude Code + Codex conversations, git commits) by free-text query, source app, or time range. Returns the most recent matching events. Free-text query is matched as a case-insensitive literal substring against the event content; this is NOT a semantic / KNN search. Use exact tokens (file paths, SHAs, error codes) rather than paraphrased questions. Prefer `source_app` (`cursor` | `claude_code` | `codex` | `git`) for app-scoped queries; falls through to the FS-encoded `source_prefix` if you need a path-precise filter (e.g. a single Codex rollout JSONL). For result sets larger than `limit`, pass back the prior call's `next_cursor` verbatim — do not construct one client-side."

The substring-not-semantic clarification was added in item 022 after dogfooding showed AI clients sending paraphrased queries against the implementation's literal-match contract and getting empty results. Item 025 introduced the `source_app` enum and stripped the FS-prefix prose ("logical names like `claude_code` or `cc` will not match", "broaden to `fs:`") that was carrying load-bearing teaching work in the description string — two AI clients in one day (Codex 16:22 PDT and Claude Code 16:33 PDT on 2026-05-07) had guessed the literal `'claude_code'` as a prefix and gotten 0 results, only recovering by pattern-matching against a *prior* captured FS path.

**Input schema** (zod; all fields optional):

```ts
{
  query?:         string,                                              // case-insensitive substring match on content
  source_app?:    'cursor' | 'claude_code' | 'codex' | 'git',          // app-scoped enum (item 025)
  source_prefix?: string,                                              // path-precise filter; wins on conflict with source_app
  since?:         ISO8601,                                             // events with timestamp >= since
  until?:         ISO8601,                                             // events with timestamp <  until
  limit?:         number,                                              // default 10, clamped to [1, 50]
  cursor?:        string,                                              // opaque base64 from prior next_cursor (item 025)
}
```

**Output envelope:**

```ts
{
  matches: [
    { id, source, timestamp, content, bytes_elided?, metadata?,
      metadata_bytes_elided?, metadata_keys_elided?, metadata_keys_projected? },
    ...
  ],
  total_returned: number,
  limit_applied:  number,
  next_cursor:    string | null,    // always present; non-null when more rows available (item 025)
  query_echo: { query, source_app, source_prefix, since, until, limit, cursor },
  warnings: string[],               // always present (possibly empty) — V1.5.7 Gap 6
}
```

The `query_echo` field returns the inputs the tool actually used after defaulting and clamping — useful for clients that want to log or surface what was searched. `source_app` and `source_prefix` are both echoed when both are passed, so consumers can see exactly which one took precedence.

The per-match `bytes_elided` / `metadata_bytes_elided` / `metadata_keys_elided` / `metadata_keys_projected` fields are populated by the V1.5.6 wire-shape projector (`src/mcp/wire-shape/match.ts`) when content or specific metadata keys exceed the per-match cap (`PER_MATCH_CONTENT_CAP=2000` chars; per-key metadata cap on values like `tool_calls`). `tool_calls` is reshaped to its workflow trajectory (V1.5.6.1) instead of an opaque elision placeholder; small structured neighbours (`git_state`, `session_id`) pass verbatim. `tail_session` and `search_memories` go through the same projector — caps stay synchronized across both retrieval tools.

## `source_app` Enum (item 025)

`source_app` accepts one of four values; the handler maps to a literal `source_prefix` using `os.homedir()` at request time:

| `source_app` | maps to `source_prefix` |
|---|---|
| `cursor` | `fs:${homedir}/Library/Application Support/Cursor/` |
| `claude_code` | `fs:${homedir}/.claude/projects/` |
| `codex` | `fs:${homedir}/.codex/sessions/` |
| `git` | `git:` |

The `codex` mapping is the narrow `~/.codex/sessions/` because nothing under `~/.codex/` outside `sessions/` is in the [[capture-allowlist|capture allowlist]] (`src/capture/sources.ts:11` lists only `'~/.codex/sessions/'`). Cursor's broader directory prefix correctly LIKE-matches both `globalStorage/state.vscdb` and any `workspaceStorage/<hash>/state.vscdb` source string.

**Precedence rule:** when both `source_app` and `source_prefix` are passed, `source_prefix` wins (explicit-over-implicit; this is the escape hatch for path-precise queries the enum can't express). Both are echoed in `query_echo` so consumers can see exactly what was applied. `source_app` cannot be used with the `source` exact-match field (already mutually exclusive with `source_prefix` per the [[storage|storage contract]]).

**Out of scope for V1.5.3:** `source_apps?: array[]` for multi-source filtering. The [[storage|storage `QueryFilter`]] only takes one prefix today; widening it is a V1.6 follow-up.

## Cursor Pagination (item 025)

`MAX_LIMIT=50` stays. Result sets larger than 50 are reachable via opaque cursor:

- **Cursor shape.** Composite `{timestamp, id}`, base64-encoded JSON. Opaque to the consumer — pass the prior call's `next_cursor` back verbatim; never construct one client-side. Why composite: same-millisecond rows have non-deterministic order under `timestamp DESC` alone, and a naïve `oldest_minus_1ms` cursor would silently skip ties. Item 025 added the `id`-secondary tie-break in [[storage]] so the composite key is stable.
- **`next_cursor` is always present** in success responses (`string | null`). Null when no more rows; non-null base64 string when more exist. Not optional — consumers can rely on the field being present without conditional access.
- **Detection mechanism: path-aware `limit + 1` overfetch.** See "Filter-before-slice" below — the recency-only and substring-query paths overfetch differently to preserve item 022's invariant.
- **Malformed cursor.** Returns an MCP-style error result: `{ isError: true, content: [{ type: 'text', text: '...human-readable reason...' }] }` with NO `structuredContent`. Per MCP semantics, tool errors are signalled by `isError: true` on the result envelope, not by validation rejection of the JSON-RPC call (which still succeeds at the transport layer). Three concrete failure modes have explicit tests: not-base64 input, valid base64 but non-JSON, and valid JSON but missing `timestamp` or `id`.
- **`cursor` + `until` together.** Both bounds applied: `until` is the outer time bound; `cursor` is the inner page boundary that narrows further. `query_echo` records both.

## Defaults, Clamping, Validation

- **`limit`** defaults to `10`. Provided values are floored (non-integers like `2.7` become `2`), then clamped to `[1, 50]`. Asking for `limit: 1000` returns at most 50.
- **`since` / `until`** are validated by a structural ISO 8601 regex (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`). The check is structural, not full RFC; malformed timestamps are rejected by zod before the handler runs.
- **TZ-naive warning (V1.5.7 Gap 6).** The regex intentionally accepts strings without a TZ marker (`Z` / `±HH:MM` / `±HHMM` / `±HH`), but a naive `since` or `until` parses as local server time — silently expands or contracts the window by hours on a non-UTC machine. The handler emits a `warnings[]` advisory ("input.since or input.until lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity") rather than reject. Same warning fires from `get_recent_work_context`. Single string literal across both tools so a multi-tool trace can grep for it.
- **`query` / `source_prefix`** have no length cap and no normalization beyond `toLowerCase()` for `query` matching.

### fs-watcher exclusion (V1.5.7 Gap 3)

Storage rows where `metadata.surface === 'fs'` are raw fs-watcher meta-events (`{event_type:"change", path, mtime, size}` shape) — capture-implementation detail, not user-facing content. The handler's [[storage|`QueryFilter`]] always passes `exclude_metadata_surface: ['fs']`. Pre-V1.5.7, `search_memories(source_app='cursor')` could silently return hundreds of fs change events when the cursor extractor was stale, even though the AI client wanted conversation atoms. The exclusion mirrors the same discipline `tail_session` and `get_recent_work_context` already enforced. Conversation atoms riding the same `fs:/Users/.../Cursor/` source prefix carry richer per-extractor metadata (no `surface: 'fs'`), so they're unaffected.

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

### Filter-before-slice (item 022) and path-aware pagination (item 025)

Pre-022, the content-filter path sliced to `limit * 4` (capped at 200) **before** the substring filter ran. A literal match in the 201st-newest row was silently invisible. Item 022 reordered the steps: filter first, slice last. The fix sounds trivial but the wrong-version-of-it (pushing `limit: MAX_OVERFETCH` into `storage.query`) just relocates the bug into the storage layer — a substring living in row 201 is still dropped if storage caps at 200.

Item 025 added cursor pagination on top of this, and the natural temptation was to unify the two paths under a single `filter.limit = limitApplied + 1` storage call. That would have re-introduced the 022 bug. The correct path-aware wiring:

- **Recency-only path (`query` undefined)** → push `filter.limit = limitApplied + 1` into `storage.query`. Storage returns rows in DESC order; drop the `+1` if present, emit `next_cursor` from the last kept row's `{timestamp, id}` (composite key, base64-encoded). Safe because no post-storage filter can drop rows.
- **Substring-query path (`query` defined)** → do NOT pass any `limit` to storage (preserves the 022 invariant). Substring filter runs over the full per-source / time-range slice, then `slice(0, limitApplied + 1)`; same drop-and-emit logic for `next_cursor`. Pays a memory cost bounded by the existing filters; rejects unbounded full-store scans because `since`/`until`/`source_prefix`/`source_app` are still applied at the storage seam.

A test at `tests/mcp/tools/search-memories.test.ts:694-724` instruments the storage mock to assert `filter.limit === undefined` on the substring path, guarding the invariant against future "simplifications." A `// Item 025:` comment at the bifurcation site in `src/mcp/tools/search-memories.ts:181-191` documents the asymmetry so the next reader doesn't collapse the paths.

The proper long-term fix — server-side `WHERE content LIKE ?` in `QueryFilter` — remains deferred to V1.5.3+ once a real content-filter contract is added. The current pattern works because V1 datasets are small (tens of thousands of events on one Mac).

## Substring V1, Embeddings V1.5

V1 retrieval is `String.prototype.includes` against the lowercased content. This is a deliberate floor:

- **It works because users are stable in their phrasing.** When the founder asks Cursor "why did we choose TS over Rust", the previous Claude Code session that decided it almost certainly contains the words "TS" and "Rust". Substring catches the literal-vocabulary case that dominates real usage.
- **It's a clean upgrade path.** When dogfooding shows substring missing semantically-related results, embeddings replace step 5 — the same MCP tool surface, the same input/output, the same client integrations. Nothing AI clients depend on changes.
- **It avoids a premature dependency.** Embeddings mean a model, model-loading code, an embedding column populated on append, and a vector index. Each of those is a V1.5 decision we don't need to make to ship the killer demo.

## Known V1 Limitation

On the content-filter path, `limit` is intentionally not passed to `storage.query` (see "Filter-before-slice" above). Storage may scan and return the entire matching time-range / source-prefix set before the tool slices off the top after substring filtering. This is fine at V1 dataset sizes (tens of thousands of events on one Mac).

The clean long-term fix — server-side `content_contains` in `QueryFilter` so the substring filter pushes into the SQL `WHERE` clause — is deferred to V1.5.3 (queued in `backlog/_followups.md`). Item 021 added `QueryFilter.order: 'asc' | 'desc'` to [[storage]] (default DESC); item 022 added `exclude_metadata_surface` for the trace tool's noise-filter need. The next storage-side feature `search_memories` actually wants is content-filter pushdown.

## What it does NOT do

- **No relevance scoring.** Results are ordered by timestamp DESC then id DESC only (item 025 composite key for cursor stability). There is no recency-decay, no TF-IDF, no rerank.
- **No `source_apps` array** (V1.6 follow-up). `source_app` is single-valued; cross-app filtering requires widening [[storage|`QueryFilter`]] which is its own item.
- **No raise of `MAX_LIMIT=50`.** Cursor pagination (item 025) is the V1.5 answer for "I need more than 50"; raising the cap is V1.6 work.
- **No embeddings, no FTS5, no fuzzy match.** Exact case-insensitive substring on `content`.
- **No write surface.** `search_memories` is read-only against [[storage]] — `readOnlyHint: true` advertises this to MCP clients (item 025). Forget / redact / delete are separate (V1.5+) tools.
- **No auth.** Loopback-only is the V1 boundary; the [[mcp-server]] handles binding.
- **No mutation of metadata.** What [[capture-pipeline|capture]] wrote is exactly what's returned.

## Related

- [[mcp-server]] — the host this tool is registered on
- [[storage]] — the substrate it queries
- [[capture-pipeline]] — produces the events this tool retrieves
- [[clipboard-and-launch]] — the Pull side of which this is the V1 realization

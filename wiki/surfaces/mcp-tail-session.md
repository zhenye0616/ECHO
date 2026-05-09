---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - tail_session
  - MCP tail_session tool
  - Tail Session
---

# MCP `tail_session` Tool

## Definition

`tail_session` is the cheap exact-fetch primitive on the [[mcp-server|local MCP server]]. It returns the N most-recent captured atoms for a single named source (or auto-resolves the most-recently-active session for an app, then returns its tail). Lives at `src/mcp/tools/tail-session.ts`. Shipped 2026-05-08 as item 026 (V1.5.4).

## Why It Exists

Three retrieval shapes were live by V1.5.3:
- [[mcp-search-memories|`search_memories`]] — paraphrase / substring search across all sources
- [[mcp-recent-work-context|`get_recent_work_context`]] — clustered context joined by shared artifact identity
- [[mcp-server|`echo_ping`]] — connectivity check

None of them fits "fetch the last 3 turns from a specific Codex session X." On 2026-05-08 the founder (with strategist Claude in the loop) bypassed ECHO twice in one afternoon for exactly that lookup — once at 13:27 PDT, once at 14:00 PDT — because `search_memories` returns paraphrase and `get_recent_work_context` returns clusters, and neither shape lets you say "give me Codex's session X tail" in one MCP call. The bypass path was direct rollout-JSONL `grep`, which works but defeats the purpose of having ECHO. `tail_session` closes that gap.

## Public Contract

**Tool name:** `tail_session`

**Description (verbatim):**

> "Tail the N most-recent captured atoms for a single named source — the cheap counterpart to search_memories (substring) and get_recent_work_context (clustered). Pass `source` for an exact path-precise tail, or `source_app` (one of cursor/claude_code/codex/git) to auto-resolve the most-recently-active session for that app. Default count=5, max 20; typical response < 10k chars. Use this for 'where did <app> leave off' lookups instead of substring search."

**Input schema** (zod; `source` and `source_app` are mutually exclusive — exactly one required):

```ts
{
  source?:     string,                                     // exact source string (path-precise; matches QueryFilter.source)
  source_app?: 'cursor' | 'claude_code' | 'codex' | 'git', // auto-resolve newest session for the app
  count?:      number,                                     // default 5; schema enforces >=1; handler clamps to MAX_COUNT=20
  cursor?:     string,                                     // opaque base64 from prior next_cursor (item 026, shared with search_memories)
}
```

The XOR refinement on `source` / `source_app` is enforced inside the handler (the SDK's per-field input schema can't express cross-field invariants); passing both or neither returns an `isError: true` envelope.

**Output envelope:**

```ts
{
  turns: [
    { id, source, timestamp, content, bytes_elided?, metadata?,
      metadata_bytes_elided?, metadata_keys_elided?, metadata_keys_projected? },
    ...
  ],
  next_cursor:     string | null,    // composite {timestamp, id} cursor; shared shape with search_memories
  source_resolved: string | null,    // when source_app was passed: the actual source string the tail used
  warnings:        string[],         // always present (possibly empty)
}
```

## Two Modes

### Exact-source mode (`source` set)

Bypasses session resolution; runs the tail directly against `QueryFilter.source = <exact>`. Use when the AI client already knows the source string — e.g., it just got it from a `get_recent_work_context` cluster atom and wants to hydrate that session's tail.

### Auto-resolve mode (`source_app` set)

The handler does a two-step query:

1. Resolve the newest session under the app's prefix (excluding fs-watcher meta-events — see "fs-watcher exclusion" below): `storage.query({ source_prefix, exclude_metadata_surface: ['fs'], limit: 1 })`. The single returned row's `source` is the most-recently-active session.
2. Tail that resolved source for `count` atoms.

Echoed in `source_resolved` so the AI client can re-call with `source` directly on subsequent calls (saves the resolve step). When no eligible session exists for the app, `source_resolved` is `null`, `turns` is empty, and `warnings` carries `"no captured sessions found for source_app=<app>"`.

The `source_app` → FS-prefix mapping is shared with `search_memories` via `src/mcp/util/source-app.ts`:

| `source_app` | maps to `source_prefix` |
|---|---|
| `cursor` | `fs:${homedir}/Library/Application Support/Cursor/` |
| `claude_code` | `fs:${homedir}/.claude/projects/` |
| `codex` | `fs:${homedir}/.codex/sessions/` |
| `git` | `git:` |

## fs-watcher exclusion (Bug B, V1.5.4)

Both source resolution and the per-source tail must exclude rows where `metadata.surface === 'fs'`. Pre-fix, `tail_session(source_app='codex')` resolved to the rollout file (correctly) but then returned 5 fs-watcher change events (`{event_type:"change", path, mtime, size}`) instead of the codex extractor's turn atoms. The exclusion mirrors `get_recent_work_context.ts` and (post-V1.5.7) `search_memories.ts`. Conversation atoms riding the same `fs:/Users/.../.codex/sessions/` source prefix carry richer per-extractor metadata (no `surface: 'fs'`), so they're unaffected.

## Wire-Shape Projection (V1.5.6)

`tail_session` and `search_memories` go through the same projector at `src/mcp/wire-shape/match.ts`. Per-match content is capped at `PER_MATCH_CONTENT_CAP=2000` chars (head + elision marker + tail); per-key metadata cap applies to values like `tool_calls`. `tool_calls` is reshaped to its workflow trajectory (V1.5.6.1) instead of an opaque elision placeholder. Small structured neighbours (`git_state`, `session_id`) pass verbatim. Caps stay synchronized across both retrieval tools.

## Pagination

Composite `{timestamp, id}` opaque base64 cursor — same shape `search_memories` uses, so a `next_cursor` from one tool is interchangeable with the other if a consumer wires them together. The handler overfetches `count + 1` from storage; if the extra row is present, the kept `count` rows pack into the response and `next_cursor` is the last kept row's composite key. Storage already orders by `(timestamp DESC, id DESC)` per the V1.5.3 storage contract — no in-handler sort needed.

Malformed cursor returns the same MCP-style error envelope as `search_memories` (`isError: true`, no `structuredContent`).

## Cost Contract

- **Default `count=5`, max 20.** Asking for `count: 100` clamps silently to 20. Asking for `count: 0` is rejected at the schema layer (`min 1`).
- **Typical response < 10 kB** when `count ≤ 5` on real claude_code/codex turns. The wire-shape projector keeps individual atoms bounded; the response stays well under the 25 kB consumer budget.

## What `tail_session` Does NOT Do

- **No clustering.** That's `get_recent_work_context`.
- **No substring filter.** That's `search_memories`.
- **No multi-source tail.** Pass one source or one source_app.
- **No state.** Stateless transport (V1.5.4 / item 027) — every call is a self-contained HTTP request.

## Related

- [[mcp-server]] — the host transport
- [[mcp-search-memories]] — the substring counterpart
- [[mcp-recent-work-context]] — the clustered counterpart
- [[storage]] — the substrate this tool tails

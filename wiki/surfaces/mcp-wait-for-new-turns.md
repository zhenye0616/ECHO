---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - wait_for_new_turns
  - MCP wait_for_new_turns tool
  - Group session subscription
  - Stateless long-poll
---

# MCP `wait_for_new_turns` Tool

## Definition

`wait_for_new_turns` is the **group-session subscription** primitive in the V1.6 MCP toolkit. It's a stateless long-poll: pass a list of sources to watch plus a `since` ISO timestamp, and the server returns either (a) new turns captured after `since` from those sources, or (b) an empty response when the timeout elapses with no new activity. Lives at `src/mcp/tools/wait-for-new-turns.ts`. Shipped 2026-05-10 as item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] (V1.6) — implements **Goal A** of the [[group-session]] pattern (synchronized human-driven group).

## Why It Exists

Cross-tool group sessions (e.g., the strategist coordinating Cursor's Claude + Codex on a spec review) need an AI client to wait for another AI client's response without polling in a tight loop. Three patterns failed in dogfooding:

1. **No subscription primitive.** Cursor or Codex had no way to "wait for the strategist's next turn" — they fell back to repeated [[mcp-tail-session|`tail_session`]] polls, which works but burns budget and adds latency on top of the human's typing time.
2. **No stateless subscription primitive.** A stateful MCP subscription (per-session SSE stream) would have required the V1.5 stateful transport ECHO already dropped (item 027). Group session needs a primitive that fits the stateless transport.
3. **Goal C (autonomous group, e.g., two agents talking with no human) is deferred to V2+.** Goal A is the synchronized-human-driven group — turns are produced when humans paste / submit in their respective AI clients; `wait_for_new_turns` blocks until any turn lands.

## Public Contract

**Tool name:** `wait_for_new_turns`

**Input schema** (zod):

```ts
{
  sources:  string[],       // REQUIRED. Non-empty. Exact source strings to watch (path-precise; matches QueryFilter.source)
  since:    ISO8601,        // REQUIRED. Cursor — only turns captured AFTER this timestamp are returned
  timeout?: number,         // optional, default 30 seconds. Max 120 seconds.
}
```

`sources` is path-precise (same shape as `tail_session`'s `source` param) — typically obtained from a prior `tail_session.source_resolved` or a journal entry. There is no `source_app` auto-resolve variant, because the group-session use case knows exactly which JSONLs/sessions it's watching.

**Output envelope** (`schema_version: 1`):

```ts
{
  schema_version: 1,
  tool: 'wait_for_new_turns',
  turns: [
    { id, source, timestamp, content, truncations: string[], ... }, ...
  ],
  next_since?: ISO8601,    // pass back as 'since' on next call for forward-only watching
  warnings:    string[],
}
```

When the timeout elapses with no new turns, `turns: []` and `next_since` echoes the input `since` (so the consumer can immediately re-call without computing the next cursor).

## How It Works

The handler runs a short polling loop server-side at ~250 ms cadence:
1. Query storage for atoms from `sources[]` with `timestamp > since`.
2. If any rows, return them immediately (wire-shape projected through `projectMatch` — same caps as `tail_session`).
3. If no rows AND elapsed < `timeout`, sleep 250 ms and re-query.
4. If elapsed ≥ `timeout`, return `turns: []` + echoed `next_since`.

This is **stateless from the MCP transport's perspective** — no `Mcp-Session-Id`, no subscription registry, no fan-out. The server-side polling is hidden behind one MCP request/response cycle. Per-client timeout is independent.

## Polling Fallback (documented in tool description)

If a consumer can't long-poll (timeout < daemon poll cadence, or transport-level limits), the fallback is the V1.5 pattern: repeated [[mcp-tail-session|`tail_session`]] calls on the watched source, using the last-seen `timestamp` to detect new turns. The fallback works; `wait_for_new_turns` just absorbs the polling loop server-side so the consumer's MCP-call count drops from N to 1 per wait window.

## Wire-Shape Projection

Same projector as [[mcp-tail-session|`tail_session`]] and [[mcp-get-atoms|`get_atoms`]] (`src/mcp/wire-shape/match.ts`). Per-match content cap, per-key metadata cap, `truncations[]` trust signal on every returned turn. When a Codex long-turn elision fires (`truncations: ["content"]`), recovery goes via `get_atom(id)` (item [[2026-05-10-033-full-atom-recovery|033]], when shipped) — same recovery shape as `tail_session` + `search_memories` + `get_atoms`.

## Cost Contract

- **Stateless on the wire, polling under the hood.** One MCP request blocks for up to `timeout` seconds.
- **Default timeout 30s; max 120s.** Higher timeouts mean fewer round-trips but block the calling client's MCP slot longer. 30s matches typical human-typing-pause cadence in group sessions.
- **`turns: []` is a legitimate empty response** when the timeout elapses with no activity. Consumers should NOT treat it as an error.

## What `wait_for_new_turns` Does NOT Do

- **No autonomous-group orchestration** — that's Goal C, deferred to V2+. V1.6 only ships Goal A (synchronized human-driven).
- **No source auto-resolve** — pass exact source strings. Use `tail_session(source_app=...)` first if you need to discover them.
- **No multi-tenant fan-out** — each MCP request is its own polling loop. Two clients waiting for the same source means two server-side polls.
- **No backpressure on the watched sources** — the consumer is responsible for advancing `since` past returned turns; calling with a stale `since` will return the same turns again (not deduplicated server-side).
- **No state persistence.** Same stateless transport guarantee as the rest of the V1.6 toolkit (item 027).

## Related

- [[mcp-server]] — the host transport
- [[group-session]] — the pattern this tool implements (Goal A)
- [[mcp-tail-session]] — the polling-fallback primitive
- [[mcp-find-clusters]] + [[mcp-get-atoms]] — sibling V1.6 atomic toolkit
- [[cross-tool-spec-review]] — the canonical use case for synchronized group sessions

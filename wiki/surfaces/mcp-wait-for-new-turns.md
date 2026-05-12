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

1. **No subscription primitive.** Cursor or Codex had no way to "wait for the strategist's next turn" — they fell back to repeated [[mcp-search-memories|`search_memories`]] reverse-chrono polls (or pre-038 `tail_session` polls), which works but burns budget and adds latency on top of the human's typing time.
2. **No stateless subscription primitive.** A stateful MCP subscription (per-session SSE stream) would have required the V1.5 stateful transport ECHO already dropped (item 027). Group session needs a primitive that fits the stateless transport.
3. **Goal C (autonomous group, e.g., two agents talking with no human) is deferred to V2+.** Goal A is the synchronized-human-driven group — turns are produced when humans paste / submit in their respective AI clients; `wait_for_new_turns` blocks until any turn lands.

## Public Contract

**Tool name:** `wait_for_new_turns`

**Input schema** (zod):

```ts
{
  sources:    string[],     // REQUIRED. Non-empty, ≤ 8. Mixed entry types accepted:
                            //   - literal source path (fs:/Users/.../session.jsonl) → EXACT match
                            //   - source-app name (cursor | claude_code | codex | git) → PREFIX MATCH on canonical app prefix
                            //     (matches ALL sessions of that app — explicitly DIFFERENT from echo_resolve_mru which resolves to MRU exact source)
  since:      ISO8601,      // REQUIRED. Cursor — only turns captured STRICTLY AFTER this timestamp are returned (> since, not >=)
  repo_path?: string,       // item 037 — when set, each per-source poll AND-filters by metadata.repo_root === normalize(repo_path)
  timeout?:   number,       // optional, default 30 seconds. Max 60 seconds (item 038 lowered ceiling from 120s; harness-timeout-pattern mitigation).
}
```

`sources` typically comes from a prior [[mcp-echo-resolve-mru|`echo_resolve_mru`]] call: pass `desc.source` from the resolved descriptor. `wait_for_new_turns` ignores `filter.metadata_match` — wait is for NEW turns, and legacy Cursor atoms (which need `metadata_match: {composer_id}` because they predate the `metadata.repo_root` capture write) are out of scope (already captured, not new).

**Output envelope** (`schema_version: 1`) — **item 038 / AC4 IDs-only contract:**

```ts
{
  schema_version: 1,
  tool: 'wait_for_new_turns',
  turn_ids: string[],       // NEW (item 038) — atom IDs only; was `turns: ProjectedMatch[]` pre-038
  next_since: ISO8601,      // pass back as `since` on next call for forward-only watching
  timed_out: boolean,
  warnings:   string[],
}
```

When the timeout elapses with no new turns, `turn_ids: []`, `timed_out: true`, and `next_since` echoes the server's current timestamp. **No parallel-vocabulary deprecation window** — the bodies-bundled `turns[]` shape was removed in the same merge that shipped IDs-only (clean break; migration is bounded to 3 in-loop MCP clients which demonstrated they update fluidly in-session).

### Canonical composition

Callers compose IDs to bodies via one extra MCP call per wake:

```ts
const w = await wait_for_new_turns({ sources: [...], since: last });
if (!w.timed_out) {
  const atoms = await get_atoms({ atom_ids: w.turn_ids });        // cost-bounded summaries
  // OR for verbatim of one atom: await get_atom({ id: w.turn_ids[0] });
}
last = w.next_since;
```

Envelope shrinks dramatically vs pre-038 (no body projection in the wait response); cost is one extra MCP call per wake, which is well under the per-wake latency budget for human-driven group sessions.

## How It Works

The handler runs a short polling loop server-side at ~250 ms cadence:
1. Query storage for atoms from `sources[]` with `timestamp > since`.
2. If any rows, return them immediately (wire-shape projected through `projectMatch` — same caps as `tail_session`).
3. If no rows AND elapsed < `timeout`, sleep 250 ms and re-query.
4. If elapsed ≥ `timeout`, return `turns: []` + echoed `next_since`.

This is **stateless from the MCP transport's perspective** — no `Mcp-Session-Id`, no subscription registry, no fan-out. The server-side polling is hidden behind one MCP request/response cycle. Per-client timeout is independent.

## Polling Fallback

If a consumer can't long-poll (timeout < daemon poll cadence, or MCP-client transport-level limits — see "harness timeout" note below), the fallback is repeated [[mcp-search-memories|`search_memories`]] calls on the watched source, using the last-seen `timestamp` to detect new turns: `search_memories({source: <exact>, since: <last_ts>, limit: N})` in reverse-chrono. The fallback works; `wait_for_new_turns` just absorbs the polling loop server-side so the consumer's MCP-call count drops from N to 1 per wait window.

**Harness-timeout pattern (documented in journal):** MCP clients occasionally abort the long-poll request at the transport layer before the daemon's 60s graceful return. Item 038 lowered the max timeout from 120s to 60s to reduce the harness-timeout window. When this fires, fall back to `search_memories` polling or `echo_resolve_mru` + `search_memories` if the source isn't already known.

## Wire-Shape Projection

Post-038, `wait_for_new_turns` returns IDs only — no wire-shape projection happens in this tool. Bodies live in [[mcp-get-atoms|`get_atoms`]] (cost-bounded summaries via the shared `projectMatch`) or [[mcp-get-atom|`get_atom`]] (verbatim escape hatch). The `truncations: string[]` trust signal appears on those body-fetch responses, not on this one.

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
- [[mcp-echo-resolve-mru]] — the resolver primitive that produces `sources[]` + `repo_path` arguments
- [[mcp-search-memories]] — the polling-fallback primitive (post-038, replaces `tail_session`)
- [[mcp-get-atoms]] + [[mcp-get-atom]] — body-fetch composers (post-038, this tool returns IDs only)
- [[mcp-find-clusters]] — sibling V1.6 atomic toolkit
- [[cross-tool-spec-review]] — the canonical use case for synchronized group sessions
- [[atomic-primitives-compose]] — the principle behind the IDs-only contract

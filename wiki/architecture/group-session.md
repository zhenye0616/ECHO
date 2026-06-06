---
status: shipped
topic: System Architecture
subtopic: Group Session
aliases:
  - Group session
  - Cross-tool group session
  - Synchronized human-driven group
  - Goal A pattern
---

# Group Session

## Definition

A **group session** is a cross-tool coordination pattern where two or more AI clients work the same problem through ECHO's shared substrate — each watching the others' turns via [[mcp-wait-for-new-turns|`wait_for_new_turns`]] on their respective capture sources. The canonical V1.6 use case is the [[cross-tool-spec-review]] cycle: the strategist (Claude Code) writes a spec, Cursor's Claude reviews it, Codex reviews it independently, and the strategist synthesizes — all coordinated by reading each other's turns through ECHO instead of through copy-paste. Shipped as part of item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] (V1.6).

## Three Goals (only Goal A in V1.6)

The 030 brainstorm identified three coordination patterns at different autonomy levels:

| Goal | Pattern | V1.6? |
|---|---|---|
| **A — Synchronized human-driven** | Humans paste/submit in each AI client; ECHO captures the turns; participants `wait_for_new_turns` to see each other's responses | ✅ shipped |
| B — Asynchronous human-driven | Same as A, but participants can leave and return without losing context (uses ECHO's persistent storage as the shared transcript) | ✅ implicit via A + storage |
| **C — Autonomous group** | Two or more AI clients converse with no human in the loop, each driving its own turn submission | ❌ deferred to V2+ |

Goal C is deferred because (a) it requires write-back to AI clients (none of the V1 targets — Cursor, Claude Code, Codex — expose a "post a turn programmatically" API in their MCP surface today), and (b) the autonomy risks (drift, loops, runaway cost) need governance work that's out of V1 scope.

## Primitives Used

Goal A uses three existing/added MCP tools end-to-end, no new transport:

1. **[[mcp-echo-resolve-mru|`echo_resolve_mru`]]** — discover the other participant's session source (resolves via `source_app` + optional `repo_path`); returns a `search_memories`-ready descriptor; `desc.source` is the watched-source string. Replaces V1.5's `tail_session` for source-discovery (item 038).
2. **[[mcp-search-memories|`search_memories`]]** — using the descriptor: `search_memories({source: desc.source, ...desc.filter, limit: N})` grabs the latest turn(s) in reverse-chrono. Replaces V1.5's `tail_session` for the cheap recency-only fetch.
3. **[[mcp-wait-for-new-turns|`wait_for_new_turns`]]** — block on the discovered source(s) until a new turn lands. Stateless long-poll, max 60s timeout (item 038 lowered from 120s); post-038 IDs-only contract (callers compose `get_atoms`/`get_atom` for bodies). Falls back to repeated `search_memories` reverse-chrono polls if long-poll isn't viable.
4. **[[mcp-find-clusters|`find_clusters`]] + [[mcp-get-atoms|`get_atoms`]]** — when joining a group session mid-flight, hydrate the prior turns via the discovery → body-fetch chain.

No new state, no new transport. The group-session pattern is a *protocol over existing primitives*, not a new MCP capability.

## First-Call Reliability Gate (item 032)

Group-session continuation calls (subsequent `wait_for_new_turns` rounds against a known session) work cleanly because the consumer already has the watched-source string from the prior `echo_resolve_mru` resolve. The friction was on the **first call** — when a participant tries to join a group by asking ECHO "where did the strategist leave off?" via a no-args `find_clusters()`, the strategist's own recent activity in the calling session would historically outrank the prior multi-source thread, returning calling-session noise as `clusters[0]`.

Item [[2026-05-10-032-m2-first-call-reliability|032]] closed this gate:

- **Auto-expand triggers** — no-args `find_clusters` auto-expands from 4h → 24h lookback when the 4h pass returns either zero clusters or only single-source-recent clusters (warning prefix: `[AUTO_EXPAND]` or `[AUTO_EXPAND] single-source-recent`).
- **Strict-partition demotion** — single-source-recent clusters sort STRICTLY BELOW all non-single-source-recent clusters in rank, regardless of all other signals. After 032, `clusters[0]` is prior multi-source work, not the calling session's noise — a **structural guarantee**, not a heuristic.
- **`prefer='newest_first'` on `get_atoms`** — when the hydration call exceeds the 25 kB envelope, the newest atom of the picked cluster lands in the response (not dropped to the prefix-drop loop), so resume calls show the most-recent state of the prior work.

The first-call gate was the structural blocker for the "where did the strategist leave off?" join pattern; it's now closed. Continuation calls within an active group session were always reliable and are unaffected.

## Operational Pattern (canonical Goal A)

```ts
// Participant joins a group session
// (a) discover the other participants' MRU sessions
const myMru   = await echo_resolve_mru({ source_app: 'claude_code' });  // strategist's MRU
const peerMru = await echo_resolve_mru({ source_app: 'codex' });        // codex reviewer's MRU

// grab the peer's latest turn(s) using the resolved descriptor
const peerLatest = await search_memories({ source: peerMru.source,
                                           ...peerMru.filter, limit: 1 });

// (b) hydrate the prior cross-tool context
const c = await find_clusters();                                       // no-args auto-expand handles gaps
const a = await get_atoms({ atom_ids: c.clusters[0].atom_ids,
                            prefer: 'newest_first' });

// (c) submit own turn (paste into AI client UI; ECHO captures via extractor)

// (d) wait for next participant's turn
const reply = await wait_for_new_turns({
  sources: [myMru.source, peerMru.source],
  since:   peerLatest[0].timestamp,
  timeout: 30,
});

// (e) loop on (c)–(d) until session ends
```

The protocol stays stateless on the wire: ECHO's storage is the canonical group transcript. Any participant can re-derive full state from a fresh resume call.

## Cross-Tool Spec Review — The Canonical Use Case

The [[cross-tool-spec-review]] pattern (promoted to operating-model after six independent confirmation cycles, commit `1d77ff1`) is the production driver for Goal A:

1. Strategist writes a spec (Claude Code).
2. Cursor's Claude reviews it (`/review`).
3. Codex reviews it independently.
4. Strategist reads both via `wait_for_new_turns` / `tail_session`, synthesizes, applies patches.
5. Loop until both reviewers converge on "proceed."

Across items 030 + 032 + 033 (today's spec work), this pattern produced 8 review cycles, all with differentiated findings per reviewer per cycle — no two reviewers caught the same class of issue twice in a row. The wiki page documents the findings-class taxonomy, the strategist self-review checklist (4 gates pre-commit + post-patch re-grep proposed by 033 R2), and the verdict-convergence signal.

## Sibling Well-Known Surface: `echo:coord`

The [[coord-layer|coordination layer]] (item 057a substrate, 2026-05-16) introduced a sibling family of well-known surfaces on the same shared ledger: `coord:*` events emitted by the daemon-side coord substrate (`coord:codex`, `coord:codex-ops`, `coord:claude`, `coord:cursor`, ...) under a synthetic `metadata.session_id = "echo:coord"`. These events are NOT group-session turns — they bypass normalization, embedding, and clustering, and are default-excluded from [[mcp-search-memories|`search_memories()`]] — but they ride the same [[mcp-wait-for-new-turns|`wait_for_new_turns`]] subscription primitive when the caller opts in via `source_prefix="coord:"` (the AC4 widening of `wait_for_new_turns`). Group-session subscribers and coord-layer subscribers therefore share one mailbox contract: the durable atom log is the primary surface; long-poll is the latency optimization. See [[coord-substrate-and-observability|coord substrate page]] for the substrate's full semantics and the role-typed deadline tracker that consumes these events.

## What Group Sessions Do NOT Do

- **No autonomous turn submission.** Humans (or extractors capturing their AI clients) produce turns. Goal C is V2+.
- **No participant directory.** ECHO doesn't know who's in a session — participants self-identify by watching the sources they care about.
- **No turn ordering guarantees beyond capture timestamp.** If two participants submit nearly-simultaneously, both turns land but timestamp ordering is at storage granularity.
- **No turn deduplication across sources.** Each AI client's turn is captured by its own extractor; if a human pastes the same content into two clients, it lands twice.
- **No back-pressure to slow participants.** A participant blocked on `wait_for_new_turns` just blocks; other participants are unaffected.

## Related

- [[mcp-wait-for-new-turns]] — the subscription primitive
- [[mcp-echo-resolve-mru]] — session discovery (post-038, replaces `tail_session`)
- [[mcp-find-clusters]] + [[mcp-get-atoms]] — mid-session hydration
- [[cross-tool-spec-review]] — the canonical use case (operating-model)
- [[storage]] — the shared transcript substrate
- [[mcp-server]] — host transport
- [[coord-layer]] — sibling well-known surface on the same ledger (`coord:*` / `echo:coord`)

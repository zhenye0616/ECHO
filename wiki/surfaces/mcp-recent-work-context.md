---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - get_recent_work_context
  - MCP get_recent_work_context tool
  - Recent Work Context
---

# MCP `get_recent_work_context` Tool

## Definition

`get_recent_work_context` is the MCP tool through which AI clients retrieve **clustered** ECHO context — coherent threads of work joined by shared artifact identity within a recent time window. It lives at `src/mcp/tools/recent-work-context.ts`, is registered against the [[mcp-server|local MCP server]] alongside [[mcp-search-memories|`search_memories`]] and `echo_ping`, and is the V1.5 magic primitive: when Cursor or Claude Code asks an open-ended question about recent work, this is the call that returns evidence already grouped into work threads.

## Public Contract (Stable)

The tool's name, description, input schema, and response shape are now a contract that AI clients depend on. Changes are breaking.

**Tool name:** `get_recent_work_context`

**Description (verbatim, what AI clients see):**

> "Retrieve clusters of related events from the user's captured ECHO memories — joined by shared artifacts (files, repos, conversations) within a recent time window. Use when the user asks open-ended questions about what they were doing, where they left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the current conversation. Returns one cluster per coherent work thread; the AI client decides which to attend to."

**Input schema** (zod; all fields optional):

```ts
{
  since?:         ISO8601,                                  // default: now − 4h
  until?:         ISO8601,                                  // default: now
  artifact_hint?: { provider: string, type: string, id: string },
  limit?:         number,                                   // max atoms in response (default 100; clamped [1, 500])
}
```

**Output envelope** (`schema_version: 1`):

```ts
{
  schema_version: 1,
  tool: 'get_recent_work_context',
  query: { since, until, artifact_hint: ArtifactHint | null },
  clusters: [
    {
      cluster_id:        'ctx_<8-hex>',
      rank:              1,
      rank_reason:       string[],         // 'recent_activity' | 'matches_artifact_hint' | 'has_open_loop' | 'dense' | 'cross_tool'
      label?:            string,           // heuristic only; omitted when not useful
      anchor_artifacts:  ArtifactRef[],    // top-3 by occurrence
      atom_ids:          EventId[],
      edges: [
        {
          from:          EventId,
          to:            EventId,
          kind:          'shared_artifact',  // future: 'temporal_near' | 'same_conversation' | 'state_transition' | 'same_actor' | 'semantic_similarity'
          artifact_ids:  ArtifactKey[],
          confidence:    'high' | 'medium' | 'low',
        }, ...
      ],
      open_loop_hints: [
        {
          atom_id:    EventId,
          kind:       'ends_with_question' | 'unresolved_assistant_q' | 'contains_todo' | 'explicit_followup',
          text:       string,
          confidence: 'high' | 'medium' | 'low',
        }, ...
      ],
      source_breakdown: { [app: string]: number },     // e.g., { claude_code: 2, cursor: 1, git: 1 }
      time_range:       { from: ISO8601, to: ISO8601 },
    },
    ...
  ],
  atoms: { [atom_id: EventId]: NormalizedContextEvent },  // referenced atoms returned inline
  truncation: {
    atoms_returned:        number,
    atoms_total_in_window: number,
    clusters_returned:     number,
    clusters_total:        number,
    truncated:             boolean,
  },
  warnings: string[],
}
```

See [[normalized-context-event]] for the atom shape. See [[work-trace]] for the algorithm and the cluster fields.

## Why This Shape

Every choice was settled during the V1.5 brainstorm + a Codex CLI redline pass. The non-obvious ones:

- **Multiple `clusters[]` (not a single `cluster`).** Users context-switch; collapsing to one cluster is silent loss.
- **Atoms returned inline as a top-level `atoms` map.** No second MCP roundtrip; clusters reference atoms by id; deduplicates if a future relaxation lets atoms appear in multiple clusters.
- **Cluster IDs are deterministic-ephemeral.** `cluster_id = "ctx_" + sha256_8(schema_version + sorted(atom_ids))`. Same atoms → same id. No traces table in V1.5.
- **Edges are explicit and structured** with a documented future-list (`temporal_near | same_conversation | state_transition | same_actor | semantic_similarity`). V1.5 ships only `shared_artifact`; consumers must tolerate unknown `edge.kind` values gracefully.
- **Open-loop hints enriched at the trace layer**, not stored on atoms. Atom-side hints (`open_loop_hints?: string[]` on `NormalizedContextEvent`) are cheap regex hits; the trace layer turns them into `{kind, text, confidence}` for clusters. Resolution stays V2.
- **`rank` + `rank_reason`, no `score`.** A numeric score without a calibrated formula misleads consumers. Default sort: `artifact_hint_match → has_open_loop → recent_activity → cluster_size → newer-median-age`.
- **`label?` is optional, heuristic-only.** No LLM call. AI client can synthesize naming if the heuristic is bad.
- **`warnings[]` at response level only.** Cluster-level warnings deferred until a use case surfaces — adding later is non-breaking.
- **`schema_version: 1` at response level.** Independent from atom-level `schema_version`. Bump on breaking change.

The full design conversation lives in `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md`.

## How AI Clients Should Call It

The tool description names the calling rule explicitly: open-ended questions about recent work, "where did I leave off," or "bring prior context into the current conversation." Three calling patterns:

1. **No args.** Default 4h window, all clusters. Returns a snapshot of recent work.
2. **`artifact_hint` only.** Anchor at a specific file/repo/conversation; returns clusters that touch it.
3. **`since` / `until`.** Custom time window. The trace layer's `recent_activity` rank-reason fires for any atom within 1 h of `until`.

Push-mode (ECHO surfacing context proactively) is **not** part of V1 — that's Layer 2, deferred to V2. The AI client decides when to call.

## Implementation

```ts
// src/mcp/tools/recent-work-context.ts
async function getRecentWorkContext(storage, params, now = new Date()) {
  const limit = clampLimit(params.limit);                     // [1, 500]
  const until = params.until ?? now.toISOString();
  const since = params.since ?? new Date(Date.parse(until) − 4h).toISOString();

  const events = await storage.query({ since, until, limit: limit * 10 });   // overfetch ×10
  const query = { since, until, limit, window_hours: 4, artifact_hint? };
  return buildRecentWorkContext(events, query, normalizeEvent);
}
```

The wrapper resolves the time-window defaults from `Date.now()` *at the boundary* — the [[work-trace|trace module]] itself never reads the clock, which keeps it pure and easy to test. Storage is overfetched by 10× so cluster diversity isn't truncated by the storage query before the trace layer can rank.

## Performance

The [[work-trace|trace layer]] processes ≤500 atoms in <500 ms wall-clock. The MCP wrapper adds storage query time (typically <50 ms for V1 dataset sizes) and JSON serialization. End-to-end p50 in the integration test fixture is <300 ms.

## Truncation

When the trace layer's clusters total more atoms than `limit`, the wrapper drops atoms from the **lowest-rank cluster's oldest atoms first**. Edges referencing dropped atoms are removed; if a cluster ends up empty, the cluster is dropped. `truncation.truncated = true` if anything was dropped; the counts surface what was returned vs. what existed in the window.

## What it does NOT do

- **No authentication.** Loopback-only is the V1 boundary, same as the rest of the [[mcp-server|MCP server]].
- **No persisted traces table.** Clusters are computed on every call.
- **No LLM-generated labels.** Heuristic only.
- **No open-loop *resolution*.** Hints are enriched into structured form; no decision is made about whether the loop closed.
- **No new edge kinds beyond `shared_artifact`.** The future-list is documented but not implemented.
- **No automatic context injection.** AI clients call the tool when their model decides; ECHO never pushes.
- **No GitHub / Slack atom sources.** Source set is the four V1 sources (claude-code + codex + cursor + git). Wave 4 adapters are a parallel thread.
- **No change to [[mcp-search-memories|`search_memories`]].** That contract is independent.
- **No trace viewer / UI.** Visual surface for traces is V2.

## V1 Targets

Same as the rest of the [[mcp-server|MCP server]]: Cursor + Claude Code + Claude Desktop + any future MCP-speaking client. Each speaks the Streamable HTTP transport ECHO ships at `http://127.0.0.1:38478/mcp`.

## Related

- [[work-trace]] — the layer that produces the response shape
- [[normalization]] — the layer that produces the atoms inside the response
- [[normalized-context-event]] — the atom shape (referenced as `atoms[atom_id]`)
- [[artifact-identity]] — the canonical-id rules that power cluster joins
- [[mcp-server]] — the host server
- [[mcp-search-memories]] — sibling MCP tool (raw event search)
- [[v1-spec]] — the V1.5 gap this tool closes

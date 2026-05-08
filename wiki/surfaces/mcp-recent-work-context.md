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

**Description (verbatim, what AI clients see — composed across items 018/019/020/021):**

> "Retrieve clusters of related events from the user's captured ECHO memories — joined by shared artifacts (files, repos, conversations) within a recent time window. Use when the user asks open-ended questions about what they were doing, where they left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the current conversation. Returns one cluster per coherent work thread; the AI client decides which to attend to. `cluster.atom_ids[]` is the membership index; `cluster.edges[]` is signal-bearing (work-role pairs) and not exhaustive pairwise membership. `cluster.open_loop_hints[].resolved` indicates whether the hint has a downstream closure signal in the same window. `format: 'minimal'` caps `action.input/output` per atom to 500 chars. `window_hours` is inferred from the `(since, until)` span when not passed: span ≤ 4h uses span; span > 4h uses min(span, 24h). Always include explicit timezone (`Z` or `+HH:MM`) on `since`/`until` — naive ISO strings are parsed as local server time."

**Input schema** (zod; all fields optional):

```ts
{
  since?:         ISO8601,                                  // default: now − 4h; include explicit TZ
  until?:         ISO8601,                                  // default: now; include explicit TZ
  artifact_hint?: { provider: string, type: string, id: string },
  limit?:         number,                                   // max atoms in response (default 100; clamped [1, 500])
  window_hours?:  number,                                   // [0.1, 168]; inferred from span when omitted (item 021)
  format?:        'full' | 'minimal',                       // default 'full'; 'minimal' caps action.input/output to 500 chars (item 019)
}
```

**Output envelope** (`schema_version: 1`):

```ts
{
  schema_version: 1,
  tool: 'get_recent_work_context',
  query: {
    since, until,
    artifact_hint: ArtifactHint | null,
    window_hours: number,         // echoed: explicit value or inferred from span (item 021)
    format: 'full' | 'minimal',   // echoed: 'full' when omitted (item 019)
  },
  clusters: [
    {
      cluster_id:        'ctx_<8-hex>',
      rank:              1,
      rank_reason:       string[],         // 'recent_activity' | 'matches_artifact_hint' | 'has_open_loop' | 'dense' | 'cross_tool'
      label?:            string,           // heuristic only; omitted when not useful
      anchor_artifacts:  ArtifactRef[],    // top-3 by occurrence
      atom_ids:          EventId[],        // membership index — exhaustive
      edges: [
        // Signal-bearing only (item 019): each edge has at least one work-role
        // or unknown-role artifact. NOT an enumeration of C(N, 2) cluster pairs.
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
          atom_id:                EventId,
          kind:                   'ends_with_question' | 'unresolved_assistant_q' | 'contains_todo' | 'explicit_followup',
          text:                   string,
          confidence:             'high' | 'medium' | 'low',
          resolved:               boolean,    // R1 heuristic resolution (item 020)
          resolved_by_atom_id?:   EventId,    // earliest qualifying later atom; omitted when unresolved
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

Every choice was settled during the V1.5 brainstorm + a Codex CLI redline pass; refinements landed via items 019/020/021 dogfooding. The non-obvious ones:

- **Multiple `clusters[]` (not a single `cluster`).** Users context-switch; collapsing to one cluster is silent loss.
- **Atoms returned inline as a top-level `atoms` map.** No second MCP roundtrip; clusters reference atoms by id; deduplicates if a future relaxation lets atoms appear in multiple clusters.
- **Cluster IDs are deterministic-ephemeral.** `cluster_id = "ctx_" + sha256_8(schema_version + sorted(atom_ids))`. Same atoms → same id. No traces table in V1.5.
- **`atom_ids[]` is membership; `edges[]` is signal-bearing.** Item 019 split these roles cleanly. Pre-019, `edges` enumerated all C(N, 2) pairs (97% redundant in dense clusters); post-019 it carries only pairs joined by at least one work-role or unknown-role artifact. Consumers that previously assumed `edges.length === C(N, 2)` must update — `atom_ids[]` is the membership index.
- **Edges are explicit and structured** with a documented future-list (`temporal_near | same_conversation | state_transition | same_actor | semantic_similarity`). V1.5 ships only `shared_artifact`; consumers must tolerate unknown `edge.kind` values gracefully.
- **Open-loop hints enriched at the trace layer**, not stored on atoms. Atom-side hints (`open_loop_hints?: string[]` on `NormalizedContextEvent`) are cheap regex hits; the trace layer turns them into `{kind, text, confidence, resolved, resolved_by_atom_id?}` for clusters. R1 heuristic resolution (item 020) ships in V1.5; LLM-based R2/R3 stay deferred.
- **`format: 'full' | 'minimal'` is content cap, not schema variant.** `'minimal'` caps `action.input` and `action.output` per atom to 500 chars with a discoverable suffix; the atom is still a valid `NormalizedContextEvent`. Default stays `'full'` — flipping the default is a separate dogfooding-driven patch.
- **`window_hours` is exposed and span-inferred (item 021).** The pre-021 hardcoded 4h made "where did I leave off after a break" structurally impossible. Now: explicit value if passed; otherwise span-inferred (`min(span, 24h)` for span > 4h).
- **`rank` + `rank_reason`, no `score`.** A numeric score without a calibrated formula misleads consumers. Default sort: `artifact_hint_match → has_open_loop → recent_activity → cluster_size → newer-median-age`.
- **`label?` is optional, heuristic-only.** No LLM call. AI client can synthesize naming if the heuristic is bad.
- **`warnings[]` at response level only.** Cluster-level warnings deferred until a use case surfaces — adding later is non-breaking. See "Warnings" below.
- **`schema_version: 1` at response level.** Independent from atom-level `schema_version`. Bump on breaking change.

The full design conversation lives in `raw/internal/decisions/2026-05-06-v15-trace-layer-design.md`. Edge-filter rationale: `raw/internal/decisions/2026-05-07-trace-edge-filter-design.md`.

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
  const limit = clampLimit(params.limit);                          // [1, 500]
  const until = params.until ?? now.toISOString();
  const since = params.since ?? new Date(Date.parse(until) − 4h).toISOString();
  const window_hours = inferWindowHours(sinceMs, untilMs, params.window_hours);
  const format = params.format ?? 'full';

  const events = await storage.query({
    since, until,
    limit: limit * 10,                                              // overfetch ×10
    exclude_metadata_surface: ['fs'],                               // Bug C (item 022) — drop raw FS noise
    // order defaults to 'desc' since item 021; the trace layer re-sorts ASC internally
  });

  const warnings = [];
  if (events.length === limit * STORAGE_OVERFETCH) {
    warnings.push('storage cap hit (events.length === limit * STORAGE_OVERFETCH); ' +
                  'atoms in window may be silently truncated. ' +
                  'Raise limit or narrow (since, until) to retain them.');
  }
  if (!hasTzMarker(params.since) || !hasTzMarker(params.until)) {
    warnings.push('input.since (or input.until) lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity');
  }

  const query = { since, until, limit, window_hours, format, artifact_hint? };
  const response = buildRecentWorkContext(events, query, normalizeEvent);
  response.warnings.push(...warnings);
  return response;
}
```

The wrapper resolves the time-window defaults from `Date.now()` *at the boundary* — the [[work-trace|trace module]] itself never reads the clock, which keeps it pure and easy to test. Storage is overfetched by 10× so cluster diversity isn't truncated by the storage query before the trace layer can rank.

### Two storage-query refinements landed in item 022

- **`exclude_metadata_surface: ['fs']`** filters raw `metadata.surface === 'fs'` change events at the storage layer. Codex measured these dominating storage's newest 1000 rows at 96.6% on busy days; without the filter, the trace tool's storage budget is wasted on rows the normalizer throws away, collapsing cross-source representation. Conversation atoms ride a different `metadata` shape and are unaffected. `search_memories` does NOT pass this filter — those raw events stay searchable for forensic purposes.
- **DESC default + in-memory ASC re-sort.** Storage now returns newest-first by default (see [[storage]]); the trace layer re-sorts the post-overfetch slice ASC for cluster determinism and forward-only resolution scans. Pre-021, ASC + LIMIT silently dropped the newest atoms when a busy day exceeded the cap.

## Warnings

`response.warnings[]` is the channel for non-fatal anomalies the consumer should know about. V1.5 emits two kinds:

- **Naive timestamp warning** (item 021): when `since` or `until` lacks a TZ marker (`Z` or `±HH:MM[:MM]`), parsed as local server time. Emitted once per request even if both are naive. Regex broadened in item 022 to also recognize `+0700` and `+07` forms.
- **Storage-cap warning** (item 022): when the storage query returns exactly `limit * STORAGE_OVERFETCH` rows, atoms outside that slice may be silently truncated. The wording is exact and stable so AI clients can detect it programmatically.

## Performance

The [[work-trace|trace layer]] processes ≤500 atoms in <500 ms wall-clock. The MCP wrapper adds storage query time (typically <50 ms for V1 dataset sizes) and JSON serialization. End-to-end p50 in the integration test fixture is <300 ms.

## Truncation

When the trace layer's clusters total more atoms than `limit`, the wrapper drops atoms from the **lowest-rank cluster's oldest atoms first**. Edges referencing dropped atoms are removed; if a cluster ends up empty, the cluster is dropped. `truncation.truncated = true` if anything was dropped; the counts surface what was returned vs. what existed in the window.

## What it does NOT do

- **No authentication.** Loopback-only is the V1 boundary, same as the rest of the [[mcp-server|MCP server]].
- **No persisted traces table.** Clusters are computed on every call.
- **No LLM-generated labels.** Heuristic only.
- **No LLM-based open-loop resolution.** R1 heuristic resolution ships in V1.5 (item 020); R2/R3 (LLM-based) deferred.
- **No new edge kinds beyond `shared_artifact`.** The future-list is documented but not implemented.
- **No automatic context injection.** AI clients call the tool when their model decides; ECHO never pushes.
- **No GitHub / Slack atom sources.** Source set is the four V1 sources (claude-code + codex + cursor + git). Wave 4 adapters are a parallel thread.
- **No change to [[mcp-search-memories|`search_memories`]] semantics**, beyond the filter-before-slice + description fixes that landed alongside in item 022. That contract is independent of the trace tool.
- **No trace viewer / UI.** Visual surface for traces is V2.
- **No re-clustering on `metadata.surface === 'fs'`** — those raw events are filtered at the storage-query layer, never reach the trace pipeline. They remain searchable via [[mcp-search-memories|`search_memories`]] for forensic use.

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

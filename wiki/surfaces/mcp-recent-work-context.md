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

> ⚠️ **DEPRECATED 2026-05-10 (V1.6, item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]]); SURVIVES IN ITEM 038 AS A THIN RE-EXPORT SHIM.** Replaced by the atomic toolkit [[mcp-find-clusters|`find_clusters`]] (cheap discovery) + [[mcp-get-atoms|`get_atoms`]] (targeted body-fetch). **Post-038 status:** the cluster engine canonical home moved to `src/mcp/internal/cluster-engine.ts`; `recent-work-context.ts` is now a ≤10-line re-export shim that preserves the MCP-tool registration. The registered handler still works identically (regression-tested via integration test); removal of the MCP-tool registration is scheduled in the **2026-05-17 follow-up** item, gated on founder-consent receipt drafted from journal evidence (zero `get_recent_work_context` calls since 2026-05-09).
>
> **Migration recipe:**
> ```ts
> // OLD:
> const r = await get_recent_work_context({ format: 'minimal', limit: 20 });
>
> // NEW:
> const c = await find_clusters();                                    // no-args; auto-expand handles gaps
> const picked = c.clusters[0];                                       // top rank after 032 strict-partition demotion
> const a = await get_atoms({ atom_ids: picked.atom_ids,
>                             prefer: 'newest_first' });              // hydrate just that cluster
> ```
> See [[mcp-find-clusters]] + [[mcp-get-atoms]] for the new contract. The historical content below documents the deprecated tool as shipped for V1.5 reference.

## Definition

`get_recent_work_context` is the MCP tool through which AI clients retrieve **clustered** ECHO context — coherent threads of work joined by shared artifact identity within a recent time window. It lives at `src/mcp/tools/recent-work-context.ts`, is registered against the [[mcp-server|local MCP server]] alongside [[mcp-search-memories|`search_memories`]] and `echo_ping`, and is the V1.5 magic primitive: when Cursor or Claude Code asks an open-ended question about recent work, this is the call that returns evidence already grouped into work threads.

## Public Contract (Stable)

The tool's name, description, input schema, and response shape are now a contract that AI clients depend on. Changes are breaking.

**Tool name:** `get_recent_work_context`

**Description (verbatim, what AI clients see — composed across items 018/019/020/021/025):**

> "Retrieve clusters of related events from the user's captured ECHO memories — joined by shared artifacts (files, repos, conversations) within a recent time window. Use when the user asks open-ended questions about what they were doing, where they left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the current conversation. Returns one cluster per coherent work thread; the AI client decides which to attend to. `cluster.atom_ids[]` is the membership index; `cluster.edges[]` is signal-bearing (work-role pairs) and not exhaustive pairwise membership. `cluster.open_loop_hints[].resolved` indicates whether the hint has a downstream closure signal in the same window. **Defaults are now `limit=20`, `format='minimal'`** — pass `format: 'full'` only when you need full `action.input`/`action.output` content. `MAX_LIMIT=500` is available for offline/batch consumers but is rarely the right choice for interactive AI-client paths. `window_hours` is inferred from the `(since, until)` span when not passed: span ≤ 4h uses span; span > 4h uses min(span, 24h). Always include explicit timezone (`Z` or `+HH:MM`) on `since`/`until` — naive ISO strings are parsed as local server time."

**Input schema** (zod; all fields optional):

```ts
{
  since?:         ISO8601,                                  // default: now − 4h; include explicit TZ
  until?:         ISO8601,                                  // default: now; include explicit TZ
  artifact_hint?: { provider: string, type: string, id: string },
  limit?:         number,                                   // default 20; clamped [1, 500] (item 025)
  window_hours?:  number,                                   // [0.1, 168]; inferred from span when omitted (item 021)
  format?:        'full' | 'minimal' | 'skeleton',          // default 'minimal' (item 025); 'skeleton' (item 028) for cheap resume-call shape
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
    format: 'full' | 'minimal' | 'skeleton',   // echoed; 'minimal' default (item 025); 'skeleton' added in item 028
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
- **Three-format ladder (`'full' | 'minimal' | 'skeleton'`) is content cap, not schema variant.** Cost ordering, cheapest first:
  - **`'skeleton'`** (item 028, V1.5.5) — drops every uncapped sub-collection. Keeps cluster `id`, `label`, `rank`/`rank_reason`, `atom_ids[]` (membership index), `source_breakdown`, `time_range`, and minimal-shape `open_loop_hints[]` (`{atom_id, resolved}` only — text/kind/confidence stripped). Per-atom: keep `id`, `time`, `source` (full SourceRef including `raw_pointer` for hydration), and a 200-char head-clipped `action.summary` synthesized from `action.input ?? action.output`. Drops `artifacts[]`, `actors`, `provenance`, `context`, `state`, the full `action` envelope, and cluster-level `anchor_artifacts[]` / `edges[]`. Typical < 10 kB even on full-day windows; right for low-budget context-pull / "where did I leave off" / resume calls.
  - **`'minimal'`** (default, item 025) — caps `action.input` and `action.output` to 500 chars with a discoverable elision suffix; atom otherwise a valid `NormalizedContextEvent`. Realistic claude_code days can still exceed the consumer 25 kB budget if `artifacts[]` density is high — call this out and pass `'skeleton'` for resume-call shape.
  - **`'full'`** (debug) — verbatim atom envelopes, only for offline inspection. Routinely exceeds the 25k budget on real data.
- Item 025 flipped the default from `'full'` to `'minimal'` and lowered `DEFAULT_LIMIT` from 100 to 20 after dogfooding 2026-05-08 showed every Claude/Codex retrieval that day blew the consumer's 25k-char tool-result budget on first try. The merge-time envelope-byte-size acceptance test (synthetic 200-atom multi-file fixture) measured `<25kB` JSON-stringified payload at `limit=20`, ~27kB at `limit=25` — which is why 025 shipped `20` using the spec's explicit "lower further" escape hatch.

  **Production regression closed by V1.5.5 + V1.5.6 + V1.5.7.** Two real-world post-025 calls on 2026-05-08 (15:05 PDT zero-args: 72,283 chars; 15:14 PDT full-day resume: 76,593 chars; 15:54 PDT post-026+027 worsened to 84,188 chars / +16.5%) overflowed the 25k budget by ~3× under `format='minimal'`. Root cause: `truncateForMinimal` caps only `action.input`/`action.output`, while `artifacts[]` (33 entries / ~8.4 kB on a measured top atom), `actors`, `provenance`, `context`, and cluster `edges[]` / `open_loop_hints[].text` remained uncapped. **Fix landed in three layers.** V1.5.5 (item 028) added `format:'skeleton'` for caller opt-in resume-call shape. V1.5.6 (commit `21edd69`) added the wire-shape projector — per-key metadata cap on values like `tool_calls`. V1.5.7 (Gap 4, commit `c20db34`) added per-cluster bounds on skeleton-mode arrays (`SKELETON_CLUSTER_ATOM_IDS_CAP=50`, `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP=30`); when exceeded, the response keeps first N/2 + last N/2 entries and emits an `*_omitted` integer plus a cluster-level `truncated: true` flag so consumers can detect and re-query with smaller `limit` or hydrate via `tail_session`/`search_memories`. Default `format='minimal'` did NOT change — skeleton remains caller opt-in.
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

## Wire-shape Affordances (item 025)

The tool advertises an `outputSchema` and returns `structuredContent` alongside `content` text on every call. Schema scoping is intentionally permissive on the deeply nested cluster/atom/edge bodies (`z.record(z.string(), z.unknown())`) and exact on the top-level keys (`schema_version: z.literal(1)`, `tool: z.literal('get_recent_work_context')`, `query`, `clusters`, `atoms`, `truncation`, `warnings`). Full mirroring of the nested bodies would lock the agent into validating fields whose internal contract is still moving — items 016–022 reshape them on most weeks. Codex's 2026-05-08 13:51 PDT spec review caught that an earlier scoping draft omitted `schema_version` and `tool`; both are non-optional fields in the actual response, so an `outputSchema` that excluded them would reject every real response at validation time. The scoping decision is documented inline in `recent-work-context.ts` for the next reader.

The tool also carries `annotations: { readOnlyHint: true }` so MCP clients can render and route it as safe-by-default. `get_recent_work_context` is pure-read against [[storage]] — no `storage.append` calls — so the hint is structurally accurate.

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

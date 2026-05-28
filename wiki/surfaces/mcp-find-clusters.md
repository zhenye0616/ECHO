---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - find_clusters
  - MCP find_clusters tool
  - Find Clusters
  - Cluster discovery
---

# MCP `find_clusters` Tool

## Definition

`find_clusters` is the **discovery** primitive in the V1.6 atomic MCP toolkit. It returns coherent work clusters — atoms joined by shared artifact identity within a recent time window — **as skeletons only**: each cluster carries its `atom_ids[]` list, source breakdown, rank metadata, and open-loop hints, but **not** the atom bodies. Bodies are fetched separately via [[mcp-get-atoms|`get_atoms`]]. Lives at `src/mcp/tools/find-clusters.ts`. Shipped 2026-05-10 as item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] (V1.6); strict-partition demotion + auto-expand triggers added by item [[2026-05-10-032-m2-first-call-reliability|032]].

## Why It Exists

V1.5's `get_recent_work_context` ([[mcp-recent-work-context|deprecated since 030]]) returned clusters AND inline atom bodies in one envelope. Real-world dogfooding showed three structural problems:

1. **Bodies dominate cost.** Even with `format='skeleton'` capping cluster bodies, large windows still routinely blew the 25 kB MCP envelope. Consumers paid for atom bodies they never used.
2. **One tool, two purposes.** Discovery ("what threads exist?") and body fetch ("hydrate atoms A,B,C") had been bundled — the 030 atomic-decomposition principle says one tool, one purpose.
3. **No targeted body fetch.** Consumers couldn't say "I picked cluster 2 — give me just THOSE 7 atoms' bodies." They got every body, or none.

`find_clusters` is the cheap-discovery half; [[mcp-get-atoms|`get_atoms`]] is the targeted-fetch half. Together they replace `get_recent_work_context` for V1.6+ resume calls.

## Public Contract

**Tool name:** `find_clusters`

**Input schema** (zod; all fields optional):

```ts
{
  since?:        ISO8601,       // lookback start; include explicit TZ (Z or +HH:MM)
  until?:        ISO8601,       // lookback end; default now
  window_hours?: number,        // [0.1, 168] — cluster-gap, NOT lookback (see below)
  format?:       'skeleton',    // only 'skeleton' shipped in V1.6 — no atom bodies
  repo_path?:    string,        // item 037 — absolute repo root; AND-filters atoms by metadata.repo_root === normalize(repo_path)
                                //   uniformly across all source_apps (see [[work-artifact-first-class]])
  view?:         'compact' | 'rich',  // item 064 — field-hygiene projection; default 'rich' (byte-identical to pre-064)
}
```

**Foot-gun (load-bearing):** `window_hours` controls the **maximum cluster-gap** (the temporal gap allowed between atoms in a single cluster), **NOT** lookback. Lookback is controlled by `since` / `until`. Passing `window_hours=24` for "24h lookback" is the most common misuse — it widens cluster-gap, which is almost never what the consumer wants. Documented in the tool description verbatim.

**Output envelope** (`schema_version: 1`):

```ts
{
  schema_version: 1,
  tool: 'find_clusters',
  query: { since, until, window_hours, format: 'skeleton' },
  clusters: [
    {
      cluster_id:        'ctx_<8-hex>',
      rank:              1,
      rank_reason:       string[],            // 'recent_activity' | 'has_open_loop' | 'dense' | 'matches_artifact_hint'
      atom_ids:          EventId[],           // FULL, un-capped — feed directly to get_atoms
      atom_ids_truncated?: boolean,           // fires only if a single cluster's atom_ids would dominate the envelope
      atom_ids_total?:   number,              // total when truncated
      source_breakdown:  { [app: string]: number },
      time_range:        { from: ISO8601, to: ISO8601 },
      label?:            string,              // heuristic; omitted when not useful
      open_loop_hints?:  [{ atom_id, resolved }, ...],   // capped at 30 per cluster
    }, ...
  ],
  result_caps: {
    clusters_returned:     number,
    clusters_total:        number,
    atoms_returned:        number,
    atoms_total_in_window: number,
    truncated:             boolean,
  },
  warnings: string[],
}
```

## Auto-Expand Triggers (item 032)

When called with **neither `since` nor `until`** (the "no-args resume" path), `find_clusters` runs with a default 4h lookback. If that pass would return a result a consumer can't use, two auto-expand triggers fire — each retries once at 24h lookback and emits a prefixed warning so the implicit widen is visible:

1. **Empty trigger** — the 4h pass returned zero clusters. Warning prefix: `[AUTO_EXPAND]`. This is the "where did I leave off after a quiet stretch" case.
2. **Single-source-recent trigger** (032) — the 4h pass returned only clusters whose `source_breakdown` is dominated by the calling session itself (i.e., the AI client looking at its own recent activity, not "prior work"). Warning prefix: `[AUTO_EXPAND] single-source-recent`. This is the resume-after-gap case where the calling tool's own activity in the last 4h would otherwise outrank older multi-source prior work.

Both triggers only fire on no-args calls. If `since` or `until` is passed explicitly, the consumer's window is respected verbatim (no auto-expand) — the warnings still report TZ ambiguity if a timestamp lacked an explicit TZ marker.

## Strict-Partition Demotion (item 032)

After auto-expand, the rank chain previously sorted single-source-recent clusters into the top slot because their `recent_activity` signal won the tiebreak chain (`hint > openLoop > recent > size > negMedianAge`). The fix is a **strict partition** — single-source-recent clusters sort STRICTLY BELOW all non-single-source-recent clusters via a new primary sort key in `rank.ts`, regardless of all other signals. The existing 5-key chain becomes the tiebreaker within each partition.

This makes the demo bar a **structural guarantee**: after `[AUTO_EXPAND] single-source-recent` fires, `clusters[0]` is prior multi-source work, not the calling session's noise.

## Compact view projection (item 064)

`view: "compact"` opts the response into the daemon-side field-hygiene projection at `src/mcp/wire-shape/compact.ts`. The full KEEP/DROP rules and motivation live on [[mcp-compact-view-projection]]; the cluster-level summary:

- **KEEP per cluster:** `cluster_id`, `atom_ids`, `source_breakdown`, `time_range.from` / `.to`, `label` (UUID-fallback emitted as `null`), `open_loop_hints` + `open_loop_hints_omitted` when the existing 30-hint cap fired, `atom_ids_truncated`, `atom_ids_total`.
- **DROP per cluster:** `rank` (sort order conveys it), and `rank_reason` values other than `"has_open_loop"` (drop `"recent_activity"`, `"dense"`, `"matches_artifact_hint"`).
- **Envelope:** keep `schema_version`, `tool`, `clusters[]`, `warnings[]`; drop `query` (echoed args) and `result_caps`. The registered `findClustersOutputSchema` was widened so schema-aware MCP clients pass validation.

`view` is independent of `format` (`view` controls field hygiene; `format` controls atom-body inclusion). Default is `view: "rich"` so existing agent callers observe byte-identical output. The 25 kB envelope-overflow prefix-drop loop sizes its budget on the post-compact bytes, so the live ~207 kB codex case stops triggering `atoms_dropped > 0` purely on metadata that compact would have removed.

The Raycast client at `tools/raycast-echo/src/lib/mcp.ts` opts in to compact for `find_clusters` (and [[mcp-get-atoms|`get_atoms`]]).

## Cost Contract

- **Cheap.** Typical response < 10 kB even on full-day windows.
- **Hard envelope ceiling: 25 kB.** Per-cluster `atom_ids_truncated: true` + `atom_ids_total: N` fires only if a single cluster's `atom_ids[]` would dominate the response. Per-cluster `open_loop_hints[]` capped at 30 entries.
- **No atom bodies.** This is the discovery primitive — pair with [[mcp-get-atoms|`get_atoms`]].

## Canonical Recipe (resume-after-gap)

```ts
const c = await find_clusters();                                  // no args; auto-expand handles gaps
const picked = c.clusters[0];                                     // top rank — after 032's strict partition,
                                                                  //   this is prior work, not calling-session noise
const a = await get_atoms({ atom_ids: picked.atom_ids,
                            prefer: 'newest_first' });            // hydrate just that cluster
```

Documented in the `find_clusters` tool description verbatim (V1.6.1). See [[mcp-get-atoms]] for the targeted-fetch half.

## What `find_clusters` Does NOT Do

- **No atom bodies.** That's [[mcp-get-atoms|`get_atoms`]].
- **No substring search.** That's [[mcp-search-memories|`search_memories`]].
- **No MRU resolution.** That's [[mcp-echo-resolve-mru|`echo_resolve_mru`]] (post-038 replacement for `tail_session`'s compound modes).
- **No persisted clusters table.** Computed on every call; cluster IDs are deterministic-ephemeral.

## Related

- [[mcp-server]] — the host transport
- [[mcp-get-atoms]] — the body-fetch counterpart
- [[mcp-echo-resolve-mru]] — sibling V1.6 RC2 resolver primitive (post-038)
- [[mcp-search-memories]] — substring search sibling
- [[mcp-recent-work-context]] — the deprecated V1.5 predecessor (`get_recent_work_context`)
- [[work-trace]] — the clustering algorithm
- [[work-artifact-first-class]] — the principle behind `repo_path` (item 037)
- [[atomic-primitives-compose]] — the principle behind discovery / body-fetch / resolver separation
- [[mcp-compact-view-projection]] — the `view: "compact"` projection's KEEP/DROP rules + motivation
- [[group-session]] — cross-tool review pattern that uses this tool

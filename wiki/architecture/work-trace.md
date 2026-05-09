---
status: shipped
topic: Architecture
subtopic: System Architecture
aliases:
  - Work Trace
  - Trace Layer
  - WorkTrace
---

# Work Trace (the trace layer)

## Definition

The trace layer is a pure, in-process module that turns a list of [[normalized-context-event|normalized atoms]] into *clusters* of related work — connected components over a graph where atoms share artifact identity within a time window. It lives at `src/trace/` and is consumed today by the [[mcp-recent-work-context|`get_recent_work_context`]] MCP tool. The layer takes events + a query and returns a response. No I/O, no clock reads (the caller resolves time-window defaults at the boundary), no persisted traces table.

This is the **V1.5 magic primitive**: in your daily Cursor + Claude Code + Codex + git flow, you ask an open-ended question and ECHO returns a *coherent thread* of evidence, automatically joined across tools. You don't tell ECHO what the thread is; ECHO infers it from what you've been touching.

## Position in the Architecture

```
CaptureEvent (storage, raw)
        │
        ▼
normalizeEvent (read-time, pure — see [[normalization]])
        │
        ▼
NormalizedContextEvent (atom — observation)
        │
        ▼
buildRecentWorkContext (this layer, read-time, pure)
        │
        ▼
RecentWorkContextResponse (clusters + atoms + graph — interpretation)
        │
        ▼
[[mcp-recent-work-context|get_recent_work_context]]   [V2: trace viewer]   [V2: Resume Packet]
```

The layer is **pure**: takes events + a query, returns a response. If the trace layer turns out wrong, deleting `src/trace/` is the rollback. Storage and the [[normalization|normalizer]] stay clean.

## Public API

```ts
// src/trace/index.ts
export function buildRecentWorkContext(
  events: CaptureEvent[],
  query: Query,
  normalize: (e: CaptureEvent) => NormalizedContextEvent | null,
): RecentWorkContextResponse;

interface Query {
  since: string;              // ISO 8601 — caller-resolved
  until: string;              // ISO 8601 — caller-resolved (also the "now" anchor for ranking)
  artifact_hint?: ArtifactHint;
  window_hours?: number;      // resolved at the MCP boundary; see "Window-hours inference"
  limit?: number;             // default 100; clamped [1, 500] at the MCP boundary
  format?: 'full' | 'minimal'; // content cap for action.input/output on emitted atoms
}
```

The function is dispatched per-call: `normalize` is the strategy, `events` is the input, `query` is the constraint. Adapters and storage stay out of the trace module entirely.

`format` is a content cap, not a schema variant: every atom is still a valid `NormalizedContextEvent` in either mode, only `action.input` and `action.output` shrink. This keeps consumers that don't know about `format` parsing the response unmodified. (Item 019.)

### Window-hours inference (item 021)

Before item 021, `window_hours` was hardcoded to `DEFAULT_WINDOW_HOURS = 4` at the MCP wrapper and not exposed to callers. The trace layer's "where did I leave off after a break" use case structurally couldn't span a sleep gap. The MCP wrapper now resolves `window_hours` from the input:

- Explicit caller value → used verbatim (clamped to `[0.1, 168]`).
- Otherwise inferred from `(since, until)` span: `span ≤ 4h` → `span`; `span > 4h` → `min(span, 24h)`.
- The `4h` constant remains as a fallback for degenerate inputs (NaN dates, `since ≥ until`).

`response.query.window_hours` echoes the value actually used. Callers asking for explicit overnight context should pass either a span-equal `window_hours` or rely on the inference for typical 24h windows.

## Algorithm (V1.5 — `shared_artifact` only)

```
buildRecentWorkContext(events, query, normalize):
  # 1. Normalize, filter to time window, then sort ASC by occurred_at
  #    (storage now returns DESC by default per item 021; the trace layer needs ASC
  #    for cluster determinism and forward-only open-loop resolution scans)
  atoms = events.map(normalize).filter(non-null).filter(within [since, until]).sort(ASC)

  # 2. Enrich open-loop hints — including R1 resolution (per item 020)
  enriched_hints = enrichHints(atoms)   # forward-scan resolution; cluster-agnostic

  # 3. Index atoms by ArtifactKey = `${provider}:${type}:${id}`
  by_artifact = group atoms.id by every artifact key in atom.artifacts

  # 4. Build full edge set: pairs sharing an artifact within window_hours
  for each artifact bucket with ≥2 atoms:
    for each pair (a, b) in the bucket:
      if |occurred_at(a) − occurred_at(b)| ≤ window_hours:
        add edge {from: a, to: b, kind: 'shared_artifact', artifact_ids[], confidence: 'high'}

  # 5. Connected components → clusters (uses the FULL edge set, including scope/session edges)
  clusters = union-find over (atoms, edges)

  # 6. Per-cluster edge filter (item 019): drop edges whose artifact_ids resolve to
  #    only {scope, session} roles. Cluster membership unchanged; only edges trim.
  for each cluster:
    cluster.edges = cluster.edges.filter(e =>
      e.artifact_ids.some(id => roleOf(typeOf(id)) ∈ {work, unknown})
    )

  # 7. If artifact_hint provided: filter to clusters that touch it
  if query.artifact_hint:
    clusters = clusters.filter(c => c touches hint_key)

  # 8. Compute label, anchor_artifacts, source_breakdown, time_range; attach enriched_hints
  # 9. Rank (see "Ranking" below)
  # 10. Truncate by atom limit (lowest-rank cluster's oldest atoms drop first)
  # 11. If format === 'minimal': cap action.input/output to 500 chars per atom

  return response
```

Single-pass. O(N²) on atom pairs in the worst case, but for typical windows (~50–200 atoms) it runs comfortably under 500 ms in plain Node — the artifact-bucket index gives O(sum-of-degree²) which is much smaller in practice. Open-loop resolution adds O(H · A) worst-case (H hints, A atoms), sub-millisecond at dogfooding scale.

## Edge Filter & Role Taxonomy (item 019)

`cluster.edges[]` is **signal-bearing** post-019 — it enumerates pairs that share at least one artifact whose role carries cross-atom signal beyond mere cluster membership. It is **not** an exhaustive enumeration of pairwise cluster membership; that role belongs to `cluster.atom_ids[]`.

Each artifact type maps to one of four roles (`src/trace/role.ts`):

| role | meaning | examples |
|---|---|---|
| `scope` | the broad context every cluster member shares — restating it is redundant | `repo`, `workspace`, `account`, `org` |
| `session` | continuous conversational/temporal thread | `conversation`, `thread`, `channel` |
| `work` | a concrete work artifact both atoms touched (real cross-tool / cross-time signal) | `file`, `pr`, `issue`, `branch`, `commit`, `doc`, `crm_record`, `task`, `meeting`, `email_thread`, `record` |
| `unknown` | type the registry doesn't recognize — **edges are kept by default** | (any new V2+ adapter type before its registry entry lands) |

The filter drops an edge iff every artifact_id in `edge.artifact_ids` resolves to a role in `{scope, session}`. Edges retain their full `artifact_ids[]` when kept (no per-edge trimming).

Two design commitments make this safe:

1. **Cluster membership is unchanged.** The filter runs on each cluster's edge list **after** `connectedComponents` — so an atom joined to its cluster only by `repo` is still a cluster member; we just don't enumerate the redundant edge.
2. **`unknown` keeps the edge.** Generalizability default: future adapters' artifact types appear before the registry is updated; we'd rather over-emit an edge than silently drop signal we haven't classified yet.

In dense clusters this trims ~95% of the pre-019 edges (the dogfooding fixture went from 630 K_36 edges to ~30) without losing signal. Consumer impact: any client that previously assumed `edges.length === C(N, 2)` must update — `cluster.atom_ids[]` is the membership index.

The role registry is deliberately small for V1.5. Patches B (`shared_artifacts[]` schema replacement) and C (re-clustering on work-only edges) are deferred — both are real semantic shifts that require their own dogfooding window.

## Cluster IDs are Deterministic-Ephemeral

`cluster_id = "ctx_" + sha256_hex(schema_version + sorted(atom_ids).join(',')).slice(0, 8)`

Same atoms → same id. No traces table; clusters are computed on every call. Within-session reference works (the AI client can `cluster_id`-quote a result back to ECHO and get the same cluster) without persistence. V2 may add a traces table for cross-session reference (Resume Packets); V1.5 deliberately doesn't.

## Ranking (`src/trace/rank.ts`)

Internal signal computation; only the result fields `rank` (1-indexed integer) and `rank_reason` (string list) are exposed. No numeric `score` field — a calibrated score requires labeled ground truth that V1.5 doesn't have.

Sort key, descending:

1. `query.artifact_hint && touches_hint` (1 or 0) — hint match dominates
2. `has_open_loop` (1 or 0)
3. `recent_activity` (1 or 0) — any atom within 1 h of `query.until`
4. `atom_ids.length` (size)
5. `-median_age` — newer wins ties
6. `cluster_id` lexical — full-determinism tiebreak

Reasons surfaced (all that fire are listed):

- `recent_activity`
- `matches_artifact_hint`
- `has_open_loop`
- `dense` — `atom_ids.length ≥ 5`
- `cross_tool` — `source_breakdown` has ≥3 distinct apps

The "now" anchor for `recent_activity` is `query.until`, not `Date.now()` — the caller resolved it at the boundary so the trace layer stays pure.

## Label Heuristic (`src/trace/labels.ts`)

Optional `label?: string` per cluster. Heuristic only — no LLM call.

```
heuristic(atoms):
  1. Find dominant artifact: most occurrences across cluster's atoms
     (tiebreak: prefer non-conversation; conversations with opaque ids are bad labels)
  2. If max_count < 2 → return undefined  ("not really a shared work thread")
  3. Pick verb mode across atoms (action.verb || action.kind)
     'message' → "discussion about", 'commit' → "work on", 'edit' → "edits to"
  4. Compose: `${verb} ${artifact_label_or_tail}`
```

Examples:

- `"discussion about src/normalize/types.ts"`
- `"edits to src/storage/sqlite.ts"`
- `"work on echo"` (when the dominant artifact is a repo)

If the heuristic produces nothing useful (no dominant artifact, or only conversation artifacts with opaque ids), `label` is omitted. The AI client falls back to its own naming.

## Open-Loop Hint Enrichment (`src/trace/hints.ts`)

Atoms carry per-atom `open_loop_hints?: string[]` from the [[normalization|normalizer]] — cheap regex hits. The trace layer enriches each into `{atom_id, kind, text, confidence, resolved, resolved_by_atom_id?}`:

| `kind` | text source | `confidence` |
|---|---|---|
| `ends_with_question` | last sentence of `action.input` | `high` |
| `unresolved_assistant_q` | last sentence of `action.output` | `medium` |
| `contains_todo` | first `TODO/FIXME` line in input/output | `high` |
| `explicit_followup` | line containing `follow up` / `come back to` / `will do later` | `medium` |

Confidence is *signal-quality* (how reliably this hint kind indicates an open loop), distinct from *resolution-status* — both ship in V1.5 but separately.

### R1 resolution rules (item 020)

`resolved: boolean` and (when resolved) `resolved_by_atom_id: string` are populated by a forward-scan pass over the input atom list, before clustering. The pass is cluster-agnostic — an atom's resolved state depends only on the input list, not on which cluster the atom lands in. Heuristic-only; no LLM on the read path.

| Hint kind | Rule | Closes when |
|---|---|---|
| `ends_with_question` (R1.Q) | a later **non-question** turn in the **same conversation** (`context.conversation` artifact id match) | the conversation moved past the question |
| `unresolved_assistant_q` (R1.AQ) | a later atom from `'user'` role in the same conversation, with non-empty trimmed input/output | the user replied (any length ≥ 1 char) |
| `contains_todo` (R1.TODO) | a later atom whose `state.delta.artifact_id` matches one of the hint atom's file artifact ids | the file containing the TODO was edited after |
| `explicit_followup` (R1.FU) | **never auto-resolves in V1** | conservative — phrasing too open-ended for a regex match to safely close |

`resolved_by_atom_id` is the **earliest** qualifying later atom. Hints with no later atoms stay `resolved: false`. Resolution is identical in `format: 'full'` and `'minimal'` — truncation only affects atom emission, not the upstream hint pass.

The bet: simple per-kind rules catch ≥80% of real closures. R2 (LLM resolution) and R3 (heuristic prefilter + LLM disambiguation) are V1.5+ upgrades reserved for the case where R1's precision proves insufficient. The `resolved_by_atom_id` pointer composes with that future upgrade without contract change.

This V1 surface is what the hotkey overlay reads — `resolved: false` becomes "open loops still hanging." The substrate's hint *detection* alone was necessary but not sufficient for that magic moment; surfacing 17 false-positive open loops on a normal weekday would destroy trust faster than missing some real ones. R1 is the cheapest correctness lever.

## Edge Future-List (V1.5+ Roadmap)

V1.5 ships only `kind: 'shared_artifact'`. Documented future kinds (additive, non-breaking):

- `temporal_near` — atoms within a tighter time window even without shared artifact
- `same_conversation` — atoms from the same conversation provider/session
- `state_transition` — atom's `state.delta` references another atom's `state.snapshot`
- `same_actor` — atoms by the same actor (across tools)
- `semantic_similarity` — embedding cosine over `action.input/output`

These are documented contract values today; consumers must tolerate unknown `edge.kind` values gracefully. Implementing them is gated on V1.5 dogfooding — the founder runs the trace layer in daily workflow for ~2 weeks and decides which kinds the algorithm actually needs.

## Performance

For ≤500 atoms in window, full clustering + response build runs in <500 ms wall-clock on M-series. Today the test suite seeds 500 atoms and asserts <500 ms. Synchronous in-process; no caching, no persisted traces table in V1.5.

If perf regresses under real dogfooding load: profile, propose a cache item; do not add caching preemptively (out-of-scope per spec).

## What V1.5 Trace Layer Does NOT Do

- **No persisted traces table.** Clusters are deterministic-ephemeral.
- **No LLM-generated labels.** Heuristic only.
- **No LLM-based open-loop resolution.** R1 ships heuristic-only; R2/R3 (LLM disambiguation) are deferred until R1's precision data argues for them.
- **No cross-conversation closure joins.** A question in conversation A closed by a reply in conversation B is not detected. V2 territory.
- **No persisted resolution state across queries.** Resolution is computed at trace time on each call.
- **No re-clustering on work-only edges.** Item 019's filter is a per-cluster *decoration* over the full graph; cluster membership is computed against the unfiltered graph. Patch C (work-only clustering) is a deferred semantic shift.
- **No embeddings.** `temporal_near` / `semantic_similarity` are documented future-list values, not implemented.
- **No automatic context injection.** The AI client decides when to call `get_recent_work_context`; ECHO never pushes.
- **No new MCP transport.** Uses the existing [[mcp-server|MCP server]] at `127.0.0.1:38478`.
- **No trace viewer / UI.** Visual surface for traces is V2.
- **No cross-cluster joining.** A single response = a single graph build.
- **No GitHub / Slack adapters.** Source set stays at four (claude-code + codex + cursor + git) for V1.5 ship; Wave 4 adapters are a parallel thread.
- **No `search_memories` change.** That tool's contract stays as-is. (Item 017 — "wire normalized atoms into `search_memories`" — was killed 2026-05-09; the V1.5 retrieval surface ([[mcp-search-memories|substring]] + [[mcp-tail-session|exact tail]] + [[mcp-recent-work-context|clustered]]) covers the use case via tool composition. Rationale + reopen criteria in `backlog/_followups.md` under "Killed (won't ship)".)

## What V1.5 Will Teach Us

The trace layer, dogfooded for ~2 weeks in the founder's daily workflow, will surface:

- Whether the artifact-identity policy correctly joins (or splits a coherent thread because of identity-rule edge cases).
- Whether the 4-hour window is the right default. Too narrow → coherent threads split. Too wide → unrelated work tangles.
- Whether the **shared-repo artifact joins multi-file threads too aggressively** — a flagged signal during the 018 build: when many files in the same repo touch within the window, the repo-level artifact alone joins everything into one cluster. Whether that matches the founder's intuition for "coherent work thread" is exactly what dogfooding has to answer.
- Whether the label heuristic reads right on real clusters.
- Whether the rank ordering matches founder intuition. "I expected the open-loop cluster first; ECHO ranked it third." Tunes the ranking signals.
- Whether `shared_artifact` alone is enough, or if `temporal_near` / `same_conversation` need to land.
- Whether the AI client (Claude in Cursor) actually uses the graph. If clusters help, conversation quality goes up; if Claude ignores the graph, the contract was wrong.
- Whether 500 ms p95 is the right perf SLO. If the founder waits, retreat to caching.

These findings drive the V1.5+/V2 roadmap — they are *not* derivable from spec review.

## Related

- [[normalization]] — the layer above, which produces the atoms this layer consumes
- [[normalized-context-event]] — the atom shape
- [[artifact-identity]] — the join-key contract that powers `shared_artifact` edges
- [[mcp-recent-work-context]] — the V1.5 MCP tool that exposes trace responses to AI clients
- [[mcp-server]] — the host server
- [[storage]] — raw substrate read by the MCP tool wrapper
- [[timestamp-canonicalization]] — capture-side guarantee that makes window queries comparable across sources
- [[v1-spec]] — the V1.5 magic gap this layer closes

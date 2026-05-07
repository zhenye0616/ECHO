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
  window_hours?: number;      // default 4
  limit?: number;             // default 100; clamped [1, 500] at the MCP boundary
}
```

The function is dispatched per-call: `normalize` is the strategy, `events` is the input, `query` is the constraint. Adapters and storage stay out of the trace module entirely.

## Algorithm (V1.5 — `shared_artifact` only)

```
buildRecentWorkContext(events, query, normalize):
  # 1. Normalize and filter to time window
  atoms = events.map(normalize).filter(non-null).filter(within [since, until])

  # 2. Index atoms by ArtifactKey = `${provider}:${type}:${id}`
  by_artifact = group atoms.id by every artifact key in atom.artifacts

  # 3. Build edge set: pairs sharing an artifact within window_hours (default 4)
  for each artifact bucket with ≥2 atoms:
    for each pair (a, b) in the bucket:
      if |occurred_at(a) − occurred_at(b)| ≤ window_hours:
        add edge {from: a, to: b, kind: 'shared_artifact', artifact_ids[], confidence: 'high'}

  # 4. Connected components → clusters
  clusters = union-find over (atoms, edges)

  # 5. If artifact_hint provided: filter to clusters that touch it
  if query.artifact_hint:
    clusters = clusters.filter(c => c touches hint_key)

  # 6. For each cluster, compute label, hints, anchor_artifacts, source_breakdown, time_range
  # 7. Rank (see "Ranking" below)
  # 8. Truncate by atom limit (lowest-rank cluster's oldest atoms drop first)

  return response
```

Single-pass. O(N²) on atom pairs in the worst case, but for typical 4-hour windows (~50–200 atoms) it runs comfortably under 500 ms in plain Node — the artifact-bucket index gives O(sum-of-degree²) which is much smaller in practice.

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

Atoms carry per-atom `open_loop_hints?: string[]` from the [[normalization|normalizer]] — cheap regex hits. The trace layer enriches each into `{atom_id, kind, text, confidence}`:

| `kind` | text source | `confidence` |
|---|---|---|
| `ends_with_question` | last sentence of `action.input` | `high` |
| `unresolved_assistant_q` | last sentence of `action.output` | `medium` |
| `contains_todo` | first `TODO/FIXME` line in input/output | `high` |
| `explicit_followup` | line containing `follow up` / `come back to` / `will do later` | `medium` |

Confidence is *signal-quality* (how reliably this hint kind indicates an open loop), not *resolution-status* (whether the loop is actually open). V1.5 does not resolve.

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
- **No open-loop *resolution*.** Atoms emit hints; this layer renders them; nobody decides "this loop is now closed."
- **No embeddings.** `temporal_near` / `semantic_similarity` are documented future-list values, not implemented.
- **No automatic context injection.** The AI client decides when to call `get_recent_work_context`; ECHO never pushes.
- **No new MCP transport.** Uses the existing [[mcp-server|MCP server]] at `127.0.0.1:38478`.
- **No trace viewer / UI.** Visual surface for traces is V2.
- **No cross-cluster joining.** A single response = a single graph build.
- **No GitHub / Slack adapters.** Source set stays at four (claude-code + codex + cursor + git) for V1.5 ship; Wave 4 adapters are a parallel thread.
- **No `search_memories` change.** That tool's contract stays as-is; item 017 will wire normalized atoms in separately.

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
- [[v1-spec]] — the V1.5 magic gap this layer closes

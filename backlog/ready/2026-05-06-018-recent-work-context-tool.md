---
id: 2026-05-06-018-recent-work-context-tool
title: V1.5 trace layer — `get_recent_work_context` MCP tool (cross-tool clustering)
status: ready
priority: HIGH
estimate: 2.5d
created: 2026-05-06
spec_refs:
  - backlog/ready/2026-05-06-016-read-time-normalizer.md
  - backlog/complete/2026-04-30-013-mcp-server-skeleton.md
  - backlog/complete/2026-04-30-014-mcp-search-memories.md
  - wiki/architecture/storage.md
  - wiki/architecture/system-architecture.md
  - wiki/surfaces/mcp-server.md
  - wiki/surfaces/mcp-search-memories.md
  - raw/internal/decisions/2026-05-06-normalized-context-event-design.md
  - raw/internal/decisions/2026-05-06-v15-trace-layer-design.md
blocked_by:
  - 2026-05-06-016-read-time-normalizer
acceptance:
  - "New MCP tool `get_recent_work_context` registered on the MCP server (alongside `echo_ping` and `search_memories`)."
  - "Tool input schema: `{ since?: ISO8601, until?: ISO8601, artifact_hint?: { provider: string, type: string, id: string }, limit?: number }`. All optional. Defaults: since=now-4h, until=now, artifact_hint=undefined, limit=100 atoms / 10 clusters."
  - "Tool description (visible to AI clients) makes it obvious when to call: `\"Retrieve clusters of related events from the user's captured ECHO memories — joined by shared artifacts (files, repos, conversations) within a recent time window. Use when the user asks open-ended questions about what they were doing, where they left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the current conversation. Returns one cluster per coherent work thread.\"`"
  - "New module `src/trace/` with: `cluster.ts` (graph build + connected-component), `rank.ts` (cluster ranking), `labels.ts` (heuristic label generator), `hints.ts` (open-loop hint enrichment), `types.ts` (response shape), `index.ts` (public API)."
  - "Public API: `buildRecentWorkContext(events: CaptureEvent[], query: Query, normalize: typeof normalizeEvent): RecentWorkContextResponse`. Pure function, no I/O, no clock reads (`now` for default windows is supplied by the caller, not read inside the trace module)."
  - "Clustering algorithm: see \"Algorithm\" section. Connected components over an undirected graph where atoms are nodes and edges connect atom pairs that share any `artifact_id` AND have `|time_delta| ≤ window_hours` (default 4h, configurable per call)."
  - "Response shape: see \"Response shape\" section. JSON-serializable, round-trips through JSON.parse/stringify without loss. Schema-versioned (`schema_version: 1`)."
  - "MCP tool implementation queries `Storage.query({since, until, limit: limit*10})`, runs candidates through `normalizeEvent`, drops nulls, calls `buildRecentWorkContext`, returns JSON."
  - "Open-loop hints in the response are *enriched* by the trace layer: atom-level `string[]` hints from item 016 are converted into `{kind, text, confidence}` objects per cluster. Item 016's atom shape is NOT modified."
  - "Cluster `label?` is heuristic-only (no LLM call): pick the most-occurring artifact's `label` field; if no label, derive `<verb> <artifact-id-tail>`. Field is OPTIONAL — adapter omits if heuristic produces nothing useful."
  - "Performance: for ≤500 atoms in window, full clustering + response build completes in <500ms wall-clock on the founder's M-series laptop. Synchronous in-process (no caching, no persisted traces table in V1.5)."
  - "No new dependencies. Uses `node:crypto` for cluster ID hashing only."
  - "Tests: see \"Tests\" section. Per-module unit tests + tool-level integration test against seeded `MemoryStorage`."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
files_to_modify:
  - src/trace/index.ts
  - src/trace/types.ts
  - src/trace/cluster.ts
  - src/trace/rank.ts
  - src/trace/labels.ts
  - src/trace/hints.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/server.ts
  - tests/trace/cluster.test.ts
  - tests/trace/rank.test.ts
  - tests/trace/labels.test.ts
  - tests/trace/hints.test.ts
  - tests/trace/build.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tests/trace/fixtures/

claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# V1.5 trace layer — `get_recent_work_context` MCP tool

## What

A new MCP tool that returns *clustered* normalized atoms instead of a flat list. Cluster = connected component over a graph where atoms share artifact identity within a time window. The tool is the V1.5 magic primitive: when an AI client (Cursor, Claude Code) needs cross-tool context, it calls this tool and receives evidence already grouped into coherent work threads — without the user having to phrase what those threads are.

This is the **trace layer (option α)** locked during the V1.5 brainstorm: ship the substrate that makes cross-tool magic possible across the four current sources (claude-code, codex, cursor, git). Wave 4 adapters (GitHub, Slack) are deferred to a parallel thread.

### The MCP tool

```ts
// Registered alongside echo_ping and search_memories in src/mcp/server.ts
{
  name: 'get_recent_work_context',
  description:
    "Retrieve clusters of related events from the user's captured ECHO memories — " +
    "joined by shared artifacts (files, repos, conversations) within a recent time window. " +
    "Use when the user asks open-ended questions about what they were doing, where they " +
    "left off, or to bring prior context (Cursor + Claude Code + Codex + git) into the " +
    "current conversation. Returns one cluster per coherent work thread; the AI client " +
    "decides which to attend to.",
  inputSchema: {
    since?: ISO8601,                    // default: now - 4h
    until?: ISO8601,                    // default: now
    artifact_hint?: {                   // optional anchor
      provider: string,
      type: string,
      id: string,
    },
    limit?: number,                     // max atoms in response (default 100, max 500)
  },
}
```

The tool reads from `Storage` via the existing `query` interface (no new storage method). Storage stays raw and append-only, exactly as item 016 committed.

### Response shape

```json
{
  "schema_version": 1,
  "tool": "get_recent_work_context",
  "query": {
    "since": "2026-05-06T05:00:00Z",
    "until": "2026-05-06T09:00:00Z",
    "artifact_hint": null
  },
  "clusters": [
    {
      "cluster_id": "ctx_a8f3d12c",
      "rank": 1,
      "rank_reason": ["recent_activity", "matches_artifact_hint", "has_open_loop"],
      "label": "work on src/normalize/types.ts",
      "anchor_artifacts": [
        { "provider": "local_fs", "type": "file", "id": "echo::src/normalize/types.ts", "label": "src/normalize/types.ts" },
        { "provider": "claude_code", "type": "conversation", "id": "claude_code:abc-123" }
      ],
      "atom_ids": ["evt_001", "evt_007", "evt_012", "evt_015"],
      "edges": [
        {
          "from": "evt_001", "to": "evt_007",
          "kind": "shared_artifact",
          "artifact_ids": ["local_fs:file:echo::src/normalize/types.ts"],
          "confidence": "high"
        }
      ],
      "open_loop_hints": [
        {
          "atom_id": "evt_015",
          "kind": "unresolved_assistant_q",
          "text": "Should I use A or B?",
          "confidence": "medium"
        }
      ],
      "source_breakdown": { "claude_code": 2, "cursor": 1, "git": 1 },
      "time_range": { "from": "2026-05-06T06:42:11Z", "to": "2026-05-06T08:55:03Z" }
    }
  ],
  "atoms": {
    "evt_001": { "schema_version": 1, "id": "evt_001", "...": "full NormalizedContextEvent" }
  },
  "truncation": {
    "atoms_returned": 4,
    "atoms_total_in_window": 4,
    "clusters_returned": 1,
    "clusters_total": 1,
    "truncated": false
  },
  "warnings": []
}
```

### Why this shape

Decided during brainstorm + codex redline pass:

- **Multiple `clusters[]` (not a single `cluster`).** Users context-switch; collapsing to one cluster is silent loss.
- **Cluster IDs are deterministic-ephemeral.** `cluster_id = "ctx_" + sha256_8(schema_version + sorted(atom_ids))`. Same atoms → same id. No traces table in V1.5.
- **Atoms returned inline as a top-level `atoms` map.** No second MCP roundtrip; clusters reference atoms by id; deduplicates if a future relaxation lets atoms appear in multiple clusters.
- **Edges are explicit (`kind: 'shared_artifact'`)** with a future-list (`temporal_near | same_conversation | state_transition | same_actor | semantic_similarity`). V1.5 ships only `shared_artifact`.
- **Open-loop hints are enriched at the trace layer**, not stored on atoms. Atom-side hints (`open_loop_hints?: string[]` on `NormalizedContextEvent`) are cheap regex hits; trace layer turns them into `{kind, text, confidence}` for clusters. Resolution stays V2.
- **Ranking has `rank` + `rank_reason`, no `score`.** A numeric score without a calibrated formula misleads consumers. Default sort: recent_activity → artifact_hint_match → open_loop_hint → cluster_size.
- **`label?` is optional, heuristic-only.** No LLM call. AI client can synthesize naming if the heuristic is bad.
- **`warnings[]` at response level only.** Cluster-level warnings deferred until a use case surfaces.

### Algorithm

```
buildRecentWorkContext(events, query, normalize):
  # 1. Normalize and filter
  atoms = events
    .map(e => normalize(e))
    .filter(a => a !== null)
    .filter(a => parseISO(a.time.occurred_at) ∈ [query.since, query.until])

  # 2. Build artifact->atoms index
  by_artifact = {}
  for atom in atoms:
    for artifact in atom.artifacts:
      key = `${artifact.provider}:${artifact.type}:${artifact.id}`
      by_artifact[key].push(atom.id)

  # 3. Build edge set: pairs sharing an artifact within window_hours
  WINDOW_HOURS = 4
  edges = []
  for atom_ids in values(by_artifact):
    for (a_id, b_id) in pairs(atom_ids):
      a = atoms.find(a_id); b = atoms.find(b_id)
      if abs(a.time.occurred_at - b.time.occurred_at) <= WINDOW_HOURS:
        edges.push({from: a_id, to: b_id, kind: 'shared_artifact', artifact_ids: [shared_keys], confidence: 'high'})

  # 4. Connected components → clusters
  clusters = connected_components(atoms, edges)

  # 5. If artifact_hint provided: filter to clusters that touch it
  if query.artifact_hint:
    hint_key = `${hint.provider}:${hint.type}:${hint.id}`
    clusters = clusters.filter(c => c.atoms.some(a => a.artifacts.some(art => key(art) === hint_key)))

  # 6. For each cluster, compute:
  for cluster in clusters:
    cluster.cluster_id = "ctx_" + sha256_8(schema_version + sorted(cluster.atom_ids))
    cluster.label = labels.heuristic(cluster.atoms)         # may return undefined
    cluster.open_loop_hints = hints.enrich(cluster.atoms)   # string[] → {kind, text, confidence}[]
    cluster.anchor_artifacts = top_n_by_occurrence(cluster.atoms, 3)
    cluster.source_breakdown = count_by(cluster.atoms, a => a.source.app)
    cluster.time_range = {from: min, to: max}

  # 7. Rank
  clusters = rank.sort(clusters, query)
  for i, c in enumerate(clusters): c.rank = i + 1

  # 8. Truncate
  ...

  return response
```

Single-pass. O(N²) on atom pairs in the worst case, but for a 4-hour window with normal usage (~50-200 atoms) this is comfortably under 500ms in plain JS. If later we hit scale, the artifact->atoms index already gives us O(sum-of-degree²) which is much smaller in practice.

The trace layer is **pure**: no `Date.now()`, no FS, no network. The MCP tool wrapper supplies `query.since` / `query.until` defaults (resolved against `Date.now()` at the boundary) and passes `events` from `storage.query`. Tests can call `buildRecentWorkContext` with synthetic clock without any module-level mocking.

### Ranking detail (`src/trace/rank.ts`)

Signal scoring is internal — only `rank` (1-indexed integer) and `rank_reason` (string list) are exposed. Internal calculation:

```
priority(cluster, query):
  reasons = []
  if any(atom.time.occurred_at within last 1h):    reasons += "recent_activity"
  if query.artifact_hint and cluster touches it:    reasons += "matches_artifact_hint"
  if cluster.open_loop_hints.length > 0:            reasons += "has_open_loop"
  if cluster.atom_ids.length >= 5:                  reasons += "dense"
  if cluster.source_breakdown has ≥3 distinct apps: reasons += "cross_tool"

# Sort key: tuple comparison, descending
sort_key = (
  query.artifact_hint && touches_hint ? 1 : 0,         # hint match dominates
  has_open_loop ? 1 : 0,
  recent_activity ? 1 : 0,
  cluster.atom_ids.length,
  -median_age,                                          # newer wins ties
)
```

Stable, debuggable, no embeddings. The `rank_reason` strings let the AI client see *why* a cluster ranks where it does without exposing a synthetic score.

### Label heuristic (`src/trace/labels.ts`)

Goal: a one-line phrase that helps the AI client present the cluster. Optional — if the heuristic produces nothing useful, the field is omitted.

```
heuristic(atoms):
  # 1. Find dominant artifact: most occurrences across cluster's atoms
  artifact_counts = count_artifacts_across(atoms)
  if max_count < 2: return undefined   # not really a "shared work thread"
  dominant = top_artifact(artifact_counts)

  # 2. Pick verb from action.kind on majority of atoms
  verb = mode(atoms.map(a => a.action.verb || a.action.kind))
  verb = humanize(verb)   # 'message' → 'discussion about', 'commit' → 'work on', 'edit' → 'edits to'

  # 3. Compose
  artifact_label = dominant.label || tail(dominant.id)
  return `${verb} ${artifact_label}`
```

Example outputs:
- `"discussion about src/normalize/types.ts"`
- `"edits to src/storage/sqlite.ts"`
- `"work on echo repo"`

If the dominant artifact is a `conversation` type with no label and no useful tail, return undefined. AI client falls back to its own naming.

### Open-loop hint enrichment (`src/trace/hints.ts`)

Atoms carry `open_loop_hints?: string[]` from item 016 — cheap regex-detected signals. Trace layer enriches these:

```
enrich(atoms):
  results = []
  for atom in atoms:
    for hint_str in atom.open_loop_hints || []:
      # Map hint_str to {kind, text, confidence}
      switch hint_str:
        case 'ends_with_question':
          text = last_question_in(atom.action.input || '')
          results.push({atom_id: atom.id, kind: 'ends_with_question', text, confidence: 'high'})
        case 'unresolved_assistant_q':
          text = last_question_in(atom.action.output || '')
          results.push({atom_id: atom.id, kind: 'unresolved_assistant_q', text, confidence: 'medium'})
        case 'contains_todo':
          text = first_todo_substring(atom.action.input + atom.action.output)
          results.push({atom_id: atom.id, kind: 'contains_todo', text, confidence: 'high'})
        case 'explicit_followup':
          text = first_match(atom.action.input + atom.action.output, /follow up|come back to|will do later/i)
          results.push({atom_id: atom.id, kind: 'explicit_followup', text, confidence: 'medium'})
  return results
```

Confidence is *signal-quality* (how reliably this hint kind indicates an open loop), not *resolution-status* (whether the loop is actually open). V1.5 does not resolve.

### Tests

Per-module unit tests:

- `cluster.test.ts`: graph construction; connected components on synthetic atoms with known artifact overlaps; time-window edge filtering (atoms 5h apart sharing an artifact = no edge); empty input; single-atom input.
- `rank.test.ts`: each `rank_reason` triggers correctly; tie-breaking by atom count then median-age; `artifact_hint` boost when cluster touches it.
- `labels.test.ts`: dominant-artifact + verb-mode → expected string; edge cases (no dominant artifact, conversation-only cluster, empty cluster).
- `hints.test.ts`: each of the 4 hint kinds enriches correctly; missing input/output handled; multiple hints per atom preserved.
- `build.test.ts`: end-to-end `buildRecentWorkContext` against fixtures; JSON round-trip; schema_version present; truncation flags correct.

MCP tool integration test:

- `tests/mcp/tools/recent-work-context.test.ts`: seed `MemoryStorage` with a realistic mix (10 claude-code turns, 5 cursor edits, 3 codex turns, 4 git commits — all within 4h, with a few sharing artifacts). Boot the MCP server with this storage. Send a `tools/call` for `get_recent_work_context`. Assert clusters formed correctly, ranking respected, atoms inline.

Fixtures live under `tests/trace/fixtures/` — anonymized real `CaptureEvent`s, ideally reused from item 016's fixtures (which the agent for 016 will produce; this item depends on 016 landing first).

## Why

V1 ships the killer-demo loop *mechanically* but doesn't trigger the "when can I pay?" reaction. `wiki/product/v1-spec.md` line 132 names two gaps: bundle incomplete (Wave 4 — GitHub + Slack) AND the cross-tool join not built. V1.5 trace layer (this item) closes the second gap on the four sources already shipped.

The magic is: in your daily Cursor + Claude Code + Codex + git flow, you ask an open-ended question and ECHO returns a *coherent thread* of evidence, automatically joined across tools. You don't tell ECHO "this thread"; ECHO infers it from what you've been touching. That inference is the trace layer.

Why ship α (trace layer) before β (Wave 4 adapters):
- Your daily evidence stream is already 70-80% AI conversations + code. Bundle expansion adds completeness for *external* demos but doesn't change the magic of *your* dogfooding.
- The trace layer is the new architectural primitive. Validating it on 4 sources de-risks the same algorithm running on 6+ sources later.
- α is dogfoodable the day item 016 ships, on the evidence already in your store. β requires accumulating new history.

What V1.5 explicitly does NOT do (per the brainstorm, locked):
- No persisted traces table — clusters are computed on demand
- No LLM-generated labels — heuristic-only
- No open-loop *resolution* — only enrichment of atom-level hints into structured form
- No embeddings — V1.5+ enrichment with `temporal_near` / `same_conversation` / `same_actor` / `semantic_similarity` edge kinds is a future contract addition, not a V1.5 ship
- No automatic context injection — the AI client decides when to call this tool, not ECHO
- No new MCP transport — uses the existing `127.0.0.1:38478` server from item 013

## Acceptance Criteria

- [ ] `src/trace/types.ts` exports the response shape: `RecentWorkContextResponse`, `Cluster`, `Edge`, `OpenLoopHintEnriched`, `Truncation`, `Query`. Plus internal types for the algorithm: `ArtifactKey`, `RankSignals`.
- [ ] `src/trace/cluster.ts` exports `buildGraph(atoms, window_hours): {nodes, edges}` and `connectedComponents(graph): Cluster[]`. Pure functions. Edges only between atoms sharing an artifact AND within window_hours.
- [ ] `src/trace/rank.ts` exports `rankClusters(clusters, query): Cluster[]` (stable sort) and `rankReasonsFor(cluster, query): string[]`. Default sort per the "Ranking detail" section.
- [ ] `src/trace/labels.ts` exports `heuristicLabel(atoms): string | undefined` per the "Label heuristic" section.
- [ ] `src/trace/hints.ts` exports `enrichHints(atoms): OpenLoopHintEnriched[]` per the "Open-loop hint enrichment" section.
- [ ] `src/trace/index.ts` exports `buildRecentWorkContext(events, query, normalize): RecentWorkContextResponse`. Signature: `(events: CaptureEvent[], query: Query, normalize: (e: CaptureEvent) => NormalizedContextEvent | null) => RecentWorkContextResponse`. Pure: no I/O, no clock reads. The caller resolves the time window from `Date.now()` *before* calling.
- [ ] `cluster_id` computed as `"ctx_" + sha256_hex(schema_version + sorted(atom_ids).join(',')).slice(0, 8)`. Deterministic for same atom set.
- [ ] `src/mcp/tools/recent-work-context.ts` exports `registerRecentWorkContext(server, storage)`. Implementation:
  - Validate input schema (defaults: `since=now-4h`, `until=now`, `limit=100` clamped to `[1, 500]`).
  - Call `storage.query({since, until, limit: limit*10})` — overfetch so cluster diversity isn't truncated by the storage query.
  - Run candidates through `normalizeEvent` (imported from `src/normalize/index.ts`); drop nulls.
  - Pass to `buildRecentWorkContext`.
  - Truncate response per `limit` (atoms first, dropping lowest-rank cluster atoms preferentially) — set `truncation.truncated = true` if anything dropped.
  - Return JSON via the SDK's tool-result mechanism.
- [ ] `src/mcp/server.ts` updated to register the new tool alongside `echo_ping` and `search_memories`.
- [ ] **Tests** in `tests/trace/` and `tests/mcp/tools/`:
  - `cluster.test.ts`: graph construction (5+ scenarios including time-window edge filter, no shared artifacts, multiple disjoint components, atoms with empty `artifacts[]`).
  - `rank.test.ts`: each rank_reason fires when expected; tie-breaking by atom count; artifact-hint boost.
  - `labels.test.ts`: each verb mapping; undefined when heuristic fails; conversation-only cluster.
  - `hints.test.ts`: each of 4 hint kinds enriches; missing input/output handled; multiple hints per atom.
  - `build.test.ts`: end-to-end against fixtures from `tests/trace/fixtures/` (or reused from `tests/normalize/fixtures/` once item 016 ships); JSON round-trip; schema_version=1; truncation.truncated bool correct.
  - `tests/mcp/tools/recent-work-context.test.ts`: seeded `MemoryStorage` (~20 atoms across 4 sources, with known cluster structure); MCP `tools/call`; assert response.
- [ ] **Performance test (lightweight)**: a single test seeds 500 atoms (synthetic) and asserts `buildRecentWorkContext` returns in <500ms wall-clock. Skipped on CI if too flaky; always runs locally.
- [ ] Trace module is pure — no `Date.now()`, no FS, no network. Agent runs `grep -RE "Date.now|fs\.|require\('fs'\)|import.*from 'fs'|fetch\(|http" src/trace/` and confirms zero hits.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean.
- [ ] Run log appended to `raw/internal/agent-runs/2026-05-06-018-recent-work-context-tool.md`.

## Out of Scope (Don't Drift)

- **Modifying storage.** `src/storage/*` is read-only input. Storage stays append-only and append-only.
- **Modifying the normalizer.** `src/normalize/*` (item 016) is read-only input — atoms come in, clusters go out. If a normalization bug is discovered during this work, escalate and let item 016's owner fix it; do not patch.
- **Modifying any extractor or the capture pipeline.** Capture-side is unrelated.
- **Persisted traces table.** Clusters are deterministic-ephemeral. Adding a `traces` table with row-per-cluster is V2 territory once Resume Packet shape is decided. Do not write to a new SQLite table.
- **LLM-generated labels.** Heuristic only. No `Anthropic` / `OpenAI` SDK calls. No new dependency.
- **Open-loop *resolution*.** Atoms carry hints; trace layer enriches them with structured form; nobody decides "this loop is now closed." Resolution requires looking at later events and reasoning about whether the question was answered — V2.
- **New edge kinds beyond `shared_artifact`.** `temporal_near`, `same_conversation`, `same_actor`, `state_transition`, `semantic_similarity` are documented as future-list values, not implemented.
- **Embedding-based clustering.** Storage's `embedding` column stays untouched. The clusterer never reads it.
- **Wiring `search_memories` to return normalized atoms.** That's item 017 — separate, sibling.
- **Wave 4 adapters (GitHub, Slack).** Source set stays at 4 (claude-code + codex + cursor + git). Adding adapters is parallel work, not part of this item.
- **Caching.** Compute on every call. If perf regresses, profile then propose a cache item; do not add it preemptively.
- **Auto-injection.** ECHO does not push context to AI clients; clients call this tool when their model decides to. The tool description must make the calling rule clear.
- **Modifying `search_memories`.** Item 014's tool stays as-is.
- **Adding a UI / trace viewer.** Visual surface for traces is V2. This item is API-only.
- **Cross-cluster joining.** A single response = a single graph build. Don't try to find "related clusters across sessions."

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next tasks are:

1. **Promote to wiki:**
   - `wiki/architecture/work-trace.md` (`status: shipped`, replacing the `planned` page that item 016's after-completion notes will create) — documents the trace layer, the algorithm, the open-loop hint enrichment.
   - `wiki/surfaces/mcp-recent-work-context.md` — documents the new MCP tool, its input/output schema, when AI clients should call it (this is the contract Cursor/Claude Code consume).
2. **Update existing wiki pages:**
   - `wiki/architecture/system-architecture.md` — add the trace layer above the normalizer, add the new MCP tool.
   - `wiki/surfaces/mcp-server.md` — now serves three tools (`echo_ping`, `search_memories`, `get_recent_work_context`).
3. **V1.5 dogfooding loop:** the founder uses ECHO daily for ~2 weeks and logs surprises (good and bad clustering) in `raw/internal/dogfooding/2026-05-<dates>-trace-layer.md`. Findings inform the V1.5+ roadmap.
4. **Spec follow-ups based on dogfooding** (predictable candidates):
   - V1.5+ refine label heuristic if it reads as wrong on real clusters
   - V1.5+ add `temporal_near` edge kind if shared-artifact alone misses obvious joins
   - V1.5+ add `same_conversation` edge kind if conversation-internal joins improve clusters
   - V1.6 spec `search_memories` returning normalized atoms (item 017's scope, but informed by trace-layer learnings)
5. **V2 promotion candidates** (do not start without separate brainstorm):
   - Persisted traces table + Resume Packet
   - LLM-generated labels
   - Open-loop resolution
   - Embedding-based edges
   - Trace viewer UI
6. **Update `.manifest.json`** with the new pages and topics.
7. **Regenerate `wiki/index.md`** via `tools/wiki_index.py`.

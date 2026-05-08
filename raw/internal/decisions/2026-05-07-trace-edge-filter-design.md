# V1.5 trace edge-filter + `format` param — design reasoning

**Date:** 2026-05-07
**Status:** committed (spec lives in `backlog/ready/2026-05-07-019-trace-edge-filter-and-format.md`)
**Participants:** founder, Claude Code (this Claude), Codex CLI (founder's other AI session)
**Depends on:** `2026-05-06-018-recent-work-context-tool` (shipped); `2026-05-06-016-read-time-normalizer` (shipped)
**Related:** `2026-05-06-v15-trace-layer-design.md`, dogfooding journal at `raw/internal/dogfooding/mcp-interactions-journal.md`, response sample at `raw/internal/dogfooding/019-trace-response-sample/`

## Problem

V1.5's trace tool shipped item 018 working — the `get_recent_work_context` MCP tool returns clusters of related atoms. But the very first dogfooding call returned **454,871 chars**, which exceeded Claude-in-Cursor's per-tool-result context budget. The response was *too big to use* on the first try.

Forensic analysis (`raw/internal/dogfooding/019-trace-response-sample/`) located the bytes:

- 66% in `atoms[]` (40 atoms × ~7.5KB mean)
  - Within atoms: 48% `action.input`/`output` inline, 49% `artifacts[]`
- 37% in `clusters[]`, of which **96% was `edges[]`** alone (162KB across 3 clusters)
- The dominant cluster contained 36 atoms forming K_36 = 630 edges; **611 of 630 edges (97%) were redundant** — they only restated cluster anchor artifacts (the repo + the conversation)

The signal-bearing edges were the 19 (3%) that connected pairs sharing a *specific file*. Cluster membership was already captured by `cluster.atom_ids[]`; the redundant 611 edges added zero information.

## Roadmap (A / B / C)

The brainstorm settled on a three-part roadmap, ordered by risk and reversibility:

- **A (this item, 019):** Filter redundant edges in place; add `format: 'minimal'` parameter to truncate atom-content. Same response shape, smaller payload. ~95% size reduction in dense clusters with no signal lost.
- **B (deferred, no spec yet):** Replace `edges[]` with a `shared_artifacts[]` summary — `[{artifact_id, role, atom_ids[], apps[]}]`. Lossless representation of `kind: shared_artifact` edges; ~37× smaller than the current edge list in the sample. Schema v2 — breaks consumers reading `edges[]`. Specced after A's dogfooding answers whether AI clients were using edges or just atom_ids.
- **C (deferred, no spec yet):** Re-cluster: connected components over **work-role edges only**, with scope/session attached as cluster annotations rather than membership drivers. Real semantic shift; same data produces different clusters. Specced if A's dogfooding flags repo-driven mega-clusters as a real failure mode.

A is the patch. B is the contract upgrade. C is the structural fix. They compose: A's role-classifier feeds directly into B's `role` field, and B's `shared_artifacts` is exactly what C's clusterer would key on.

## Key brainstorm decisions

### 1. Don't define "redundant" by anchor membership

My first proposal was: drop edges whose artifacts are all in `cluster.anchor_artifacts`. Codex's pushback was sharp: anchor_artifacts is a top-3 frequency rank, not a category. Counterexample — if `src/normalize/types.ts` had been touched by 50 of 60 atoms in a cluster, it'd top the anchor list, and my predicate would filter the most-essential edges.

The right predicate classifies by **role of artifact**, not frequency:

| role | meaning |
|---|---|
| `scope` | broad context (everyone in cluster shares; redundant when restated per pair) |
| `session` | conversational/temporal continuity (high in-session co-occurrence) |
| `work` | concrete work artifacts both atoms touched (real signal) |
| `unknown` | type the registry doesn't recognize — keep edges (generalizability default) |

The predicate becomes: drop iff all roles are in `{scope, session}`.

### 2. Drop session edges in V1.5; revisit if dogfooding misses them

This was the live decision. Two arguments:

- **For dropping** (codex's lean, accepted): same-conversation atoms are already temporally coherent; edges between them within one conversation restate cluster membership. 276/630 edges in the sample were session-only — dropping them = 44% of edges gone, no signal loss in single-conversation clusters.
- **For keeping**: a multi-turn back-and-forth is cohesive; session evidence might be the only thing tying two atoms when no work artifact is shared.

Decision: drop session edges, with the explicit reversibility note. Adding back is cheap if dogfooding flags missing chains; removing later is a breaking change.

### 3. `unknown: keep` is the substrate-correct default

Item 016 committed to open-vocabulary artifact types. New V2 cohorts (sales, legal, medical) will produce types V1's registry doesn't know about (`opportunity`, `matter`, `patient_record`, etc.). Defaulting unknown to `keep` ensures we don't accidentally drop them before the registry is updated.

### 4. Edge filter runs *after* clustering, not during graph construction

If we filtered scope/session edges from the graph before computing connected components, atoms joined only by repo would split into separate clusters. That's option C territory — a deliberate semantic change. For A, cluster membership must be unchanged; only the *response* trims redundant edges.

Concretely: graph + components are computed from the full edge set; the filter runs in step 3 of `buildRecentWorkContext` when `rawCluster` is converted to `Cluster`.

### 5. `format` rides with A, default `'full'`

Should atom-content truncation ship with A or as a separate patch?

Codex's framing: "Default dogfooding mostly observes the edge filter; minimal can be tested intentionally without another schema patch." Accepted. Both changes are orthogonal in code (edge filter in `src/trace/`; truncation in `src/mcp/tools/`); shipping together avoids two agent runs.

The default matters: `'full'` keeps current behavior so we observe the edge-filter effect in default traffic. `'minimal'` is opt-in for a separate parallel observation track. The **default flip to `'minimal'`** is a real product decision, not the parameter introduction — it's its own patch, gated on dogfooding evidence.

### 6. Cap-only truncation, not field omission

Codex: "Avoid omitting fields entirely until there is a real `atoms_summary` contract." Strong agree. `format: 'minimal'` caps `action.input`/`action.output` to 500 chars + suffix; all other atom fields stay full. Atom shape stays valid as `NormalizedContextEvent`; consumers who don't know about `format` see shorter strings, not a different schema.

### 7. Truncation suffix carries fetch hint

The suffix `"… [truncated; <N> chars omitted; fetch full atom via search_memories]"` tells the AI client there *is* a longer version available. A model that hits the marker mid-reasoning has a clear next action.

### 8. A is not "purely additive" semantically

The shape of `cluster.edges[]` is unchanged but its **meaning** shifts: from "all pairwise shared-artifact pairs" to "signal-bearing shared-artifact pairs." That's a contract refinement, not just a filter. The patch must update the wiki and tool description in the same change so future readers don't assume `edges.length === C(N, 2)`.

## What 019 explicitly does NOT do

- **No replacing `edges[]` with `shared_artifacts[]`** — patch B.
- **No re-clustering on work-role only** — patch C.
- **No flipping the default `format`** — separate one-line patch after dogfooding.
- **No truncation beyond `action.input`/`output`** — preserves consumer parser stability.
- **No new MCP tools** — `search_memories` and 017 are unrelated.
- **No registry expansion** beyond V1.5's known types — new types ship with their adapters.

## What 019 will teach us

After ~1 week of dogfooding:

- **Did the edge filter visibly help?** Response sizes should drop sharply on real queries. The smoke script already asserts non-K_n; we'll observe whether the founder still hits context-budget issues.
- **Did Claude-in-Cursor's response quality change?** Better, worse, or the same? This is the signal that drives B's design.
- **Did the founder use `format: 'minimal'`?** If never invoked, the parameter was wrong-shaped or undiscoverable. If used and helpful, the default-flip becomes obvious.
- **Did the truncation suffix actually trigger search_memories follow-ups?** This tells us whether AI clients act on the hint or ignore it.
- **Did any cluster surface as obviously over-joined?** I.e., conflating two distinct work threads into one cluster because they share repo+conversation. That's the signal that C is urgent vs. nice-to-have.

These observations are the input to B's spec and C's brainstorm.

## Conversation artifacts referenced

- This Claude Code session, 2026-05-07.
- Codex CLI session (founder's other AI), 2026-05-07: provided the role taxonomy critique, the `unknown: keep` generalizability default, the cap-only-truncation principle, the same-patch-with-default-full sequencing, and the framing that A is not purely additive semantically.
- `raw/internal/dogfooding/019-trace-response-sample/` — the live response data that produced the 97%-redundant-edges measurement and the role taxonomy validation.
- `raw/internal/dogfooding/019-trace-response-sample/edge-graph.md` — the visualized green/red edge classification.

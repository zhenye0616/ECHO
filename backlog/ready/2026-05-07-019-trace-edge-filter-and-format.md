---
id: 2026-05-07-019-trace-edge-filter-and-format
title: V1.5 trace patch — drop redundant edges + add `format` param
status: ready
priority: HIGH
estimate: 0.75d
created: 2026-05-07
spec_refs:
  - backlog/complete/2026-05-06-018-recent-work-context-tool.md
  - backlog/complete/2026-05-06-016-read-time-normalizer.md
  - raw/internal/decisions/2026-05-06-v15-trace-layer-design.md
  - raw/internal/decisions/2026-05-07-trace-edge-filter-design.md
  - raw/internal/dogfooding/2026-05-07-trace-response-sample/edge-graph.md
  - raw/internal/dogfooding/2026-05-07-trace-response-sample/curated-preview.json
  - wiki/architecture/work-trace.md
  - wiki/surfaces/mcp-recent-work-context.md
blocked_by: []
acceptance:
  - "New file `src/trace/role.ts` exports `type ArtifactRole = 'work' | 'session' | 'scope' | 'unknown'` and `roleOf(artifactType: string): ArtifactRole`. Initial registry per the \"Type → role registry\" section below."
  - "Edge predicate: `src/trace/cluster.ts` (or wherever `buildGraph` lives) drops shared-artifact edges where ALL `artifact_ids` resolve to roles in `{scope, session}`. Edges retain ALL artifact_ids that justified them (don't trim per-edge). The predicate runs once on the final edge list, not during graph construction (see \"Where the filter runs\" below)."
  - "`format?: 'full' | 'minimal'` parameter added to `get_recent_work_context` MCP tool input schema. Default `'full'` (existing behavior). Echoed in `response.query.format`."
  - "When `format === 'minimal'`: `action.input` and `action.output` are capped to first 500 chars per atom; all other atom fields stay full. Truncation suffix: `\"… [truncated; <N> chars omitted; fetch full atom via search_memories]\"` where N is the number of chars dropped. No other field is modified or omitted."
  - "Atom shape stays valid as `NormalizedContextEvent` even in minimal — i.e., consumers who don't know about `format` can still parse the response. Only string content shrinks."
  - "`tools/mcp-integration-smoke.sh` extended: after seeding (or against live storage), call `get_recent_work_context` with default args; assert that for any cluster with >= 5 atoms, `cluster.edges.length` is strictly less than `C(N, 2)` — i.e., the predicate visibly trims redundant edges."
  - "`wiki/architecture/work-trace.md` updated to document that `edges[]` is **signal-bearing** (carries ≥1 work-role artifact), not exhaustive pairwise cluster membership. `cluster.atom_ids[]` is the membership index. Add a short paragraph explaining the role taxonomy."
  - "`wiki/surfaces/mcp-recent-work-context.md` updated: tool description, input schema (with new `format`), response schema, and a one-sentence callout that `edges[]` is signal-bearing — clients should not assume `edges.length === C(N, 2)`."
  - "Tool description string in `src/mcp/tools/recent-work-context.ts` updated to mention the `format` parameter and the signal-bearing edge semantic. The description is the AI-client-facing contract — if AI clients are to use `format: 'minimal'`, they need to know it exists."
  - "Tests in `tests/trace/`:"
  - "  - `role.test.ts`: every initial type maps to its expected role; unknown types map to `'unknown'`; case-sensitivity is documented (we recommend lowercase, but registry must handle the actual values adapters emit)."
  - "  - `cluster.test.ts` (extend): synthetic atoms forming a tightly-coupled K_n via shared repo+conversation produce 0 edges after filtering; mixed cluster (scope+session+work artifacts) preserves work-bearing edges only."
  - "  - `build.test.ts` (extend): integration test that asserts response invariants — every retained edge has at least one work-role or unknown-role artifact; cluster.atom_ids unchanged by filter; rank/rank_reason unchanged."
  - "Tests in `tests/mcp/tools/recent-work-context.test.ts` (extend):"
  - "  - `format: 'minimal'` truncates `action.input`/`action.output` to ≤500 chars + suffix; other fields untouched."
  - "  - `format: 'full'` (and omitted format) preserves current behavior bit-for-bit on a fixture call."
  - "  - `response.query.format` echoes the request value (or default `'full'` when omitted)."
  - "  - Truncation suffix message format is asserted exactly so AI clients can rely on it."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
  - "Run log appended to `raw/internal/agent-runs/2026-05-07-019-trace-edge-filter-and-format.md`."
files_to_modify:
  - src/trace/role.ts
  - src/trace/cluster.ts
  - src/trace/types.ts
  - src/trace/index.ts
  - src/mcp/tools/recent-work-context.ts
  - tests/trace/role.test.ts
  - tests/trace/cluster.test.ts
  - tests/trace/build.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tools/mcp-integration-smoke.sh
  - wiki/architecture/work-trace.md
  - wiki/surfaces/mcp-recent-work-context.md

claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# V1.5 trace patch — drop redundant edges + `format` parameter

## What

A targeted patch on top of item 018 that addresses two bloat sources surfaced by first-day dogfooding:

1. **Edge bloat:** the V1.5 trace tool returns all pairwise shared-artifact edges. In a tightly-coupled cluster (e.g., 36 atoms in one Claude Code session in one repo), this is K_36 = 630 edges, of which 97% restate cluster membership without adding signal. Patch: drop edges whose shared artifacts are all `scope` or `session` role.
2. **Atom-content bloat:** each atom inlines full `action.input` / `action.output`, ~48% of per-atom bytes. Patch: optional `format: 'minimal'` query parameter caps both fields to 500 chars with a suffix telling the AI client how to fetch the full version. Default stays `'full'`; opt-in only.

The patch is small (~50 LOC of code, plus tests and docs). Together with item 018, the trace layer's response is ~95% smaller in dense clusters with **no signal lost** — confirmed by the dogfooding analysis in `raw/internal/dogfooding/2026-05-07-trace-response-sample/`.

This is **patch A** of a three-part roadmap (A/B/C) settled in `raw/internal/decisions/2026-05-07-trace-edge-filter-design.md`. B (`shared_artifacts[]` schema replacement) and C (work-role-only clustering) are parked until A's dogfooding surfaces real signal.

## Type → role registry (`src/trace/role.ts`)

The role taxonomy classifies what a shared artifact tells you about a pair of atoms.

| role | meaning | examples |
|---|---|---|
| `scope` | the broad context both atoms operate within (everyone in cluster shares; restating is redundant) | `repo`, `workspace`, `account`, `org` |
| `session` | continuous conversational/temporal thread | `conversation`, `thread`, `channel` |
| `work` | concrete work artifact both atoms touched (real cross-tool / cross-time signal) | `file`, `pr`, `issue`, `branch`, `commit`, `doc`, `crm_record`, `task`, `meeting`, `email_thread`, `record` |
| `unknown` | type the registry doesn't recognize — **keep edges, generalizability default** | (any new V2+ type before registry is updated) |

```ts
const TYPE_TO_ROLE: Record<string, ArtifactRole> = {
  repo: 'scope', workspace: 'scope', account: 'scope', org: 'scope',
  conversation: 'session', thread: 'session', channel: 'session',
  file: 'work', pr: 'work', issue: 'work', branch: 'work', commit: 'work',
  doc: 'work', crm_record: 'work', task: 'work', meeting: 'work',
  email_thread: 'work', record: 'work',
};

export function roleOf(artifactType: string): ArtifactRole {
  return TYPE_TO_ROLE[artifactType.toLowerCase()] ?? 'unknown';
}
```

The registry is V1.5's best guess. It's deliberately small. New types will appear in V2+ adapters; `unknown: keep` ensures generalizability — we don't accidentally drop future Salesforce/legal/medical artifacts before the registry is updated.

## Edge filter — semantics

For each edge, look up `roleOf(artifact_type)` for every artifact_id in `edge.artifact_ids` (the artifact's type is parseable from the canonical id, or kept as a separate field — see "Where the filter runs"). Drop the edge iff **all** roles are in `{scope, session}`.

In other words: **keep any edge whose shared set includes at least one `work` or `unknown` artifact**. The predicate is permissive — we err toward preserving signal and let consumers filter further.

### What the consumer should now expect

This is a **semantic refinement** of `cluster.edges[]`:

- **Before this patch:** `cluster.edges[]` enumerated all C(N, 2) atom pairs sharing any artifact within the time window.
- **After this patch:** `cluster.edges[]` enumerates pairs sharing at least one **work or unknown** artifact. Pairs joined only by scope or session artifacts are absent.
- **Cluster membership is unchanged.** `cluster.atom_ids[]` carries membership; `edges[]` carries cross-atom evidence beyond membership.

This is a behavior change visible to any consumer that previously assumed `edges.length === C(N, 2)`. The wiki + tool description must call this out in the same patch.

## Where the filter runs

The edge filter must run **after** `connectedComponents` produces clusters, not during graph construction. Two reasons:

1. **Cluster membership must not change.** If we filter scope/session edges out of the graph before computing components, atoms joined only by `repo` would split into separate clusters. That's option C territory — out of scope here.
2. **Filtering is per-cluster decoration, not graph topology.** The cluster's atoms are already connected via the broader graph (including scope/session edges); we just don't return the redundant ones in the response.

Concretely: in `src/trace/index.ts` step 3 (where each `rawCluster` is converted to a `Cluster`), filter `rc.edges` before assigning to `cluster.edges`. `connectedComponents` and the cluster's `atom_ids` are produced from the unfiltered graph.

## `format` parameter

```ts
// Tool input schema (extension)
{
  since?: ISO8601,
  until?: ISO8601,
  artifact_hint?: { provider, type, id },
  limit?: number,
  format?: 'full' | 'minimal',  // NEW; default 'full'
}
```

`format: 'minimal'` caps `action.input` and `action.output` per atom:

```ts
function truncateForMinimal(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= 500) return s;
  const dropped = s.length - 500;
  return s.slice(0, 500) + `… [truncated; ${dropped} chars omitted; fetch full atom via search_memories]`;
}
```

No other field is touched. The atom is still a valid `NormalizedContextEvent`; consumers who don't know about `format` see the truncation as just a shorter string.

`response.query.format` echoes the request (or `'full'` if omitted).

### Why keep fields, just truncate

Codex's framing during the brainstorm (recorded in the design note): "Avoid omitting fields entirely until there is a real `atoms_summary` contract." Keeping the same atom shape means consumers don't need branching parser logic. The minimal/full distinction is a *content cap*, not a *schema variant*.

## Default policy

Default stays `'full'`. Reasons:

- Behavior change for existing consumers must be deliberate. Default-flipping deserves its own patch + dogfooding window.
- Phase 1 (this patch): observe whether the **edge filter alone** changes AI client response quality.
- Phase 2 (separate later patch, no spec yet): if the dogfooding journal supports it, flip the default to `'minimal'`. That's the real product decision; this patch only introduces the lever.

The dogfooding journal at `raw/internal/dogfooding/2026-05-07-trace-layer.md` should run two parallel observation tracks once this lands: (a) default-traffic observations capture the edge-filter effect; (b) intentional `format: 'minimal'` calls on the same queries observe the truncation effect in isolation.

## Why

V1.5's trace tool shipped working but, as captured in `raw/internal/dogfooding/2026-05-07-trace-response-sample/`, produced 454K responses for ordinary queries — too large for Claude-in-Cursor's context budget on the very first dogfooding call. Forensic analysis showed:

- `clusters[]` was 37% of the response, almost entirely `edges[]` (162KB)
- `atoms[]` was 66% of the response, dominated by inline `action.input`/`output` (48% of atom bytes)
- Of the 630 edges in the dominant cluster, **97% were redundant** — they only restated artifacts every cluster member shared by definition

The cheap structural fix (this patch) drops the redundant 97%. The opt-in atom truncation gives consumers a lever for the orthogonal bloat source. Together they make `get_recent_work_context` actually usable in the founder's daily workflow without losing signal.

The deeper design question — should clustering itself be re-thought to use only work-role edges as cluster-membership evidence, with scope/session as annotations? — is captured as item C in the design note. It's the right structural fix, but it's a **semantic shift** (clusters return differently for the same data) and needs its own brainstorm + spec. Dogfooding the present patch is what tells us whether C is urgent or can wait.

## Acceptance Criteria

- [ ] `src/trace/role.ts` exports `ArtifactRole` type and `roleOf(artifactType: string): ArtifactRole`. Initial registry per the "Type → role registry" section. `unknown` for any unrecognized type.
- [ ] `src/trace/cluster.ts` or `src/trace/index.ts` applies the edge filter **after** `connectedComponents`, **before** assigning to `cluster.edges`. The graph used for component detection is unfiltered.
- [ ] Edge filter predicate: drop iff `every(artifact_id, roleOf(parseType(id)) in {scope, session})`. Keep otherwise. Edge `artifact_ids` are NOT trimmed (kept full when edge is retained).
- [ ] `src/trace/types.ts` extends `Query` with `format?: 'full' | 'minimal'` and adds the same to the `query` echo.
- [ ] `src/mcp/tools/recent-work-context.ts` accepts `format` parameter, defaults `'full'` when omitted, validates against the union, and applies `truncateForMinimal` to each atom's `action.input` and `action.output` only when `format === 'minimal'`.
- [ ] Truncation suffix exactly: `"… [truncated; <N> chars omitted; fetch full atom via search_memories]"` where `<N>` is the count of dropped characters.
- [ ] `response.query` includes `format` field reflecting the request (or `'full'` if omitted).
- [ ] Tool description in `recent-work-context.ts` mentions the `format` parameter (concise — one sentence) and notes that `edges[]` is signal-bearing.
- [ ] **Tests** in `tests/trace/`:
  - [ ] `role.test.ts`: every initial-registry type returns the expected role; `roleOf('something_unknown')` returns `'unknown'`; uppercase/lowercase variants are handled per the registry's `.toLowerCase()` normalization.
  - [ ] `cluster.test.ts` (extend): synthetic K_5 atoms sharing only repo+conversation produce **0** edges after filter. K_5 atoms sharing repo+conversation+one-shared-file produce edges only between the file-sharing pairs.
  - [ ] `build.test.ts` (extend): on a fixture cluster, every retained edge has at least one artifact whose role is `'work'` or `'unknown'`; `cluster.atom_ids` and `cluster.rank_reason` are unchanged from pre-filter behavior.
- [ ] **Tests** in `tests/mcp/tools/recent-work-context.test.ts`:
  - [ ] `format: 'minimal'` caps `action.input`/`action.output` to 500 chars + exact-suffix; other fields (`source`, `actors`, `artifacts`, `time`, `conversation`, `context`, `provenance`, `open_loop_hints`) are bit-for-bit identical to the `'full'` response.
  - [ ] `format: 'full'` and omitted format produce identical responses; both echo `query.format === 'full'`.
  - [ ] `query.format` echoes whatever the caller sent (including invalid values? — the schema validator rejects invalid values; test the rejection).
  - [ ] Atoms whose `action.input` ≤ 500 chars are unmodified in `'minimal'` mode (i.e., no spurious suffix).
- [ ] `tools/mcp-integration-smoke.sh` extended: assert that any cluster with `atom_ids.length >= 5` has `edges.length < (N * (N-1) / 2)` — i.e., predicate observably trims redundant edges in real data.
- [ ] `wiki/architecture/work-trace.md`: short paragraph documenting (a) `edges[]` semantic refinement post-019, (b) the role taxonomy, (c) the `unknown: keep` generalizability default. Cross-reference this item.
- [ ] `wiki/surfaces/mcp-recent-work-context.md`: input schema includes `format`; response schema callout that `edges[]` is signal-bearing; consumer notice that `edges.length === C(N, 2)` is no longer guaranteed. Cross-reference this item.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/2026-05-07-019-trace-edge-filter-and-format.md`.

## Out of Scope (Don't Drift)

- **Replacing `edges[]` with `shared_artifacts[]`.** That's patch B in the design-note roadmap. Same patch would change schema substantially; deferred until A's dogfooding tells us whether to spec B.
- **Re-clustering on work-role artifacts only.** That's patch C. Real semantic shift in cluster output for the same data; needs its own brainstorm. Out of scope here.
- **Flipping the default `format` to `'minimal'`.** Default stays `'full'`. The flip is a separate one-line patch after dogfooding produces evidence supporting it.
- **Truncating any atom field beyond `action.input`/`output`.** The cap-only-content principle is deliberate; expanding it requires a real `atoms_summary` contract design. Not in this patch.
- **Adding new artifact types to the registry beyond V1.5.** Only the listed types. New types get added when adapters that emit them ship.
- **Changing `roleOf` to take more than `artifactType`.** The classifier is deliberately one-arg. Adding context (cluster size, atom count, etc.) is a richer policy that deserves its own design.
- **Modifying the normalizer.** `src/normalize/*` is read-only input.
- **Modifying capture / extractors / storage.** This patch is read-time only.
- **Adding `format: 'summary'` or any third format value.** Two values for V1.5; expansions deferred.
- **Adding new MCP tools or modifying `search_memories`.** Item 017 territory; separate.
- **Persisted traces / cluster cache / new SQLite tables.** Same as 018: clusters stay deterministic-ephemeral.

## After Completion (Strategist Notes)

1. **Update the dogfooding journal** with the first observations after 019 ships:
   - Did `edges.length` drop visibly on real queries?
   - Did Claude-in-Cursor's response quality change in either direction (qualitative)?
   - Did the founder hit `format: 'minimal'` opt-in ergonomics — i.e., is the truncation suffix discoverable enough that AI clients chain a `search_memories` follow-up when they need the full atom?
2. **Plan B spec only after ~1 week** of A dogfooding. The dogfooding signal that matters: did `edges[]` carry signal we underestimated, or were `atom_ids` + cluster anchors + open-loop hints enough? If the latter, B (`shared_artifacts[]`) becomes a clean upgrade. If the former, B's design needs to preserve what edges were carrying.
3. **Plan C spec only if** dogfooding journal flags real over-clustering pain — i.e., a single repo/conversation produces a mega-cluster that conflates distinct work threads, AND atom_ids/anchor_artifacts are insufficient to disentangle. Until then, C is theoretical.
4. **Wiki updates land with the patch** (per founder's delegation of wiki promotion to the implementation agent for items 016/018 onward). Strategist verifies on next pass that the cross-references and topic taxonomy are coherent.
5. **No `_followups.md` entry** is expected from this item unless the agent surfaces a corner case during implementation. The brainstorm is unusually well-traced (decision note + dogfooding sample + brainstorm transcript); the agent should mostly execute against acceptance.

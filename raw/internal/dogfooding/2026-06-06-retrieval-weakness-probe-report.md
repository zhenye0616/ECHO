# Retrieval Weakness Probe Report — 2026-06-06

## Scope

This report grounds the retrieval-strategy critique in live ECHO actions, not code inspection alone.

Primary corpus under test:
- Repo: `/Users/zhenye/Desktop/Project_echo`
- Main Claude walkthrough atom: `6159cf3f-6ed0-41bd-8d44-046471a58ee4`
- Claude session: `5fd2bd27-1f23-4895-a302-784cded32ef7`
- Codex session: `019e9e39-fad9-7e10-8e86-67a5d4c88963`
- Main probe window: `2026-06-06T18:00:00.000Z` to `2026-06-06T19:10:00.000Z`

## Executive Finding

The retrieval strategy is structurally sound for evidence-backed work recall, but the live probes expose four concrete weak points:

1. Literal search is too brittle for normal human phrasing, typo repair, and separator normalization.
2. Open-ended ranking can prefer older unresolved/open-loop work over newer current work.
3. Cross-tool clustering can fragment because repo artifacts are normalized differently by adapter metadata.
4. Cluster diagnostics hide membership causes when edges are filtered as scope/session-only.

The most important root cause is not generic "weak artifacts"; it is inconsistent artifact identity across adapters, especially repo identity.

## Probe Results

### Probe 1 — Walkthrough Phrase Variation

Query:
`search_memories(source_app=claude_code, repo_path=/Users/zhenye/Desktop/Project_echo, query="detail walk through", limit=10)`

Result:
`matches: []`, `total_returned: 0`

Contrast query:
`query="walkthrough"`

Result:
Returned `6159cf3f-6ed0-41bd-8d44-046471a58ee4` at `2026-06-06T18:30:54.636Z`.

Root cause:
`search_memories` is literal substring search. It does not normalize `walk through` to `walkthrough`.

### Probe 2 — Separator Normalization

Query:
`search_memories(... query="normalize trace rank")`

Result:
`matches: []`, `total_returned: 0`

Contrast query:
`query="normalize→trace→rank"`

Result:
Returned `6159cf3f-6ed0-41bd-8d44-046471a58ee4`.

Root cause:
No separator/token normalization. ASCII word-separated fallback text misses the Unicode-arrow phrase.

### Probe 3 — Typo Repair

Query:
`search_memories(... query="current progress", since=2026-06-06T18:00:00Z, until=2026-06-06T19:00:00Z)`

Result:
`matches: []`, `total_returned: 0`

Contrast query:
`query="current ptogrss"` over the same window.

Result:
Returned `5644a051-37e4-4e46-a0ef-ac0d44b671e2`, whose captured user text was:
`use echo to understand where we left off. also i want a very accurate checkpoint on where the current ptogrss is`

Additional observation:
Without the time window, `query="current progress"` returned older unrelated builder-monitoring memories from `2026-06-03`.

Root cause:
No fuzzy matching or typo tolerance. Broad unscoped literal search can also produce plausible but wrong older matches.

### Probe 4 — Concept Compression / Stopword Sensitivity

Query:
`search_memories(... query="cognitive debt months sprinting", since=2026-06-06T18:00:00Z, until=2026-06-06T19:00:00Z)`

Result:
`matches: []`, `total_returned: 0`

Contrast query:
`query="cognitive debt from months of sprinting"`

Result:
Returned `c3de87b9-b0a9-4554-aa56-c5740c0d1e7f`, the founder's setup turn for the walkthrough.

Root cause:
The search surface has no token-based AND matching. Removing stopwords changes the contiguous substring and misses.

### Probe 5 — Open-Ended Cluster Ranking

Query:
`find_clusters(repo_path=/Users/zhenye/Desktop/Project_echo, since=2026-06-06T18:00:00Z, until=2026-06-06T19:00:00Z, window_hours=4)`

Result:
Rank 1:
- `cluster_id`: `ctx_b9d6cb4d`
- label: `discussion about Project_echo`
- source breakdown: `claude_code: 6`
- time range: `18:12:30 -> 18:30:54`
- reasons: `recent_activity`, `has_open_loop`, `has_unresolved_open_loop`, `code_session_anchor`, `dense`

Rank 2:
- `cluster_id`: `ctx_2b985fd1`
- label: `discussion about ECHO`
- source breakdown: `codex: 5`
- time range: `18:39:47 -> 18:55:50`
- reasons: `recent_activity`, `code_session_anchor`, `dense`

Follow-up:
`get_atoms(... prefer=newest_first, fields=["content"], view=compact)` confirmed the rank-2 cluster contained the newer current Codex evaluation thread.

Root cause:
Open-loop and density can outrank freshness. This is useful for "what unresolved thread should I return to?" but weak for "what is the latest/current activity?"

### Probe 6 — Default Resume Ranking

Query:
`find_clusters(repo_path=/Users/zhenye/Desktop/Project_echo)` with no explicit `since`/`until`.

Result:
The 4h default window returned the same top ordering:
- Rank 1: Claude walkthrough cluster `ctx_b9d6cb4d`
- Rank 2: newer Codex audit cluster `ctx_6fc1b539`

Root cause:
The default resume mode is tuned toward open-loop recovery. It does not provide an explicit "latest activity" mode.

### Probe 7 — Repo Artifact Identity Split

Query A:
`get_recent_work_context(... artifact_hint={provider:"local", type:"repo", id:"local:/Users/zhenye/Desktop/Project_echo"})`

Result:
Returned only the Claude cluster:
- `source_breakdown: {"claude_code": 6}`
- matched local repo artifact `local:/Users/zhenye/Desktop/Project_echo`

Query B:
`get_recent_work_context(... artifact_hint={provider:"github", type:"repo", id:"https://github.com/zhenye0616/ECHO"})`

Result:
Returned only the Codex cluster:
- `source_breakdown: {"codex": 6}`
- matched GitHub repo artifact `https://github.com/zhenye0616/ECHO`

Root cause:
`repo_path` scopes candidate events by metadata, but the graph still joins by normalized repo artifact IDs. Claude lacked `origin_url` and normalized to a local repo artifact; Codex had `git.origin_url` and normalized to a GitHub repo artifact. Same checkout, split graph.

### Probe 8 — Diagnostic Surface Hides Membership Cause

Observed in:
`get_recent_work_context(... format=minimal)` over the same window.

Result:
Codex cluster `ctx_2b985fd1` / `ctx_6fc1b539` had `edges: []` while still forming a valid cluster.

Root cause:
The graph uses scope/session artifacts for membership, but response edges filter out scope/session-only edges. That is good for UI noise reduction, but bad for debugging retrieval. The response needs a separate compact `joined_by` / `membership_artifacts` diagnostic.

### Probe 9 — Body Fetch Budget

Query:
`get_atoms(12 ids from both clusters, prefer=newest_first, format=minimal, view=rich)`

Result:
Returned 7 atoms and dropped 5:
`atoms_dropped: 5`

Dropped IDs:
- `3dc3dd13-d622-489e-8a0e-e542cdf500ca`
- `0b8d30f0-1eb3-4009-b6b8-f36f5473313b`
- `c3de87b9-b0a9-4554-aa56-c5740c0d1e7f`
- `e921c2da-5708-4795-8587-f5f32d8c2660`
- `5644a051-37e4-4e46-a0ef-ac0d44b671e2`

Root cause:
This is expected behavior under the 25k envelope and prefix-drop policy. For realistic large turns, one-shot hydration of multiple clusters is lossy unless callers use `fields` projection, chunking, or `get_atom` selectively.

## Root Cause Summary

### Confirmed Retrieval Weaknesses

- Literal matching is too exact for user language.
- Broad unscoped literal search can return older plausible wrong hits.
- Default cluster ranking conflates "resume unresolved work" with "latest current work."
- Repo artifacts are not canonical across adapters.
- `repo_path` is a filter, not a graph-join key.
- Diagnostics do not expose hidden membership artifacts.
- Body hydration requires careful staged fetching.

### What Did Not Look Broken

- ECHO did not lose the memories. The target atoms existed and were recoverable.
- `find_clusters` formed coherent clusters according to its current graph rules.
- `get_atoms(prefer=newest_first)` behaved correctly under its documented budget rule.
- `get_atom` remains the right escape hatch for one full body.

## Recommended Fix Order

1. Canonicalize repo artifact identity across adapters.
   - Prefer one stable repo identity per local checkout.
   - If remote URL is missing in one source but present in another for the same `repo_root`, converge them.
   - Consider emitting both local and remote repo artifacts when both are known.

2. Add cluster diagnostic fields.
   - `joined_by`: compact top membership artifacts.
   - `filtered_edge_count` or `hidden_scope_session_edges`.
   - This keeps UI edges clean while making retrieval debugging explainable.

3. Add retrieval modes or rank profiles.
   - `resume_open_loop` for current behavior.
   - `latest_activity` where freshness outranks unresolved assistant questions.
   - Possibly `cross_tool_handoff` where cross-source joins are boosted.

4. Add lightweight query normalization before semantic search.
   - Normalize arrows and separators.
   - Token-based AND fallback for short queries.
   - Typo-tolerant fallback only after exact search returns empty.

5. Make hydration guidance first-class.
   - Encourage `find_clusters -> get_atoms(fields=["content"], prefer=newest_first)` for previews.
   - Use chunking for multiple clusters.
   - Use `get_atom` only for selected full bodies.

## Bottom Line

The retrieval system is not failing to capture; it is failing in recoverability ergonomics. The most damaging issue is cross-tool graph fragmentation from inconsistent repo artifact identity. Fixing that will improve the actual ECHO promise more than adding embeddings first.

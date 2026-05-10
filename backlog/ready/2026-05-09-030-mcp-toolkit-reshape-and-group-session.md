# MCP V1.6 reshape — atomic decomposition (`find_clusters` + `get_atoms`) + group session subscription (`wait_for_new_turns`); deprecate `get_recent_work_context`

> **Strategist note (2026-05-09):** frontmatter intentionally omitted to keep the originating session a strategist conversation. The claiming builder will populate the standard frontmatter (`id`, `status`, `priority`, `estimate`, `created`, `claimed_by`, `claimed_at`, `branch`, `worktree`, `head_sha`, `pr_url`, `agent_notes`, `review_notes`, `spec_refs`, `blocked_by`, `acceptance`, `files_to_modify`) at atomic-claim time, lifting the acceptance bullets verbatim from the **Acceptance Criteria** section below.
>
> **Spec refs the claiming builder will need:** `src/mcp/tools/recent-work-context.ts`, `src/mcp/tools/search-memories.ts`, `src/mcp/tools/tail-session.ts`, `src/mcp/tools/echo-ping.ts`, `src/mcp/util/source-app.ts`, `src/mcp/wire-shape/`, `src/trace/index.ts`, `src/storage/`, `wiki/architecture/system-architecture.md`, `wiki/architecture/storage.md`, `wiki/surfaces/mcp-server.md`, `wiki/surfaces/mcp-recent-work-context.md`, `wiki/surfaces/mcp-search-memories.md`, `wiki/surfaces/mcp-tail-session.md`, `backlog/complete/2026-05-08-027-mcp-stateless-transport.md`, `backlog/complete/2026-05-08-028-rwc-envelope-skeleton-format.md`, `backlog/_followups.md` (the "MCP retrieval — long-turn elision + envelope caps" entry).
>
> **Blocked by:** none. Can claim immediately. Item 029 (`backlog/ready/2026-05-09-029-cursor-source-breakdown-falsification.md`) is in flight in parallel; the two items touch overlapping surfaces (`src/trace/index.ts`, `src/mcp/tools/recent-work-context.ts`). 029 ships first OR 030's claimer rebases against 029's branch on completion. The merge order: 029 → 030. (The reverse order is OK if 029 surfaces a Phase-1 finding that materially changes 030's design — claimer of 030 should pause + check before merging.)
>
> **Companion item (post-shipping 030):** item 031 will *remove* `get_recent_work_context` after the 1–2 week dogfooding period. Spec drafted at completion of 030.

## What

Three changes to the MCP toolkit, shipped as one V1.6 reshape:

1. **Decompose** `get_recent_work_context` into two atomic tools — `find_clusters` (cheap cross-source discovery) and `get_atoms` (targeted body fetch). Mark `get_recent_work_context` deprecated; remove in item 031 post-dogfooding.
2. **Add** `wait_for_new_turns` — a stateless long-poll primitive that blocks until new content lands at any of N sources, enabling group session A (synchronized human-driven multi-agent conversation) without manual brokering.
3. **Add** a `truncations: string[]` field to atom-bearing responses across `find_clusters`, `get_atoms`, `tail_session`, `search_memories` — closes the "is this body verbatim?" trust bug structurally.

Net toolkit shape after this item ships:

```
echo_ping              — liveness (unchanged)
search_memories        — substring lookup (unchanged + truncations field)
tail_session           — per-source recency (unchanged + truncations field)
find_clusters          — NEW: cheap cross-source discovery (cluster IDs + atom_ids[] + source_breakdown, no atom bodies)
get_atoms              — NEW: targeted body fetch by IDs (with fields?, format?, truncations[])
wait_for_new_turns     — NEW: stateless long-poll for group session
get_recent_work_context — DEPRECATED in description; removed in item 031
```

## Why

This item resolves three friction surfaces that have accreted over V1.5:

1. **Compound-tool friction.** `get_recent_work_context` is the only compound tool in the current 4 (search/tail/ping are all atomic). Empirically, >90% of the V1.5 envelope/truncation/format-ladder friction (items 025/026/027/028 + the in-flight A+B+C polish + the 029 falsification AC) traced back to that one compound tool. Atomic decomposition removes the *class* of friction, not specific instances.

2. **Group session A blocked by manual brokering.** Per founder direction: "I should be able to link multiple sessions together and they tail each other... user should feel the unified context of all the tools and agents they use are unified and communicating with each other." Today, every cross-session tail requires a manual MCP call; founder bridges by pasting. `wait_for_new_turns` is the missing primitive that lets agents stay synchronized passively. Without it, group session A doesn't work.

3. **Elision trust bug.** Surfaced today (2026-05-09) during cross-session review (Cursor's Claude pushback at composer `c15c2eca` bubble `f28acde5...`, ~14:04 PDT; logged in `backlog/_followups.md` "MCP retrieval — long-turn elision + envelope caps"): MCP responses can return middle-elided bodies (`bytes_elided` / `…[N chars elided]…`) without a clear signal to the consumer. Reviewers treating MCP output as authoritative can miss middle paragraphs. Adding `truncations: string[]` per atom + `atoms_dropped` per response makes the same trust bug structurally impossible.

The three changes are coupled: `truncations` must land in the new tools at first-shipment (not a follow-up); `wait_for_new_turns` benefits from `truncations` on its returned atoms; the deprecation marker on `get_recent_work_context` is what tells consumers to migrate to the atomic pair.

## Implementation Direction

Five sub-deliverables, in dependency order:

### 1. `find_clusters(window?, since?, until?, format?)` — cheap discovery

Returns the cluster shape from today's `get_recent_work_context` skeleton mode, but as a first-class tool.

```ts
// Response shape (TypeScript-ish):
{
  schema_version: 1,
  tool: "find_clusters",
  query: { since, until, window_hours, format },
  clusters: [
    {
      cluster_id: string,
      rank: number,
      rank_reason: string[],
      atom_ids: string[],         // load-bearing — get_atoms takes these
      source_breakdown: { [source_app]: count },
      time_range: { from, to },
      label?: string,
      open_loop_hints?: { atom_id, resolved }[],  // body-less; just IDs+resolved flag
    }
  ],
  truncation: {
    clusters_returned: number,
    clusters_total: number,
    atoms_returned: number,
    atoms_total_in_window: number,
    truncated: boolean,
  },
  warnings: string[],
}
```

Cost target: < 10k chars typical, even on full-day windows. Same skeleton-format budget item 028 enforced.

The cluster-builder logic in `src/trace/index.ts` is already this; this tool is a re-export of that logic with the skeleton wire shape.

### 2. `get_atoms(atom_ids[], fields?, format?)` — targeted fetch

Returns full bodies (capped per `WIRE_SHAPE_CAPS`) for a specified ID list.

```ts
// Input:
{
  atom_ids: string[],         // max 50 per call
  fields?: string[],          // optional projection — e.g., ["content", "metadata"]
  format?: "minimal" | "full" // minimal = standard caps, full = no caps (may overflow envelope)
}

// Response:
{
  schema_version: 1,
  tool: "get_atoms",
  atoms: [
    {
      id: string,
      source: string,
      timestamp: string,
      content?: string,         // present unless caller's fields[] excluded
      metadata?: object,
      truncations: string[],    // [] = verbatim; ["content"] = clipped; ["metadata.X"] = key-cap; ["fields_omitted"] = caller-projected
      content_bytes_elided?: number,  // present iff "content" in truncations
    }
  ],
  atoms_dropped: number,
  atoms_dropped_ids: string[],  // requested IDs that didn't fit response budget
}
```

`atom_ids` are the load-bearing input — they come from `find_clusters` `atom_ids[]` or from `search_memories` match `id`. Atom IDs are persisted (echo.db row IDs); cluster IDs are deterministic-ephemeral (`system-architecture.md:140`) and would be the wrong primitive to base the targeted-fetch tool on.

### 3. `wait_for_new_turns(sources[], since, timeout?)` — stateless long-poll

```ts
// Input:
{
  sources: string[],            // max 8 — mix of source paths and source_apps
  since: string,                // ISO 8601 timestamp; only return atoms with timestamp > since
  timeout?: number,             // seconds, default 30, max 60
}

// Response:
{
  schema_version: 1,
  tool: "wait_for_new_turns",
  turns: [...same shape as tail_session.turns],
  next_since: string,           // server's current timestamp; pass as `since` next call
  timed_out: boolean,           // true if timeout fired with no new turns
  truncations: string[],        // per-call (not per-turn — turns carry their own)
}
```

Server behavior:
- Polls echo.db every 1s internally, querying `WHERE source IN (...) AND timestamp > since LIMIT 20`.
- Returns immediately on any non-empty result.
- Returns at `timeout` with empty `turns[]` and `next_since` set to server's current timestamp.
- **No subscriber registry. No per-client state.** Each call is independent → stateless ✓ per item 027.

Server-side cost: the Node event loop holds the request open; the poll loop is cheap (indexed query against echo.db). For a single founder + 3-4 agents, this is negligible. Multi-tenant later may need a global concurrency cap; not specced here.

### 4. `truncations: string[]` field — added to ALL atom-bearing responses

Existing tools `tail_session` and `search_memories` get a `truncations: string[]` field on each returned atom (alongside the existing `bytes_elided` field), with rules:

- `[]` ⟺ every returned field byte-for-byte identical to echo.db.
- `["content"]` ⟺ content body was clipped to `WIRE_SHAPE_CAPS.content`. Existing `content_bytes_elided` (or equivalent) counts the clip.
- `["metadata.<key>"]` ⟺ V1.5.6 per-key metadata cap fired on `<key>`.
- `["fields_omitted"]` ⟺ caller passed `fields?` and only a subset returned. (Distinguishes "cap fired" from "you didn't ask for it.")

The legacy `bytes_elided` field STAYS for backward compat (consumers may still rely on it); `truncations` is additive.

### 5. `get_recent_work_context` deprecation

In `src/mcp/tools/recent-work-context.ts`, prepend the tool description with:

```
**[DEPRECATED 2026-05-09 — use `find_clusters` + `get_atoms` instead. This tool will be removed in item 031 after a 1-2 week dogfooding period. Migration recipe in description below.]**
```

Followed by a 3-line migration recipe:

```
Migration:
  OLD: get_recent_work_context(window_hours=24, format='minimal')
  NEW: c = find_clusters(window_hours=24)
       a = get_atoms(c.clusters[0].atom_ids, format='minimal')
```

The tool's behavior remains unchanged for the deprecation period — consumers can keep calling it, just see the deprecated marker in the tool registry.

### Polling-fallback documentation for `wait_for_new_turns`

Append to `wait_for_new_turns` description:

```
If your MCP client has issues with long-running calls (timeout limits, no streaming),
use the polling pattern instead — works on any MCP client:

  last_ts = now
  while monitoring:
      result = find_clusters(since=last_ts, format='skeleton')
      if result.clusters:
          process(result.clusters)
          last_ts = max_timestamp(result)
      sleep(2)

Cost trade-off: polling = N calls/min (poll frequency). Long-poll = 1 call per
wake event. Polling adds wake-latency (≤ poll interval) but works on any client.
```

This makes `wait_for_new_turns` an **optimization**, not load-bearing. If real MCP clients in the cohort can't handle 30s blocking calls cleanly during dogfooding, the founder/strategist can choose to drop it without re-architecting group session — the polling fallback covers the same use case at higher cost.

## Out of Scope (Don't Drift)

- Do NOT touch `echo_ping`. (Strategist debate flagged it as borderline; resolution is "keep" — leave alone in this item. Removal would be a separate cosmetic item.)
- Do NOT touch the source_app vocabulary (`SOURCE_APP_VALUES` stays at `cursor | claude_code | codex | git`).
- Do NOT add a `whoami` MCP tool. (Mentioned in brainstorm as a footgun-prevention primitive; deferred — agents can pass `exclude_sources` on `wait_for_new_turns` if they want to exclude themselves.)
- Do NOT add push/SSE notifications, persistent subscriptions, or a multi-tenant filter to `wait_for_new_turns`. Stateless long-poll only.
- Do NOT remove `get_recent_work_context` in this item — that's item 031, after dogfooding.
- Do NOT change `WIRE_SHAPE_CAPS` values. Same caps; new tools, same projector.
- Do NOT update wiki pages. Wiki promotion happens after merge per the strategist `After Completion` notes.
- Do NOT widen the substring engine in `search_memories` to KNN/semantic. Out of scope; substring is the right primitive.
- Do NOT touch the `extractors-causal-metadata` branch.
- Do NOT design or implement item 031 (get_recent_work_context removal). Scope of THIS item ends at "deprecation marker shipped."

If the agent discovers `find_clusters` + `get_atoms` together produce envelope sizes that exceed today's `get_recent_work_context` for the common-case resume call, STOP and surface to founder via `pending_review/`. The decomposition's load-bearing claim is "two targeted calls cost less than one compound call"; if that fails empirically, the design needs revisit before completion. **Definition of "common-case resume":** founder's `get_recent_work_context()` no-args call (which today auto-resolves to `window_hours=24, limit=20, format='minimal'` via the V1.5.7 polish). The new equivalent: `find_clusters(window_hours=24)` followed by `get_atoms(top_cluster.atom_ids, format='minimal')`.

## After Completion (Strategist Notes)

Post-shipment, the strategist will:

1. **Wiki promotion** — write three new wiki pages:
   - `wiki/surfaces/mcp-find-clusters.md` (mirrors the existing per-tool page convention)
   - `wiki/surfaces/mcp-get-atoms.md`
   - `wiki/surfaces/mcp-wait-for-new-turns.md`
2. **Update `wiki/surfaces/mcp-server.md`** — list the new tools in the published surface table; flag `get_recent_work_context` as deprecated with a pointer to item 031.
3. **Update `wiki/surfaces/mcp-recent-work-context.md`** — add a top-of-page deprecation banner pointing to `find_clusters` + `get_atoms`.
4. **Update `wiki/architecture/system-architecture.md`** — note the toolkit shift from compound to atomic; reference the migration as a V1.6 architectural milestone.
5. **File item 031** — `Remove get_recent_work_context after V1.6 dogfooding`. Estimate: 0.5d. Acceptance: after ≥1 week of founder daily use confirms the new tools cover all resume patterns, delete the tool, its tests, its tool description block, and update the migration banner in the wiki.
6. **Update `backlog/_followups.md`** — move the "MCP retrieval — long-turn elision + envelope caps" entry from "Known V1 degraded surfaces" to a "Resolved" subsection (truncations field closes the trust-bug part; the per-cluster sourcing concern is unchanged).
7. **Group session wiki page** — write `wiki/architecture/group-session.md` documenting the synchronized-human-driven group pattern (Goal A from brainstorm), the polling fallback, and the deferred Goal C (autonomous group, V2+ territory).

## Acceptance Criteria

The claiming builder lifts these into the frontmatter `acceptance:` field at atomic-claim time. Each bullet is enforceable as written.

1. **`find_clusters(window?, since?, until?, format?)` ships** at `src/mcp/tools/find-clusters.ts` with the response shape specified in **Implementation Direction §1**. Behavior matches today's `getRecentWorkContext({format:'skeleton'})` for the same inputs (regression test: same inputs → same cluster_ids and atom_ids; differences allowed only in field-level shape, not graph membership). Cost target: < 10k chars on a 24h window with default limits, asserted in tests.

2. **`get_atoms(atom_ids[], fields?, format?)` ships** at `src/mcp/tools/get-atoms.ts` with the response shape specified in **Implementation Direction §2**. Validates `atom_ids[]` is non-empty and ≤ 50 entries. Returns atoms in the order requested (preserves caller's intent). Per-atom `truncations` field follows the rules in **Implementation Direction §4**. `atoms_dropped` + `atoms_dropped_ids` populated when response budget would be exceeded.

3. **`wait_for_new_turns(sources[], since, timeout?)` ships** at `src/mcp/tools/wait-for-new-turns.ts` with the response shape specified in **Implementation Direction §3**. Validates: `sources[]` is non-empty and ≤ 8; `timeout` defaults to 30, max 60; `since` is a valid ISO 8601 timestamp. Server-side polling interval is 1s (constant; no need for tunable). **`sources[]` accepts a mix of literal source paths (e.g. `fs:/Users/.../state.vscdb`) and source_app names (e.g. `cursor`, `claude_code`); source_app names resolve via the same logic `tail_session(source_app=...)` uses today (`buildSourceAppMap()` in `src/mcp/util/source-app.ts`).** **Stateless test:** a unit test fires 3 parallel `wait_for_new_turns` calls with disjoint `sources[]` against a controlled storage; asserts each call's response is independent of the others' presence (results identical to running each call alone). Reviewer additionally inspects code for module-level mutable state.

4. **`truncations: string[]` field added to `tail_session` and `search_memories` responses** per the rules in **Implementation Direction §4**. Existing `bytes_elided` field stays untouched (back-compat). Test: a tool call that hits the wire-shape cap produces `truncations: ["content"]`; a call that doesn't produces `truncations: []`.

5. **`get_recent_work_context` deprecation marker** prepended to its tool description per **Implementation Direction §5**. The tool's behavior is otherwise unchanged. Test: tool registry response includes the deprecation marker text.

6. **Polling-fallback docs** appended to `wait_for_new_turns` tool description per **Implementation Direction**'s closing block.

7. **Out-of-scope guardrail (do not drift):** This item does NOT remove `get_recent_work_context`, modify `echo_ping`, change `SOURCE_APP_VALUES`, add `whoami`, add SSE/push notifications, or update wiki pages. If the agent finds the decomposition produces envelope sizes that exceed today's `get_recent_work_context` for common-case resume, STOP and surface via `pending_review/`.

8. **MCP best-practices compliance per item 025:** new tool descriptions follow the established conventions (`use when X` discriminator one-liner; explicit cost class — cheap/medium/large; explicit statelessness claim where relevant; explicit migration recipes where relevant).

9. **Tests overall:** `npm test` passes (full suite); `npm run lint` passes; `npm run typecheck` passes. New regression tests fail on a clean revert of each new tool's implementation. Realistic-density envelope test (item 028's precedent) extended to cover `find_clusters` + `get_atoms` chain — **assertion shape:** `bytes(find_clusters(window=24h, format='skeleton')) + bytes(get_atoms(top_cluster.atom_ids, format='minimal'))` ≤ `bytes(get_recent_work_context(window_hours=24, format='minimal'))` for the same effective query against the same fixture. The point: targeted dive saves bytes vs compound call.

10. **Run log appended** to `raw/internal/agent-runs/<run-date>-2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` with: (a) per-tool envelope measurements in chars (find_clusters skeleton vs today's `format='skeleton'` baseline; get_atoms minimal vs today's `format='minimal'`; the find+get chain total per the §9 assertion); (b) `wait_for_new_turns` latency measurement (median **and** p95 wake time **in milliseconds** when content lands during a wait, sampled over ≥10 trials with content landing at random offsets between 0 and 30s into the wait); (c) one before/after cross-tool dogfooding journal entry showing the same resume call via the old vs new toolkit (founder's "where did I leave off" shape); (d) any envelope/cost surprise observations for item 031's removal-decision context (i.e., flag whether anything in the new toolkit cost more than expected).

**Files to modify** (claiming builder lifts into frontmatter `files_to_modify:`):
- `src/mcp/tools/find-clusters.ts` (NEW)
- `src/mcp/tools/get-atoms.ts` (NEW)
- `src/mcp/tools/wait-for-new-turns.ts` (NEW)
- `src/mcp/tools/recent-work-context.ts` (modified: deprecation marker only)
- `src/mcp/tools/search-memories.ts` (modified: add `truncations` field)
- `src/mcp/tools/tail-session.ts` (modified: add `truncations` field)
- `src/mcp/wire-shape/match.ts` (modified: emit `truncations` from the projector)
- `src/mcp/server.ts` (or wherever tool registration lives — register the 3 new tools)
- `tests/mcp/find-clusters.test.ts` (NEW)
- `tests/mcp/get-atoms.test.ts` (NEW)
- `tests/mcp/wait-for-new-turns.test.ts` (NEW)
- `tests/mcp/recent-work-context.test.ts` (modified: assert deprecation marker)
- `tests/mcp/search-memories.test.ts` (modified: assert `truncations` field)
- `tests/mcp/tail-session.test.ts` (modified: assert `truncations` field)
- `tests/mcp/envelope-find-get-chain.test.ts` (NEW: realistic-density chain assertion per item 028 precedent)
- `docs/mcp-integration.md` (modified: document the new tools + migration recipe)
- `raw/internal/agent-runs/<run-date>-2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` (NEW)

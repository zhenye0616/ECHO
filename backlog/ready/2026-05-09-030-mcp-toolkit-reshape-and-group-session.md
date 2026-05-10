---
id: 2026-05-09-030-mcp-toolkit-reshape-and-group-session
title: MCP V1.6 reshape — atomic decomposition + group session subscription
status: ready
priority: HIGH
estimate: 1.5-2.5d
created: 2026-05-09
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/tools/search-memories.ts
  - src/mcp/tools/tail-session.ts
  - src/mcp/tools/echo-ping.ts
  - src/mcp/util/source-app.ts
  - src/mcp/wire-shape/match.ts
  - src/storage/interface.ts
  - src/storage/sqlite.ts
  - src/storage/memory.ts
  - src/trace/index.ts
  - wiki/architecture/system-architecture.md
  - wiki/architecture/storage.md
  - wiki/surfaces/mcp-server.md
  - backlog/complete/2026-05-08-027-mcp-stateless-transport.md
  - backlog/complete/2026-05-08-028-rwc-envelope-skeleton-format.md
  - backlog/complete/2026-05-09-029-cursor-source-breakdown-falsification.md
  - backlog/_followups.md
blocked_by: []
acceptance:
  - "See **Acceptance Criteria** section in spec body — claiming builder copies the 10 bullets verbatim into this list at atomic-claim time. The body is the canonical source; this stub satisfies tooling (tools/blocked.py) but is not the contract."
files_to_modify:
  - "See **Files to modify** subsection at end of spec body — claiming builder copies the file list verbatim into this list at atomic-claim time."
---

# MCP V1.6 reshape — atomic decomposition (`find_clusters` + `get_atoms`) + group session subscription (`wait_for_new_turns`); deprecate `get_recent_work_context`

> **Strategist origin note (2026-05-09):** spec emerged from a strategist brainstorm session (Claude Code session `71b36548-...`). Originally drafted with no frontmatter to keep that session a pure strategist conversation; revised to include canonical frontmatter after Codex's spec review (2026-05-09 23:52 PDT) flagged that `tools/blocked.py` exits with `no frontmatter (must start with '---')` and blocks the documented builder loop. The `acceptance:` and `files_to_modify:` lists are stubs pointing to the canonical body sections — claiming builder copies the body's 10 acceptance bullets and file list verbatim into the frontmatter at atomic-claim time.
>
> **Item 029 already shipped** (merged 2026-05-09 via commit `b50a843`; sidecar followups landed at `b46170c`). 030's claimer rebases on current `main` — no parallel-branch coordination needed. Cross-check 029's review_notes for any Phase-1 findings that materially change 030's design before claiming.
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
find_clusters          — NEW: cheap cross-source discovery (cluster IDs + FULL atom_ids[] (with atom_ids_truncated paginator if a giant cluster overflows budget) + source_breakdown, no atom bodies)
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

Returns the cluster shape from today's `get_recent_work_context` skeleton mode, but as a first-class tool. **Important parameter semantic:** `window_hours` in today's `get_recent_work_context` means **cluster-gap width** (the maximum temporal gap allowed between atoms in a single cluster), NOT lookback. The current default lookback is 4h via `since = until - DEFAULT_WINDOW_HOURS` in `recent-work-context.ts`. `find_clusters` MUST preserve this distinction: `window_hours?` controls cluster-gap (default 4h); `since?` / `until?` control lookback. **No-args behavior** mirrors today's V1.5.7 polish: `find_clusters()` with no since/until auto-resolves to `since=now-4h, until=now`, and if that returns empty, auto-expands to `since=now-24h` (per `NO_ARGS_AUTO_EXPAND_WINDOW_HOURS` constant). Migration recipes in this spec use `since=` for lookback, NOT `window_hours=` (a common source of confusion that Codex's review flagged at 2026-05-09 23:52 PDT).

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
  result_caps: {                     // renamed from `truncation` to avoid name-collision with
    clusters_returned: number,       // the per-atom `truncations: string[]` field added in §4.
    clusters_total: number,          // `result_caps` describes RESPONSE-LEVEL limit application
    atoms_returned: number,          // (clusters/atoms dropped to fit response budget);
    atoms_total_in_window: number,   // `truncations: string[]` describes per-FIELD clipping inside
    truncated: boolean,              // an individual atom. Two different concepts; two different names.
  },
  warnings: string[],
}
```

Cost target: < 10k chars typical, even on full-day windows. Same skeleton-format budget item 028 enforced.

**`atom_ids[]` cap MUST be lifted (or substantially raised) for `find_clusters`.** Today's skeleton mode caps per-cluster `atom_ids[]` at 50 entries (item 028 Gap 4 — `recent-work-context.ts:226`) — but `atom_ids[]` is the load-bearing input to `get_atoms`. Capping atom_ids silently drops the tail of any cluster with >50 atoms; downstream `get_atoms(top_cluster.atom_ids)` would silently miss most of a large cluster. **Required:** `find_clusters` emits the FULL `atom_ids[]` per cluster (atom IDs are tiny — ~50 chars each; even 200 IDs is 10KB, within the per-cluster budget that today caps `open_loop_hints[]` and edges). The 50-cap stays for `open_loop_hints[]` only. If a cluster's `atom_ids[]` is so large it overflows the response budget on its own, surface via `result_caps.truncated: true` AND a per-cluster `atom_ids_truncated: true` flag (with `atom_ids_total: number`) so the consumer knows to either (a) narrow the window OR (b) accept partial coverage explicitly.

The cluster-builder logic in `src/trace/index.ts` is already this; this tool is a re-export of that logic with the skeleton wire shape (modulo the atom_ids cap lift above).

### 2. `get_atoms(atom_ids[], fields?, format?)` — targeted fetch

Returns full bodies (capped per `WIRE_SHAPE_CAPS`) for a specified ID list.

```ts
// Input:
{
  atom_ids: string[],         // max 50 per call
  fields?: string[],          // optional projection — e.g., ["content", "metadata"]
  format?: "minimal"          // V1.6: minimal only — applies WIRE_SHAPE_CAPS to content + per-key metadata.
                               // ("full" / verbatim mode is intentionally OUT OF SCOPE for v1 of get_atoms —
                               //  the host's hard-max response size makes a "no caps" mode a footgun.
                               //  Consumers needing absolute verbatim read the source path directly per
                               //  §4 truncations recovery contract. A future debug-only "full" mode is
                               //  a separate item if real demand surfaces.)
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
      truncations: string[],    // [] = verbatim AND no projector reshaped; ["content"] = clipped;
                                 // ["metadata.X"] = byte-cap on key X; ["metadata.X:projected"] =
                                 // V1.5.6.1 projector reshaped key X (e.g. tool_calls → trajectory);
                                 // ["fields_omitted"] = caller passed fields? excluding some.
                                 // See §4 for full rules.
      content_bytes_elided?: number,  // present iff "content" in truncations
    }
  ],
  atoms_dropped: number,
  atoms_dropped_ids: string[],  // requested IDs that didn't fit response budget
}
```

`atom_ids` are the load-bearing input — they come from `find_clusters` `atom_ids[]` or from `search_memories` match `id`. Atom IDs are persisted (echo.db row IDs); cluster IDs are deterministic-ephemeral (`system-architecture.md:140`) and would be the wrong primitive to base the targeted-fetch tool on.

**Response budget + deterministic drop rule:** `get_atoms` has a hard interactive envelope ceiling of **25,000 chars** for `JSON.stringify(result)` before MCP wraps it in `content[]`. This matches the existing consumer tool-result budget enforced by the search/tail/recent-work-context tests and prevents `atom_ids.length=50` from becoming a footgun. Build the response in requested order after applying the same wire-shape projector and `fields?` projection:

1. Fetch requested IDs via `getByIds` (order-preserving); missing IDs are not returned by storage.
2. Project each found atom to the minimal wire shape and apply `fields?`.
3. Append projected atoms in request order until adding the next atom would make `JSON.stringify(result)` exceed 25,000 chars.
4. Once an atom would exceed the budget, drop that atom AND every remaining requested ID. This returns a deterministic prefix of the caller's requested order rather than holes in the middle.
5. `atoms_dropped` is the count of all requested IDs not returned, including missing IDs and budget-dropped IDs. `atoms_dropped_ids` preserves requested order for those omitted IDs.
6. If the first projected atom alone would exceed 25,000 chars, return `atoms: []`, put every requested ID in `atoms_dropped_ids`, and add a warning telling the caller to retry with a narrower `fields[]` projection. Do NOT change `WIRE_SHAPE_CAPS` to make this pass; cap tuning is out of scope.

Regression tests must cover: all requested atoms fit; a missing ID is reported in `atoms_dropped_ids`; and a 50-ID request with large projected metadata returns a budget-fitting prefix plus ordered dropped IDs.

**Storage API gap (Codex review 2026-05-09 23:52 PDT):** today's `Storage` interface (`src/storage/interface.ts:38`) only exposes `append`, `query`, and `count`; `QueryFilter` has no `ids` filter. `get_atoms` requires a NEW storage method:

```ts
// src/storage/interface.ts — add:
getByIds(ids: string[]): Promise<CaptureEvent[]>
```

Implementations:
- `src/storage/sqlite.ts` — `SELECT * FROM events WHERE id IN (?...)` with parameterized binding (LIMIT enforcement from caller's atom_ids.length validation, max 50 per `get_atoms` contract).
- `src/storage/memory.ts` — `events.filter(e => ids.includes(e.id))`.

**Order-preserving (Codex review B, 2026-05-10 00:01 PDT):** `getByIds(['a','b','c'])` returns events in the same order as the input `ids[]` array. The naive impls do NOT achieve this — `events.filter(e => ids.includes(e.id))` preserves storage/insertion order; SQLite `WHERE id IN (?...)` returns rows in storage order too. **Both impls MUST explicitly reorder by input ids after fetch:**

```ts
// memory.ts impl:
const found = new Map(events.filter(e => ids.includes(e.id)).map(e => [e.id, e]));
return ids.map(id => found.get(id)).filter(Boolean) as CaptureEvent[];

// sqlite.ts impl:
const rows = db.prepare(`SELECT * FROM events WHERE id IN (${ids.map(() => '?').join(',')})`).all(ids);
const byId = new Map(rows.map(r => [r.id, r]));
return ids.map(id => byId.get(id)).filter(Boolean) as CaptureEvent[];
```

Missing IDs (in input but not in storage) are silently filtered out; `get_atoms` populates `atoms_dropped_ids` with those at the tool layer. This is what lets `get_atoms` honor the contract "atoms returned in the order requested."

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
                                 // Each turn carries its own `truncations: string[]` field
                                 // per §4 rules. There is NO response-level truncations field —
                                 // any clipping happens per-turn at the wire-shape projector,
                                 // never at the response envelope (timeout returns empty turns[],
                                 // not a truncated turns[]).
  next_since: string,            // server's current timestamp; pass as `since` next call
  timed_out: boolean,            // true if timeout fired with no new turns
}
```

**Source semantics (Codex review 2026-05-09 23:52 PDT — choose explicitly):** `sources[]` accepts mixed-type entries; each entry is normalized at call time:

| Entry shape | Resolution | SQL effect |
|---|---|---|
| Literal source path (e.g. `fs:/Users/.../state.vscdb`, `git:/Users/.../repo`) | exact match | `source = '<path>'` |
| Source-app name (e.g. `cursor`, `claude_code`, `codex`, `git`) | **prefix match** via `buildSourceAppMap()` | `source LIKE '<prefix>%'` — matches ALL sessions of that app, NOT just the most-recent |

This is **deliberately different** from `tail_session(source_app=...)`, which resolves to the **most-recently-active exact source** for that app. Reasoning: group session A wants "wake me when ANY session of these apps writes new content" — the prefix-match semantic catches new Cursor composers, new CC sessions, etc. as they spawn. Single-source MRU resolution would miss them.

Server behavior:
- Polls echo.db every 1s internally. Query shape: `WHERE (source IN (<exact_sources...>) OR source LIKE '<prefix1>%' OR source LIKE '<prefix2>%' ...) AND timestamp > since LIMIT 20`.
- Returns immediately on any non-empty result.
- Returns at `timeout` with empty `turns[]` and `next_since` set to server's current timestamp.
- **No subscriber registry. No per-client state.** Each call is independent → stateless ✓ per item 027.

Server-side cost: the Node event loop holds the request open; the poll loop is cheap (indexed query against echo.db). For a single founder + 3-4 agents, this is negligible. Multi-tenant later may need a global concurrency cap; not specced here.

### 4. `truncations: string[]` field — added to ALL atom-bearing responses

Existing tools `tail_session` and `search_memories` get a `truncations: string[]` field on each returned atom (alongside the existing `bytes_elided` / `metadata_keys_projected` fields), with rules covering BOTH caps AND projections (per Codex review 2026-05-09 23:52 PDT):

- `[]` ⟺ every returned field byte-for-byte identical to echo.db AND no projector reshaped any field.
- `["content"]` ⟺ content body was clipped to `WIRE_SHAPE_CAPS.match_content` (per `src/mcp/wire-shape/caps.ts:19` — exact key name; the historical "content" shorthand in earlier spec drafts was wrong). Existing `content_bytes_elided` (or equivalent) counts the clip.
- `["metadata.<key>"]` ⟺ V1.5.6 per-key metadata cap fired on `<key>` (BYTE-LEVEL clip; value is lossy).
- `["metadata.<key>:projected"]` ⟺ V1.5.6.1's projector reshaped the value (e.g. `tool_calls` → trajectory + histogram per `match.ts:79`'s `metadata_keys_projected`). Value is REFORMATTED, not clipped — semantically distinct from a cap. Consumer needing the original raw value reads the source file. The `:projected` suffix lets the consumer distinguish "this got clipped" from "this got rewritten by a known projector with a documented schema."
- `["fields_omitted"]` ⟺ caller passed `fields?` and only a subset returned. (Distinguishes "cap fired" from "you didn't ask for it.")

The legacy `bytes_elided`, `metadata_keys_projected`, and `metadata_bytes_elided` fields STAY for backward compat (consumers may still rely on them); `truncations` is additive AND unifies the cap+projection trust signal in one place.

### 5. `get_recent_work_context` deprecation

In `src/mcp/tools/recent-work-context.ts`, prepend the tool description with:

```
**[DEPRECATED 2026-05-09 — use `find_clusters` + `get_atoms` instead. This tool will be removed in item 031 after a 1-2 week dogfooding period. Migration recipe in description below.]**
```

Followed by a migration recipe that names the judgment step explicitly (not "blind clusters[0]"):

```
Migration:
  OLD: get_recent_work_context(window_hours=24, format='minimal')
       // window_hours=24 in the OLD shape was being misused as lookback —
       // it actually controls cluster-gap (the temporal gap allowed between
       // atoms in a single cluster). The default lookback was 4h via the
       // V1.5.7 auto-expand path. Migration uses since= for explicit
       // lookback, NOT window_hours=.

  NEW: c = find_clusters(since=now-24h)        // explicit 24h lookback
       // (omit since= to get find_clusters' V1.5.7-equivalent no-args
       // semantics: 4h default, auto-expand to 24h if empty.)
       //
       // Inspect c.clusters[]: each has rank, label, source_breakdown,
       // time_range, atom_ids[]. Pick the cluster matching your intent
       // (typically rank-1 for "where did I leave off", but read label +
       // source_breakdown before picking — the resume target may be a
       // sibling).
       picked = c.clusters[0]                   // or whichever matches intent
       //
       // get_atoms accepts ≤50 ids per call. If picked.atom_ids.length > 50,
       // partition into chunks and concat results:
       //   chunks = chunk(picked.atom_ids, 50)
       //   a = flatMap(chunks, ids => get_atoms(ids, format='minimal'))
       a = get_atoms(picked.atom_ids, format='minimal')   // single call if ≤50
```

The judgment-between-calls is the actual win of the decomposition. Picking `clusters[0]` blindly recreates the compound-tool's failure mode (wrong cluster surfaced, atom bodies wasted). The tool's behavior remains unchanged for the deprecation period — consumers can keep calling it, just see the deprecated marker in the tool registry.

### Polling-fallback documentation for `wait_for_new_turns`

Append to `wait_for_new_turns` description:

```
If your MCP client has issues with long-running calls (timeout limits, no streaming),
use the polling pattern instead — works on any MCP client:

  last_ts = now
  while monitoring:
      // find_clusters with explicit since= for lookback (NOT window_hours,
      // which is cluster-gap; see §1). Default cluster-gap (4h) applies
      // when window_hours= is omitted; that's typically what you want.
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
- Do NOT add a `whoami` MCP tool. (Mentioned in brainstorm as a footgun-prevention primitive; deferred — agents that want to avoid tailing their own session simply omit their own source from `sources[]` at call site. If a structured `exclude_sources` parameter becomes load-bearing during dogfooding, file as a follow-up; not in scope for v1.)
- Do NOT add push/SSE notifications, persistent subscriptions, or a multi-tenant filter to `wait_for_new_turns`. Stateless long-poll only.
- Do NOT remove `get_recent_work_context` in this item — that's item 031, after dogfooding.
- Do NOT change `WIRE_SHAPE_CAPS` values. Same caps; new tools, same projector.
- Do NOT update wiki pages. Wiki promotion happens after merge per the strategist `After Completion` notes.
- Do NOT widen the substring engine in `search_memories` to KNN/semantic. Out of scope; substring is the right primitive.
- Do NOT touch the `extractors-causal-metadata` branch.
- Do NOT design or implement item 031 (get_recent_work_context removal). Scope of THIS item ends at "deprecation marker shipped."

If the agent discovers `find_clusters` + `get_atoms` together produce envelope sizes that exceed today's `get_recent_work_context` for the common-case resume call, STOP and surface to founder via `pending_review/`. The decomposition's load-bearing claim is "two targeted calls cost less than one compound call"; if that fails empirically, the design needs revisit before completion. **Definition of "common-case resume":** founder's `get_recent_work_context()` no-args call (which today auto-resolves to lookback=24h after the V1.5.7 empty-expand polish, with `limit=20, format='minimal'`). The new equivalent: `find_clusters(since=now-24h)` followed by `get_atoms(picked.atom_ids, format='minimal')` where `picked` is the cluster the consumer judges relevant per the migration recipe (NOT blind `clusters[0]`).

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

1. **`find_clusters(window?, since?, until?, format?)` ships** at `src/mcp/tools/find-clusters.ts` with the response shape specified in **Implementation Direction §1**. Behavior matches today's `getRecentWorkContext({format:'skeleton'})` for the same inputs EXCEPT for the intentional `atom_ids[]` cap lift described in §1. **Regression test (graph-membership equality, NOT skeleton-wire equality and NOT cluster-id-string equality):** same inputs → same set of clusters when each cluster is identified by the FULL sorted `atom_ids[]` set from the trace builder's un-clipped cluster membership, AND ranks of corresponding clusters match. Do NOT compare against today's `buildSkeletonResponse(...).clusters[].atom_ids` on large clusters, because that wire shape clips `atom_ids[]` at 50 and is exactly what `find_clusters` is fixing. Do NOT assert string equality of `cluster_id` — those are deterministic-ephemeral hashes (`system-architecture.md:140`) and may flake if any input pre-processing differs by an implementation detail. Cost target: < 10k chars on a 24h lookback (`since=now-24h`, not `window_hours=24`) with default cluster-gap/window settings, asserted in tests.

2. **`get_atoms(atom_ids[], fields?, format?)` ships** at `src/mcp/tools/get-atoms.ts` with the response shape specified in **Implementation Direction §2**. Validates `atom_ids[]` is non-empty and ≤ 50 entries. Returns atoms in the order requested (preserves caller's intent). Per-atom `truncations` field follows the rules in **Implementation Direction §4**. `atoms_dropped` + `atoms_dropped_ids` populated when response budget would be exceeded.

3. **`wait_for_new_turns(sources[], since, timeout?)` ships** at `src/mcp/tools/wait-for-new-turns.ts` with the response shape specified in **Implementation Direction §3**. Validates: `sources[]` is non-empty and ≤ 8; `timeout` defaults to 30, max 60; `since` is a valid ISO 8601 timestamp. Server-side polling interval is 1s (constant; no need for tunable). **`sources[]` accepts a mix of literal source paths (e.g. `fs:/Users/.../state.vscdb`) and source_app names (e.g. `cursor`, `claude_code`); source_app names resolve via `buildSourceAppMap()` PREFIX MAPPING — matches ALL sessions of that app (e.g. `cursor` → `source LIKE 'fs:.../Cursor/%'`). Explicitly DIFFERENT from `tail_session(source_app=...)` MRU exact-source resolution; group session A wants "wake on any session of these apps."** **Strict-after boundary semantic:** `wait_for_new_turns` returns turns with `timestamp > since` (STRICT, not ≥). Today's `Storage.query` uses `timestamp >= @since` (`src/storage/sqlite.ts:105`, `src/storage/memory.ts:43`); the new tool MUST post-filter the storage result to drop turns at exactly `since` OR the daemon must add a strict-after query path. Without this, re-firing `wait_for_new_turns` with `since=last_returned_ts` would re-deliver the boundary turn on every wake. **Stateless test:** a unit test fires 3 parallel `wait_for_new_turns` calls with disjoint `sources[]` against a controlled storage; asserts each call's response is independent of the others' presence (results identical to running each call alone). Reviewer additionally inspects code for module-level mutable state.

4. **`truncations: string[]` field added to `tail_session` and `search_memories` responses** per the rules in **Implementation Direction §4**. Existing `bytes_elided` field stays untouched (back-compat). Test: a tool call that hits the wire-shape cap produces `truncations: ["content"]`; a call that doesn't produces `truncations: []`.

5. **`get_recent_work_context` deprecation marker** prepended to its tool description per **Implementation Direction §5**. The tool's behavior is otherwise unchanged. Test: tool registry response includes the deprecation marker text.

6. **Polling-fallback docs** appended to `wait_for_new_turns` tool description per **Implementation Direction**'s closing block.

7. **Out-of-scope guardrail (do not drift):** This item does NOT remove `get_recent_work_context`, modify `echo_ping`, change `SOURCE_APP_VALUES`, add `whoami`, add SSE/push notifications, or update wiki pages. If the agent finds the decomposition produces envelope sizes that exceed today's `get_recent_work_context` for common-case resume, STOP and surface via `pending_review/`.

8. **MCP best-practices compliance per item 025:** new tool descriptions follow the established conventions (`use when X` discriminator one-liner; explicit cost class — cheap/medium/large; explicit statelessness claim where relevant; explicit migration recipes where relevant).

9. **Tests overall:** `npm test` passes (full suite); `npm run lint` passes; `npm run typecheck` passes. New regression tests fail on a clean revert of each new tool's implementation. Realistic-density envelope test (item 028's precedent) extended to cover `find_clusters` + `get_atoms` chain — **assertion shape (apples-to-apples):** `bytes(find_clusters(since=now-24h, format='skeleton')) + bytes(get_atoms(materialized_ids, format='minimal'))` ≤ `bytes(get_recent_work_context(since=now-24h, format='minimal'))`, where `materialized_ids` is **the same atom_id set the compound call materializes for the rank-1 cluster at `format='minimal'`** (NOT all atom_ids in the cluster — the compound call may already truncate atoms inside the cluster's atom_ids[] when computing its `atoms[id]` body map). Use a fully-materialized fixture (atom count ≤ compound's per-cluster atom limit) to make the comparison fair. The point: targeted dive saves bytes vs compound call ON THE SAME EFFECTIVE PAYLOAD.

10. **Run log appended** to `raw/internal/agent-runs/<run-date>-2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` with: (a) per-tool envelope measurements in chars (find_clusters skeleton vs today's `format='skeleton'` baseline; get_atoms minimal vs today's `format='minimal'`; the find+get chain total per the §9 assertion); (b) `wait_for_new_turns` latency measurement (median **and** p95 wake time **in milliseconds** when content lands during a wait, sampled over ≥10 trials with content landing at random offsets between 0 and 30s into the wait); (c) one before/after cross-tool dogfooding journal entry showing the same resume call via the old vs new toolkit (founder's "where did I leave off" shape); (d) any envelope/cost surprise observations for item 031's removal-decision context (i.e., flag whether anything in the new toolkit cost more than expected).

**Files to modify** (claiming builder lifts into frontmatter `files_to_modify:`):
- `src/mcp/tools/find-clusters.ts` (NEW)
- `src/mcp/tools/get-atoms.ts` (NEW)
- `src/mcp/tools/wait-for-new-turns.ts` (NEW)
- `src/mcp/tools/recent-work-context.ts` (modified: deprecation marker; lift atom_ids[] cap if find_clusters reuses cluster-builder helpers)
- `src/mcp/tools/search-memories.ts` (modified: add `truncations` field)
- `src/mcp/tools/tail-session.ts` (modified: add `truncations` field)
- `src/mcp/wire-shape/match.ts` (modified: emit `truncations` covering both caps and projections)
- `src/mcp/util/source-app.ts` (modified: expose source-prefix helper for `wait_for_new_turns`'s prefix-match resolution)
- `src/storage/interface.ts` (modified: add `getByIds(ids[])` method to Storage interface — Codex review P1)
- `src/storage/sqlite.ts` (modified: implement `getByIds` with `WHERE id IN (?...)`)
- `src/storage/memory.ts` (modified: implement `getByIds` order-preserving)
- `src/mcp/server.ts` (or wherever tool registration lives — register the 3 new tools)
- `src/trace/index.ts` (potentially modified: if find_clusters needs distinct cluster-shape emission separate from recent-work-context's existing skeleton path; depends on how the claimer factors the shared logic)
- `tests/mcp/find-clusters.test.ts` (NEW)
- `tests/mcp/get-atoms.test.ts` (NEW)
- `tests/mcp/wait-for-new-turns.test.ts` (NEW)
- `tests/mcp/recent-work-context.test.ts` (modified: assert deprecation marker)
- `tests/mcp/search-memories.test.ts` (modified: assert `truncations` field including projection markers)
- `tests/mcp/tail-session.test.ts` (modified: assert `truncations` field)
- `tests/mcp/envelope-find-get-chain.test.ts` (NEW: realistic-density chain assertion per item 028 precedent)
- `tests/storage/get-by-ids.test.ts` (NEW: order-preservation + IN-clause correctness for both impls)
- `docs/mcp-integration.md` (modified: document the new tools + migration recipe + source-app prefix-match semantics)
- `raw/internal/agent-runs/<run-date>-2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` (NEW)

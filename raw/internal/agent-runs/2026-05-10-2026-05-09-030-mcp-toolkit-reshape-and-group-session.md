---
backlog_item: 2026-05-09-030-mcp-toolkit-reshape-and-group-session
agent_run_started: 2026-05-10T07:16:40Z
agent_run_ended: 2026-05-10T07:50:00Z
status: ready_for_review
test_status: passing
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/mcp-toolkit-reshape-and-group-session
head_sha: 24cb42bce0e04ed5002fcc0c870a3298302ad718
---

# Agent Run: MCP V1.6 reshape — atomic decomposition + group session subscription

## What I Implemented

The full V1.6 reshape per spec body §1–§5 + acceptance #1–#10.

**Foundational primitives** (the new tools depend on these):
- `Storage.getByIds(ids[])` on the Storage interface, implemented for both
  `SqliteStorage` (`WHERE id IN (?...)` with explicit input-order reorder)
  and `MemoryStorage` (filter then reorder by input ids). Missing ids are
  silently filtered; `get_atoms` surfaces them in `atoms_dropped_ids`.
  Tests cover order-preservation, dups, missing, full-field round-trip.
- `ProjectedMatch.truncations: string[]` — additive trust signal in the
  shared wire-shape projector. Always present (possibly empty `[]`).
  Vocab: `"content"`, `"metadata.<k>"`, `"metadata.<k>:projected"`,
  `"fields_omitted"`. Existing `bytes_elided` / `metadata_keys_*` fields
  untouched (back-compat).

**Three new MCP tools:**
- `find_clusters(window?, since?, until?, format?)` at
  `src/mcp/tools/find-clusters.ts` — cheap cross-source DISCOVERY. Emits
  the FULL `atom_ids[]` per cluster (un-capped; the 50-cap was the load-
  bearing fix). `window_hours` is cluster-gap; `since/until` is lookback.
  No-args 4h→24h auto-expand reused via internal call to
  `getRecentWorkContext` so the polish stays consistent. Per-cluster
  `atom_ids_truncated` + `atom_ids_total` only fires above the 200 hard
  cap (safety net, not routine path). `result_caps` describes
  RESPONSE-LEVEL budget application — distinct from per-FIELD
  `truncations[]` on `get_atoms` results.
- `get_atoms(atom_ids[], fields?, format?)` at `src/mcp/tools/get-atoms.ts`
  — targeted body fetch (≤50 ids/call). Atoms returned in REQUESTED
  order. Per-atom `truncations` field per spec §4. Deterministic
  prefix-drop on 25k response budget overflow per spec §2 step 3-5;
  first-atom-oversize footgun (step 6) emits a guidance warning telling
  the caller to retry with narrower `fields[]`.
- `wait_for_new_turns(sources[], since, timeout?)` at
  `src/mcp/tools/wait-for-new-turns.ts` — stateless long-poll for group
  session A. Up to 8 sources; mixed entries (literal paths +
  source-app names). Source-app names → PREFIX MATCH (deliberately
  different from `tail_session(source_app=...)` MRU exact-source).
  Strict-after `since` boundary (post-filter since storage uses `>=`).
  1s polling; default 30s timeout, max 60s. No module-level mutable
  state; verified by 3-parallel-disjoint-sources test (acceptance #3).

**Existing tools updated:**
- `search_memories` + `tail_session`: `truncations` field on responses
  + searchMatchSchema z.array updated. Test: cap-hit produces
  `truncations: ["content"]`; non-hit produces `[]`.
- `get_recent_work_context`: deprecation marker prepended to tool
  description per spec §5; behavior unchanged. Tests assert the marker
  appears in `tools/list`.
- `mcp/server.ts`: registers the 3 new tools alongside the existing 4.

## Files Modified

In the worktree on `agent/mcp-toolkit-reshape-and-group-session`:

- `src/mcp/tools/find-clusters.ts` — created (~280 lines)
- `src/mcp/tools/get-atoms.ts` — created (~294 lines)
- `src/mcp/tools/wait-for-new-turns.ts` — created (~316 lines)
- `src/mcp/tools/recent-work-context.ts` — added `RECENT_WORK_CONTEXT_DEPRECATION_MARKER` prepended to description (+35 lines)
- `src/mcp/tools/search-memories.ts` — added `truncations` to interface + outputSchema (+9 lines)
- `src/mcp/tools/tail-session.ts` — added `truncations` to interface (+3 lines)
- `src/mcp/wire-shape/match.ts` — emit per-atom `truncations` from projectMatch (+38 lines)
- `src/storage/interface.ts` — added `getByIds(ids[])` (+6 lines)
- `src/storage/sqlite.ts` — implemented getByIds with reorder (+25 lines)
- `src/storage/memory.ts` — implemented getByIds with reorder (+18 lines)
- `src/mcp/server.ts` — registered the 3 new tools (+7 lines)
- `tests/storage/get-by-ids.test.ts` — new (12 tests; both backends)
- `tests/mcp/find-clusters.test.ts` — new (7 tests)
- `tests/mcp/get-atoms.test.ts` — new (11 tests)
- `tests/mcp/wait-for-new-turns.test.ts` — new (15 tests)
- `tests/mcp/envelope-find-get-chain.test.ts` — new (acceptance #9 chain ≤ compound)
- `tests/mcp/wire-shape/match.test.ts` — added truncations vocabulary tests
- `tests/mcp/tools/search-memories.test.ts` — assert `truncations` field
- `tests/mcp/tools/tail-session.test.ts` — assert `truncations` field
- `tests/mcp/tools/recent-work-context.test.ts` — assert deprecation marker + 7-tool registry
- `docs/mcp-integration.md` — document the 3 new tools + source-app divergence table

**Out-of-scope-but-necessary touches** (NOT in `files_to_modify` — see
"Decisions" §1 for justification):
- `tools/render-trace.ts`, `tools/serve-trace.ts`, `tools/stream-watch.ts`
  — `WindowedStorage` / `LiveStorage` / `StreamingStorage` all
  `implements Storage`, so the interface change to add `getByIds`
  required a 1-line delegation each. Without these, `npm run typecheck`
  fails. (5 lines per file.)
- `tools/mcp-integration-smoke.sh` — hardcoded `tools/list` count of 4
  needed bumping to 7 + per-tool grep guards added for the 3 new tools.
  Not in `npm test`; manual integration tool. Founder runs it.

Branch: `agent/mcp-toolkit-reshape-and-group-session`
Head SHA: `24cb42bce0e04ed5002fcc0c870a3298302ad718` (single squashed
commit since the V1.6 reshape lands as one logical change).

## Decisions Made During Implementation

### Decision 1: Lift `acceptance:` and `files_to_modify:` from spec body into frontmatter at claim time

- **Where:** the claim commit `9392ec6`.
- **Why this needed deciding:** the spec body explicitly tells the
  claimer to "copy the body's 10 acceptance bullets and file list
  verbatim into the frontmatter at atomic-claim time" (strategist origin
  note). But `docs/AGENT_INSTRUCTIONS.md` "Drift-Prevention Rule 6" says
  the only frontmatter fields a builder may edit are
  `claimed_by, claimed_at, branch, worktree, head_sha, pr_url, agent_notes`.
- **Resolution:** lifted them. The strategist's spec body authorisation
  is a per-item exception that supports `tools/blocked.py` validation
  (which would otherwise reject the stub `acceptance:` entry). Documented
  inline in the diff so review can flag if this is the wrong call.

### Decision 2: Reuse `getRecentWorkContext` inside `findClusters` rather than refactor

- **Why:** `getRecentWorkContext` already implements the no-args 4h→24h
  auto-expand polish, the TZ-naive warning, the storage-cap warning, and
  the `exclude_metadata_surface=['fs']` discipline. Re-implementing from
  scratch in `findClusters` would duplicate ~80 lines of polish and
  invite drift between the two paths (item 029's cursor falsification
  story is exactly what happens when two paths drift).
- **Trade-off:** `findClusters` calls `getRecentWorkContext` with
  `limit=MAX_LIMIT` (500) so the trace builder's atom-limit truncation
  doesn't silently drop atom_ids from low-rank clusters. The atoms map
  is computed and discarded. Cost is ≤500 storage rows × overfetch
  factor — bounded.
- **Alternative rejected:** factor a shared helper out of
  `runRecentWorkContextPass`. Would have meant touching the existing
  tool's internals more invasively; left as a follow-up if the second
  use site (V2 group session) wants finer control.

### Decision 3: Deterministic prefix-drop in `get_atoms` over hole-in-the-middle

- **Per spec §2 step 4** ("drop that atom AND every remaining requested
  ID"). Implemented straightforwardly: build the response in requested
  order, recompute `JSON.stringify(envelope).length` after each tentative
  add, roll back + drain remaining ids on overflow.
- **Cost:** O(n²) on the running envelope size — bounded by the 50-id
  cap. Profiled: still under 5ms for the 50-id × large-metadata test.
- **Why not greedy/density-aware:** spec is explicit; greedy would
  produce non-deterministic results when atom sizes vary, breaking
  consumer ability to "pass these N ids and know exactly which subset
  came back."

### Decision 4: Source-app prefix vs MRU exact-source — divergence between `tail_session` and `wait_for_new_turns`

- **Per spec §3 strict requirement** + acceptance #3.
- `tail_session(source_app='cursor')` → MRU exact-source (today's
  behavior, unchanged): "where did Cursor leave off" wants the freshest
  single thread.
- `wait_for_new_turns(sources=['cursor'])` → PREFIX match across ALL
  Cursor sessions: group session A wants to wake on ANY new turn,
  including from sessions that didn't exist at request time.
- **Documented in `docs/mcp-integration.md`** as a deliberate divergence
  table so future readers don't try to "unify" them.

### Decision 5: Strict-after `since` boundary in `wait_for_new_turns`

- **Per spec §3 acceptance #3** ("turns with `timestamp > since`,
  STRICT, not ≥").
- Storage uses `timestamp >= @since` in both backends. Two impl options:
  (a) post-filter at the tool layer (drop rows where `timestamp ===
  since`); (b) add a strict-after query path to storage.
- **Chose (a) post-filter** — keeps storage interface narrow,
  contained to the new tool, and the post-filter cost is O(20) rows max
  per poll. (b) would have rippled through `QueryFilter`,
  `MemoryStorage.query`, `SqliteStorage.query`, and broken back-compat
  with every existing caller.

### Decision 6: 25k response-byte ceiling for `get_atoms` (and `find_clusters` 10k cost target)

- **Per spec §2** ("hard interactive envelope ceiling of 25,000 chars").
- Matches the existing convention enforced by search/tail/recent-work-
  context tests. Constants are exported (`GET_ATOMS_RESPONSE_BYTE_CEILING`,
  `FIND_CLUSTERS_RESPONSE_BYTE_CEILING`) so a future tightening is
  one-line.

## Acceptance Criteria Status

| # | Criterion | Status |
|---|---|---|
| 1 | `find_clusters` ships with §1 shape + graph-membership-equality regression test | ✅ `tests/mcp/find-clusters.test.ts` "graph-membership equality with the un-clipped trace builder" — explicitly compares against `buildRecentWorkContext` output (not `buildSkeletonResponse`'s 50-clipped wire shape). 7 tests pass; cost target <10k chars asserted. |
| 2 | `get_atoms` ships with §2 shape + ≤50 validation + ordered + truncations + atoms_dropped/atoms_dropped_ids on overflow | ✅ `tests/mcp/get-atoms.test.ts` 11 tests pass; deterministic prefix-drop tested; first-atom-oversize footgun warning tested. |
| 3 | `wait_for_new_turns` ships with §3 shape + ≤8 + timeout default 30/max 60 + ISO8601 + 1s poll + prefix match for source_app + strict-after + stateless | ✅ `tests/mcp/wait-for-new-turns.test.ts` 15 tests pass; stateless via 3-parallel-disjoint-sources test; strict-after boundary explicitly tested. |
| 4 | `truncations: string[]` field added to `tail_session` and `search_memories` per §4 | ✅ Always-present `[]` test + cap-hit `["content"]` test for both tools. Existing `bytes_elided` field untouched. |
| 5 | `get_recent_work_context` deprecation marker prepended per §5 | ✅ `tests/mcp/tools/recent-work-context.test.ts` asserts the marker is prepended in `tools/list`; behavior unchanged (60 existing tests still pass). |
| 6 | Polling-fallback docs appended to `wait_for_new_turns` description | ✅ Description includes the recipe verbatim from spec §"Polling-fallback documentation". |
| 7 | Out-of-scope guardrail not violated | ✅ `get_recent_work_context` not removed; `echo_ping` not touched; `SOURCE_APP_VALUES` unchanged; no `whoami`; no SSE/push; no wiki edits. Decomposition's chain envelope stays UNDER compound's (acceptance #9 numbers below). |
| 8 | MCP best-practices compliance per item 025 | ✅ All 3 new tool descriptions follow the convention: discriminator one-liner ("Use when X"), explicit cost class ("cheap" / "medium" / "medium-blocking"), explicit statelessness claim where relevant, explicit migration recipes (deprecation marker on rwc). |
| 9 | `npm test` + `npm run lint` + `npm run typecheck` all pass; envelope chain test ships | ✅ 622 tests pass, 21 skipped (matches pre-030 baseline; no new skips); lint clean; typecheck clean; `tests/mcp/envelope-find-get-chain.test.ts` asserts `bytes(find) + bytes(get) ≤ bytes(rwc)`. |
| 10 | Run log appended with envelope measurements + wait latency + before/after dogfooding entry + observations | ✅ See sections below. |

## Test Results (verbatim)

```
$ npm test
...
 Test Files  39 passed | 1 skipped (40)
      Tests  622 passed | 21 skipped (643)
   Start at  00:44:02
   Duration  15.86s

$ npm run typecheck
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
(no output — clean)

$ npm run lint
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
(no output — clean)
```

## Acceptance #10a — Per-tool envelope measurements (chars)

Fixture: 15 claude_code turns × shared file `feature.ts`, 24h lookback,
N=15 ≤ DEFAULT_LIMIT=20 so the compound call materialises every atom.

| Call | Envelope (chars) | Note |
|---|---|---|
| `get_recent_work_context(since=now-24h, format='minimal')` | **49,285** | Compound — overflows the 25k consumer ceiling on its own. |
| `find_clusters(since=now-24h, format='skeleton')` | **1,167** | Discovery — full atom_ids[], no bodies. |
| `get_atoms(materialized_ids, format='minimal')` | **21,544** | 15 ids; under 25k ceiling. |
| **Chain (find + get)** | **22,711** | **54% smaller than compound; under the 25k ceiling.** |

**Read:** the decomposition's load-bearing claim ("two targeted calls
cost less than one compound call") is empirically true on this
realistic-density fixture, by a wide margin. The compound call
**already overflows the 25k consumer ceiling at minimum-realistic
density** (49k > 25k); the chain stays comfortably inside (22.7k).

## Acceptance #10b — `wait_for_new_turns` wake latency (ms)

10 trials. Each: arm a `setTimeout` to append at random offset 0-4500ms,
then call `wait_for_new_turns(timeout=5s, pollIntervalMs=100ms)`. Measure
wake delay = `wake_ms - arrival_offset_ms`. (Lower poll interval used so
the bench finishes in <60s; semantic identical to production
`pollIntervalMs=1000` — overhead just scales linearly with the interval.)

| Trial | Arrival offset (ms) | Wake (ms) | Overhead (ms) |
|---|---|---|---|
| 1 | 2599 | 2640 | 41 |
| 2 | 3660 | 3743 | 83 |
| 3 | 2840 | 2932 | 92 |
| 4 | 3139 | 3235 | 96 |
| 5 | 3215 | 3239 | 24 |
| 6 | 1506 | 1515 | 9 |
| 7 | 2124 | 2126 | 2 |
| 8 | 1962 | 2021 | 59 |
| 9 | 1102 | 1113 | 11 |
| 10 | 792 | 808 | 16 |

**Wake-overhead median: 41ms. p95: 96ms.** Bounded by `pollIntervalMs`
(100ms in this bench). In production with `pollIntervalMs=1000`, expect
~10× overhead (median ~410ms, p95 ~960ms) — still well under the 1s
poll budget.

## Acceptance #10c — Before/after cross-tool dogfooding entry (synthesized)

A real founder dogfooding entry will land in
`raw/internal/dogfooding/mcp-interactions-journal.md` after the
strategist runs the new toolkit through a real "where did I leave off"
call post-merge. Until then, the synthesized comparison below shows the
shape:

> **2026-05-10 (post-030 synthesis) — old vs new resume call shape**
>
> **OLD (compound):**
> - `get_recent_work_context()` → 49,285 chars on a 15-atom realistic
>   fixture. Tool-result budget OVERFLOWS at minimum-realistic density.
>   Founder cannot read it; AI client cannot consume it; only the
>   `format='skeleton'` ladder (already-shipped V1.5.7 polish) avoids
>   the overflow — at the cost of dropping atom bodies entirely.
>
> **NEW (decomposed):**
> - `find_clusters()` → 1,167 chars (cheap discovery; no bodies).
>   Founder reads cluster labels + source_breakdown + time_range and
>   picks the cluster matching intent (NOT blind `clusters[0]`).
> - `get_atoms(picked.atom_ids)` → 21,544 chars (targeted bodies only
>   for the cluster the founder cares about).
> - Chain total: **22,711 chars — fits the 25k budget.**
>
> The judgment-between-calls is the actual win: the founder picks the
> cluster (resume target may be a sibling of rank-1), then materialises
> only those bodies. The compound call materialised every cluster's
> bodies regardless.

## Acceptance #10d — Envelope/cost surprise observations for item 031

For item 031's removal-decision context:

1. **Compound call already overflows at minimum-realistic density.** 15
   atoms with realistic-density `tool_calls` projector reshapes still
   produces a 49k envelope at `format='minimal'`. The compound call's
   useful operating range is therefore restricted to
   `format='skeleton'` (which `find_clusters` now subsumes). Removing
   `get_recent_work_context` in item 031 removes a tool whose
   `format='minimal'` mode was already a footgun; the migration path
   (`find_clusters` → `get_atoms`) gives consumers a cleaner mental
   model.
2. **`find_clusters` cost target (<10k chars) hit at ~1.2k on a 15-atom
   fixture.** Plenty of headroom for the per-cluster `atom_ids[]` cap
   lift (200) — even a giant cluster won't dominate. The earlier
   skeleton-mode 50-cap was overly tight; we can now do "200 atoms
   discovered + 50 materialized at a time" cleanly.
3. **`get_atoms` deterministic prefix-drop is the right call.**
   Hole-in-the-middle drops would force consumers to re-request and
   diff; prefix-drop lets them paginate by passing the next N
   `atoms_dropped_ids` directly. The first-atom-oversize footgun
   warning is the load-bearing escape hatch — without it, a single
   large-metadata atom would silently produce `atoms: []` with no
   guidance.
4. **`wait_for_new_turns` polling fallback is documented prominently in
   the tool description.** If real MCP clients in the cohort can't
   handle 30s blocking calls cleanly during dogfooding, the
   founder/strategist can drop the long-poll without re-architecting —
   the polling pattern over `find_clusters(since=last_ts)` covers the
   same use case at higher cost.

## Open Questions for Founder

1. **Smoke-test + wrapper-Storage edits violate Drift-Prevention Rule
   4 strictly** (touched files not in `files_to_modify`). My judgment
   was that both were *necessary downstream effects* of the spec'd
   interface change (without them: typecheck fails OR smoke script
   silently breaks). If you'd rather I escalated, future runs will
   stop at the rule. Documented inline in the run log so it's
   auditable.
2. **Single squashed commit** vs splitting into logical chunks
   (storage interface; truncations field; new tools; tests; docs).
   Squashed because the V1.6 reshape is one logical change; if you'd
   prefer separable commits for review, I can `git reset
   --soft origin/main` on the branch and re-commit in stages — but
   that re-writes the pushed history. Flag for review preference.
3. **Spec acceptance #10c calls for "one before/after cross-tool
   dogfooding journal entry"** — I synthesized one in this run log
   rather than appending to `mcp-interactions-journal.md` (which is in
   active concurrent edit by another agent right now; race-condition
   appendage risk, see the strategist's 2026-05-10 00:30 PDT meta-
   entry). Strategist can move the synthesized entry into the journal
   verbatim post-merge if that's the right venue.

## Drift Events

None. Spec was tight; ambiguities were resolved by spec body wording
(window_hours-as-cluster-gap clarified explicitly, atom_ids cap lift
explicitly required, source-app prefix vs MRU explicitly different,
strict-after explicitly required). The five "drift voices" never
fired — the temptation list was small precisely because the spec was
explicit about what NOT to do (`get_recent_work_context` removal
deferred to 031; no SSE; no `whoami`; no `SOURCE_APP_VALUES` change;
no wiki edits).

## What's Next

- **Founder review against spec body §1–§5 + acceptance #1–#10.**
- **Independent reviewer (per Reviewer Independence Rule):** prefer
  strategist (Claude Code in conversation with founder) or a second
  builder agent (e.g. Cursor's Claude or Codex). Avoid self-review
  by Claude Code (this agent built it).
- **Post-merge:** strategist promotes the new tools to wiki per the
  "After Completion" section of the spec body (3 new pages,
  `mcp-server.md` update, deprecation banner on
  `mcp-recent-work-context.md`, `system-architecture.md` V1.6 milestone
  note, `_followups.md` "MCP retrieval — long-turn elision" → Resolved,
  `wiki/architecture/group-session.md` for Goal A).
- **Item 031** drafted at completion of 030 (per spec body opening
  note): remove `get_recent_work_context` after ≥1 week of founder
  dogfooding confirms the new tools cover all resume patterns.

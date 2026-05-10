---
backlog_item: 2026-05-10-032-m2-first-call-reliability
agent_run_started: 2026-05-10T22:45:40Z
agent_run_ended: 2026-05-10T22:57:00Z
status: ready_for_review
test_status: passing
agent_persona: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/m2-first-call-reliability
head_sha: a16779ed368fea90f1ce19372b818cf9b9f6d239
---

# Agent Run: M2 first-call reliability — single-source-recent demotion + resume-friendly get_atoms ordering

## What I Implemented

Per AC1–AC4 in `backlog/claimed/2026-05-10-032-m2-first-call-reliability.md`:

- **AC1 — predicate + auto-expand + demotion:**
  - New `src/trace/auto-expand.ts` (51 lines) exports `SINGLE_SOURCE_RECENT_THRESHOLD_MS` (300_000 ms = 5 min), `isSingleSourceRecent(cluster, atomsById, nowMs)`, and `noUsefulCluster(clusters, atomsById, nowMs)`. The predicate operates on `NormalizedContextEvent.time.occurred_at` per AC1.
  - `src/mcp/tools/recent-work-context.ts`: the no-args auto-expand block now fires when `noUsefulCluster(4h)` is true (covers both the historic `clusters.length === 0` case AND the new "all single-source-recent" case). Warning is now `[AUTO_EXPAND] <trigger> ...` with trigger ∈ `{empty, single-source-recent}`. When trigger is `single-source-recent`, the 24h cluster set is re-ranked via `rankClusters(..., { demoteSingleSourceRecent: true, nowMs })` and cluster `rank`/`rank_reason` are rewritten in place.
  - `src/trace/rank.ts`: added optional `RankOptions { demoteSingleSourceRecent?, nowMs? }` 4th param. When demote is true and nowMs provided, the sort decoration adds a NEW primary key `singleSourceRecent` (0 = non-single-source-recent, 1 = single-source-recent) sorted ascending. Existing 5-key chain (`hint > openLoop > recent > size > negMedianAge > cluster_id`) becomes the tiebreaker within each partition. R2-2 strict-partition contract.

- **AC2 — `get_atoms` `prefer` parameter:**
  - Added optional `prefer: "as_requested" | "newest_first"` to `GetAtomsParams` + `inputSchema`. Default `"as_requested"` preserves existing contract.
  - New `buildProcessOrder` helper builds the iteration order: under `newest_first`, dedupe input to first occurrence → split existing vs missing → stable-sort existing by `CaptureEvent.timestamp` DESC (ties → input order) → append missing IDs at end preserving input order.
  - Main prefix-drop loop now operates on `processOrder` instead of `atom_ids` directly. Drops the END of the processed order on overflow — under newest_first, END = oldest atoms + missing IDs.

- **AC3 — description strings updated in lockstep:**
  - `FIND_CLUSTERS_DESCRIPTION` NO-ARGS RESUME bullet updated to document both triggers (`empty` + `single-source-recent`), the demotion rule, and the new warning label format.
  - `RECENT_WORK_CONTEXT_DEPRECATION_MARKER` migration recipe gained a RESUME-STYLE QUERIES section pointing at `prefer='newest_first'` and the single-source-recent auto-expand.
  - `GET_ATOMS_DESCRIPTION` PARAMETERS section gained the `prefer` bullet documenting the asymmetry (default preserves existing contract; newest_first introduces opt-in dedup + sort + missing-IDs-at-end).

- **AC4 — tests:**
  - `tests/trace/auto-expand.test.ts` (NEW, 9 tests): four predicate fixtures (empty / all single-source-recent / all single-source-but-old / mixed) + edge cases (multi-source, latest-atom-rule, boundary inclusive).
  - `tests/trace/rank.test.ts`: strict-partition demotion test (noise with `hint=1, openLoop=1, recent=1, size=20` vs two weak multi-source-old work clusters → demoted noise lands LAST, both work clusters precede it). Baseline check (without demote) confirms noise wins; demote diff is the contract. Plus degenerate-input test (all single-source-recent → existing 5-key chain decides tiebreaker, no synthetic empty).
  - `tests/mcp/find-clusters.test.ts`: chain integration test (24h-spanning fixture with 2 claude_code noise atoms in last 5min + multi-source work session 6h ago) — auto-expand warning fires with `single-source-recent` trigger, clusters[0] is the prior multi-source work, noise present but ranked below, `get_atoms(top.atom_ids, prefer='newest_first')` returns the newest work atom (codex turn at 14:10) first. Plus a warning-label disambiguation test (empty trigger does NOT carry the single-source-recent label).
  - `tests/mcp/get-atoms.test.ts`: 5 `newest_first` tests covering (a) DESC sort, (b) missing IDs at end, (c) dedup-on-input asymmetry (newest_first dedupes, as_requested preserves dupes — R2-3), (d) drop-priority diff vs as_requested under budget pressure (8 heavy atoms + 2 missing IDs → newest_first survives the 4 newest, as_requested survives the 4 earliest), (e) envelope-ceiling preservation.

## Files Modified

- `src/trace/auto-expand.ts` — created (51 lines)
- `src/trace/rank.ts` — +49 lines (RankOptions + primary sort key)
- `src/mcp/tools/recent-work-context.ts` — +63 / -23 (extended auto-expand trigger + demote re-rank)
- `src/mcp/tools/find-clusters.ts` — +2 / -2 (AC3 description)
- `src/mcp/tools/get-atoms.ts` — +99 / -22 (prefer parameter + buildProcessOrder helper + loop refactor + description)
- `tests/trace/auto-expand.test.ts` — created (220 lines, 9 tests)
- `tests/trace/rank.test.ts` — +205 lines (2 new tests)
- `tests/mcp/find-clusters.test.ts` — +115 lines (2 new tests)
- `tests/mcp/get-atoms.test.ts` — +176 lines (5 new tests in a nested describe)

Branch: `agent/m2-first-call-reliability`
Head SHA: `a16779ed368fea90f1ce19372b818cf9b9f6d239`

## Decisions Made During Implementation

### Decision 1: Predicate location — `src/trace/auto-expand.ts` (new file)

- **Options considered:** (a) inline in `find-clusters.ts`, (b) inline in `recent-work-context.ts`, (c) new `src/trace/auto-expand.ts`.
- **Chose:** (c).
- **Why:** The predicate is used in two consumer paths — the auto-expand trigger in `getRecentWorkContext` AND the per-cluster sort key in `rank.ts`. Co-locating in `rank.ts` would invert the historical "rank consumes shared trace primitives" direction; placing in a tool file would create a tool→trace import. A new `src/trace/auto-expand.ts` keeps the dependency arrow inward (consumers import from trace; trace doesn't import back). The Implementation Notes explicitly authorized `src/trace/auto-expand.ts` as one of two acceptable locations.
- **Worth founder review?** No — explicit in spec.

### Decision 2: Re-rank in `getRecentWorkContext` rather than threading a parameter through `buildRecentWorkContext`

- **Options considered:** (a) thread `demoteSingleSourceRecent` through the `Query` interface so `buildRecentWorkContext` does the demotion natively, (b) re-rank in `getRecentWorkContext` after the 24h pass returns.
- **Chose:** (b).
- **Why:** Option (a) widens the `Query` shape — a public surface used in every trace test fixture — to carry a flag only the no-args auto-expand path needs. Option (b) keeps the demotion's blast radius local: the 24h response is already in hand, `response.atoms` already maps id → NormalizedContextEvent, and `rankClusters` is already exported with an options 4th param. The 24h re-rank is a single `rankClusters` call + a `forEach` rewrite of `rank` + `rank_reason`. Lower surface-area change.
- **Worth founder review?** No — narrower change preserves the existing `Query` contract.

### Decision 3: Stable sort under `newest_first` ties → input order

- **Options considered:** (a) JS native `Array.prototype.sort` (stable in V8 since 2018), (b) decorate-sort-undecorate with explicit position tiebreaker.
- **Chose:** (b).
- **Why:** Spec says "ties resolve in original request order." Decorate-sort-undecorate makes the tiebreak explicit in the code (independent of engine stability guarantees) and lets the tiebreak survive future refactors. Same pattern the existing `rank.ts` `negMedianAge` uses.
- **Worth founder review?** No — defensive equivalent.

### Decision 4: `prefer="as_requested"` (default) deliberately does NOT dedupe input

- **Options considered:** (a) dedupe at the boundary regardless of `prefer`, (b) preserve duplicates under as_requested per the R2-3 asymmetry, dedupe only under newest_first.
- **Chose:** (b).
- **Why:** R2-3 spec says "Each unique ID appears at most once in `atoms[]`. This is NEW behavior introduced with `prefer='newest_first'` — `prefer='as_requested'` (default) preserves the existing storage contract... duplicates as repeated entries." The test for the default path asserts behavior is `>=1` matched atoms (storage's `getByIds` may de-dupe at its layer; we don't add a second one).
- **Worth founder review?** No — explicit in R2-3.

## Acceptance Criteria Status

- [x] **AC1** — predicate (`SINGLE_SOURCE_RECENT_THRESHOLD_MS`, `isSingleSourceRecent`, `noUsefulCluster`) defined; auto-expand fires on `noUsefulCluster(4h)`; warning labeled `[AUTO_EXPAND] <trigger>`; demotion implemented as strict-partition primary sort key in `rank.ts`, gated on `demoteSingleSourceRecent` option (default false). 5 predicate tests + 1 strict-partition rank test + 1 degenerate-input test all green.
- [x] **AC2** — `get_atoms` accepts `prefer: "as_requested" | "newest_first"`. `newest_first` dedupes input to first occurrence, sorts existing by `CaptureEvent.timestamp` DESC (stable, ties → input order), appends missing IDs at end. 5 tests green.
- [x] **AC3** — `FIND_CLUSTERS_DESCRIPTION` updated; `RECENT_WORK_CONTEXT_DEPRECATION_MARKER` migration recipe updated; `GET_ATOMS_DESCRIPTION` PARAMETERS bullet added for `prefer`. `outputSchema` description fields don't reference auto-expand semantics (no change needed per AC3 conditional).
- [x] **AC4** — all five required tests landed (predicate, auto-expand trigger, demotion strict-partition, get_atoms newest_first, chain integration). 21 new test cases total.

## Tests Run

```
$ npm test
...
 Test Files  40 passed | 1 skipped (41)
      Tests  644 passed | 21 skipped (665)
   Start at  15:55:08
   Duration  20.09s

$ npm run lint
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
[no output — clean]

$ npm run typecheck
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
[no output — clean]
```

New tests (all green):
- `tests/trace/auto-expand.test.ts` — 9 tests (`isSingleSourceRecent` × 5, `noUsefulCluster` × 4)
- `tests/trace/rank.test.ts` — +2 tests (strict-partition demote, degenerate-input)
- `tests/mcp/find-clusters.test.ts` — +2 tests (single-source-recent trigger chain, empty-vs-single-source-recent label disambiguation)
- `tests/mcp/get-atoms.test.ts` — +5 tests (DESC sort, missing IDs at end, dedup asymmetry, drop-priority diff, envelope ceiling under newest_first)

## Open Questions for Founder

None — spec was R3-clean (Cursor explicit "Proceed", Codex "After those two wording fixes: proceed" — both fixes landed in R3 patch).

## Anything I Almost Did But Stopped Myself

- **Tempted to fix the 60 pre-existing prettier warnings** in `tests/` while I was running `format:check`. Caught myself — Pattern 1 (scope creep). Only formatted the 9 files I actually touched. The pre-existing format warnings are someone else's call to address (they predate my claim; a clean `git stash` confirmed 60 warnings exist on the unmodified branch).
- **Tempted to update `mcp-integration-smoke.sh`** per the Implementation Notes' optional bump ("Bump `mcp-integration-smoke.sh` to validate `prefer='newest_first'` round-trip if it has time. Not strictly required for acceptance."). The note says "if it has time" + "not strictly required." Deferred since the chain integration test in `find-clusters.test.ts` already exercises the round-trip end-to-end and the smoke script is shell-level (separate concern). If a follow-up bumps it, the round-trip is one shell-loop addition.

## Drift Events Caught

None requiring `raw/internal/decisions/` writeups.

## Next Suggested Backlog Items (Don't Auto-Create)

- The "Update `mcp-integration-smoke.sh` to validate `prefer='newest_first'` round-trip" line in Implementation Notes could be cherry-picked into a 10-minute polish item, but it's already implicitly covered by the new chain integration test.

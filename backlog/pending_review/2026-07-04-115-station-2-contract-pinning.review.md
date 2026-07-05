---
item_id: 2026-07-04-115-station-2-contract-pinning
verdict: merge as-is
reviewed_at: '2026-07-05T01:18:31Z'
test_counts:
  passed: 1694
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. All five acceptance criteria are Met against the pinned head_sha ab39e06a. The diff touches exactly the four files_to_modify (930 insertions, 23 deletions) with zero drift: resolveCurrentGranolaSignalRuns is untouched, no capture/poller, getSignalWindow (113), decision-drift, intake/station-3, extractor/prompt/output, or schema/whitelist/MCP-schema changes, and observability counters are per-tick in-memory only. AC1's filterToCurrentSignalRuns is a faithful extraction of the search-memories inline block that composes the untouched resolver, preserves input order, and passes non-signal rows through; 13 unit cases pin every semantic including hardcoded run-b winners for the duplicate and tie fixtures, the ManifestFailOnceStorage retry-orphan exclusion, cycle-terminates, inert nonexistent-ref, and exact array-equality order preservation. AC2 replaces the inline block with a single helper call, existing tests untouched (pure append), plus a retry-orphan parity case through the tool path. AC3 surfaces the exact observability key set with exclusive first-match precedence (missing_summary -> missing_transcript -> missing_dedupe_key, multi-defect note counts once), two separately-falsifiable malformed paths, and unparsable updated_at counted-as-settled while an unparsable now clock is correctly NOT counted; the mixed-defect worker-level case asserts the full object by equality plus reason-log spies. AC4 pins hardcoded field lists and the transcript-vs-summary quote asymmetry (transcript span presence-enforced, summary spans unguaranteed). AC5 adds no new source module and both packaging tests pass with zero snapshot delta. The builder's candidateEvents param name (vs spec working name signalEvents) is load-bearing and correct: the helper accepts a mixed window by design to preserve item-112 cross-source-join passthrough, and the exported function name matches spec exactly. Independent verification reproduced the builder's numbers exactly: targeted 99 passed, packaging 2 passed zero delta, full product suite 1694 passed / 21 skipped / 1 todo / 0 failed, tsc clean, eslint --max-warnings 0 clean on the four changed files. Merge to origin/main previewed clean (real git merge --no-ff, 0 conflicts, only the four files staged).

## Pre-merge fixups
- [ ] None. Mergeable as-is; no pre-merge punch-list items.

## Expected merge conflicts
- None. A real `git merge --no-ff ab39e06a` into a worktree at origin/main (tip 9d90d931) completed cleanly with 0 conflicts and only the four `files_to_modify` staged. The branch forked from 7bc368b5; origin/main has advanced only by the review sidecar (f99bcf69) and the founder's pitch-dir removal (9d90d931), neither of which touches these four files. The merge does NOT reintroduce the removed `raw/internal/pitch/` files (the branch diff does not touch them).

## Follow-up items (defer, do not block merge)
- Founder disposition (already actioned): the atomic-claim commit 7bc368b5 swept an untracked `raw/internal/pitch/yc-2026-07/**` (YC pitch drafts) into main via `git add -A`. The founder already removed it from HEAD at 9d90d931 (option 2, history retains 7bc368b5). It is on the merge base, not in this item's code diff, and does not affect this merge. No action needed for 115.
- Strategist "After Completion" owes: file per-station followups (drift-sweep station-6, intake station-3) to adopt `filterToCurrentSignalRuns` when each is next touched, and wiki-promote the signal-window architecture page to reference the helper as the currentness half of the station-2 contract.

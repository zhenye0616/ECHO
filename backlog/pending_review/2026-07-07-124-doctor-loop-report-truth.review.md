---
item_id: 2026-07-07-124-doctor-loop-report-truth
verdict: merge as-is
reviewed_at: '2026-07-07T08:07:01Z'
test_counts:
  passed: 2084
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (5042b0890efd6a6c9568c895331ce7deed7fd433). All 4 ACs Met with file:line evidence: AC1 station-2 observed via 120's exported heartbeat contract, staleness from last_tick_at not checkpoint mtime, the 2026-07-06 quiet-day false alarm is a named regression test, missing/malformed heartbeat falls back to inference with explicit inferred:true; AC2 station-1 rows = pinned set UNION store-derived distinct prefixes (bounded SQL LIMIT 5000, read-only), phantom classes removed, coord: surfaced, zero-atom pinned classes annotated in report AND rendered text; AC3 dashboard source verified untouched (fixture-only test update); AC4 6 new tests, 44/44 targeted. All three builder flags upheld: (1) render.ts edit is spec-mandated by AC2's rendering clause (annotation unreachable in human output otherwise; 5 lines; list was PROVISIONAL) — founder ratifies via this merge per the 121/123 precedent; (2) observed disabled/degraded kept SOFT — correct: hardening would unilaterally change the pinned overall-rollup contract mid-item; whether observed-disabled should downgrade overall is deferred to the founder as a follow-up; (3) surfacing 'degraded' heartbeats soft is the spirit of report-tells-the-truth, not drift. The 1 recorded failure is tests/surfaces/ceo-slack-brain.test.ts, the named acceptable flake — passes in isolation 18/18 (2.1s); shell-reachable passed in-suite. Lint and typecheck clean, reproduced by the reviewer. Zero conflict predicted vs main and vs 125's branch in either merge order (disjoint files: 124 touches the dashboard TEST, 125 the dashboard SOURCE).

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: branch clean vs main; disjoint from 125's merge in either order

## Follow-up items (defer, do not block merge)
- hardening: readSignalsHeartbeat should return null (fall to inferred path) when last_tick_at fails to parse to a finite time — a corrupt-but-JSON-valid heartbeat currently reads as observed-and-never-stale
- founder policy call: should an observed-disabled station-2 worker ever downgrade doctor's overall rollup (currently soft by design)
- perf cleanup candidate: queryClassHealth materializes full rows to count; coord: adds 18k+ rows per doctor run — a COUNT(*) storage method would fix the class

---
item_id: 2026-07-02-111-list-task-states-batched-git
verdict: merge as-is
reviewed_at: '2026-07-03T03:47:48Z'
test_counts:
  passed: 1610
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
All six ACs met with observed evidence at head_sha e50237dcef0ce6fcc86d81c8283c0b1d7be6dd4c. Constant 8-child git budget through a single injectable GitRunner seam with a full-argv-ledger test; single-SHA pinning verified by trace (resolveRefOnce at entry, all 7 subsequent reads take the resolved sha); AC6 zombie class made structurally impossible via spawnSync capture with explicit 64MiB maxBuffer (permitted alternative), high-cardinality test at 606 dirs. Baseline methodology sound (fixture+baseline commit 175e0d9f precedes the rewire commit; deep-equal). Reviewer additionally ran old-vs-new implementations against the REAL repo (~3.8k commits, 49 task-state dirs) at the same pinned SHA: byte-identical JSON. Zero drift (diff = exactly the 5 allowed files; get-role-state.ts and role-state.test.ts byte-untouched). Regression target fixed: recent-calls-endpoint 2 passed at 977ms standalone (was ~11.7s/timeout), green in full suite. Known theoretical edges (merge-only-touched-path commit-time attribution; ledger blind to out-of-seam spawns; tautological AC6(a) counter test) documented as non-blocking follow-ups.

## Pre-merge fixups
- [x] none — reviewer found no pre-merge fixups

## Expected merge conflicts
- none expected — merge-base fa7c35ac is atop the 110 merge; zero main-side commits touch the 5 changed files since fork (backlog/docs churn only)

## Follow-up items (defer, do not block merge)
- Rename run log to drop the doubled date prefix (2026-07-02-2026-07-02-111-... -> 2026-07-02-111-...)
- Restore the pinned-commit-time fallback in the batched path (or document the hard-error choice) to close the merge-only-touched-path edge where git log --name-only emits no file list for merges
- Strengthen or drop the tautological AC6(a) injected-failure counter test; optionally add a PATH-shim git counter if out-of-seam spawn regression ever matters

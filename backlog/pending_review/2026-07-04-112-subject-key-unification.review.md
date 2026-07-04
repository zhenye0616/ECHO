---
item_id: 2026-07-04-112-subject-key-unification
verdict: merge with founder fixups
reviewed_at: '2026-07-04T20:24:23Z'
test_counts:
  passed: 1885
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Code is correct and complete: all five ACs Met with load-bearing tests (byte-stable dedupe_key literal, mixed-generation fixture, AC5 negative test); zero drift — the one out-of-files_to_modify touch (packed-manifest snapshot +2 lines) is a forced mechanical consequence of shipping src/util/subject.ts; both builder-flagged design choices stand (decision_atom_type predicate is the spec-permitted equivalent and the import-closure constraint is real; verified legacy atoms carry the predicate key). Worktree HEAD matches recorded head_sha 658f3d22. The only pre-merge fixup is a verification gate, not a code change: the full suite shows 1 failing test (tests/cli/shell-reachable.test.ts, daemon-health integration) assessed as pre-existing/environmental — confirm it fails identically on clean origin/main before merging; orchestrator check in progress. typecheck and lint clean.

## Pre-merge fixups
- [ ] Verification gate only (no code change): confirm tests/cli/shell-reachable.test.ts ('packs an echoctl binary…', fails with daemon-not-healthy-on-port) fails identically on clean origin/main in this environment. If it PASSES on clean main, escalate to founder before merge — otherwise pre-existing/environmental, proceed.

## Expected merge conflicts
- none — all four modified src/test files unchanged on origin/main since merge-base ee8aa848; src/util/subject.ts is new; main advanced only via 113/114 review-round commits touching disjoint paths; --no-ff merge applies clean.

## Follow-up items (defer, do not block merge)
- Strategist post-shipment: note unified canonical_subject key on wiki/architecture/storage (per spec After-Completion notes).
- Confirm 113's loop filter treats canonical_subject as the sole forward join key when 113 is built.
- agent_notes' claimed test counts (1617 passed / 0 failed) did not match observed (1885 passed / 1 failed, failure environmental); harmless here but worth noting for builder-report calibration.

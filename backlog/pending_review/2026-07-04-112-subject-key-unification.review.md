---
item_id: 2026-07-04-112-subject-key-unification
verdict: merge with founder fixups
reviewed_at: '2026-07-04T20:25:56Z'
test_counts:
  passed: 1885
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Code is correct and complete: all five ACs Met with load-bearing tests (byte-stable dedupe_key literal, mixed-generation fixture, AC5 negative test); zero drift — the one out-of-files_to_modify touch (packed-manifest snapshot +2 lines) is a forced mechanical consequence of shipping src/util/subject.ts; both builder-flagged design choices stand (decision_atom_type predicate is the spec-permitted equivalent and the import-closure constraint is real; verified legacy atoms carry the predicate key). Worktree HEAD matches recorded head_sha 658f3d22. typecheck and lint clean. The single full-suite test failure was investigated and RESOLVED as flake (see fixups) — no code fixups remain; merge is unblocked pending founder sign-off.

## Pre-merge fixups
- [x] RESOLVED by orchestrator verification (2026-07-04 13:25 PDT): tests/cli/shell-reachable.test.ts failed once in the reviewer's full-suite run (daemon-not-healthy-on-port) but PASSES in isolation on BOTH clean origin/main (ephemeral worktree, npm ci) AND the feature branch at 658f3d22. Diff exonerated in both directions; failure is daemon-port/timing flake under full-suite load. No action required; flake tracking is a follow-up.

## Expected merge conflicts
- none — all four modified src/test files unchanged on origin/main since merge-base ee8aa848; src/util/subject.ts is new; main advanced only via 113/114 review-round commits touching disjoint paths; --no-ff merge applies clean.

## Follow-up items (defer, do not block merge)
- Strategist post-shipment: note unified canonical_subject key on wiki/architecture/storage (per spec After-Completion notes).
- Confirm 113's loop filter treats canonical_subject as the sole forward join key when 113 is built.
- tests/cli/shell-reachable.test.ts is flaky under full-suite load (daemon port health timeout) — candidate for a dogfooding/ops note or test-hardening item; do not fold into 112.
- agent_notes' claimed test counts (1617 passed / 0 failed) did not match observed (1885 passed / 1 failed environmental); harmless here but worth noting for builder-report calibration.

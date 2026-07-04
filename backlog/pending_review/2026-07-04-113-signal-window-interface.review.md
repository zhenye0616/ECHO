---
item_id: 2026-07-04-113-signal-window-interface
verdict: merge with founder fixups
reviewed_at: '2026-07-04T21:23:39Z'
test_counts:
  passed: 1911
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
All ACs Met (AC1 union/full-fidelity/no-next-cursor, AC2 single scope table, AC3 generalized half-open seam with backend parity, AC4 late-arrival, AC5 determinism, AC6 strict-equality loop filter with real static import-closure test); coord seam reimplemented on the generic seam with existing coord test unmodified and green; zero drift; six builder design calls judged — five stand, one needs a founder fixup: the sealed spec is internally contradictory (AC2 'company = derived:*' also matches derived:granola-signals-index, the dedupe MANIFEST source, while AC1 enumerates only the two real signal sources as union members), so company-scope windows would surface bookkeeping atoms as context entries. Single test failure is the known shell-reachable full-suite flake (passes isolated).

## Pre-merge fixups
- [ ] Resolve AC1/AC2 contradiction: exclude derived:granola-signals-index from company scope (one-line exclude set or named-source allowlist) + a test asserting manifest atoms never appear in company windows. Orchestrator applying at C4 under founder's standing pipeline authorization; founder may override post-merge.

## Expected merge conflicts
- none — branch forked after both 112 merge commits; only origin/main commit not on branch is the item's own pending_review transition (backlog files, no code overlap).

## Follow-up items (defer, do not block merge)
- Push since/until into SQL WHERE for event-time mode once the ledger grows (currently materializes full in-scope ledger, filters in JS — fine at demo scale).
- Strategist: record in review_notes that iterateCoordAtomsByAppendOrder was reimplemented on the generic seam (not left parallel).
- New wiki/architecture/signal-window page post-shipment (spec After-Completion).

---
item_id: 2026-07-06-120-worker-heartbeat-artifacts
verdict: merge as-is
reviewed_at: '2026-07-06T02:07:18Z'
test_counts:
  passed: 1746
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches recorded head_sha (f1a53d84). All 5 ACs Met with file:line evidence (contract module worker-heartbeat.ts; tick-end heartbeats + total result-to-status mapping in all three workers; every boot-disable path writes status:disabled; drift degraded predicate from tracked retryable_failures, false-positive-free per tests; best-effort writer never crashes a worker). No scope drift: the single out-of-files_to_modify edit (tests/packaging/packed-manifest.test.ts, +2 lines) is the mechanical packed-set consequence of the new shipped module, same class as item 114 precedent, self-flagged by the builder. All four agent design choices judged Stand (run()-wrapper placement; blockingSeqs-based watermark-advance definition; exhaustive status map incl. brain_unavailable->degraded; setEchoHomeRoot test isolation). Reviewer re-ran verification independently: typecheck clean, lint clean, test:product exit 0 including the three flakes agent_notes flagged.

## Pre-merge fixups
- [ ] none — tests/lint/typecheck green, ACs met, drift accounted for

## Expected merge conflicts
- against current main: none expected (branch cut from current main; new file plus edits in unmodified regions)
- against in-flight item 119 (agent/drift-delivery-retry, same decision-drift.ts): additive-mechanical collision in DriftSweepResult ok-branch type (:558-577), runDriftSweepOnce counter decls/return literal (:634-645, :908-922), adjacent loop hunks (:741, :758), and the run()/runInner() split (:1261-1291) — merge 120 and 119 sequentially; whichever lands second hand-reconciles the result shape and loop hunks; no semantic incompatibility

## Follow-up items (defer, do not block merge)
- optional hardening: write a heartbeat even on an uncaught runInner() throw (theoretical path; all known error paths return values)
- after 119 and 120 both land: wire item 117's doctor loop section to consume the exported heartbeat contract (already 117 AC3's named follow-up, out of scope here)

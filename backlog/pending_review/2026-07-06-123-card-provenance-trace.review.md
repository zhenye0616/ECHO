---
item_id: 2026-07-06-123-card-provenance-trace
verdict: merge as-is
reviewed_at: '2026-07-07T05:17:21Z'
test_counts:
  passed: 2078
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (e27eebd7b6321c519b7a5182e5a92b78ae53ab15). All 5 ACs Met with file:line evidence: AC1 channel-agnostic derived:intake-cards atom with byte-identical posted text (same string instance passed to postSeed), card_atom_status {written,failed} marker written in the SAME markPosted mutate, duplicate-suppressed rerun provably cannot clear a failed marker (test-verified), trace reports provenance loss; AC2 tri-state capture_status embedded in classifier_run one hop from the card atom, proxy-start failure and finish failure both yield capture_failed never fake zero_retrievals, persisted in SQLite; AC3 trace-card with 121-identical entry guard renders all three states + PROVENANCE LOSS banner + pre-123 walk; AC4 existsSync-gated read-only with byte-identical test incl. no-db case; AC5 all enumerated tests present and substantive. Both builder flags upheld: (1) src/enrich/granola-intake-seed-store.ts is outside PROVISIONAL files_to_modify but the edit is literally forced by AC1's text (record type + markPosted live only there; new arg optional, no caller behavior change) — founder ratifies via this merge, same shape as 121's package.json line; (2) the recording proxy is AC2's sanctioned option 2, fidelity-verified (all headers forwarded incl. Accept for the 406 requirement, responses streamed unbuffered, per-run isolation, wired only into the intake classifier — CEO responder untouched). Full suite 2078/2078 pass (flake did not fire), lint and typecheck clean. Four non-blocking hardening follow-ups filed.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: merge-tree reports 0 conflict markers; main moved only by the review sidecar commit since branch point; no file overlap

## Follow-up items (defer, do not block merge)
- add error-event handlers on ures/cres streams in createHttpRetrievalCapture (brain.ts:1005-1012) — unhandled EPIPE after brain-child timeout kill could crash the enrich worker
- document the proxy-bypass blind spot (child MCP config hardcoding the daemon URL records fake zero_retrievals) when promoting the mechanism to the wiki house pattern
- optional: seed-store-by-note listing in trace --note mode for pre-123 notes
- optional: dedupe_key existence check before card-atom append to close the markPosted-throw retry double-atom edge

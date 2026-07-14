---
item_id: 2026-07-13-135-local-echo-context-source-extraction
verdict: redo before merge
reviewed_at: '2026-07-14T22:01:17Z'
test_counts:
  passed: 987
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. Fresh independent AC8 review of target c3882ec057d1f19dd729977730a87ac6e76e5714 rejected the evidence contract: the byte-bound ESLint configuration imports TypeScript ESLint modules from the clean shared target's intentionally absent node_modules, so exact private-clone lint exits 2 unless the reviewer mutates the accepted target. The code and focused proof batteries otherwise pass. The immutable rejection record is published as sole-parent review child ebad1fc944103b00fb8064b8bf545cf715ecf721.

## Pre-merge fixups
- [ ] Replace the embedded ESLint bytes in `raw/internal/migrations/2026-07-13-135-echo-context.md` with a relocatable configuration retaining the same rules, and bind its exact new SHA-256.
- [ ] From a new config-isolated private clone, prove byte-identical typecheck and lint without reading or writing shared-target `node_modules`.
- [ ] Correct the target README AC3 aggregate from `2f0b28f6...` to the independently reproduced `6569b047...`, then create a new target HEAD/tree and refresh every affected hash and object binding.
- [ ] Publish a new immutable builder head and independent sole-parent review child without installing, transferring authority, or advancing maturity.

## Expected merge conflicts
- No textual conflicts are predicted against current `main`; the fresh merge-tree preview was clean.
- On re-review, preserve current-main backlog, task-state, generated-index, run-log, journal, and sidecar state; do not treat two-dot branch reversions as merge inputs.

## Follow-up items (defer, do not block merge)
- Remove or explicitly adjudicate residual onboarding, task-state, coordination vocabulary, and Project_echo default-path semantics before qualification.
- Define loopback binding and authentication policy before any general MCP-server exposure.

---
item_id: 2026-07-13-133-local-echo-brain-source-extraction
verdict: redo before merge
reviewed_at: '2026-07-14T22:01:16Z'
test_counts:
  passed: 25
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. Fresh independent AC8 review of target 957ad4680f6c67d15fb3dfa0941b52c2ab9c3110 rejected the candidate: the file-global command-literal map in tools/check-dependencies.mjs lets an attacker-controlled inner command inherit authorization from an unrelated outer same-name literal binding. AC2, AC5, and AC7 remain unmet. The immutable rejection record is published as sole-parent review child 1caf83fc63c83f044a2f0d2608a85bcf4759bbcc.

## Pre-merge fixups
- [ ] Replace the file-global command-name map in `tools/check-dependencies.mjs:152-176` with scope- and mutation-correct analysis, or reject every nonliteral executable token outside the explicit computed-command owners.
- [ ] Commit the exact same-name shadowing fixture from the fresh review as a fail-closed regression alongside the direct arbitrary-RHS fixture.
- [ ] Produce a new accepted echo-brain target OID/tree, regenerate extraction provenance and the Project_echo migration record, and rerun B0/B1/B2 plus fresh independent R1.
- [ ] Publish a new immutable builder head and independent sole-parent review child without advancing authority or maturity.

## Expected merge conflicts
- No textual conflicts are predicted against current `main`; the fresh merge-tree preview was clean.
- On re-review, preserve current-main backlog, task-state, generated-index, run-log, journal, and sidecar state; do not treat two-dot branch reversions as merge inputs.

## Follow-up items (defer, do not block merge)
- Reconcile the TypeScript/typescript-eslint peer-range mismatch before qualification.
- Consolidate superseded identity sections in a later migration-record cleanup.

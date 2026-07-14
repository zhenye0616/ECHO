---
item_id: 2026-07-13-135-local-echo-context-source-extraction
verdict: redo before merge
reviewed_at: '2026-07-14T19:20:07Z'
test_counts:
  passed: 3181
  failed: 14
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. Although echo-context's target suite reports 973 passing tests, the accepted OID does not satisfy load-bearing AC2, AC3, AC6, or AC8 proof contracts: runtime inventory is shallow, context parity never launches and compares the pinned source stdio surface, parity rows are not tied to same-path source evidence, and the service proof does not enforce the pinned schema or fail-closed teardown/environment rules. These are target/proof defects requiring a new accepted OID, migration record, and independent review child.

## Pre-merge fixups
- [ ] Implement AC3 pinned-source stdio/process-group parity with the sealed 10-case fixture, source roster/ignored-ID/projected-descriptor bindings, canonical full-response hashing, and negative mutations.
- [ ] Make AC2 runtime inventory recursively derived and fail closed for transitive reads/imports/launches, npm loaders such as `tsx`, native helpers, migrations, and SQL blobs.
- [ ] Bind every AC6 parity row's source OID/hash to the same-path `source-evidence` row and add mutation coverage.
- [ ] Enforce `schemas/service-api.v1.json`; sanitize the service child environment; bound request bodies and timeouts; guarantee cleanup; and fail when graceful shutdown or descendant termination fails.
- [ ] Correct the tracked README's `INCOMPLETE / UNACCEPTED` status, remove all target `node_modules` residue, and re-prove literal clean-target state.
- [ ] Produce a new accepted target OID, refresh the migration record, rerun AC7 and all proof batteries, and publish a fresh independent reviewer child.

## Expected merge conflicts
- No textual conflicts are predicted against current `main`; merge-tree was clean and the candidate contributes only the item-135 migration and review records.
- On a future re-review, preserve current-main backlog, task-state, generated index, run-log, and journal state rather than taking apparent two-dot reversions from the feature branch.

## Follow-up items (defer, do not block merge)
- Add an explicit loopback binding guard and authentication policy for any general MCP-server exposure.
- Re-run Project_echo's timeout/performance failures under normal load; this review observed 2,208 passed and 14 failed there, while the target suite passed 973 with 17 skipped.
- Remove or adjudicate residual task-state/coord/product semantics from the context boundary before qualification.

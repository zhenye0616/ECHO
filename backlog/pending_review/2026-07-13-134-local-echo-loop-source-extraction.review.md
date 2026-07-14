---
item_id: 2026-07-13-134-local-echo-loop-source-extraction
verdict: redo before merge
reviewed_at: '2026-07-14T22:38:02Z'
test_counts:
  passed: 143
  failed: 9
producer: review-pending-orchestrator
---
## Verdict
Redo before merge. Fresh independent AC8 review of target d69c003ae4146140d3d0ee3fe945778781ae5a43 reproduced the declared hashes, 143-test suite, offline lifecycle, and dual-route result, but rejected AC2/AC5/AC7. The committed 584-row edge record has 585 errors against its own committed schema; executable-edge extraction remains fail-open or ambiguous for six same-class cases; watcher takeover can lose termination evidence between transactions and permits stale-owner terminal mutation. The immutable rejection record is published as sole-parent review child fe26a78f89d130364af5b2207e7b07b41eecb78b.

## Pre-merge fixups
- [ ] Extend `provenance/edge-record.v1.schema.json` for every emitted root/row field and make `tools/build-source-plan.mjs --check` validate generated and committed bytes against the schema before fixed-point comparison.
- [ ] Make executable-edge extraction fail closed across test bodies, member/computed expressions, absolute repository paths, scope/reassignment, and per-source tsconfig contexts; reject ambiguous variant configurations.
- [ ] Make prior PGID plus termination evidence an atomic input/output of the takeover CAS and owner-token-predicate every APPLYING mutation, including escalation and failure accounting.
- [ ] Commit schema, six edge, crash-between-CAS/evidence, and stale-owner-after-takeover regressions; regenerate a new target HEAD/tree and migration record, then publish a new immutable builder head for fresh review.

## Expected merge conflicts
- No textual conflicts are predicted against current `main`; the fresh merge-tree preview was clean for the migration and review records.
- On re-review, preserve current-main backlog, task-state, generated-index, run-log, journal, and sidecar state; do not treat two-dot branch reversions as merge inputs.

## Follow-up items (defer, do not block merge)
- Remove ignored target-local build outputs before any later qualification or packaging audit, even though they did not alter the accepted Git object and were non-blocking for this DEV review.
- Keep authority:false, installed:false, and DEV until the separate graduation pipeline advances them.

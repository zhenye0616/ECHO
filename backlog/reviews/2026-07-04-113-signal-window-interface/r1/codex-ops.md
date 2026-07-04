---
item_id: "2026-07-04-113-signal-window-interface"
round: 1
reviewer: "codex-ops"
artifact_sha: "a39efaf1355c448da134ca3d1c77319c4d8b7011"
completed_at: '2026-07-04T19:21:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-113-signal-window-interface.md:31"
    finding: "AC1 defines a sequence cursor input but does not require `getSignalWindow` results to expose `sequence_id` or a next-cursor/high-watermark value. An unattended cron/watch consumer cannot durably advance progress from the returned window and may fall back to timestamps or ids, reintroducing late-arrival skips or repeated reads. Patch the contract to return durable sequence progress, and test non-empty plus empty-window cursor advancement."
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-113-signal-window-interface.md:33"
    finding: "AC3 says `sinceSeq` has half-open semantics while AC4 expects `cursor: {sinceSeq: W+1}` to return the atom at `W+1`; those two contracts are ambiguous about `>` versus `>=`. In unattended cursor loops this is exactly the off-by-one that skips the first late-arriving atom or duplicates the last processed atom. Patch the spec to define the boundary rule precisely and align AC4's example with it."
  - severity: "medium"
    where: "backlog/proposed/2026-07-04-113-signal-window-interface.md:33"
    finding: "The generic append-order seam only calls out optional source filtering, but the existing protected consumer is the `coord:%` atom path. If `iterateCoordAtomsByAppendOrder` is reimplemented on the generic seam without an explicit coord-compatibility regression, 057a deadline tracking can silently miss or duplicate coord atoms at runtime. Patch AC3/tests to require the existing coord ID-prefix behavior, ordering, and cursor boundary semantics remain green when the coord seam is backed by the generic method."
---

## Findings

Required patches are limited to tightening the spec contract and tests around durable sequence cursors and coord-seam compatibility.

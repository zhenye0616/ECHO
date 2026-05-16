---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 4
reviewer: "codex"
artifact_sha: "e68159823036a0bbd1a17f5b9ce0b1a3c14b43a2"
completed_at: '2026-05-16T05:51:22Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:177-186"
    finding: >-
      AC3 still mixes two incompatible sequence-boundary definitions. `iterateCoordAtomsByAppendOrder` is declared as `(sinceSeq, untilSeq]`, but `getCurrentCoordSequence()` returns the next rowid (`max(rowid)+1`) and reconciliation then sets `last_full_replay_watermark = highSeq`; a future coord atom can receive exactly that rowid and be skipped forever by the next `rowid > sinceSeq` scan. Separately, `getCoordSequenceAtOrAfter(timestamp)` is specified as the smallest sequence_id with `emitted_at >= timestamp`, while the implementation note says to binary-search `(emitted_at,rowid)` and MemoryStorage's insertion list. With out-of-order `emitted_at`, timestamp-order search does not return the smallest append sequence, so boot reconstruction can start too late and miss earlier qualifying coord atoms. Patch the contract to use an inclusive current-max watermark (or make `untilSeq` exclusive and adjust all examples/tests), and define the horizon lookup as `MIN(sequence_id) WHERE timestamp >= horizon` or another append-order-safe scan with parity tests covering an earlier qualifying append whose timestamp is not timestamp-order-first.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:216-217"
    finding: >-
      AC6 says last-miss status survives daemon restart because the durable atom log is the source of truth, but the r4 algorithm still starts from in-memory `last_miss_clear_watermark` and iterates only slots the daemon has ever observed in memory. After restart those structures are empty, so a 48h-old uncleared miss may have no slot to scan, and a miss that was cleared before restart can be reported again because the successful-close watermark was not rebuilt. Patch `coord_status()` to derive both slot discovery and the latest clear watermark from durable coord atoms (or persist them durably), then extend the restart fixture to cover both old-uncleared and old-cleared miss cases.
---

## Findings

1. MEDIUM — AC3 still has unsafe sequence boundary semantics.

The storage seam now names all three methods, but the current definitions can skip append-order rows. `getCurrentCoordSequence()` returns the next rowid while the iterator treats `untilSeq` as inclusive and future scans use `rowid > sinceSeq`; that makes the exact next rowid vulnerable to being skipped after the watermark advances. The time-to-sequence helper also cannot be implemented as a timestamp-order binary search if reconstruction must replay by append order under out-of-order `emitted_at`.

2. MEDIUM — AC6 last-miss persistence still depends on restart-volatile state.

The on-demand status path needs durable slot discovery and durable clear-watermark reconstruction. As written, an empty post-restart in-memory slot set can hide an old uncleared miss, while an empty post-restart watermark map can resurrect a miss that was already cleared before restart.

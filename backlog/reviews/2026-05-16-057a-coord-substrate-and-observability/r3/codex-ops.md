---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 3
reviewer: "codex-ops"
artifact_sha: "4d4530281fbca9593b6ca280e736bb3b1cdd7531"
completed_at: '2026-05-16T05:13:29Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC3 durable append-order reconstruction window, lines 176-183"
    finding: >-
      The restart replay still has an operational correctness gap: the spec bounds reconstruction by a time horizon but the new storage seam only orders by append sequence, then says the time bound is converted to `sinceSeq` by binary search on the same API. That conversion is not valid once `emitted_at` is allowed to be out of order relative to append order, which AC3 explicitly treats as a production hazard. At runtime the daemon must either scan all coord atoms on every startup/reconciliation, blocking the hard startup gate on large ledgers, or it can choose a `sinceSeq` that skips late-appended or clock-skewed coord atoms and rebuilds the open-deadline map incorrectly after restart. Patch the AC to add a durable append-time/coord-sequence index, or define an intentionally full replay with a bounded compaction/snapshot mechanism, and require a fixture where a coord atom crosses the horizon with out-of-order `emitted_at` plus a 100k-atom startup/reconciliation performance check.
  - severity: "medium"
    where: "AC6 persistent last-miss status, lines 211-213 and AC8 status test at line 239"
    finding: >-
      `coord_status()` promises that the per-role-per-event-type last-miss list ignores the recent-window horizon and remains visible until a successful close event arrives, but the restart path only describes scanning the max-deadline horizon. After a daemon restart, a 48h-old unresolved miss can disappear from the in-memory status map even though no successful `tick_start`/`tick_end` ever cleared it, which is exactly the overnight/operator-observability failure this surface is supposed to catch. Patch AC6/AC8 to specify how last-miss state is rebuilt across daemon restart, either by querying the durable coord log beyond the recent window or by persisting a compact status summary, and make the 48h-old-miss test restart the daemon before asserting visibility.
---

# Codex-ops review

Verdict: `pushback`.

Reviewed the R3 artifact at `4d4530281fbca9593b6ca280e736bb3b1cdd7531` through the operational/runtime lens.

The r3 spec closes the prior stale-open-record, cwd-independent config, role-keying, and `deadline_missed` payload gaps. The remaining blockers are both restart-time production failures: replay cannot be both append-ordered and time-bounded with the storage primitive currently specified, and the promised persistent last-miss operator signal can be lost after daemon restart.

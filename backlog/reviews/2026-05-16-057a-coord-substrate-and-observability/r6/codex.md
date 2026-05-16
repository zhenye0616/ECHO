---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 6
reviewer: "codex"
artifact_sha: "dd94247e62606aaa2576d221f5fe390c34ab699c"
completed_at: '2026-05-16T06:09:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 line 219; AC1 lines 108 and 111; AC3 lines 179-181"
    finding: >-
      The new volume-warning contract still does not compose with the coord event model. `getCurrentCoordSequence()` is defined as the max SQLite rowid over coord atoms, not the coord-atom count, so `getCurrentCoordSequence() > 100_000` can fire after one coord atom if the main `events` ledger already has a high rowid from non-coord captures; the warning then no longer measures the O(coord-atom-count) replay/status cost it is meant to guard. The same sentence requires emitting a `coord:scheduler_health` atom, but AC1 defines `scheduler_health` as a scheduler-tier self-attestation requiring a `tick_run_id` and `subject_role == emitter_role`, and AC2 gives it an `expects: scheduler_health_done` deadline. A daemon-startup warning has no reviewer role or tick_run_id and, if implemented literally as `scheduler_health`, would open a deadline that no wrapper will close. Patch AC6/AC8 to define a count-based threshold seam (or explicitly rename this to a sequence-watermark warning and test mixed non-coord rows), and define a warning atom shape that is valid and non-deadline-opening, or keep it log/coord_status-only.
---

# Codex review

Verdict: `proceed_after_patches`.

The r6 patches resolve the prior slot-universe and full-scan testability concerns in the main status contract. The remaining issue is the new startup volume-warning path: it uses the sequence watermark as if it were a coord-row count, then asks the daemon to emit a scheduler health event without the scheduler-tier identity/key fields and without a close path.

Once that warning contract is made internally consistent and the AC8 perf fixture covers it, I expect this spec to be claim-ready from the Codex implementability lens.

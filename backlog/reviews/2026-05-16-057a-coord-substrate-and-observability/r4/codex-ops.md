---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 4
reviewer: "codex-ops"
artifact_sha: "e68159823036a0bbd1a17f5b9ce0b1a3c14b43a2"
completed_at: '2026-05-16T05:51:10Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:176-186"
    finding: >-
      The restart replay boundary still depends on `emitted_at` for the first `sinceSeq`, even though AC3 explicitly treats caller timestamps as skewable and append order as the runtime authority. If a coord atom is appended after the daemon has been down or delayed but carries an `emitted_at` older than `horizonStart` (or if there are no coord atoms with `emitted_at >= horizonStart`), `getCoordSequenceAtOrAfter(horizonStart)` can return a sequence after that atom or `null`, and boot reconstruction will never replay the open record. At runtime that produces a false-clean `coord_status()` after restart instead of a `deadline_missed` atom. Patch the boundary to use an append-time/rowid watermark, a full replay/snapshot strategy, or an explicitly accepted outage bound, and add the horizon-crossing fixture r3 requested: late-appended/out-of-order `emitted_at` plus a large ledger startup check.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:216-217"
    finding: >-
      The new on-demand last-miss rehydration path still has a restart blind spot: it iterates slots "the daemon has ever observed" from an in-memory set, but after a daemon restart that set is empty unless the 24h boot reconstruction happened to see the slot. A 48h-old uncleared `deadline_missed` atom can therefore remain durable but never be scanned, so the operator sees no persistent failure even though no successful close cleared it. Make the slot universe durable or deterministic from `coord-roles.json` / the coord atom log, and require the AC8 restart fixture to start from a fresh process with no preloaded slot state.
---

# Codex-ops review

Verdict: `proceed_after_patches`.

Reviewed the r4 artifact at `e68159823036a0bbd1a17f5b9ce0b1a3c14b43a2` through the operational/runtime lens.

The r4 patch narrows the previous storage-seam and persistent-status gaps, but two restart-time failure modes remain. Both are production observability risks: a boot replay can skip delayed or clock-skewed coord atoms at the time-to-sequence boundary, and the status rehydration algorithm still depends on volatile slot memory after restart.

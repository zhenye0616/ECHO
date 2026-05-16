---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 7
reviewer: "codex"
artifact_sha: "96cb505e4aae1fb7cdf2a65ef03d3f766148fa22"
completed_at: '2026-05-16T06:18:28Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 line 219; AC8 lines 230-247; files_to_modify line 71"
    finding: >-
      AC6 still makes the 100k-atom performance fixture the falsifiable V1 operational contract, and files_to_modify still names tests/coord/coord-volume-perf.test.ts with the two budgets and no warning assertions, but the normative AC8 test inventory now ends at coord-status-shape.test.ts and omits coord-volume-perf.test.ts entirely. That means a builder can satisfy the body text's "each test is merge-blocking" list while skipping the only test that proves reconstruction <1500ms and coord_status() <300ms after the warning mechanism was removed. Patch AC8 to explicitly list tests/coord/coord-volume-perf.test.ts with only those two budget assertions and no startup-warning log/atom assertions.
---

# Codex review

Verdict: `proceed_after_patches`.

The r7 artifact correctly removes the runtime volume-warning mechanism from AC6: no sequence-threshold warning, no stderr/log assertion, and no scheduler_health warning atom remain. The V1.5+ deferral is also explicit about needing a real coord-row-count primitive, a non-deadline-opening warning atom shape, and coord_status visibility together.

One patch remains before claim: restore `tests/coord/coord-volume-perf.test.ts` to the AC8 test inventory. Right now the perf fixture exists only in frontmatter and AC6 prose, so the merge-blocking test list no longer actually requires the r6 follow-up's surviving contract.

---
item_id: "2026-05-29-080-decisions-desktop-overlay"
round: 3
reviewer: "codex-ops"
artifact_sha: "12b0435c2a096c0f0e787057561c34084adda613"
completed_at: '2026-05-29T08:38:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2 line 114; AC7 line 119; J1 line 124"
    finding: >-
      The r3 artifact is content-identical to r2, so the packaged-app smoke gate still does not require the runtime check that proves the summoned window is actually transparent and always on top. AC7 lists transparent always-on-top behavior as an integration failure mode, but the required pass/fail checklist only verifies no Dock/window presence, menu item, hotkey/dismiss, live MCP, repo reads, and SEE+JUMP. At unattended runtime this can pass the written smoke with a normal menu-bar window that loses focus/stacking or renders opaque, which breaks AC2's operator-overlay contract while still satisfying the current checklist. Patch AC7/README fallback to require an explicit transparency plus always-on-top/window-level verification and record the chosen-stack capability/config used.
    cross_ref:
      round: 2
      reviewer: "codex"
      finding_index: 1
---

# codex-ops review

Verdict: `proceed_after_patches`.

Round 3 did not change the spec content from r2, so the prior installed-app smoke gap remains from the runtime perspective. The rest of the r1 ops concerns are still covered: repoPath normalization, bounded coord_status join, build-graph isolation, packaged-app smoke for live MCP/repo/hotkey/SEE+JUMP, and post-merge dogfooding separation.

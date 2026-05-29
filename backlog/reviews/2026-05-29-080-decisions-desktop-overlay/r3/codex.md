---
item_id: "2026-05-29-080-decisions-desktop-overlay"
round: 3
reviewer: "codex"
artifact_sha: "12b0435c2a096c0f0e787057561c34084adda613"
completed_at: '2026-05-29T08:37:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC7 line 119; AC2 line 114; J1 line 124"
    finding: >-
      The r2 Codex packaged-app smoke finding has not landed. AC2 still requires a transparent, always-on-top overlay and J1 marks that reliability as part of the stack decision, but AC7's mandatory built-app smoke verifies only no Dock/window presence, menu item, hotkey/dismiss, MCP, repo reads, and SEE+JUMP. Because the builder can satisfy the enumerated smoke without proving the window is transparent and actually above other apps, the spec still permits a normal menu-bar window to pass. Patch AC7/README requirements so the pre-merge smoke or manual fallback explicitly verifies transparency plus always-on-top behavior and records the chosen-stack config/capabilities needed for that behavior.
---

# Codex Review

Verdict: proceed_after_patches.

Round 3 keeps the r1 fixes in place: the coord_status join is bounded to in-flight item review requests, overlay build isolation is explicit, repoPath validation is distinct from daemon-down, AC8 is post-merge founder dogfooding, and the packaged-app smoke gate is pre-merge.

One r2 load-bearing smoke gap remains. The spec says the surface is a transparent always-on-top overlay, but the required built-app smoke checklist still does not make transparency and always-on-top behavior a pass/fail check.

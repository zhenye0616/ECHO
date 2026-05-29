---
item_id: "2026-05-29-080-decisions-desktop-overlay"
round: 2
reviewer: "codex"
artifact_sha: "35755d87e446c44fdeadfdb14900461396b8fde3"
completed_at: '2026-05-29T08:06:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2 line 114; AC7 line 119; J1 line 124"
    finding: >-
      The r2 packaged-app smoke gate still does not explicitly verify the core overlay property AC2 requires: a transparent, always-on-top window. AC7 names transparent always-on-top behavior as a possible installed-app failure, but its pass/fail checklist only covers no Dock/window presence, menu item, hotkey/dismiss, live MCP under CSP, repo reads, and SEE+JUMP. On the recommended Tauri path this is not incidental; Tauri v2's config docs require macOS private API support for transparent macOS windows, and the chosen stack also needs an explicit always-on-top/window-level check. Patch AC7/README requirements so the packaged smoke or documented manual fallback must prove transparency plus always-on-top and record the chosen-stack config/capabilities (Tauri: macOSPrivateApi, transparent window, and always-on-top equivalent), otherwise a builder can pass the written smoke while shipping a normal menu-bar window rather than the overlay.
---

# Codex Review

Verdict: proceed_after_patches.

R2 resolves the five accepted r1 patches: the coord_status join is bounded to in-flight item review requests, the overlay package is isolated from root tsc, repoPath validation is explicit, AC8 is post-merge validation, and the installed-app smoke gate now covers the major runtime seams.

One small but load-bearing smoke gap remains: the installed surface must prove it is actually a transparent always-on-top overlay, not just a menu-bar app with a summonable window.

---
item_id: 2026-05-29-080-decisions-desktop-overlay
round: 3
combined_at: '2026-05-29T08:44:59Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC7 line 119; AC2 line 114; J1 line 124 | accepted — patched | b3675c45046e84c3fa7af012bad832c58724c958 — Patched AC7 to add smoke check (vii): the built app MUST verify the summoned window is actually transparent AND always-on-top (renders transparent, stays above other windows, no stacking loss on focus change), and MUST record the chosen-stack config/capabilities enabling it in README (Tauri macOSPrivateApi/transparent/alwaysOnTop; Swift NSWindow level + isOpaque=false; Electron transparent/alwaysOnTop). Manual fallback checklist must also include (vii). |
| 2 | MEDIUM | codex-ops | AC2 line 114; AC7 line 119; J1 line 124 | accepted — patched (same finding as row 1; codex-ops cross_ref to r2 codex) | b3675c45046e84c3fa7af012bad832c58724c958 — Same patch as row 1. The two reviewers converge on the identical transparency + always-on-top smoke gap; one patch resolves both. Also reinforced AC2 to require the README record the transparent+always-on-top config. |

## Convergence call

needs R4 — both r3 reviewers (codex, codex-ops) returned proceed_after_patches converging on ONE identical MEDIUM finding: AC7's packaged-app smoke enumerated 6 checks but never made transparency + always-on-top a pass/fail check, so a builder could pass the smoke while shipping a normal menu-bar window (violating AC2's overlay contract). This finding originated in r2 (codex) but was not patched before r3 dispatch (r3 spec was content-identical to r2), so it re-surfaced. The patch is now applied at b3675c45046e84c3fa7af012bad832c58724c958. r3 reviewers reviewed the PRE-patch spec (12b0435c), so a verification round is required to confirm the fix lands. NOT escalated: neither reviewer rejects the core premise (overlay-as-surface — both proceed_after_patches), and there is no J1 stack split (neither contests Tauri). Disposition autonomous per founder FULL-AUTO authorization. focus_hints: verify AC7(vii) transparent+always-on-top smoke check + chosen-stack config recording in README (incl. the manual-fallback checklist path); confirm AC2's README-config requirement; no scope expansion beyond the single smoke check.


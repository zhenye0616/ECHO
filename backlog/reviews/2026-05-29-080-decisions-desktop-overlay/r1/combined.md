---
item_id: 2026-05-29-080-decisions-desktop-overlay
round: 1
combined_at: '2026-05-29T07:56:33Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 35755d87e446c44fdeadfdb14900461396b8fde3
next_round: 2
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
| 1 | MEDIUM | codex | AC4 lines 109 and 116; src/mcp/tools/coord-status.ts lines 27-84 | accepted — patched | 35755d87 — AC4 now names the bounded `correlation_id → item_id` join: enumerate ONLY `backlog/reviews/<in-flight-item-id>/r*/request.md` for items in ready/claimed/pending_review, map correlation_id→item_id, attach matching coord_status rows, drop non-matching (completed-item) deadlines. AC7(c) fixture required. Same concern as #5 (codex-ops) — single patch covers both. |
| 2 | MEDIUM | codex | AC2/AC7 lines 113-119 and J1 line 124; tsconfig.json lines 16-24; package.json lines 28-45 | accepted — patched | 35755d87 — AC2 now requires `tools/echo-overlay/` to be a self-contained package (own deps/tsconfig/scripts) excluded from root tsconfig (`tools/echo-overlay/**/*` added to the existing `tools/raycast-echo/**/*` exclude); AC7 runs overlay checks against the overlay's own package. |
| 3 | LOW | codex | AC8 line 120 and Out of Scope line 132; docs/AGENT_INSTRUCTIONS.md lines 58-81 | accepted — patched | 35755d87 — AC8 reframed as a POST-MERGE founder-validation gate that does NOT block builder handoff; builder's only AC8 obligation is merge-ready instrumentation (`**Surface:** Overlay` marker + README dogfooding template). Daily-use validation happens post-merge and gates item 081. |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:114; :119; :124 | accepted — patched | 35755d87 — AC7 now REQUIRES a stack-specific packaged-app smoke gate (launch built app outside dev mode: idle no-Dock, menu item, hotkey+Esc/blur lifecycle, real MCP call under CSP/permissions, repo reads allowed, SEE+JUMP opens local target). Automated where the stack allows; documented manual checklist in README the accepted fallback. Pre-merge, distinct from AC8. |
| 5 | MEDIUM | codex-ops | :64; :109; :116; :125; src/mcp/tools/coord-status.ts:27-43 | accepted — patched (dup of #1) | 35755d87 — same coord→item bounded-join patch as #1; the AC7(c) two-in-flight-items + one-open-deadline fixture this finding asks for is named in AC4. |
| 6 | MEDIUM | codex-ops | :14; :113; :119; src/mcp/tools/pending-decisions.ts:56-61 | accepted — patched | 35755d87 — AC1 now requires repoPath absolute-resolution (expand `~`, reject relatives, default `~/Desktop/Project_echo`) BEFORE the MCP call, with a DISTINCT invalid-path error state separate from daemon-down; AC7(a) tests default/absolute/relative-rejection/invalid-path-surface. |

## Convergence call

**needs R2** — focus_hints: Verify spec @ 35755d87 against r1's five accepted patches (0 rejected, 0 deferred; both reviewers proceed_after_patches, no boundary cross, no escalation):

1. **AC4 coord→item bounded join** (codex F1 + codex-ops F5, both MED): confirm the `correlation_id → item_id` join is enumerated ONLY over `backlog/reviews/<in-flight-item-id>/r*/request.md` for items in ready/claimed/pending_review (bounded — NOT a wildcard scan of the ~1000-round history), deadlines with no matching in-flight item are dropped, and AC7(c) names the two-in-flight-items + one-open-deadline fixture proving the blocked/reviewing state lands on the right node. Check it does not silently re-introduce a full reviews-history scan.
2. **AC2 build-graph isolation** (codex F2 MED): confirm `tools/echo-overlay/**/*` excluded from root tsconfig with its own package scripts, so root `tsc --noEmit` can't be left broken by a builder satisfying only the written overlay checks.
3. **AC7 packaged-app smoke gate** (codex-ops F4 HIGH): confirm the pre-merge built-app smoke check (idle no-Dock / menu item / hotkey lifecycle / live MCP under CSP / repo reads / SEE+JUMP open) is required, with the manual-checklist fallback bounded to genuine automation-infeasibility — and that it is clearly distinct from AC8.
4. **AC1 repoPath validation** (codex-ops F6 MED): confirm absolute-resolution-before-MCP-call + DISTINCT invalid-path-vs-daemon-down states + AC7(a) coverage (default / absolute / relative-rejection / invalid-path surface).
5. **AC8 post-merge reframe** (codex F3 LOW): confirm AC8 no longer blocks builder handoff and the builder's obligation is reduced to merge-ready instrumentation.

J1 tech-stack (Tauri vs Swift) was NOT contested by either reviewer — no stack split, no founder escalation needed. FULL-AUTO disposition: both reviewers' `proceed_after_patches` verdicts were autonomously dispositioned per founder full-auto authorization (no core-premise rejection, no J1 split). If R2 confirms the five patches with zero new load-bearing findings → claim-ready.


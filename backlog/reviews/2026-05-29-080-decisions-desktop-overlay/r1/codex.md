---
item_id: "2026-05-29-080-decisions-desktop-overlay"
round: 1
reviewer: "codex"
artifact_sha: "d97369dfd368ccd2bdb3ef070242e4f073719d3d"
completed_at: '2026-05-29T07:50:56Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 lines 109 and 116; src/mcp/tools/coord-status.ts lines 27-84"
    finding: >-
      The fleet-glance blocked/health state is not deterministically joinable to a FleetNode with the sources AC4 permits. coord_status exposes deadline rows keyed by correlation_id or tick_run_id plus role/event metadata, but no item_id. AC4 says blocked is surfaced from coord_status and bounds the scan to ready/claimed/pending_review, explicitly not the reviews history. A builder can mark pending_review items as reviewing, but cannot attach open_deadlines/recent_missed to the right item without an additional bounded join, e.g. active request.md correlation_id -> item_id, or a thin daemon projection. Patch AC4/AC7 to name that join and add a fixture proving a coord deadline maps to the intended fleet node without scanning historical completed rounds.
  - severity: "medium"
    where: "AC2/AC7 lines 113-119 and J1 line 124; tsconfig.json lines 16-24; package.json lines 28-45"
    finding: >-
      The Tauri+web-UI path will likely make root typecheck fail unless the spec also defines package/tsconfig isolation. The root tsconfig includes tools/**/* and excludes only tools/raycast-echo/**/*, while root npm run typecheck is plain tsc --noEmit. A new tools/echo-overlay/src React/Tauri UI would be pulled into the root compiler without overlay dependencies, JSX config, or Tauri types; AC7 only requires root checks if src/ is touched, so a builder could satisfy the written checks while leaving the repository-level typecheck broken. Patch the spec to require either excluding tools/echo-overlay from root tsconfig with its own package scripts, or integrating the overlay into the root compiler/dependency graph and running root typecheck/lint/test accordingly.
  - severity: "low"
    where: "AC8 line 120 and Out of Scope line 132; docs/AGENT_INSTRUCTIONS.md lines 58-81"
    finding: >-
      AC8 is written as an acceptance criterion and line 132 says the item definition of done includes the founder dogfooding gate, but the builder loop hands off to pending_review after implementation/tests and before merge. The AC itself says merged -> validated and requires sessions across two calendar days, so no builder can honestly satisfy it during the normal review handoff. Patch by moving AC8 to After Completion/validation, or split it into a pre-merge requirement (instrument/template present) and a post-merge validation gate that does not block the builder from moving the item to pending_review.
---

# Codex Review

Verdict: proceed_after_patches.

The surface direction is implementable and the scope boundaries are mostly tight: it consumes pending_decisions and coord_status, leaves Raycast removal to a later item, and keeps SEE+ACT out of v0. Before a builder takes it, AC4 needs a concrete join contract for coord_status -> fleet nodes, and AC7 needs to make the overlay package/typecheck boundary explicit.

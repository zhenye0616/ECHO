---
item_id: "2026-05-29-080-decisions-desktop-overlay"
round: 1
reviewer: "codex-ops"
artifact_sha: "d97369dfd368ccd2bdb3ef070242e4f073719d3d"
completed_at: '2026-05-29T07:52:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:114; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:119; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:124"
    finding: >-
      AC7 can pass with mocked UI/client tests while the shipped macOS menu-bar overlay fails at the integration layer: packaged WebView access to http://127.0.0.1:38478/mcp, repo filesystem permissions, global hotkey registration, accessory/no-Dock activation, transparent always-on-top behavior, and open-path SEE+JUMP are all outside the current test contract. That is the exact unattended-runtime failure mode for this surface: the daemon is healthy, but the overlay silently looks unreachable or never summons once installed outside the dev shell. Patch AC7/J1 to require a stack-specific packaged-app smoke test (or documented manual gate if automation is impossible) that launches the built app outside dev mode, verifies idle has no Dock/window presence, the menu item exists, the global hotkey and Esc/blur lifecycle work, the local MCP call succeeds under the app's CSP/permissions, repo reads are allowed, and SEE+JUMP opens a local target.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:64; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:109; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:116; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:125; src/mcp/tools/coord-status.ts:27-43"
    finding: >-
      The fleet-glance join is not operationally anchored. AC4 says to compose item states from pending_decisions + coord_status + in-flight backlog dirs while avoiding the full reviews history, but coord_status exposes round health only as role plus correlation_id/tick_run_id keys, not item_id. At runtime an open reviewer deadline can be impossible to attach to the right FleetNode unless the overlay also scans request.md files to map correlation_id -> item_id; if it skips that join it will show the item as merely running/reviewing, and if it wildcards backlog/reviews it violates the bounded-scan requirement. Patch AC4/J2 to specify the bounded join source explicitly, e.g. enumerate only backlog/reviews/<in-flight-item-id>/r*/request.md for item IDs found in ready/claimed/pending_review, or choose the additive daemon fleet_status read to do that join once. Add a fixture with two in-flight items and one open coord deadline keyed by a review-round correlation_id so the blocked/reviewing state lands on the correct node without scanning unrelated history.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:14; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:113; backlog/ready/2026-05-29-080-decisions-desktop-overlay.md:119; src/mcp/tools/pending-decisions.ts:56-61"
    finding: >-
      The repoPath contract is too implicit for a standalone app. pending_decisions rejects non-absolute repo_path values, while the spec only says the README documents repoPath/config and does not require the overlay to expand ~/Desktop/Project_echo, validate relative paths, or surface an invalid-path state separately from daemon-down. In production that can leave the menu dot permanently unknown and the overlay reporting an MCP failure even though the daemon is healthy, especially when launched outside the interactive shell with a different cwd. Patch AC1/AC7 to require repo path normalization and validation before the MCP call, including tests for the default ~/Desktop/Project_echo, an absolute configured path, a relative path rejection, and the visible error/unknown-dot behavior.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The surface boundary is coherent: it consumes `pending_decisions` and `coord_status`, keeps Raycast removal out of scope, and preserves SEE+JUMP. The patches needed are runtime contracts around the installed macOS app, the coord-to-item join that makes fleet-glance truthful, and repo-path handling before the daemon call.

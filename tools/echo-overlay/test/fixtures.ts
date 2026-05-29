import type {
  CoordStatusResult,
  DecisionCard,
  PendingDecisionsResult,
  PendingDecisionsSourceState,
} from "../src/lib/types";

export const freshSourceState: PendingDecisionsSourceState = {
  local_head: "local",
  upstream_head: "upstream",
  behind: 0,
  upstream_checked_at: "2026-05-29T12:00:00.000Z",
  upstream_stale: false,
  dirty: false,
  scanned_items: 2,
  partial: false,
};

export function decisionCard(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    id: "2026-05-29-080-decisions-desktop-overlay#r2",
    title: "080 · decisions overlay",
    decision: "Ship the overlay shell",
    whyNow: "r2 · reviewers converged on Tauri",
    options: ["proceed_after_patches", "pushback", "more rounds"],
    default: "proceed_after_patches",
    deadline: "2026-05-29T20:00:00.000Z",
    blocking: ["081 Raycast removal"],
    agents: ["codex", "codex-ops"],
    sources: [
      {
        label: "review round",
        href: "/Users/zhenye/Desktop/Project_echo/backlog/reviews/2026-05-29-080-decisions-desktop-overlay/r2",
      },
      {
        label: "backlog item",
        href: "/Users/zhenye/Desktop/Project_echo/backlog/claimed/2026-05-29-080-decisions-desktop-overlay.md",
      },
    ],
    signals: [{ kind: "runaway_churn", detail: "churned 5 rounds without pulling you in" }],
    ...overrides,
  };
}

export function pendingResult(decisions: DecisionCard[] = [], sourceState = freshSourceState): PendingDecisionsResult {
  return {
    schema_version: 1,
    tool: "pending_decisions",
    decisions,
    source_breakdown: {},
    source_state: sourceState,
  };
}

export function coordStatus(overrides: Partial<CoordStatusResult> = {}): CoordStatusResult {
  return {
    schema_version: 1,
    tool: "coord_status",
    generated_at: "2026-05-29T12:00:00.000Z",
    open_deadlines: [],
    recent_missed: [],
    last_miss_per_role_per_event_type: [],
    per_role_last_tick: [],
    daemon_uptime_sec: 120,
    last_reconstruction_watermark: 42,
    ...overrides,
  };
}

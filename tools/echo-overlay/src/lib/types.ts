// Source of truth for these wire contracts is:
//   src/mcp/tools/internal/decision-card-types.ts
// The overlay copies the v0 types intentionally to keep this package isolated.

export interface DecisionSignal {
  kind: "runaway_churn";
  detail: string;
}

export interface DecisionSourceLink {
  label: string;
  href: string;
}

export interface DecisionCard {
  id: string;
  title: string;
  decision: string;
  whyNow: string;
  options: string[];
  default: string;
  deadline?: string;
  blocking?: string[];
  agents: string[];
  sources: DecisionSourceLink[];
  signals: DecisionSignal[];
}

export interface PendingDecisionsSourceState {
  local_head: string;
  upstream_head: string | null;
  behind: number;
  upstream_checked_at: string | null;
  upstream_stale: boolean;
  dirty: boolean;
  scanned_items: number;
  partial: boolean;
}

export interface PendingDecisionsResult {
  schema_version: 1;
  tool: "pending_decisions";
  decisions: DecisionCard[];
  source_breakdown: Record<string, number>;
  source_state: PendingDecisionsSourceState;
  result_caps?: {
    decisions_returned: number;
    decisions_total: number;
    scanned_items: number;
    partial: boolean;
  };
}

export interface CoordStatusOpenDeadline {
  tier: "round" | "scheduler";
  subject_role: string;
  event_type: string;
  key: string;
  expected_by: string;
  age_sec: number;
}

export interface CoordStatusRecentMiss {
  subject_role: string;
  opened_event_type: string;
  expected_event_type: string;
  key: string;
  missed_at: string;
}

export interface CoordStatusLastMissSlot {
  subject_role: string;
  expected_event_type: string;
  last_missed_at: string;
  opened_event_type: string;
  key: string;
  age_sec: number;
}

export interface CoordStatusPerRoleLastTick {
  role: string;
  last_tick_start: string | null;
  last_tick_end: string | null;
  last_tick_duration_sec: number | null;
  last_scheduler_health: string | null;
  last_scheduler_health_done: string | null;
}

export interface CoordStatusResult {
  schema_version: 1;
  tool: "coord_status";
  generated_at: string;
  open_deadlines: CoordStatusOpenDeadline[];
  recent_missed: CoordStatusRecentMiss[];
  last_miss_per_role_per_event_type: CoordStatusLastMissSlot[];
  per_role_last_tick: CoordStatusPerRoleLastTick[];
  daemon_uptime_sec: number;
  last_reconstruction_watermark: number;
}

export type InFlightStage = "ready" | "claimed" | "pending_review";

export interface InFlightItem {
  itemId: string;
  title: string;
  stage: InFlightStage;
  path: string;
}

export interface ReviewRequestSummary {
  itemId: string;
  round: string;
  correlationId: string;
  path: string;
}

export interface InFlightSnapshot {
  items: InFlightItem[];
  reviewRequests: ReviewRequestSummary[];
  scannedReviewRoots: string[];
}

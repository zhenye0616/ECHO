export interface DecisionSignal {
  kind: 'runaway_churn';
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
  tool: 'pending_decisions';
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

import type {
  CoordStatusOpenDeadline,
  CoordStatusRecentMiss,
  CoordStatusResult,
  DecisionCard,
  InFlightItem,
  PendingDecisionsResult,
  PendingDecisionsSourceState,
  ReviewRequestSummary,
} from "./types";

export type DotState = "lit" | "dark" | "unknown";
export type FleetNodeState = "running" | "reviewing" | "blocked" | "needs_you" | "merged";

export interface FleetNode {
  itemId: string;
  title: string;
  state: FleetNodeState;
  needsYou: boolean;
  signals: { kind: string; detail: string }[];
  health?: { open_deadlines: number; recent_misses: number };
  card?: DecisionCard;
}

export interface FleetGlance {
  nodes: FleetNode[];
  source_state: PendingDecisionsSourceState;
  scannedReviewRoots: string[];
}

export interface FleetInputs {
  pending: PendingDecisionsResult;
  coord: CoordStatusResult;
  inFlightItems: InFlightItem[];
  reviewRequests: ReviewRequestSummary[];
  scannedReviewRoots?: string[];
}

export function ambientDotState(result: PendingDecisionsResult | null, error: unknown = null): DotState {
  if (error !== null || result === null || hasSourceWarning(result.source_state)) return "unknown";
  return result.decisions.length > 0 ? "lit" : "dark";
}

export function sourceWarnings(state: PendingDecisionsSourceState): string[] {
  const warnings: string[] = [];
  if (state.behind > 0) {
    warnings.push(`source ${state.behind} commit${state.behind === 1 ? "" : "s"} behind origin`);
  }
  if (state.upstream_stale) {
    warnings.push(
      state.upstream_checked_at === null
        ? "remote never seen - may be stale"
        : `remote last seen ${formatAge(Date.parse(state.upstream_checked_at), Date.now())} ago - may be stale`,
    );
  }
  if (state.dirty) warnings.push("backlog has uncommitted changes");
  if (state.partial) warnings.push("scan partial");
  return warnings;
}

export function composeFleetGlance(inputs: FleetInputs): FleetGlance {
  const cardsByItem = new Map<string, DecisionCard>();
  for (const card of inputs.pending.decisions) {
    const itemId = itemIdFromDecisionCard(card);
    if (itemId !== null) cardsByItem.set(itemId, card);
  }

  const correlationToItem = buildCorrelationItemMap(inputs.reviewRequests);
  const healthByItem = buildHealthByItem(inputs.coord, correlationToItem);

  const nodes = inputs.inFlightItems.map((item) => {
    const card = cardsByItem.get(item.itemId);
    const health = healthByItem.get(item.itemId);
    const needsYou = card !== undefined;
    return {
      itemId: item.itemId,
      title: item.title,
      state: deriveState(item, needsYou, health),
      needsYou,
      signals: card?.signals ?? [],
      ...(health !== undefined ? { health } : {}),
      ...(card !== undefined ? { card } : {}),
    } satisfies FleetNode;
  });

  return {
    nodes,
    source_state: inputs.pending.source_state,
    scannedReviewRoots: inputs.scannedReviewRoots ?? [],
  };
}

export function buildCorrelationItemMap(requests: readonly ReviewRequestSummary[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const request of requests) {
    out.set(request.correlationId, request.itemId);
  }
  return out;
}

function buildHealthByItem(
  coord: CoordStatusResult,
  correlationToItem: ReadonlyMap<string, string>,
): Map<string, { open_deadlines: number; recent_misses: number }> {
  const out = new Map<string, { open_deadlines: number; recent_misses: number }>();
  for (const deadline of coord.open_deadlines) {
    attachHealth(out, correlationToItem, deadline, "open_deadlines");
  }
  for (const miss of coord.recent_missed) {
    attachHealth(out, correlationToItem, miss, "recent_misses");
  }
  return out;
}

function attachHealth(
  out: Map<string, { open_deadlines: number; recent_misses: number }>,
  correlationToItem: ReadonlyMap<string, string>,
  row: CoordStatusOpenDeadline | CoordStatusRecentMiss,
  key: "open_deadlines" | "recent_misses",
): void {
  const itemId = correlationToItem.get(row.key);
  if (itemId === undefined) return;
  const existing = out.get(itemId) ?? { open_deadlines: 0, recent_misses: 0 };
  existing[key] += 1;
  out.set(itemId, existing);
}

function deriveState(
  item: InFlightItem,
  needsYou: boolean,
  health: { open_deadlines: number; recent_misses: number } | undefined,
): FleetNodeState {
  if (needsYou) return "needs_you";
  if (health !== undefined && (health.open_deadlines > 0 || health.recent_misses > 0)) return "blocked";
  if (item.stage === "claimed") return "running";
  return "reviewing";
}

function itemIdFromDecisionCard(card: DecisionCard): string | null {
  const match = card.id.match(/^\d{4}-\d{2}-\d{2}-\d{3}-[^#]+/);
  return match?.[0] ?? null;
}

function hasSourceWarning(state: PendingDecisionsSourceState): boolean {
  return state.behind > 0 || state.upstream_stale || state.dirty || state.partial;
}

function formatAge(thenMs: number, nowMs: number): string {
  if (!Number.isFinite(thenMs)) return "unknown";
  const diffMs = Math.max(0, nowMs - thenMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

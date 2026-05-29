import { describe, expect, it } from "vitest";
import { buildCorrelationItemMap, composeFleetGlance } from "../src/lib/fleet";
import { coordStatus, decisionCard, pendingResult } from "./fixtures";

describe("fleet glance composition", () => {
  it("joins coord_status correlation_id rows to bounded in-flight review requests", () => {
    const pendingCard = decisionCard({
      id: "2026-05-29-080-decisions-desktop-overlay#r2",
      signals: [{ kind: "runaway_churn", detail: "churned 5 rounds without pulling you in" }],
    });
    const glance = composeFleetGlance({
      pending: pendingResult([pendingCard]),
      coord: coordStatus({
        open_deadlines: [
          {
            tier: "round",
            subject_role: "codex",
            event_type: "reviewer_invoked",
            key: "corr-079-open",
            expected_by: "2026-05-29T12:10:00.000Z",
            age_sec: 60,
          },
          {
            tier: "round",
            subject_role: "codex",
            event_type: "reviewer_invoked",
            key: "corr-complete-open",
            expected_by: "2026-05-29T12:10:00.000Z",
            age_sec: 60,
          },
        ],
        recent_missed: [
          {
            subject_role: "cursor",
            opened_event_type: "reviewer_invoked",
            expected_event_type: "tick_start",
            key: "corr-079-open",
            missed_at: "2026-05-29T12:00:00.000Z",
          },
        ],
      }),
      inFlightItems: [
        {
          itemId: "2026-05-29-080-decisions-desktop-overlay",
          title: "080 overlay",
          stage: "claimed",
          path: "/repo/backlog/claimed/2026-05-29-080-decisions-desktop-overlay.md",
        },
        {
          itemId: "2026-05-28-079-loop-reliability-pack",
          title: "079 loop reliability",
          stage: "pending_review",
          path: "/repo/backlog/pending_review/2026-05-28-079-loop-reliability-pack.md",
        },
        {
          itemId: "2026-05-29-082-ready-item",
          title: "082 ready",
          stage: "ready",
          path: "/repo/backlog/ready/2026-05-29-082-ready-item.md",
        },
      ],
      reviewRequests: [
        {
          itemId: "2026-05-28-079-loop-reliability-pack",
          round: "r1",
          correlationId: "corr-079-open",
          path: "/repo/backlog/reviews/2026-05-28-079-loop-reliability-pack/r1/request.md",
        },
      ],
      scannedReviewRoots: ["/repo/backlog/reviews/2026-05-28-079-loop-reliability-pack"],
    });

    expect(glance.scannedReviewRoots).toEqual(["/repo/backlog/reviews/2026-05-28-079-loop-reliability-pack"]);
    expect(glance.nodes).toHaveLength(3);
    expect(glance.nodes.find((node) => node.itemId === "2026-05-29-080-decisions-desktop-overlay")).toMatchObject({
      state: "needs_you",
      needsYou: true,
      signals: pendingCard.signals,
      card: pendingCard,
    });
    expect(glance.nodes.find((node) => node.itemId === "2026-05-28-079-loop-reliability-pack")).toMatchObject({
      state: "blocked",
      health: { open_deadlines: 1, recent_misses: 1 },
    });
    const readyNode = glance.nodes.find((node) => node.itemId === "2026-05-29-082-ready-item");
    expect(readyNode).toMatchObject({ state: "reviewing" });
    expect(readyNode).not.toHaveProperty("health");
  });

  it("drops coord_status rows whose correlation_id is not mapped by an in-flight review request", () => {
    const map = buildCorrelationItemMap([
      {
        itemId: "2026-05-29-080-decisions-desktop-overlay",
        round: "r2",
        correlationId: "corr-080",
        path: "/repo/backlog/reviews/2026-05-29-080-decisions-desktop-overlay/r2/request.md",
      },
    ]);
    expect(map.get("corr-080")).toBe("2026-05-29-080-decisions-desktop-overlay");
    expect(map.get("corr-completed-history")).toBeUndefined();
  });
});

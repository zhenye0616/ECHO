import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Color: {
    Red: "red",
    Orange: "orange",
    Green: "green",
    SecondaryText: "secondary",
  },
  Detail: {
    Metadata: Object.assign(() => null, {
      Separator: () => null,
      Label: () => null,
    }),
  },
}));

import { buildAuditRows } from "../src/components/AuditTimeline";

describe("AuditTimeline", () => {
  it("renders live pending rows", () => {
    const rows = buildAuditRows([
      { ts: 1_000, tool: "find_clusters", args_shape: { since: "x" }, result_shape: {}, duration_ms: null, status: "pending" },
    ], "live", "unavailable");
    expect(rows[0].text).toContain("running");
    expect(rows[0].text).toContain("find_clusters");
  });

  it("renders completed rows with result shape", () => {
    const rows = buildAuditRows([
      { ts: 1_000, tool: "search_memories", args_shape: { limit: 15 }, result_shape: { match_count: 3 }, duration_ms: 12, status: "ok" },
    ], "completed", "unavailable");
    expect(rows[0].text).toContain("match_count=3");
  });

  it("renders errored daemon state", () => {
    const rows = buildAuditRows([], "errored", "Audit unavailable - daemon at 127.0.0.1:38478 not reachable");
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toContain("not reachable");
  });

  it("renders empty audit arrays without rows", () => {
    expect(buildAuditRows([], "empty", "unavailable")).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditUnavailableError, fetchRecentCalls, parseAuditResponse } from "../src/lib/audit";

describe("audit response parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses pending, ok, and error calls", () => {
    const parsed = parseAuditResponse({
      calls: [
        { ts: 1, tool: "search_memories", args_shape: {}, result_shape: {}, duration_ms: null, status: "pending" },
        { ts: 2, tool: "find_clusters", args_shape: {}, result_shape: { cluster_count: 0 }, duration_ms: 4, status: "ok" },
        { ts: 3, tool: "get_atom", args_shape: {}, result_shape: { is_error: true }, duration_ms: 2, status: "error" },
      ],
    });

    expect(parsed.calls.map((call) => call.status)).toEqual(["pending", "ok", "error"]);
    expect(parsed.calls[1]).toEqual({
      ts: 2,
      tool: "find_clusters",
      args_shape: {},
      result_shape: { cluster_count: 0 },
      duration_ms: 4,
      status: "ok",
    });
  });

  it("rejects malformed call shapes", () => {
    expect(() => parseAuditResponse({ calls: [{ ts: 1, tool: "x", args_shape: {}, result_shape: {}, status: "ok" }] })).toThrow(
      AuditUnavailableError,
    );
  });

  it("passes AbortSignal through to fetchRecentCalls", async () => {
    const controller = new AbortController();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ calls: [] }),
    } as Response);

    await expect(fetchRecentCalls({ since: 1, signal: controller.signal })).resolves.toEqual({ calls: [] });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });
});

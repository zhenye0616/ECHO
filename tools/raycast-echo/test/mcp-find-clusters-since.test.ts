import { afterEach, describe, expect, it, vi } from "vitest";
import { findClusters } from "../src/lib/mcp";

function mockFetchWithStructuredContent(structuredContent: Record<string, unknown>) {
  const calls: RequestInit[] = [];
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { structuredContent },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

function requestArguments(call: RequestInit): Record<string, unknown> {
  expect(typeof call.body).toBe("string");
  const body = JSON.parse(call.body as string) as {
    params?: { arguments?: Record<string, unknown> };
  };
  return body.params?.arguments ?? {};
}

describe("findClusters freshness window", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("passes explicit 18h since arg with compact view", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T20:00:00.000Z"));
    const calls = mockFetchWithStructuredContent({ clusters: [], warnings: [] });

    await findClusters();

    expect(calls).toHaveLength(1);
    expect(requestArguments(calls[0]!)).toMatchObject({
      since: "2026-05-22T02:00:00.000Z",
      view: "compact",
    });
  });
});

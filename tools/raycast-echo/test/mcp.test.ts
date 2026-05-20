import { afterEach, describe, expect, it, vi } from "vitest";
import { findClusters, getAtoms } from "../src/lib/mcp";

function mockFetchWithStructuredContent(structuredContent: Record<string, unknown>) {
  const calls: RequestInit[] = [];
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          structuredContent,
        },
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

describe("mcp client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("findClusters requests compact view", async () => {
    const calls = mockFetchWithStructuredContent({ clusters: [], warnings: [] });

    await findClusters();

    expect(calls).toHaveLength(1);
    expect(requestArguments(calls[0]!)["view"]).toBe("compact");
  });

  it("getAtoms requests compact view", async () => {
    const calls = mockFetchWithStructuredContent({
      atoms: [],
      atoms_dropped: 0,
      atoms_dropped_ids: [],
      warnings: [],
    });

    await getAtoms(["atom-1"]);

    expect(calls).toHaveLength(1);
    expect(requestArguments(calls[0]!)).toMatchObject({
      atom_ids: ["atom-1"],
      format: "minimal",
      view: "compact",
    });
  });
});

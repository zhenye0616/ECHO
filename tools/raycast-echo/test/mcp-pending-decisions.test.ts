import { afterEach, describe, expect, it, vi } from "vitest";
import { EchoDaemonError, pendingDecisions } from "../src/lib/mcp";

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

function requestBody(call: RequestInit): { params?: { name?: string; arguments?: Record<string, unknown> } } {
  expect(typeof call.body).toBe("string");
  return JSON.parse(call.body as string) as { params?: { name?: string; arguments?: Record<string, unknown> } };
}

describe("pendingDecisions MCP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls pending_decisions with repo_path", async () => {
    const calls = mockFetchWithStructuredContent({
      decisions: [],
      source_breakdown: { active_items: 0, review_rounds: 0, decisions: 0 },
      source_state: {
        local_head: "local",
        upstream_head: "upstream",
        behind: 0,
        upstream_checked_at: "2026-05-29T00:00:00.000Z",
        upstream_stale: false,
        dirty: false,
        scanned_items: 0,
        partial: false,
      },
    });

    const result = await pendingDecisions("/Users/test/Project_echo");

    expect(result.decisions).toEqual([]);
    expect(calls).toHaveLength(1);
    const body = requestBody(calls[0]!);
    expect(body.params?.name).toBe("pending_decisions");
    expect(body.params?.arguments).toEqual({ repo_path: "/Users/test/Project_echo" });
  });

  it("maps daemon HTTP failure to EchoDaemonError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));

    await expect(pendingDecisions("/Users/test/Project_echo")).rejects.toBeInstanceOf(EchoDaemonError);
  });
});

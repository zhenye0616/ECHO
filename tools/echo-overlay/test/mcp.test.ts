import { afterEach, describe, expect, it, vi } from "vitest";
import { EchoDaemonError, callTool, coordStatus, parseMcpResponse, pendingDecisions } from "../src/lib/mcp";
import { coordStatus as coordFixture, decisionCard, pendingResult } from "./fixtures";

describe("MCP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls pending_decisions with the absolute repo_path argument and unwraps structuredContent", async () => {
    const result = pendingResult([decisionCard()]);
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ jsonrpc: "2.0", id: 1, result: { structuredContent: result } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(pendingDecisions("/Users/zhenye/Desktop/Project_echo")).resolves.toEqual(result);

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      method: string;
      params: { name: string; arguments: Record<string, unknown> };
    };
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:38478/mcp",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        }),
      }),
    );
    expect(request).toMatchObject({
      method: "tools/call",
      params: {
        name: "pending_decisions",
        arguments: { repo_path: "/Users/zhenye/Desktop/Project_echo" },
      },
    });
  });

  it("calls coord_status with an empty argument object and parses text content fallback", async () => {
    const result = coordFixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: JSON.stringify(result) }] },
        }),
      ),
    );

    await expect(coordStatus()).resolves.toEqual(result);
  });

  it("parses SSE JSON-RPC responses", async () => {
    const envelope = parseMcpResponse('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"structuredContent":{"ok":true}}}\n\n');
    expect(envelope.result).toEqual({ structuredContent: { ok: true } });
  });

  it("surfaces daemon-unreachable failures as EchoDaemonError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(callTool("coord_status", {})).rejects.toBeInstanceOf(EchoDaemonError);
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

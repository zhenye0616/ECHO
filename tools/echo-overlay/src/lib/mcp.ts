import type { CoordStatusResult, PendingDecisionsResult } from "./types";

export const ECHO_MCP_URL = "http://127.0.0.1:38478/mcp";

interface JsonRpcEnvelope {
  jsonrpc?: "2.0";
  id?: number;
  result?: unknown;
  error?: { message?: string; code?: number; data?: unknown };
}

interface McpTextContent {
  type: "text";
  text: string;
}

interface McpToolResult {
  content?: McpTextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export class EchoDaemonError extends Error {
  constructor(message = "ECHO daemon unreachable") {
    super(message);
    this.name = "EchoDaemonError";
  }
}

export async function pendingDecisions(repoPath: string): Promise<PendingDecisionsResult> {
  return callTool<PendingDecisionsResult>("pending_decisions", { repo_path: repoPath });
}

export async function coordStatus(): Promise<CoordStatusResult> {
  return callTool<CoordStatusResult>("coord_status", {});
}

export async function callTool<T>(
  name: string,
  args: Record<string, unknown>,
  timeoutMs = 2_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(ECHO_MCP_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new EchoDaemonError(`ECHO daemon unreachable: HTTP ${response.status}`);
    }

    const envelope = parseMcpResponse(raw);
    if (envelope.error !== undefined) {
      throw new Error(envelope.error.message ?? `MCP ${name} failed`);
    }

    return unwrapToolResult<T>(envelope.result);
  } catch (err) {
    if (err instanceof EchoDaemonError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw new EchoDaemonError();
    if (err instanceof TypeError) throw new EchoDaemonError(err.message);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseMcpResponse(raw: string): JsonRpcEnvelope {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:") || trimmed.includes("\ndata:")) {
    const dataLine = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("data:") && line !== "data: [DONE]");
    if (dataLine === undefined) throw new Error("MCP response did not include an SSE data line");
    return JSON.parse(dataLine.slice("data:".length).trim()) as JsonRpcEnvelope;
  }
  return JSON.parse(trimmed) as JsonRpcEnvelope;
}

function unwrapToolResult<T>(result: unknown): T {
  const toolResult = result as McpToolResult | undefined;
  if (toolResult === undefined) throw new Error("MCP response missing result");
  if (toolResult.isError === true) {
    const message = toolResult.content?.find((entry) => entry.type === "text")?.text ?? "MCP tool returned an error";
    throw new Error(message);
  }
  if (toolResult.structuredContent !== undefined) {
    return toolResult.structuredContent as T;
  }
  const text = toolResult.content?.find((entry) => entry.type === "text")?.text;
  if (text === undefined) return result as T;
  return JSON.parse(text) as T;
}

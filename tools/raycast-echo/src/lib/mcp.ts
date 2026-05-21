import type { EchoAtom } from "./format";

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

export interface SearchMatch extends EchoAtom {
  content: string;
  truncations: string[];
  bytes_elided?: number;
  metadata_bytes_elided?: number;
  metadata_keys_elided?: string[];
  metadata_keys_projected?: string[];
}

export interface SearchResult {
  matches: SearchMatch[];
  total_returned: number;
  limit_applied: number;
  next_cursor: string | null;
  warnings: string[];
}

export interface FindClustersCluster {
  cluster_id: string;
  rank?: number;
  rank_reason?: string[];
  atom_ids: string[];
  source_breakdown: Record<string, number>;
  time_range: { from: string; to: string };
  label?: string | null;
}

export interface FindClustersResult {
  clusters: FindClustersCluster[];
  warnings: string[];
}

export interface GetAtomSuccessResult {
  atom: EchoAtom;
  atom_size_bytes: number;
  warnings: string[];
}

export interface GetAtomErrorResult {
  atom: null;
  atom_size_bytes: number;
  error_code: "atom_too_large_for_wire" | "atom_not_found";
  source: string | null;
  warnings: string[];
}

export type GetAtomResult = GetAtomSuccessResult | GetAtomErrorResult;

export interface GetAtomsResult {
  atoms: EchoAtom[];
  atoms_dropped: number;
  atoms_dropped_ids: string[];
  warnings: string[];
}

export class EchoDaemonError extends Error {
  constructor(message = "ECHO daemon unreachable") {
    super(message);
    this.name = "EchoDaemonError";
  }
}

export async function findClusters(): Promise<FindClustersResult> {
  return callTool<FindClustersResult>("find_clusters", { view: "compact" });
}

export async function searchMemories(query: string, limit = 15): Promise<SearchResult> {
  return callTool<SearchResult>("search_memories", { query, limit });
}

export async function getAtom(id: string): Promise<GetAtomResult> {
  return callTool<GetAtomResult>("get_atom", { id });
}

export async function getAtoms(atomIds: readonly string[], format: "minimal" = "minimal"): Promise<GetAtomsResult> {
  return callTool<GetAtomsResult>("get_atoms", { atom_ids: [...atomIds], format, view: "compact" });
}

async function callTool<T>(name: string, args: Record<string, unknown>, timeoutMs = 2_000): Promise<T> {
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

function parseMcpResponse(raw: string): JsonRpcEnvelope {
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

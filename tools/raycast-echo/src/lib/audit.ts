export type AuditStatus = "pending" | "ok" | "error";

export interface AuditCall {
  ts: number;
  tool: string;
  args_shape: Record<string, unknown>;
  result_shape: Record<string, unknown>;
  duration_ms: number | null;
  status: AuditStatus;
}

export interface AuditResponse {
  calls: AuditCall[];
}

export interface AuditCallBody {
  timestampMs: number;
  tool: string;
  argsShape: Record<string, unknown>;
  resultShape: Record<string, unknown>;
  durationMs: number | null;
  status: AuditStatus;
}

export interface FetchAuditOptions {
  since: number;
  until?: number;
  status?: AuditStatus;
  signal?: AbortSignal;
}

export class AuditUnavailableError extends Error {
  constructor(message = "Audit unavailable") {
    super(message);
    this.name = "AuditUnavailableError";
  }
}

const RECENT_CALLS_URL = "http://127.0.0.1:38478/mcp/recent-calls";

export async function fetchRecentCalls(options: FetchAuditOptions): Promise<AuditResponse> {
  const url = new URL(RECENT_CALLS_URL);
  url.searchParams.set("since", String(options.since));
  if (options.until !== undefined) url.searchParams.set("until", String(options.until));
  if (options.status !== undefined) url.searchParams.set("status", options.status);

  let response: Response;
  try {
    response = await fetch(url, { signal: options.signal });
  } catch (err) {
    throw new AuditUnavailableError((err as Error).message);
  }
  if (!response.ok) {
    throw new AuditUnavailableError(`audit endpoint returned HTTP ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  return parseAuditResponse(raw);
}

export function parseAuditResponse(raw: unknown): AuditResponse {
  if (raw === null || typeof raw !== "object" || !Array.isArray((raw as { calls?: unknown }).calls)) {
    throw new AuditUnavailableError("audit response missing calls");
  }
  const calls = (raw as { calls: unknown[] }).calls.map(parseAuditCall);
  return { calls };
}

export function toAuditCallBody(call: AuditCall): AuditCallBody {
  return {
    timestampMs: call.ts,
    tool: call.tool,
    argsShape: call.args_shape,
    resultShape: call.result_shape,
    durationMs: call.duration_ms,
    status: call.status,
  };
}

function parseAuditCall(raw: unknown): AuditCall {
  if (raw === null || typeof raw !== "object") {
    throw new AuditUnavailableError("audit call is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["ts"] !== "number") throw new AuditUnavailableError("audit call missing ts");
  if (typeof obj["tool"] !== "string") throw new AuditUnavailableError("audit call missing tool");
  if (!isShape(obj["args_shape"])) throw new AuditUnavailableError("audit call missing args_shape");
  if (!isShape(obj["result_shape"])) throw new AuditUnavailableError("audit call missing result_shape");
  if (obj["duration_ms"] !== null && typeof obj["duration_ms"] !== "number") {
    throw new AuditUnavailableError("audit call missing duration_ms");
  }
  if (obj["status"] !== "pending" && obj["status"] !== "ok" && obj["status"] !== "error") {
    throw new AuditUnavailableError("audit call has invalid status");
  }
  return {
    ts: obj["ts"],
    tool: obj["tool"],
    args_shape: obj["args_shape"],
    result_shape: obj["result_shape"],
    duration_ms: obj["duration_ms"],
    status: obj["status"],
  };
}

function isShape(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

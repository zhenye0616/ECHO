import { Color, Detail } from "@raycast/api";
import { toAuditCallBody, type AuditCall } from "../lib/audit";

export type AuditTimelineMode = "live" | "completed" | "errored" | "empty";

export function AuditTimeline({
  calls,
  mode,
  unavailableMessage = "Audit unavailable - daemon may not be reachable.",
}: {
  calls: readonly AuditCall[] | null;
  mode: AuditTimelineMode;
  unavailableMessage?: string;
}) {
  const rows = buildAuditRows(calls ?? [], mode, unavailableMessage);
  if (rows.length === 0) {
    return <Detail.Metadata.Label title="Audit" text="No MCP calls" />;
  }
  return (
    <>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Audit" text={mode === "live" ? `Live (${rows.length} calls)` : `${rows.length} calls`} />
      {rows.map((row, index) => (
        <Detail.Metadata.Label
          key={`${row.title}-${index}`}
          title={row.title}
          text={{ value: row.text, color: row.color }}
        />
      ))}
    </>
  );
}

export interface AuditTimelineRow {
  title: string;
  text: string;
  color: Color;
}

export function buildAuditRows(calls: readonly AuditCall[], mode: AuditTimelineMode, unavailableMessage: string): AuditTimelineRow[] {
  if (mode === "errored") return [{ title: "Audit", text: unavailableMessage, color: Color.Red }];
  if (calls.length === 0) return [];
  const firstTs = calls[0]?.ts ?? 0;
  return calls.slice(0, 20).map((call) => {
    const body = toAuditCallBody(call);
    const timestamp = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(body.timestampMs));
    const relative = firstTs > 0 ? `(+${((body.timestampMs - firstTs) / 1000).toFixed(1)}s)` : "(+0.0s)";
    const result = body.status === "pending"
      ? "running"
      : summarizeShape(body.resultShape);
    return {
      title: `${timestamp} ${relative}`,
      text: `${body.tool} · ${summarizeShape(body.argsShape)} · ${result}`,
      color: colorForStatus(body.status),
    };
  });
}

function colorForStatus(status: AuditCall["status"]): Color {
  if (status === "error") return Color.Red;
  if (status === "pending") return Color.Orange;
  return Color.Green;
}

function summarizeShape(shape: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === "boolean") parts.push(key);
    else parts.push(`${key}=${String(value)}`);
  }
  return parts.length > 0 ? parts.slice(0, 3).join(", ") : "-";
}

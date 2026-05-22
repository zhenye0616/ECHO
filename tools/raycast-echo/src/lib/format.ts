import { homedir } from "node:os";

export type DerivedApp = "cursor" | "claude_code" | "codex" | "git" | "unknown";

export interface EchoAtom {
  id: string;
  source: string;
  timestamp: string;
  content?: string;
  metadata?: Record<string, unknown>;
  truncations?: string[];
}

function buildSourceAppMap(home = homedir()): Record<Exclude<DerivedApp, "unknown">, string> {
  return {
    cursor: `fs:${home}/Library/Application Support/Cursor/`,
    claude_code: `fs:${home}/.claude/projects/`,
    codex: `fs:${home}/.codex/sessions/`,
    git: "git:",
  };
}

export function derivedApp(source: string, home = homedir()): DerivedApp {
  const sourceAppMap = buildSourceAppMap(home);
  for (const [app, prefix] of Object.entries(sourceAppMap) as Array<[Exclude<DerivedApp, "unknown">, string]>) {
    if (source.startsWith(prefix)) return app;
  }
  return "unknown";
}

export function formatPdtTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const offset = pacificOffsetMinutes(date);
  const zone = offset === -420 ? "PDT" : offset === -480 ? "PST" : "PT";

  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")} ${zone}`;
}

function pacificOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(values["year"]),
    Number(values["month"]) - 1,
    Number(values["day"]),
    Number(values["hour"]),
    Number(values["minute"]),
    Number(values["second"]),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function formatAtom(atom: EchoAtom): string {
  return `## ${derivedApp(atom.source)} · ${formatPdtTimestamp(atom.timestamp)}\n\n${atom.content ?? ""}`;
}

export function formatAtomBundle(atoms: readonly EchoAtom[]): string {
  return atoms.map(formatAtom).join("\n---\n");
}

export function formatHeroLine(label: string | null | undefined, unresolvedCount: number): string {
  const trimmed = label?.trim();
  const base = trimmed === undefined || trimmed.length === 0 ? "Untitled work" : truncate(trimmed, 60);
  return `Continue: ${base} · ${unresolvedCount} open`;
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

import type { Session } from "./sessions";

export type SinceWindowPreference = "last_session" | "24h" | "4h";

export type SinceSource =
  | "user"
  | "last_session"
  | "window_24h"
  | "window_4h"
  | "fallback_24h";

export interface ResolvedSince {
  sinceIso: string;
  source: SinceSource;
}

export class InvalidSinceInputError extends Error {
  constructor(public readonly rawInput: string) {
    super(`Invalid since input: "${rawInput}" - expected ISO 8601 timestamp with explicit timezone (Z or +/-HH:MM).`);
    this.name = "InvalidSinceInputError";
  }
}

const ISO_WITH_EXPLICIT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const HOUR_MS = 60 * 60 * 1000;

export function resolveSinceWindow(
  userInput: string | undefined,
  windowPref: SinceWindowPreference,
  sessions: readonly Session[],
  nowMs: number = Date.now(),
): ResolvedSince {
  const raw = userInput?.trim() ?? "";
  if (raw.length > 0) {
    if (!ISO_WITH_EXPLICIT_ZONE.test(raw)) throw new InvalidSinceInputError(raw);
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) throw new InvalidSinceInputError(raw);
    return { sinceIso: new Date(parsed).toISOString(), source: "user" };
  }

  if (windowPref === "24h") {
    return { sinceIso: new Date(nowMs - 24 * HOUR_MS).toISOString(), source: "window_24h" };
  }
  if (windowPref === "4h") {
    return { sinceIso: new Date(nowMs - 4 * HOUR_MS).toISOString(), source: "window_4h" };
  }

  const lastDone = mostRecentDoneSession(sessions);
  if (lastDone !== null) {
    return { sinceIso: new Date(lastDone).toISOString(), source: "last_session" };
  }
  return { sinceIso: new Date(nowMs - 24 * HOUR_MS).toISOString(), source: "fallback_24h" };
}

function mostRecentDoneSession(sessions: readonly Session[]): number | null {
  let newest: number | null = null;
  for (const session of sessions) {
    if (session.status !== "done") continue;
    const candidate = Date.parse(session.completedAt ?? session.startedAt);
    if (Number.isNaN(candidate)) continue;
    if (newest === null || candidate > newest) newest = candidate;
  }
  return newest;
}

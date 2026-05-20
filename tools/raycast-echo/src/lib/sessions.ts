import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentKind } from "./agent-profiles";
import type { AuditCall } from "./audit";
import type { LaunchTargetId } from "./launch";

export type SessionStatus = "running" | "done" | "cancelled" | "errored" | "historical";

export interface Session {
  id: string;
  question: string;
  agentKind: AgentKind;
  startedAt: string;
  completedAt: string | null;
  status: SessionStatus;
  answer: string;
  auditCalls: AuditCall[];
  subprocessLogPath: string | null;
  sourceBreakdown: Record<string, number>;
  evidenceClusters: string[];
  forkedFrom: string | null;
}

export interface SessionStartInput {
  question: string;
  agentKind: AgentKind;
  subprocessLogPath: string | null;
  startedAt?: string;
  forkedFrom?: string | null;
}

export interface SessionEndPatch {
  completedAt?: string;
  status: "done" | "cancelled" | "errored";
  sourceBreakdown?: Record<string, number>;
  evidenceClusters?: string[];
}

export interface SessionBuckets {
  today: Session[];
  yesterday: Session[];
  thisWeek: Session[];
  older: Session[];
}

const ROW_PREFIX = "echo.sessions.v1.row.";
const MIGRATED_KEY = "echo.sessions.v1.migrated";
const LEGACY_RECENT_ASKS_KEY = "echo.recent-asks";
const LEGACY_RECENT_ASKS_BACKUP_KEY = "echo.recent-asks.backup";
const LEGACY_SESSIONS_ARRAY_KEY = "echo.sessions.v1";
const MAX_SESSIONS = 100;
export const MAX_RUNTIME_MS = 300_000;
export const RECONCILED_SUFFIX = "\n\n[session reconciled at startup - Raycast extension was closed before completion]";

const terminalStatuses = new Set<SessionStatus>(["done", "errored", "cancelled", "historical"]);
const inflight: Record<string, Promise<void> | undefined> = {};
let migrationPromise: Promise<void> | null = null;

export function sessionRowKey(id: string): string {
  return `${ROW_PREFIX}${id}`;
}

export function makeSessionId(now = new Date()): string {
  return `ses_${now.toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}`;
}

export async function listSessions(): Promise<Session[]> {
  await ensureMigrated();
  let sessions = await readSessionRows();
  if (await reconcileStaleRunningRows(sessions)) {
    sessions = await readSessionRows();
  }
  return sortSessions(sessions);
}

export function selectWarmSession(sessions: readonly Session[]): Session | null {
  return sessions.find((session) => session.status === "done") ?? null;
}

export async function recordSessionStart(input: SessionStartInput): Promise<Session> {
  await ensureMigrated();
  const startedAt = input.startedAt ?? new Date().toISOString();
  const session: Session = {
    id: makeSessionId(new Date(startedAt)),
    question: input.question.trim(),
    agentKind: input.agentKind,
    startedAt,
    completedAt: null,
    status: "running",
    answer: "",
    auditCalls: [],
    subprocessLogPath: input.subprocessLogPath,
    sourceBreakdown: {},
    evidenceClusters: [],
    forkedFrom: input.forkedFrom ?? null,
  };
  await LocalStorage.setItem(sessionRowKey(session.id), JSON.stringify(session));
  await enforceSessionCap();
  return session;
}

export function recordSessionUpdate(id: string, patch: { answer?: string; auditCalls?: AuditCall[] }): Promise<void> {
  const scoped: Partial<Session> = {};
  if (patch.answer !== undefined) scoped.answer = patch.answer;
  if (patch.auditCalls !== undefined) scoped.auditCalls = patch.auditCalls;
  return mergeRowAndWrite(id, scoped);
}

export function recordSessionEnd(id: string, patch: SessionEndPatch): Promise<void> {
  return mergeRowAndWrite(id, {
    completedAt: patch.completedAt ?? new Date().toISOString(),
    status: patch.status,
    sourceBreakdown: patch.sourceBreakdown ?? {},
    evidenceClusters: patch.evidenceClusters ?? [],
  });
}

export function drainInflightWrites(id: string): Promise<void> {
  return inflight[id] ?? Promise.resolve();
}

export function mergeRowAndWrite(id: string, patch: Partial<Session>): Promise<void> {
  const previous = inflight[id] ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => doMergeRowAndWrite(id, patch));
  const assigned = next.finally(() => {
    if (inflight[id] === assigned) delete inflight[id];
  });
  inflight[id] = assigned;
  return assigned;
}

export async function deleteSession(id: string): Promise<void> {
  await drainInflightWrites(id);
  await LocalStorage.removeItem(sessionRowKey(id));
}

export function buildForkPrompt(source: Session, typedText: string): string {
  let followUp = typedText.trim();
  const sourceQuestion = source.question.trim();
  if (followUp.startsWith(sourceQuestion)) {
    followUp = followUp.slice(sourceQuestion.length).trim();
  }
  return [
    `Continuing from "${source.question}" (asked ${formatPdtTime(source.startedAt)}). Previous answer:`,
    "",
    source.answer.trim(),
    "",
    "Follow-up:",
    followUp,
  ].join("\n");
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = useCallback(async () => {
    setSessions(await listSessions());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const warmSession = useMemo(() => selectWarmSession(sessions), [sessions]);

  const start = useCallback(async (input: SessionStartInput) => {
    const session = await recordSessionStart(input);
    await refresh();
    return session;
  }, [refresh]);

  const update = useCallback(async (id: string, patch: { answer?: string; auditCalls?: AuditCall[] }) => {
    await recordSessionUpdate(id, patch);
    await refresh();
  }, [refresh]);

  const end = useCallback(async (id: string, patch: SessionEndPatch) => {
    await recordSessionEnd(id, patch);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteSession(id);
    await refresh();
  }, [refresh]);

  return { sessions, warmSession, refresh, recordSessionStart: start, recordSessionUpdate: update, recordSessionEnd: end, deleteSession: remove };
}

export function bucketSessionsForEmpty(sessions: readonly Session[], now = new Date()): Omit<SessionBuckets, "older"> {
  const buckets = bucketSessions(sessions, now);
  return { today: buckets.today, yesterday: buckets.yesterday, thisWeek: buckets.thisWeek };
}

export function bucketSessions(sessions: readonly Session[], now = new Date()): SessionBuckets {
  const today = dateKeyPdt(now);
  const yesterday = dateKeyPdt(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const thisWeekKeys = pdtWeekKeys(now);
  const buckets: SessionBuckets = { today: [], yesterday: [], thisWeek: [], older: [] };
  for (const session of sessions) {
    const key = dateKeyPdt(new Date(session.startedAt));
    if (key === today) buckets.today.push(session);
    else if (key === yesterday) buckets.yesterday.push(session);
    else if (thisWeekKeys.has(key)) buckets.thisWeek.push(session);
    else buckets.older.push(session);
  }
  return buckets;
}

export function formatPdtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const dt = now - new Date(iso).getTime();
  if (dt < 60_000) return "just now";
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m`;
  if (dt < 86_400_000) return `${Math.floor(dt / 3_600_000)}h`;
  return `${Math.floor(dt / 86_400_000)}d`;
}

export function canDeleteSession(session: Session): boolean {
  return session.status !== "running";
}

export function resetSessionsModuleForTests(): void {
  migrationPromise = null;
  for (const key of Object.keys(inflight)) delete inflight[key];
}

async function ensureMigrated(): Promise<void> {
  if (migrationPromise === null) migrationPromise = migrateOnce();
  await migrationPromise;
}

async function migrateOnce(): Promise<void> {
  const sentinel = await LocalStorage.getItem<string>(MIGRATED_KEY);
  if (sentinel !== undefined && sentinel !== null && String(sentinel).length > 0) return;

  const legacyArrayRaw = await LocalStorage.getItem<string>(LEGACY_SESSIONS_ARRAY_KEY);
  for (const session of parseLegacySessionArray(legacyArrayRaw)) {
    await LocalStorage.setItem(sessionRowKey(session.id), JSON.stringify(session));
  }
  if (legacyArrayRaw !== undefined) await LocalStorage.removeItem(LEGACY_SESSIONS_ARRAY_KEY);

  const recentRaw = await LocalStorage.getItem<string>(LEGACY_RECENT_ASKS_KEY);
  if (typeof recentRaw === "string" && recentRaw.length > 0) {
    for (const session of parseRecentAsks(recentRaw)) {
      await LocalStorage.setItem(sessionRowKey(session.id), JSON.stringify(session));
    }
    await LocalStorage.setItem(LEGACY_RECENT_ASKS_BACKUP_KEY, recentRaw);
    await LocalStorage.removeItem(LEGACY_RECENT_ASKS_KEY);
  }
  await LocalStorage.setItem(MIGRATED_KEY, new Date().toISOString());
}

async function readSessionRows(): Promise<Session[]> {
  const all = await LocalStorage.allItems();
  const rows: Session[] = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(ROW_PREFIX)) continue;
    const session = parseSession(typeof value === "string" ? value : JSON.stringify(value));
    if (session !== null) rows.push(session);
  }
  return sortSessions(rows);
}

function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

async function doMergeRowAndWrite(id: string, patch: Partial<Session>): Promise<void> {
  const raw = await LocalStorage.getItem<string>(sessionRowKey(id));
  const current = parseSession(raw);
  if (current === null) return;
  const next: Session = { ...current };

  if (patch.answer !== undefined) next.answer = patch.answer;
  if (patch.auditCalls !== undefined) next.auditCalls = mergeAuditCalls(current.auditCalls, patch.auditCalls);
  if (patch.completedAt !== undefined) next.completedAt = patch.completedAt;
  if (patch.status !== undefined && !(terminalStatuses.has(current.status) && patch.status === "running")) {
    next.status = patch.status;
  }
  if (patch.sourceBreakdown !== undefined) next.sourceBreakdown = patch.sourceBreakdown;
  if (patch.evidenceClusters !== undefined) next.evidenceClusters = patch.evidenceClusters;

  await LocalStorage.setItem(sessionRowKey(id), JSON.stringify(next));
  await enforceSessionCap();
}

function mergeAuditCalls(current: readonly AuditCall[], incoming: readonly AuditCall[]): AuditCall[] {
  const byKey = new Map<string, AuditCall>();
  for (const call of current) byKey.set(auditKey(call), call);
  for (const call of incoming) {
    const prev = byKey.get(auditKey(call));
    byKey.set(auditKey(call), prev === undefined ? call : betterAuditCall(prev, call));
  }
  return [...byKey.values()].sort((a, b) => a.ts - b.ts);
}

function betterAuditCall(a: AuditCall, b: AuditCall): AuditCall {
  const pa = statusRank(a.status);
  const pb = statusRank(b.status);
  if (pb > pa) return b;
  if (pa > pb) return a;
  return (b.duration_ms ?? -1) >= (a.duration_ms ?? -1) ? b : a;
}

function statusRank(status: AuditCall["status"]): number {
  return status === "pending" ? 0 : 1;
}

function auditKey(call: AuditCall): string {
  return `${call.ts}:${call.tool}:${stableJson(call.args_shape)}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
}

async function reconcileStaleRunningRows(sessions: readonly Session[]): Promise<boolean> {
  let changed = false;
  const now = Date.now();
  for (const session of sessions) {
    if (session.status !== "running") continue;
    if (now - new Date(session.startedAt).getTime() <= MAX_RUNTIME_MS) continue;
    const answer = session.answer.endsWith(RECONCILED_SUFFIX)
      ? session.answer
      : `${session.answer}${RECONCILED_SUFFIX}`;
    await mergeRowAndWrite(session.id, {
      status: "cancelled",
      completedAt: new Date(now).toISOString(),
      answer,
    });
    changed = true;
  }
  return changed;
}

async function enforceSessionCap(): Promise<void> {
  const sessions = await readSessionRowsNoSideEffects();
  if (sessions.length <= MAX_SESSIONS) return;
  const warmId = selectWarmSession(sessions)?.id;
  const candidates = sessions
    .filter((session) => session.status !== "running" && session.id !== warmId)
    .sort((a, b) => evictionRank(a) - evictionRank(b) || new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  for (const session of candidates.slice(0, Math.max(0, sessions.length - MAX_SESSIONS))) {
    await LocalStorage.removeItem(sessionRowKey(session.id));
  }
}

async function readSessionRowsNoSideEffects(): Promise<Session[]> {
  const all = await LocalStorage.allItems();
  return Object.entries(all)
    .filter(([key]) => key.startsWith(ROW_PREFIX))
    .map(([, value]) => parseSession(typeof value === "string" ? value : JSON.stringify(value)))
    .filter((session): session is Session => session !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

function evictionRank(session: Session): number {
  return session.status === "historical" ? 0 : 1;
}

function parseLegacySessionArray(raw: string | undefined): Session[] {
  if (raw === undefined || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => normalizeSession(value)).filter((session): session is Session => session !== null);
  } catch {
    return [];
  }
}

interface RecentAsk {
  id: string;
  question: string;
  launchedTo: LaunchTargetId;
  at: string;
}

function parseRecentAsks(raw: string): Session[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentAsk).map((ask) => ({
      id: ask.id,
      question: ask.question,
      agentKind: "claude",
      startedAt: ask.at,
      completedAt: ask.at,
      status: "historical",
      answer: "",
      auditCalls: [],
      subprocessLogPath: null,
      sourceBreakdown: {},
      evidenceClusters: [],
      forkedFrom: null,
    }));
  } catch {
    return [];
  }
}

function isRecentAsk(value: unknown): value is RecentAsk {
  const o = value as Record<string, unknown>;
  return value !== null
    && typeof value === "object"
    && typeof o["id"] === "string"
    && typeof o["question"] === "string"
    && typeof o["launchedTo"] === "string"
    && typeof o["at"] === "string";
}

function parseSession(raw: string | undefined): Session | null {
  if (raw === undefined || raw.length === 0) return null;
  try {
    return normalizeSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function normalizeSession(value: unknown): Session | null {
  if (value === null || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o["id"] !== "string" || typeof o["question"] !== "string" || typeof o["startedAt"] !== "string") return null;
  return {
    id: o["id"],
    question: o["question"],
    agentKind: o["agentKind"] === "claude" || o["agentKind"] === "custom" || o["agentKind"] === "codex" ? o["agentKind"] : "claude",
    startedAt: o["startedAt"],
    completedAt: typeof o["completedAt"] === "string" ? o["completedAt"] : null,
    status: isSessionStatus(o["status"]) ? o["status"] : "historical",
    answer: typeof o["answer"] === "string" ? o["answer"] : "",
    auditCalls: Array.isArray(o["auditCalls"]) ? o["auditCalls"].filter(isAuditCall) : [],
    subprocessLogPath: typeof o["subprocessLogPath"] === "string" ? o["subprocessLogPath"] : null,
    sourceBreakdown: isRecordOfNumbers(o["sourceBreakdown"]) ? o["sourceBreakdown"] : {},
    evidenceClusters: Array.isArray(o["evidenceClusters"]) ? o["evidenceClusters"].filter((x): x is string => typeof x === "string").slice(0, 5) : [],
    forkedFrom: typeof o["forkedFrom"] === "string" ? o["forkedFrom"] : null,
  };
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "running" || value === "done" || value === "cancelled" || value === "errored" || value === "historical";
}

function isAuditCall(value: unknown): value is AuditCall {
  const o = value as Record<string, unknown>;
  return value !== null
    && typeof value === "object"
    && typeof o["ts"] === "number"
    && typeof o["tool"] === "string"
    && isObject(o["args_shape"])
    && isObject(o["result_shape"])
    && (o["duration_ms"] === null || typeof o["duration_ms"] === "number")
    && (o["status"] === "pending" || o["status"] === "ok" || o["status"] === "error");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRecordOfNumbers(value: unknown): value is Record<string, number> {
  if (!isObject(value)) return false;
  return Object.values(value).every((v) => typeof v === "number" && Number.isFinite(v));
}

function dateKeyPdt(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function pdtWeekKeys(now: Date): Set<string> {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short" }).format(now);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const daysSinceMonday = dayIndex === 0 ? 6 : Math.max(0, dayIndex - 1);
  const keys = new Set<string>();
  for (let i = 2; i <= daysSinceMonday; i += 1) {
    keys.add(dateKeyPdt(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

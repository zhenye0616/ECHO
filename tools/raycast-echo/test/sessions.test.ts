import { beforeEach, describe, expect, it, vi } from "vitest";

const local = vi.hoisted(() => {
  const store = new Map<string, string | number | boolean>();
  return {
    store,
    setItemImpl: async (key: string, value: string | number | boolean) => {
      store.set(key, value);
    },
  };
});

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => local.store.get(key)),
    setItem: vi.fn(async (key: string, value: string | number | boolean) => local.setItemImpl(key, value)),
    removeItem: vi.fn(async (key: string) => { local.store.delete(key); }),
    allItems: vi.fn(async () => Object.fromEntries(local.store.entries())),
  },
}));

import {
  RECONCILED_SUFFIX,
  bucketSessions,
  buildForkPrompt,
  canDeleteSession,
  deleteSession,
  drainInflightWrites,
  listSessions,
  mergeRowAndWrite,
  recordSessionEnd,
  recordSessionStart,
  recordSessionUpdate,
  resetSessionsModuleForTests,
  selectWarmSession,
  sessionRowKey,
  type Session,
} from "../src/lib/sessions";

function seedSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? `s-${local.store.size}`,
    question: overrides.question ?? "What shipped?",
    agentKind: overrides.agentKind ?? "codex",
    startedAt: overrides.startedAt ?? "2026-05-19T18:00:00.000Z",
    completedAt: overrides.completedAt ?? null,
    status: overrides.status ?? "running",
    answer: overrides.answer ?? "",
    auditCalls: overrides.auditCalls ?? [],
    subprocessLogPath: overrides.subprocessLogPath ?? "/tmp/s.log",
    sourceBreakdown: overrides.sourceBreakdown ?? {},
    evidenceClusters: overrides.evidenceClusters ?? [],
    forkedFrom: overrides.forkedFrom ?? null,
  };
}

async function writeSession(session: Session) {
  local.store.set(sessionRowKey(session.id), JSON.stringify(session));
  local.store.set("echo.sessions.v1.migrated", "yes");
  resetSessionsModuleForTests();
}

describe("sessions persistence", () => {
  beforeEach(() => {
    local.store.clear();
    local.setItemImpl = async (key, value) => { local.store.set(key, value); };
    resetSessionsModuleForTests();
    vi.useRealTimers();
  });

  it("writes and reads a running session row", async () => {
    const session = await recordSessionStart({ question: "hello", agentKind: "codex", subprocessLogPath: "/tmp/a.log", startedAt: new Date().toISOString() });
    const rows = await listSessions();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: session.id, question: "hello", status: "running", subprocessLogPath: "/tmp/a.log" });
    expect(local.store.has(sessionRowKey(session.id))).toBe(true);
  });

  it("derives the warm session from the most recent done row", () => {
    const warm = seedSession({ id: "done", status: "done", startedAt: "2026-05-19T19:00:00.000Z" });
    const old = seedSession({ id: "old", status: "done", startedAt: "2026-05-18T19:00:00.000Z" });
    expect(selectWarmSession([warm, old])?.id).toBe("done");
  });

  it("migrates recent asks into full historical session rows", async () => {
    const raw = JSON.stringify([{ id: "legacy", question: "q", launchedTo: "cursor", at: "2026-05-19T10:00:00.000Z" }]);
    local.store.set("echo.recent-asks", raw);
    const rows = await listSessions();
    expect(rows[0]).toMatchObject({ id: "legacy", status: "historical", agentKind: "claude", answer: "", subprocessLogPath: null, forkedFrom: null });
    expect(local.store.get("echo.recent-asks.backup")).toBe(raw);
    expect(local.store.has("echo.recent-asks")).toBe(false);
    expect(local.store.has("echo.sessions.v1.migrated")).toBe(true);
  });

  it("recent-asks migration is idempotent after sentinel", async () => {
    local.store.set("echo.recent-asks", JSON.stringify([{ id: "legacy", question: "q", launchedTo: "copy", at: "2026-05-19T10:00:00.000Z" }]));
    await listSessions();
    local.store.set("echo.recent-asks", JSON.stringify([{ id: "second", question: "q2", launchedTo: "copy", at: "2026-05-19T11:00:00.000Z" }]));
    expect((await listSessions()).map((s) => s.id)).toEqual(["legacy"]);
  });

  it("migrates a defensive legacy sessions array key", async () => {
    local.store.set("echo.sessions.v1", JSON.stringify([seedSession({ id: "array", status: "done" })]));
    const rows = await listSessions();
    expect(rows.map((s) => s.id)).toEqual(["array"]);
    expect(local.store.has("echo.sessions.v1")).toBe(false);
  });

  it("evicts historical rows before terminal rows when over cap", async () => {
    for (let i = 0; i < 101; i += 1) {
      await recordSessionStart({ question: `q${i}`, agentKind: "codex", subprocessLogPath: null, startedAt: `2026-05-19T10:${String(i % 60).padStart(2, "0")}:00.000Z` });
      const rows = await listSessions();
      await recordSessionEnd(rows[0].id, { status: i < 60 ? "cancelled" : "done" });
    }
    local.store.set(sessionRowKey("hist"), JSON.stringify(seedSession({ id: "hist", status: "historical", startedAt: "2026-05-01T00:00:00.000Z" })));
    await recordSessionStart({ question: "trigger", agentKind: "codex", subprocessLogPath: null });
    expect(local.store.has(sessionRowKey("hist"))).toBe(false);
  });

  it("does not evict running rows or the warm done row", async () => {
    const running = seedSession({ id: "running", status: "running" });
    const warm = seedSession({ id: "warm", status: "done", completedAt: "2026-05-19T18:01:00.000Z", startedAt: "2026-05-19T18:00:00.000Z" });
    await writeSession(running);
    local.store.set(sessionRowKey(warm.id), JSON.stringify(warm));
    for (let i = 0; i < 100; i += 1) local.store.set(sessionRowKey(`h${i}`), JSON.stringify(seedSession({ id: `h${i}`, status: "historical", startedAt: `2026-05-01T00:${String(i % 60).padStart(2, "0")}:00.000Z` })));
    await recordSessionStart({ question: "trigger", agentKind: "codex", subprocessLogPath: null });
    expect(local.store.has(sessionRowKey("running"))).toBe(true);
    expect(local.store.has(sessionRowKey("warm"))).toBe(true);
  });

  it("records done, errored, and cancelled terminal statuses", async () => {
    const a = await recordSessionStart({ question: "a", agentKind: "codex", subprocessLogPath: null });
    const b = await recordSessionStart({ question: "b", agentKind: "codex", subprocessLogPath: null });
    const c = await recordSessionStart({ question: "c", agentKind: "codex", subprocessLogPath: null });
    await recordSessionEnd(a.id, { status: "done" });
    await recordSessionEnd(b.id, { status: "errored" });
    await recordSessionEnd(c.id, { status: "cancelled" });
    expect(new Set((await listSessions()).map((s) => s.status))).toEqual(new Set(["done", "errored", "cancelled"]));
  });

  it("fork prompt strips the source-question prefix and preserves the source row", () => {
    const source = seedSession({ id: "source", question: "Original?", answer: "Prior answer" });
    const prompt = buildForkPrompt(source, "Original? More detail");
    expect(prompt).toContain("Previous answer:\n\nPrior answer");
    expect(prompt).toContain("Follow-up:\nMore detail");
    expect(source.answer).toBe("Prior answer");
  });

  it("delete removes only the requested per-row key", async () => {
    const a = seedSession({ id: "a" });
    const b = seedSession({ id: "b" });
    await writeSession(a);
    local.store.set(sessionRowKey(b.id), JSON.stringify(b));
    await deleteSession("a");
    expect(local.store.has(sessionRowKey("a"))).toBe(false);
    expect(local.store.has(sessionRowKey("b"))).toBe(true);
  });

  it("reconciles stale running rows to cancelled", async () => {
    await writeSession(seedSession({ id: "stale", status: "running", startedAt: "2026-05-01T00:00:00.000Z", answer: "body" }));
    const row = (await listSessions())[0];
    expect(row.status).toBe("cancelled");
    expect(row.answer).toContain(RECONCILED_SUFFIX);
  });

  it("leaves non-stale running rows untouched", async () => {
    await writeSession(seedSession({ id: "fresh", status: "running", startedAt: new Date().toISOString(), answer: "body" }));
    const row = (await listSessions())[0];
    expect(row.status).toBe("running");
    expect(row.answer).toBe("body");
  });

  it("stale reconciliation is idempotent", async () => {
    await writeSession(seedSession({ id: "stale", status: "running", startedAt: "2026-05-01T00:00:00.000Z", answer: "body" }));
    await listSessions();
    const once = JSON.parse(String(local.store.get(sessionRowKey("stale")))) as Session;
    await listSessions();
    const twice = JSON.parse(String(local.store.get(sessionRowKey("stale")))) as Session;
    expect(twice.answer).toBe(once.answer);
  });

  it("preserves two different session ids under distinct LocalStorage keys", async () => {
    const a = await recordSessionStart({ question: "a", agentKind: "codex", subprocessLogPath: null });
    const b = await recordSessionStart({ question: "b", agentKind: "codex", subprocessLogPath: null });
    expect(local.store.has(sessionRowKey(a.id))).toBe(true);
    expect(local.store.has(sessionRowKey(b.id))).toBe(true);
  });

  it("updates different ids without cross-row loss", async () => {
    const a = await recordSessionStart({ question: "a", agentKind: "codex", subprocessLogPath: null });
    const b = await recordSessionStart({ question: "b", agentKind: "codex", subprocessLogPath: null });
    await Promise.all([recordSessionUpdate(a.id, { answer: "A" }), recordSessionUpdate(b.id, { answer: "B" })]);
    const rows = await listSessions();
    expect(rows.find((s) => s.id === a.id)?.answer).toBe("A");
    expect(rows.find((s) => s.id === b.id)?.answer).toBe("B");
  });

  it("merges audit calls by public composite key", async () => {
    const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
    const pending = { ts: 1, tool: "find_clusters", args_shape: { since: "x" }, result_shape: {}, duration_ms: null, status: "pending" as const };
    const ok = { ...pending, result_shape: { cluster_count: 1 }, duration_ms: 5, status: "ok" as const };
    await recordSessionUpdate(s.id, { auditCalls: [pending] });
    await recordSessionUpdate(s.id, { auditCalls: [ok] });
    const row = (await listSessions())[0];
    expect(row.auditCalls).toHaveLength(1);
    expect(row.auditCalls[0]).toMatchObject({ status: "ok", duration_ms: 5 });
  });

  it("does not regress terminal status after a late update", async () => {
    const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
    await recordSessionEnd(s.id, { status: "done" });
    await mergeRowAndWrite(s.id, { status: "running", answer: "late" });
    expect((await listSessions())[0].status).toBe("done");
  });

  it("recordSessionUpdate is field-scoped even if a caller casts extra status", async () => {
    const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
    await recordSessionEnd(s.id, { status: "done" });
    await recordSessionUpdate(s.id, { answer: "final", status: "running" } as unknown as { answer: string });
    const row = (await listSessions())[0];
    expect(row.status).toBe("done");
    expect(row.answer).toBe("final");
  });

  it("final flush ordering writes final answer before terminal end", async () => {
    const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
    await drainInflightWrites(s.id);
    await recordSessionUpdate(s.id, { answer: "complete body" });
    await recordSessionEnd(s.id, { status: "done" });
    const row = (await listSessions())[0];
    expect(row.answer).toBe("complete body");
    expect(row.status).toBe("done");
  });

  it("per-id chain prevents stale in-flight debounce from landing last", async () => {
    const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    local.setItemImpl = async (key, value) => {
      if (typeof value === "string" && value.includes("stale-mid-run")) {
        await held;
      }
      local.store.set(key, value);
    };
    const stale = recordSessionUpdate(s.id, { answer: "stale-mid-run" });
    const final = Promise.all([
      recordSessionUpdate(s.id, { answer: "finalAnswer" }),
      recordSessionEnd(s.id, { status: "done" }),
    ]);
    release();
    await stale;
    await final;
    const row = (await listSessions())[0];
    expect(row.answer).toBe("finalAnswer");
    expect(row.status).toBe("done");
  });

  it("delete policy omits running rows and allows terminal rows", () => {
    expect(canDeleteSession(seedSession({ status: "running" }))).toBe(false);
    expect(canDeleteSession(seedSession({ status: "done" }))).toBe(true);
  });

  it("buckets sessions into today, yesterday, this week, and older", () => {
    const now = new Date("2026-05-20T20:00:00.000Z");
    const buckets = bucketSessions([
      seedSession({ id: "today", startedAt: "2026-05-20T18:00:00.000Z" }),
      seedSession({ id: "yesterday", startedAt: "2026-05-19T18:00:00.000Z" }),
      seedSession({ id: "week", startedAt: "2026-05-18T18:00:00.000Z" }),
      seedSession({ id: "older", startedAt: "2026-05-10T18:00:00.000Z" }),
    ], now);
    expect(buckets.today.map((s) => s.id)).toEqual(["today"]);
    expect(buckets.yesterday.map((s) => s.id)).toEqual(["yesterday"]);
    expect(buckets.thisWeek.map((s) => s.id)).toEqual(["week"]);
    expect(buckets.older.map((s) => s.id)).toEqual(["older"]);
  });
});

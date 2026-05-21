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
  acquireOrAwaitClusterSession,
  bucketSessions,
  buildForkPrompt,
  canDeleteSession,
  deleteSession,
  drainInflightWrites,
  findLatestSessionForCluster,
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

  describe("cluster_id persistence + lookup", () => {
    it("(a) recordSessionStart({ clusterId }) persists; findLatestSessionForCluster finds it", async () => {
      const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-A" });
      const found = await findLatestSessionForCluster("cluster-A");
      expect(found?.id).toBe(s.id);
      expect(found?.clusterId).toBe("cluster-A");
    });

    it("(b) returns the most-recent session when multiple match the same cluster_id", async () => {
      const older = await recordSessionStart({ question: "old", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-B", startedAt: "2026-05-19T18:00:00.000Z" });
      await recordSessionEnd(older.id, { status: "done", completedAt: "2026-05-19T18:01:00.000Z" });
      const newer = await recordSessionStart({ question: "new", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-B", startedAt: "2026-05-19T19:00:00.000Z" });
      await recordSessionEnd(newer.id, { status: "done", completedAt: "2026-05-19T19:01:00.000Z" });
      const found = await findLatestSessionForCluster("cluster-B");
      expect(found?.id).toBe(newer.id);
    });

    it("(c) default status filter excludes errored and cancelled", async () => {
      const erroredS = await recordSessionStart({ question: "e", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-C", startedAt: "2026-05-19T18:00:00.000Z" });
      await recordSessionEnd(erroredS.id, { status: "errored" });
      const cancelledS = await recordSessionStart({ question: "c", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-C", startedAt: "2026-05-19T18:30:00.000Z" });
      await recordSessionEnd(cancelledS.id, { status: "cancelled" });
      expect(await findLatestSessionForCluster("cluster-C")).toBeNull();
      const done = await recordSessionStart({ question: "d", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-C", startedAt: "2026-05-19T19:00:00.000Z" });
      await recordSessionEnd(done.id, { status: "done", completedAt: "2026-05-19T19:01:00.000Z" });
      const found = await findLatestSessionForCluster("cluster-C");
      expect(found?.id).toBe(done.id);
    });

    it("(d) returns null when no session matches", async () => {
      await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null });
      expect(await findLatestSessionForCluster("nonexistent")).toBeNull();
    });

    it("(e) returns null when clusterId is undefined on the call", async () => {
      await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-X" });
      expect(await findLatestSessionForCluster(undefined)).toBeNull();
    });

    it("(f) legacy session without clusterId loads cleanly and is invisible to cluster lookup", async () => {
      const legacy: Omit<Session, "clusterId"> = {
        id: "legacy-row",
        question: "old",
        agentKind: "codex",
        startedAt: "2026-05-19T18:00:00.000Z",
        completedAt: "2026-05-19T18:01:00.000Z",
        status: "done",
        answer: "ok",
        auditCalls: [],
        subprocessLogPath: null,
        sourceBreakdown: {},
        evidenceClusters: [],
        forkedFrom: null,
      };
      local.store.set(sessionRowKey(legacy.id), JSON.stringify(legacy));
      local.store.set("echo.sessions.v1.migrated", "yes");
      resetSessionsModuleForTests();
      const rows = await listSessions();
      expect(rows.find((s) => s.id === "legacy-row")).toBeDefined();
      expect(rows.find((s) => s.id === "legacy-row")?.clusterId).toBeUndefined();
      expect(await findLatestSessionForCluster("anything")).toBeNull();
    });

    it("(g) full lifecycle preserves clusterId through update + end", async () => {
      const s = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-G" });
      await recordSessionUpdate(s.id, { answer: "partial" });
      await recordSessionUpdate(s.id, { answer: "more partial" });
      await recordSessionEnd(s.id, { status: "done" });
      const rows = await listSessions();
      const reloaded = rows.find((r) => r.id === s.id);
      expect(reloaded?.clusterId).toBe("cluster-G");
      expect(reloaded?.status).toBe("done");
      expect(reloaded?.answer).toBe("more partial");
      const found = await findLatestSessionForCluster("cluster-G");
      expect(found?.id).toBe(s.id);
    });
  });

  describe("acquireOrAwaitClusterSession", () => {
    it("collapses same-intent concurrent calls onto a single factory invocation", async () => {
      let factoryCalls = 0;
      let resolveFactory!: (value: { session: Session; source: "existing" | "created" }) => void;
      const factoryPromise = new Promise<{ session: Session; source: "existing" | "created" }>((resolve) => {
        resolveFactory = resolve;
      });
      const factory = () => {
        factoryCalls += 1;
        return factoryPromise;
      };
      const ownerPromise = acquireOrAwaitClusterSession("cluster-S", "default", factory);
      const waiterPromise = acquireOrAwaitClusterSession("cluster-S", "default", factory);
      const fakeSession = {
        id: "ses_fake",
        question: "q",
        agentKind: "codex" as const,
        startedAt: "2026-05-19T18:00:00.000Z",
        completedAt: null,
        status: "running" as const,
        answer: "",
        auditCalls: [],
        subprocessLogPath: null,
        sourceBreakdown: {},
        evidenceClusters: [],
        forkedFrom: null,
        clusterId: "cluster-S",
      };
      resolveFactory({ session: fakeSession, source: "created" });
      const [owner, waiter] = await Promise.all([ownerPromise, waiterPromise]);
      expect(factoryCalls).toBe(1);
      expect(owner.createdByThisCall).toBe(true);
      expect(waiter.createdByThisCall).toBe(false);
      expect(owner.session.id).toBe("ses_fake");
      expect(waiter.session.id).toBe("ses_fake");
      expect(owner.source).toBe("created");
      expect(waiter.source).toBe("created");
    });

    it("different intents for the same cluster proceed in parallel with different keys", async () => {
      let defaultCalls = 0;
      let freshCalls = 0;
      const fakeSession = (id: string, clusterId: string): Session => ({
        id,
        question: "q",
        agentKind: "codex",
        startedAt: "2026-05-19T18:00:00.000Z",
        completedAt: null,
        status: "running",
        answer: "",
        auditCalls: [],
        subprocessLogPath: null,
        sourceBreakdown: {},
        evidenceClusters: [],
        forkedFrom: null,
        clusterId,
      });
      const defaultPromise = acquireOrAwaitClusterSession("cluster-D", "default", async () => {
        defaultCalls += 1;
        return { session: fakeSession("ses_d", "cluster-D"), source: "created" };
      });
      const freshPromise = acquireOrAwaitClusterSession("cluster-D", "fresh", async () => {
        freshCalls += 1;
        return { session: fakeSession("ses_f", "cluster-D"), source: "created" };
      });
      const [defaultOwner, freshOwner] = await Promise.all([defaultPromise, freshPromise]);
      expect(defaultCalls).toBe(1);
      expect(freshCalls).toBe(1);
      expect(defaultOwner.createdByThisCall).toBe(true);
      expect(freshOwner.createdByThisCall).toBe(true);
      expect(defaultOwner.session.id).toBe("ses_d");
      expect(freshOwner.session.id).toBe("ses_f");
    });

    it("after the inflight settles, a subsequent call re-enters factory", async () => {
      let factoryCalls = 0;
      const session = (id: string): Session => ({
        id,
        question: "q",
        agentKind: "codex",
        startedAt: "2026-05-19T18:00:00.000Z",
        completedAt: null,
        status: "running",
        answer: "",
        auditCalls: [],
        subprocessLogPath: null,
        sourceBreakdown: {},
        evidenceClusters: [],
        forkedFrom: null,
        clusterId: "cluster-E",
      });
      await acquireOrAwaitClusterSession("cluster-E", "default", async () => {
        factoryCalls += 1;
        return { session: session("a"), source: "created" };
      });
      await acquireOrAwaitClusterSession("cluster-E", "default", async () => {
        factoryCalls += 1;
        return { session: session("b"), source: "created" };
      });
      expect(factoryCalls).toBe(2);
    });

    it("propagates rejection to both owner and waiter; removes inflight on settle", async () => {
      let factoryCalls = 0;
      let rejectFactory!: (err: Error) => void;
      const factoryPromise = new Promise<{ session: Session; source: "existing" | "created" }>((_, reject) => {
        rejectFactory = reject;
      });
      const factory = () => {
        factoryCalls += 1;
        return factoryPromise;
      };
      const ownerP = acquireOrAwaitClusterSession("cluster-R", "default", factory);
      const waiterP = acquireOrAwaitClusterSession("cluster-R", "default", factory);
      rejectFactory(new Error("boom"));
      await expect(ownerP).rejects.toThrow("boom");
      await expect(waiterP).rejects.toThrow("boom");
      expect(factoryCalls).toBe(1);
      // A subsequent call should re-enter factory.
      let secondCalls = 0;
      const ok: Session = {
        id: "next",
        question: "q",
        agentKind: "codex",
        startedAt: "2026-05-19T18:00:00.000Z",
        completedAt: null,
        status: "running",
        answer: "",
        auditCalls: [],
        subprocessLogPath: null,
        sourceBreakdown: {},
        evidenceClusters: [],
        forkedFrom: null,
        clusterId: "cluster-R",
      };
      const result = await acquireOrAwaitClusterSession("cluster-R", "default", async () => {
        secondCalls += 1;
        return { session: ok, source: "created" };
      });
      expect(secondCalls).toBe(1);
      expect(result.session.id).toBe("next");
    });
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

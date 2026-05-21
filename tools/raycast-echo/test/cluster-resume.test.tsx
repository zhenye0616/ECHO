import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const local = vi.hoisted(() => {
  const store = new Map<string, string | number | boolean>();
  return {
    store,
    setItemImpl: async (key: string, value: string | number | boolean) => {
      store.set(key, value);
    },
  };
});

vi.mock("@raycast/api", async () => {
  const ReactMod = await import("react");
  const make = (name: string) => {
    const fn = (props: Record<string, unknown>) => ReactMod.createElement(name, props, props.children as React.ReactNode);
    Object.defineProperty(fn, "name", { value: name });
    return fn;
  };
  const Action = Object.assign(make("Action"), {
    CopyToClipboard: make("Action.CopyToClipboard"),
    Open: make("Action.Open"),
    Paste: make("Action.Paste"),
    Push: make("Action.Push"),
    Style: { Destructive: "destructive" },
  });
  return {
    Action,
    ActionPanel: Object.assign(make("ActionPanel"), { Section: make("ActionPanel.Section") }),
    Color: { Blue: "blue", Green: "green", Orange: "orange", Purple: "purple", Red: "red", SecondaryText: "secondary" },
    Icon: {
      ArrowDown: "arrow-down",
      Clipboard: "clipboard",
      Code: "code",
      CodeBlock: "code-block",
      Document: "document",
      Dot: "dot",
      Globe: "globe",
      List: "list",
      RotateClockwise: "rotate-clockwise",
      Stars: "stars",
      Terminal: "terminal",
      XMarkCircle: "x",
    },
    LocalStorage: {
      getItem: vi.fn(async (key: string) => local.store.get(key)),
      setItem: vi.fn(async (key: string, value: string | number | boolean) => local.setItemImpl(key, value)),
      removeItem: vi.fn(async (key: string) => { local.store.delete(key); }),
      allItems: vi.fn(async () => Object.fromEntries(local.store.entries())),
    },
    Toast: { Style: { Failure: "failure", Success: "success" } },
    List: Object.assign(make("List"), {
      Section: make("List.Section"),
      Item: Object.assign(make("List.Item"), { Detail: make("List.Item.Detail") }),
      EmptyView: make("List.EmptyView"),
    }),
    Detail: Object.assign(make("Detail"), {
      Metadata: Object.assign(make("Detail.Metadata"), {
        Label: make("Detail.Metadata.Label"),
        Separator: make("Detail.Metadata.Separator"),
        TagList: Object.assign(make("Detail.Metadata.TagList"), {
          Item: make("Detail.Metadata.TagList.Item"),
        }),
      }),
    }),
    showToast: vi.fn(async () => undefined),
  };
});

import {
  acquireOrAwaitClusterSession,
  findLatestSessionForCluster,
  recordSessionEnd,
  recordSessionStart,
  resetSessionsModuleForTests,
  type Session,
} from "../src/lib/sessions";
import { acquireAnswerSessionForCluster } from "../src/components/AnswerView";
import { deriveClusterResumeState } from "../src/echo";
import { allocateSessionLogPath } from "../src/lib/agent-runner";
import type { FindClustersCluster } from "../src/lib/mcp";

// Mock agent-runner so we can spy on startAgent and replace allocateSessionLogPath
// behavior under test.
const startAgentSpy = vi.fn();
const allocateSessionLogPathSpy = vi.fn();
vi.mock("../src/lib/agent-runner", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/agent-runner")>("../src/lib/agent-runner");
  return {
    ...actual,
    probeEchoDaemon: vi.fn(async () => ({ ok: true })),
    findExecutable: vi.fn(async () => true),
    startAgent: (...args: Parameters<typeof actual.startAgent>) => {
      startAgentSpy(...args);
      // Return a stub AgentRun-shaped object so callers don't crash if they
      // touch events / cancel / sessionLogPath. The tests that exercise the
      // owner path do not iterate events.
      return {
        events: (async function* () {})(),
        cancel: vi.fn(),
        sessionLogPath: args[1]?.sessionLogPath ?? "/tmp/fallback.log",
      };
    },
    allocateSessionLogPath: (...args: Parameters<typeof actual.allocateSessionLogPath>) => {
      const path = allocateSessionLogPathSpy(...args);
      return path ?? actual.allocateSessionLogPath(...args);
    },
  };
});

function clusterFixture(overrides: Partial<FindClustersCluster> = {}): FindClustersCluster {
  return {
    cluster_id: "cluster-1",
    label: "Test cluster",
    atom_ids: ["a", "b"],
    rank_reason: [],
    time_range: { from: "2026-05-19T18:00:00.000Z", to: "2026-05-19T18:30:00.000Z" },
    source_breakdown: { codex: 2 },
    ...overrides,
  } as FindClustersCluster;
}

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "ses_test",
    question: "q",
    agentKind: "codex",
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    answer: "",
    auditCalls: [],
    subprocessLogPath: null,
    sourceBreakdown: {},
    evidenceClusters: [],
    forkedFrom: null,
    ...overrides,
  };
}

beforeEach(() => {
  local.store.clear();
  local.setItemImpl = async (key, value) => { local.store.set(key, value); };
  resetSessionsModuleForTests();
  startAgentSpy.mockReset();
  allocateSessionLogPathSpy.mockReset();
});

describe("ClusterRow state derivation (AC2)", () => {
  it("no matching session → primary action 'Ask ECHO about This Cluster', no resume chip", () => {
    const state = deriveClusterResumeState(clusterFixture(), []);
    expect(state.primaryActionTitle).toBe("Ask ECHO about This Cluster");
    expect(state.resumeChip).toBeNull();
  });

  it("done session → primary 'Open Prior Answer', accessory 'Answered <time>'", () => {
    const sessions = [buildSession({ id: "s1", clusterId: "cluster-1", status: "done", completedAt: new Date().toISOString() })];
    const state = deriveClusterResumeState(clusterFixture(), sessions);
    expect(state.primaryActionTitle).toBe("Open Prior Answer");
    expect(state.resumeChip?.text).toMatch(/^Answered /);
  });

  it("running session → primary 'Open Prior Answer' (NOT 'Ask'), accessory 'Running'", () => {
    const sessions = [buildSession({ id: "s1", clusterId: "cluster-1", status: "running" })];
    const state = deriveClusterResumeState(clusterFixture(), sessions);
    expect(state.primaryActionTitle).toBe("Open Prior Answer");
    expect(state.resumeChip?.text).toBe("Running");
  });

  it("errored / cancelled sessions are invisible to resume state", () => {
    const sessions = [
      buildSession({ id: "e", clusterId: "cluster-1", status: "errored" }),
      buildSession({ id: "c", clusterId: "cluster-1", status: "cancelled" }),
    ];
    const state = deriveClusterResumeState(clusterFixture(), sessions);
    expect(state.primaryActionTitle).toBe("Ask ECHO about This Cluster");
    expect(state.resumeChip).toBeNull();
  });

  it("when both done and running exist for the same cluster, newest wins (sessions sorted newest-first)", () => {
    const sessions = [
      buildSession({ id: "running-newer", clusterId: "cluster-1", status: "running", startedAt: "2026-05-19T19:00:00.000Z" }),
      buildSession({ id: "done-older", clusterId: "cluster-1", status: "done", startedAt: "2026-05-19T18:00:00.000Z" }),
    ];
    const state = deriveClusterResumeState(clusterFixture(), sessions);
    expect(state.resumeChip?.text).toBe("Running");
  });
});

describe("acquireAnswerSessionForCluster (AC4 + AC8 startup ordering)", () => {
  it("(2a) no prior session → owner outcome with invocation + pre-allocated subprocessLogPath", async () => {
    allocateSessionLogPathSpy.mockReturnValue("/tmp/preallocated.log");
    const outcome = await acquireAnswerSessionForCluster({
      clusterId: "cluster-1",
      intent: "default",
      query: "test",
      agentKind: "codex",
      preferences: {},
      repoPath: "/tmp",
      forkedFrom: null,
    });
    expect(outcome.kind).toBe("owner");
    if (outcome.kind !== "owner") throw new Error("expected owner");
    expect(outcome.subprocessLogPath).toBe("/tmp/preallocated.log");
    expect(outcome.session.clusterId).toBe("cluster-1");
    expect(outcome.session.subprocessLogPath).toBe("/tmp/preallocated.log");
    expect(allocateSessionLogPathSpy).toHaveBeenCalledTimes(1);
    // The session is now persisted; a second default-intent call should find it via lookup.
    const found = await findLatestSessionForCluster("cluster-1");
    expect(found?.id).toBe(outcome.session.id);
  });

  it("(2b) done prior session → replay outcome; allocateSessionLogPath NOT called", async () => {
    const done = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-1" });
    await recordSessionEnd(done.id, { status: "done" });
    allocateSessionLogPathSpy.mockClear();
    const outcome = await acquireAnswerSessionForCluster({
      clusterId: "cluster-1",
      intent: "default",
      query: "test",
      agentKind: "codex",
      preferences: {},
      repoPath: "/tmp",
      forkedFrom: null,
    });
    expect(outcome.kind).toBe("replay");
    if (outcome.kind !== "replay") throw new Error("expected replay");
    expect(outcome.session.id).toBe(done.id);
    expect(outcome.banner).toMatch(/^_Replayed from session asked /);
    expect(allocateSessionLogPathSpy).not.toHaveBeenCalled();
  });

  it("(2c) running prior session → replay outcome with running banner", async () => {
    const running = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-1" });
    allocateSessionLogPathSpy.mockClear();
    const outcome = await acquireAnswerSessionForCluster({
      clusterId: "cluster-1",
      intent: "default",
      query: "test",
      agentKind: "codex",
      preferences: {},
      repoPath: "/tmp",
      forkedFrom: null,
    });
    expect(outcome.kind).toBe("replay");
    if (outcome.kind !== "replay") throw new Error("expected replay");
    expect(outcome.session.id).toBe(running.id);
    expect(outcome.banner).toMatch(/^_Replayed from in-progress session started /);
    expect(outcome.banner).toMatch(/current answer may continue to grow/);
    expect(allocateSessionLogPathSpy).not.toHaveBeenCalled();
  });

  it("(2d) fresh intent skips lookup even when a done session exists", async () => {
    const done = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "cluster-1" });
    await recordSessionEnd(done.id, { status: "done" });
    allocateSessionLogPathSpy.mockReturnValue("/tmp/fresh.log");
    const outcome = await acquireAnswerSessionForCluster({
      clusterId: "cluster-1",
      intent: "fresh",
      query: "test",
      agentKind: "codex",
      preferences: {},
      repoPath: "/tmp",
      forkedFrom: null,
    });
    expect(outcome.kind).toBe("owner");
    if (outcome.kind !== "owner") throw new Error("expected owner");
    expect(outcome.session.id).not.toBe(done.id);
    expect(outcome.subprocessLogPath).toBe("/tmp/fresh.log");
  });
});

describe("AC8 atomic singleflight composition", () => {
  it("(4a) same-intent collapse, default: factory + lookup + recordSessionStart each called exactly once", async () => {
    let factoryCalls = 0;
    let lookupCalls = 0;
    let recordCalls = 0;
    const factory = async () => {
      factoryCalls += 1;
      lookupCalls += 1; // simulate findLatestSessionForCluster
      // emulate "no prior session" → create
      recordCalls += 1;
      const session = buildSession({ id: `ses-4a-${factoryCalls}`, clusterId: "C4a" });
      return { session, source: "created" as const };
    };
    const [owner, waiter] = await Promise.all([
      acquireOrAwaitClusterSession("C4a", "default", factory),
      acquireOrAwaitClusterSession("C4a", "default", factory),
    ]);
    expect(factoryCalls).toBe(1);
    expect(lookupCalls).toBe(1);
    expect(recordCalls).toBe(1);
    expect(owner.createdByThisCall).toBe(true);
    expect(waiter.createdByThisCall).toBe(false);
    expect(owner.source).toBe("created");
    expect(waiter.source).toBe("created");
  });

  it("(4b) same-intent collapse, fresh: factory + recordSessionStart each called exactly once", async () => {
    let factoryCalls = 0;
    let recordCalls = 0;
    const factory = async () => {
      factoryCalls += 1;
      recordCalls += 1;
      return { session: buildSession({ id: `ses-4b-${factoryCalls}`, clusterId: "C4b" }), source: "created" as const };
    };
    const [owner, waiter] = await Promise.all([
      acquireOrAwaitClusterSession("C4b", "fresh", factory),
      acquireOrAwaitClusterSession("C4b", "fresh", factory),
    ]);
    expect(factoryCalls).toBe(1);
    expect(recordCalls).toBe(1);
    expect(owner.createdByThisCall).toBe(true);
    expect(waiter.createdByThisCall).toBe(false);
  });

  it("(4c) mixed-intent parallel: both factories called exactly once for same cluster", async () => {
    let defaultCalls = 0;
    let freshCalls = 0;
    const factoryDefault = async () => {
      defaultCalls += 1;
      return { session: buildSession({ id: "ses-default", clusterId: "C4c" }), source: "created" as const };
    };
    const factoryFresh = async () => {
      freshCalls += 1;
      return { session: buildSession({ id: "ses-fresh", clusterId: "C4c" }), source: "created" as const };
    };
    const [defaultOwner, freshOwner] = await Promise.all([
      acquireOrAwaitClusterSession("C4c", "default", factoryDefault),
      acquireOrAwaitClusterSession("C4c", "fresh", factoryFresh),
    ]);
    expect(defaultCalls).toBe(1);
    expect(freshCalls).toBe(1);
    expect(defaultOwner.createdByThisCall).toBe(true);
    expect(freshOwner.createdByThisCall).toBe(true);
    expect(defaultOwner.session.id).toBe("ses-default");
    expect(freshOwner.session.id).toBe("ses-fresh");
  });

  it("(4d) default-intent owner with lookup hit: factory called once; source 'existing'; NO recordSessionStart", async () => {
    // Pre-create a running session for the cluster.
    const running = await recordSessionStart({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "C4d" });
    let recordCalls = 0;
    const originalRecordCount = (await import("../src/lib/sessions")).recordSessionStart;
    const wrappedFactory = async () => {
      // simulate the AnswerView factory: lookup first, return existing if hit
      const prior = await findLatestSessionForCluster("C4d", ["running", "done"]);
      if (prior !== null) return { session: prior, source: "existing" as const };
      recordCalls += 1;
      const newSession = await originalRecordCount({ question: "q", agentKind: "codex", subprocessLogPath: null, clusterId: "C4d" });
      return { session: newSession, source: "created" as const };
    };
    const result = await acquireOrAwaitClusterSession("C4d", "default", wrappedFactory);
    expect(result.source).toBe("existing");
    expect(result.createdByThisCall).toBe(true); // owner ran the factory
    expect(result.session.id).toBe(running.id);
    expect(recordCalls).toBe(0); // factory hit the lookup, never called recordSessionStart
  });
});

describe("AC8 log-path pre-allocation contract", () => {
  it("allocateSessionLogPath(invocation) returns a non-empty string under the provided dir", () => {
    const tmp = mkdtempSync(join(tmpdir(), "echo-cluster-resume-"));
    try {
      const invocation = { binary: "codex", args: [], cwd: tmp, stdin: "", env: {} };
      const path = allocateSessionLogPath(invocation, tmp);
      expect(path.length).toBeGreaterThan(0);
      expect(path.startsWith(tmp)).toBe(true);
      expect(path.endsWith(".log")).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("two calls produce two distinct paths (no determinism claim across calls)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "echo-cluster-resume-"));
    try {
      const invocation = { binary: "codex", args: [], cwd: tmp, stdin: "", env: {} };
      const p1 = allocateSessionLogPath(invocation, tmp);
      // Burn a microsecond so the timestamp moves.
      const start = Date.now();
      while (Date.now() === start) {/* spin until next ms */}
      const p2 = allocateSessionLogPath(invocation, tmp);
      expect(p1).not.toBe(p2);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

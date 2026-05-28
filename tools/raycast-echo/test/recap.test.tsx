import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import packageJson from "../package.json";
import { LocalStorage } from "@raycast/api";
import {
  RecapStartupError,
  expandHome,
  prepareRecapRun,
  resolveRepoPath,
  startRecapAgent,
} from "../src/recap";
import { InvalidSinceInputError } from "../src/lib/since-resolver";
import type { Session } from "../src/lib/sessions";

const runner = vi.hoisted(() => ({
  startAgent: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../src/lib/agent-runner", () => ({
  findExecutable: vi.fn(async () => true),
  startAgent: runner.startAgent,
}));

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "ses_test",
    question: "q",
    agentKind: "codex",
    startedAt: "2026-05-27T20:00:00.000Z",
    completedAt: "2026-05-27T21:00:00.000Z",
    status: "done",
    answer: "",
    auditCalls: [],
    subprocessLogPath: null,
    sourceBreakdown: {},
    evidenceClusters: [],
    forkedFrom: null,
    ...overrides,
  };
}

describe("Recap command helpers", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "echo-recap-repo-"));
    mkdirSync(join(repoDir, ".git"));
    runner.cancel.mockReset();
    runner.startAgent.mockReset();
    runner.startAgent.mockReturnValue({
      events: (async function* () {})(),
      cancel: runner.cancel,
      sessionLogPath: null,
    });
    (LocalStorage as unknown as { __clear: () => void }).__clear();
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("Form-submit preparation constructs a prompt with the resolved since interpolated", () => {
    const prepared = prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "codex" },
      values: { since: "2026-05-27T23:00:00-07:00", windowPref: "last_session" },
      sessions: [],
      nowMs: Date.parse("2026-05-28T07:00:00.000Z"),
    });
    expect(prepared.resolvedSince).toEqual({ sinceIso: "2026-05-28T06:00:00.000Z", source: "user" });
    expect(prepared.prompt).toContain("since 2026-05-28T06:00:00.000Z");
    expect(prepared.prompt).toContain(`repo ${repoDir}`);
    expect(prepared.prompt).not.toContain("<SINCE_ISO>");
  });

  it("agent-profile selection honors preferences.agentKind", () => {
    const prepared = prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "claude", claudeOauthToken: "token" },
      values: { windowPref: "24h" },
      sessions: [],
      nowMs: Date.parse("2026-05-28T07:00:00.000Z"),
    });
    expect(prepared.agentKind).toBe("claude");
    expect(prepared.invocation.binary).toBe("claude");
    expect(prepared.invocation.cwd).toBe(repoDir);
    expect(prepared.invocation.env).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: "token" });
  });

  it("custom-agent recap spawn receives prompt on stdin and cwd set to repoPath", () => {
    const prepared = prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "custom", customCommand: "my-agent --flag" },
      values: { windowPref: "24h" },
      sessions: [],
      nowMs: Date.parse("2026-05-28T07:00:00.000Z"),
    });
    expect(prepared.invocation).toMatchObject({
      binary: "my-agent",
      args: ["--flag"],
      cwd: repoDir,
    });
    expect(prepared.invocation.stdin).toContain("You are Recap");
  });

  it("startRecapAgent uses a 30s max runtime, disables session logs, and exposes cancellation", () => {
    const prepared = prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "codex" },
      values: { windowPref: "4h" },
      sessions: [],
    });
    const run = startRecapAgent(prepared.invocation);
    run.cancel();
    expect(runner.startAgent).toHaveBeenCalledWith(prepared.invocation, {
      maxRuntimeMs: 30_000,
      sessionLogEnabled: false,
    });
    expect(runner.cancel).toHaveBeenCalledTimes(1);
  });

  it("package.json recap command duplicates agent prefs and adds defaultSinceWindow", () => {
    const recap = packageJson.commands.find((command) => command.name === "recap");
    expect(recap).toBeDefined();
    expect(recap?.mode).toBe("view");
    const names = recap?.preferences?.map((pref) => pref.name) ?? [];
    expect(names).toEqual(["agentKind", "customCommand", "repoPath", "claudeOauthToken", "defaultSinceWindow"]);
  });

  it("invalid user input throws before any agent can be started", () => {
    expect(() => prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "codex" },
      values: { since: "last night", windowPref: "last_session" },
      sessions: [session()],
    })).toThrow(InvalidSinceInputError);
    expect(runner.startAgent).not.toHaveBeenCalled();
  });

  it("does not write Ask ECHO LocalStorage session rows during preparation or start", async () => {
    const setItem = vi.spyOn(LocalStorage, "setItem");
    const prepared = prepareRecapRun({
      preferences: { repoPath: repoDir, agentKind: "codex" },
      values: { windowPref: "24h" },
      sessions: [session()],
    });
    startRecapAgent(prepared.invocation);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("home-expands repoPath before prompt construction", () => {
    const home = expandHome("~/Desktop/Project_echo");
    expect(home).toMatch(/\/Desktop\/Project_echo$/);
    expect(home).not.toContain("~");
  });

  it("rejects nonexistent repo paths before spawn", () => {
    expect(() => resolveRepoPath(join(repoDir, "missing"))).toThrow(RecapStartupError);
  });

  it("rejects non-git directories before spawn", () => {
    const nonGit = mkdtempSync(join(tmpdir(), "echo-recap-nongit-"));
    try {
      expect(() => resolveRepoPath(nonGit)).toThrow(/not a git repo/);
    } finally {
      rmSync(nonGit, { recursive: true, force: true });
    }
  });
});

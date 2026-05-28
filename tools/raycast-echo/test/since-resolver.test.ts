import { describe, expect, it } from "vitest";
import {
  InvalidSinceInputError,
  resolveSinceWindow,
} from "../src/lib/since-resolver";
import { buildRecapPrompt } from "../src/lib/recap-system-prompt";
import type { Session } from "../src/lib/sessions";

const NOW = Date.parse("2026-05-28T07:00:00.000Z");

function session(overrides: Partial<Session>): Session {
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

describe("resolveSinceWindow", () => {
  it("user-input valid ISO wins", () => {
    expect(resolveSinceWindow("2026-05-27T23:00:00Z", "last_session", [], NOW)).toEqual({
      sinceIso: "2026-05-27T23:00:00.000Z",
      source: "user",
    });
  });

  it("user-input non-empty invalid throws", () => {
    expect(() => resolveSinceWindow("yesterday", "last_session", [], NOW)).toThrow(InvalidSinceInputError);
  });

  it("accepts negative-offset PDT-shaped ISO input", () => {
    expect(resolveSinceWindow("2026-05-27T23:00:00-07:00", "last_session", [], NOW)).toEqual({
      sinceIso: "2026-05-28T06:00:00.000Z",
      source: "user",
    });
  });

  it("last_session uses the newest done session completedAt", () => {
    const resolved = resolveSinceWindow("", "last_session", [
      session({ id: "older", completedAt: "2026-05-27T18:00:00.000Z" }),
      session({ id: "newer", completedAt: "2026-05-27T22:00:00.000Z" }),
    ], NOW);
    expect(resolved).toEqual({ sinceIso: "2026-05-27T22:00:00.000Z", source: "last_session" });
  });

  it("last_session falls back to startedAt when completedAt is null", () => {
    const resolved = resolveSinceWindow("", "last_session", [
      session({ completedAt: null, startedAt: "2026-05-27T19:30:00.000Z" }),
    ], NOW);
    expect(resolved).toEqual({ sinceIso: "2026-05-27T19:30:00.000Z", source: "last_session" });
  });

  it("running sessions do not qualify for last_session", () => {
    expect(resolveSinceWindow("", "last_session", [
      session({ status: "running", completedAt: null, startedAt: "2026-05-28T06:30:00.000Z" }),
    ], NOW)).toEqual({ sinceIso: "2026-05-27T07:00:00.000Z", source: "fallback_24h" });
  });

  it("zero sessions falls back to 24h", () => {
    expect(resolveSinceWindow("", "last_session", [], NOW)).toEqual({
      sinceIso: "2026-05-27T07:00:00.000Z",
      source: "fallback_24h",
    });
  });

  it("explicit 24h window is distinct from fallback", () => {
    expect(resolveSinceWindow("", "24h", [session({})], NOW)).toEqual({
      sinceIso: "2026-05-27T07:00:00.000Z",
      source: "window_24h",
    });
  });

  it("explicit 4h window is distinct from fallback", () => {
    expect(resolveSinceWindow("", "4h", [session({})], NOW)).toEqual({
      sinceIso: "2026-05-28T03:00:00.000Z",
      source: "window_4h",
    });
  });

  it("cancelled sessions are skipped in favor of older done sessions", () => {
    expect(resolveSinceWindow("", "last_session", [
      session({ id: "cancelled", status: "cancelled", completedAt: "2026-05-28T06:30:00.000Z" }),
      session({ id: "done", completedAt: "2026-05-27T21:15:00.000Z" }),
    ], NOW)).toEqual({ sinceIso: "2026-05-27T21:15:00.000Z", source: "last_session" });
  });

  it("errored sessions are skipped in favor of fallback when no done session exists", () => {
    expect(resolveSinceWindow("", "last_session", [
      session({ id: "errored", status: "errored", completedAt: "2026-05-28T06:30:00.000Z" }),
    ], NOW)).toEqual({ sinceIso: "2026-05-27T07:00:00.000Z", source: "fallback_24h" });
  });

  it("buildRecapPrompt rejects relative repo paths", () => {
    expect(() => buildRecapPrompt({ sinceIso: "2026-05-28T00:00:00.000Z", repoPath: "relative/path" })).toThrow(
      /absolute/,
    );
  });

  it("buildRecapPrompt fully substitutes canonical placeholders", () => {
    const prompt = buildRecapPrompt({ sinceIso: "2026-05-28T00:00:00.000Z", repoPath: "/Users/test/repo" });
    expect(prompt).not.toContain("<SINCE_ISO>");
    expect(prompt).not.toContain("<REPO_PATH>");
    expect(prompt).not.toContain("${SINCE_ISO}");
    expect(prompt).not.toContain("${REPO_ROOT}");
    expect(prompt).toContain("/Users/test/repo");
  });

  it("all resolver ISO outputs use UTC Z", () => {
    expect(resolveSinceWindow("", "4h", [], NOW).sinceIso.endsWith("Z")).toBe(true);
  });
});

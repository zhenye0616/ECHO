import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => {
  const make = (name: string) => {
    const fn = (props: Record<string, unknown>) => React.createElement(name, props, props.children as React.ReactNode);
    Object.defineProperty(fn, "name", { value: name });
    return fn;
  };
  const Action = Object.assign(make("Action"), {
    CopyToClipboard: make("Action.CopyToClipboard"),
    Open: make("Action.Open"),
    Push: make("Action.Push"),
    Style: { Destructive: "destructive" },
  });
  const Detail = Object.assign(make("Detail"), {
    Metadata: Object.assign(make("Detail.Metadata"), {
      Label: make("Detail.Metadata.Label"),
      Separator: make("Detail.Metadata.Separator"),
      TagList: Object.assign(make("Detail.Metadata.TagList"), {
        Item: make("Detail.Metadata.TagList.Item"),
      }),
    }),
  });
  return {
    Action,
    ActionPanel: Object.assign(make("ActionPanel"), { Section: make("ActionPanel.Section") }),
    Alert: { ActionStyle: { Destructive: "destructive" } },
    Color: { Blue: "blue", Green: "green", Orange: "orange", Red: "red", SecondaryText: "secondary" },
    Detail,
    Icon: { Code: "code", Document: "doc", Globe: "globe", List: "list", Plus: "plus", RotateClockwise: "rot", Stars: "stars", Text: "text", Clipboard: "clip" },
    Toast: { Style: { Failure: "failure", Success: "success" } },
    confirmAlert: vi.fn(async () => true),
    showToast: vi.fn(async () => undefined),
    useNavigation: () => ({ push: vi.fn() }),
  };
});

import { buildForkPrompt, canDeleteSession, type Session } from "../src/lib/sessions";
import { getSessionLogState, sessionMarkdown, SessionDetail } from "../src/components/SessionDetail";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    question: "What shipped?",
    agentKind: "codex",
    startedAt: "2026-05-19T18:00:00.000Z",
    completedAt: "2026-05-19T18:01:00.000Z",
    status: "done",
    answer: "Answer body",
    auditCalls: [{ ts: 1, tool: "find_clusters", args_shape: {}, result_shape: { cluster_count: 1 }, duration_ms: 2, status: "ok" }],
    subprocessLogPath: null,
    sourceBreakdown: {},
    evidenceClusters: [],
    forkedFrom: null,
    ...overrides,
  };
}

function collectTitles(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(collectTitles);
  if (!React.isValidElement(node)) return [];
  const props = node.props as Record<string, unknown>;
  return [
    typeof props.title === "string" ? props.title : "",
    ...collectTitles(props.children),
    ...collectTitles(props.actions),
    ...collectTitles(props.metadata),
  ].filter(Boolean);
}

describe("SessionDetail", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "echo-session-detail-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renders full answer markdown", () => {
    expect(sessionMarkdown(session())).toContain("Answer body");
    expect(sessionMarkdown(session())).toContain("Audit window may include unrelated MCP calls");
  });

  it("surfaces the null log-path fallback", () => {
    expect(getSessionLogState(null)).toMatchObject({ openable: false, label: "Log unavailable - agent-runner emitted no path" });
  });

  it("surfaces ENOENT fallback without throwing", () => {
    const missing = join(dir, "missing.log");
    const state = getSessionLogState(missing);
    expect(state.openable).toBe(false);
    expect(state.label).toContain(missing);
    expect(state.label).toContain("ENOENT");
  });

  it("marks an existing log as openable", () => {
    const path = join(dir, "run.log");
    writeFileSync(path, "hello");
    expect(getSessionLogState(path)).toMatchObject({ openable: true, path });
  });

  it("action panel includes the primary launch and fork actions", () => {
    const path = join(dir, "run.log");
    writeFileSync(path, "hello");
    const el = SessionDetail({ session: session({ subprocessLogPath: path }), onFork: vi.fn(), onNewAsk: vi.fn(), onOpenSessions: vi.fn() });
    const titles = collectTitles(el);
    expect(titles).toEqual(expect.arrayContaining(["Open in Cursor", "Send to Claude.ai", "Send to ChatGPT", "Copy Packet", "Ask Again from This", "New Ask", "Open Log", "Tail Log"]));
  });

  it("omits open/tail actions when the log is unavailable", () => {
    const el = SessionDetail({ session: session({ subprocessLogPath: null }), onFork: vi.fn(), onNewAsk: vi.fn(), onOpenSessions: vi.fn() });
    const titles = collectTitles(el);
    expect(titles).not.toContain("Open Log");
    expect(titles).not.toContain("Tail Log");
  });

  it("fork prompt creates a new prompt without mutating the source", () => {
    const source = session({ id: "source", question: "What shipped?", answer: "Old answer" });
    const prompt = buildForkPrompt(source, "What shipped? expand the details");
    expect(prompt).toContain("Follow-up:\nexpand the details");
    expect(source.forkedFrom).toBeNull();
  });

  it("delete action policy is omitted for running rows", () => {
    expect(canDeleteSession(session({ status: "running" }))).toBe(false);
    expect(canDeleteSession(session({ status: "done" }))).toBe(true);
  });
});

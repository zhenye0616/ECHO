import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SessionListRow } from "../src/components/SessionsList";
import type { Session } from "../src/lib/sessions";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s1",
    question: "What shipped?",
    agentKind: "codex",
    startedAt: "2026-05-19T18:00:00.000Z",
    completedAt: "2026-05-19T18:01:00.000Z",
    status: "done",
    answer: "Answer body",
    auditCalls: [],
    subprocessLogPath: null,
    sourceBreakdown: {},
    evidenceClusters: [],
    forkedFrom: null,
    ...overrides,
  };
}

function titles(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(titles);
  if (!React.isValidElement(node)) return [];
  const props = node.props as Record<string, unknown>;
  return [
    typeof props.title === "string" ? props.title : "",
    ...titles(props.children),
    ...titles(props.actions),
  ].filter(Boolean);
}

function rowTitles(status: Session["status"]): string[] {
  return titles(
    SessionListRow({
      session: session({ status }),
      onForkSession: vi.fn(),
      onNewAsk: vi.fn(),
      onOpenSessions: vi.fn(),
      deleteSession: vi.fn(async () => undefined),
    }),
  );
}

describe("SessionsList", () => {
  it("omits delete for running sessions", () => {
    expect(rowTitles("running")).not.toContain("Delete Session");
  });

  it("shows delete for terminal and historical sessions", () => {
    for (const status of ["done", "cancelled", "errored", "historical"] as const) {
      expect(rowTitles(status)).toContain("Delete Session");
    }
  });
});

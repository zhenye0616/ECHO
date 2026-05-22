import React from "react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, pickHero } from "../src/components/EmptyState";
import type { FindClustersCluster } from "../src/lib/mcp";
import type { Session } from "../src/lib/sessions";

const NOW = Date.parse("2026-05-22T20:00:00.000Z");

function clusterFixture(overrides: Partial<FindClustersCluster> = {}): FindClustersCluster {
  return {
    cluster_id: "cluster-1",
    label: "Hero work",
    atom_ids: ["a1"],
    rank_reason: ["has_unresolved_open_loop", "code_session_anchor"],
    time_range: { from: "2026-05-22T19:00:00.000Z", to: "2026-05-22T19:30:00.000Z" },
    source_breakdown: { codex: 1 },
    open_loop_hints: [{ atom_id: "a1", resolved: false }],
    ...overrides,
  };
}

function sessionFixture(overrides: Partial<Session> = {}): Session {
  return {
    id: "ses_test",
    question: "q",
    agentKind: "codex",
    startedAt: "2026-05-22T19:00:00.000Z",
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

function renderEmptyState(input: {
  clusters?: readonly FindClustersCluster[];
  sessions?: readonly Session[];
  renderHeroCluster?: (cluster: FindClustersCluster, linkedSession: Session | null) => React.ReactNode;
}) {
  return EmptyState({
    query: "",
    setQuery: vi.fn(),
    clusters: input.clusters ?? [],
    isLoading: false,
    sessions: input.sessions ?? [],
    renderHeroCluster: input.renderHeroCluster ?? (() => React.createElement("HeroCluster")),
    onOpenSession: vi.fn(),
    onOpenSessions: vi.fn(),
    onForkSession: vi.fn(),
    showDetail: false,
  }) as React.ReactElement<{ children?: React.ReactNode }>;
}

function sectionTitles(element: React.ReactElement<{ children?: React.ReactNode }>): string[] {
  return React.Children.toArray(element.props.children)
    .filter(React.isValidElement)
    .filter((child) => {
      const type = child.type as { name?: string };
      return type.name === "List.Section";
    })
    .map((child) => (child.props as { title?: string }).title ?? "");
}

describe("pickHero", () => {
  it("running session wins over a high-confidence cluster", () => {
    const running = sessionFixture({ id: "running", status: "running" });
    const pick = pickHero([clusterFixture()], [running], NOW);
    expect(pick).toEqual({ kind: "running", session: running });

    const renderHeroCluster = vi.fn(() => React.createElement("HeroCluster"));
    const element = renderEmptyState({ clusters: [clusterFixture()], sessions: [running], renderHeroCluster });
    expect(sectionTitles(element)).toContain("Continue");
    expect(renderHeroCluster).not.toHaveBeenCalled();
  });

  it("cluster hero fires when unresolved, fresh, and substrate-anchored", () => {
    const cluster = clusterFixture();
    const pick = pickHero([cluster], [], NOW);
    expect(pick).toEqual({ kind: "cluster", cluster, linkedSession: null });

    const renderHeroCluster = vi.fn(() => React.createElement("HeroCluster"));
    renderEmptyState({ clusters: [cluster], renderHeroCluster });
    expect(renderHeroCluster).toHaveBeenCalledWith(cluster, null);
  });

  it("does not fire when the top cluster is older than 18h", () => {
    const stale = clusterFixture({
      time_range: { from: "2026-05-21T23:00:00.000Z", to: "2026-05-22T00:00:00.000Z" },
    });
    expect(pickHero([stale], [], NOW)).toBeNull();
  });

  it("does not fire when the top cluster is fresh and unresolved but unanchored", () => {
    const unanchored = clusterFixture({ rank_reason: ["has_unresolved_open_loop"] });
    const element = renderEmptyState({ clusters: [unanchored] });
    expect(pickHero([unanchored], [], NOW)).toBeNull();
    expect(sectionTitles(element)).not.toContain("Continue");
    expect(sectionTitles(element)).not.toContain("Open loops · Today");
  });

  it("fires through the Raycast-side linked-session anchor fallback", () => {
    const cluster = clusterFixture({ rank_reason: ["has_unresolved_open_loop"] });
    const linked = sessionFixture({ id: "done-linked", status: "done", completedAt: "2026-05-22T19:30:00.000Z", clusterId: cluster.cluster_id });
    expect(pickHero([cluster], [linked], NOW)).toEqual({ kind: "cluster", cluster, linkedSession: linked });
  });

  it("does not treat a lone done warm session as a Continue hero", () => {
    const done = sessionFixture({ id: "done", status: "done", completedAt: "2026-05-22T19:30:00.000Z" });
    const failingTop = clusterFixture({ rank_reason: [] });
    expect(pickHero([failingTop], [done], NOW)).toBeNull();
  });
});

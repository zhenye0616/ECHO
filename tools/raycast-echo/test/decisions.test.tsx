import React from "react";
import { LocalStorage } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";
import {
  DecisionList,
  decisionAccessories,
  decisionMarkdown,
  openDecisionSource,
  sourceWarnings,
  startDecisionPolling,
} from "../src/decisions";
import { EchoDaemonError, type DecisionCard, type PendingDecisionsResult } from "../src/lib/mcp";

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    id: "item#r4",
    title: "078 - Decision Card Board",
    decision: "Decide whether to claim this item.",
    whyNow: "r4 - proceed - 4 blind rounds",
    options: ["proceed_after_patches", "pushback", "more rounds"],
    default: "proceed",
    blocking: ["ready/2026-05-28-078-decision-card-board"],
    agents: ["codex", "codex-ops"],
    sources: [
      { label: "Combined review", href: "/repo/backlog/reviews/item/r4/combined.md" },
      { label: "Backlog item", href: "/repo/backlog/ready/item.md" },
    ],
    signals: [],
    ...overrides,
  };
}

function result(decisions: DecisionCard[]): PendingDecisionsResult {
  return {
    decisions,
    source_breakdown: { active_items: decisions.length, review_rounds: decisions.length, decisions: decisions.length },
    source_state: {
      local_head: "local",
      upstream_head: "upstream",
      behind: 0,
      upstream_checked_at: "2026-05-29T00:00:00.000Z",
      upstream_stale: false,
      dirty: false,
      scanned_items: decisions.length,
      partial: false,
    },
  };
}

function collectElements(element: React.ReactNode, typeName: string): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  function visit(node: React.ReactNode): void {
    for (const child of React.Children.toArray(node)) {
      if (!React.isValidElement(child)) continue;
      const type = child.type as { name?: string };
      if (type.name === typeName) out.push(child);
      visit((child.props as { children?: React.ReactNode }).children);
    }
  }
  visit(element);
  return out;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("DecisionList", () => {
  it("renders one row per card", () => {
    const tree = DecisionList({ result: result([card({ id: "a", title: "A" }), card({ id: "b", title: "B" })]), isLoading: false, error: null });
    const titles = collectElements(tree, "List.Item").map((item) => (item.props as { title?: string }).title);
    expect(titles).toContain("A");
    expect(titles).toContain("B");
  });

  it("shows an A1 accessory on alarm cards", () => {
    const alarm = card({ signals: [{ kind: "runaway_churn", detail: "churned 7 rounds without pulling you in" }] });
    expect(decisionAccessories(alarm)[0]).toMatchObject({
      text: "A1",
      tooltip: "churned 7 rounds without pulling you in",
    });
  });

  it("renders stale, dirty, behind, and partial warnings", () => {
    const state = {
      ...result([]).source_state,
      behind: 2,
      upstream_stale: true,
      dirty: true,
      partial: true,
    };
    expect(sourceWarnings(state)).toEqual(expect.arrayContaining([
      "source 2 commits behind origin",
      "backlog has uncommitted changes",
      "scan partial",
    ]));
  });

  it("SEE+JUMP opens the selected source target and does not write LocalStorage", async () => {
    const setItem = vi.spyOn(LocalStorage, "setItem");
    const opener = vi.fn(async () => undefined);
    await openDecisionSource(card().sources[0]!, opener);
    expect(opener).toHaveBeenCalledWith("/repo/backlog/reviews/item/r4/combined.md");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("detail markdown includes decision, options, default, signals, and sources", () => {
    const markdown = decisionMarkdown(card({ signals: [{ kind: "runaway_churn", detail: "churned 4 rounds without pulling you in" }] }));
    expect(markdown).toContain("**Decision:** Decide whether to claim this item.");
    expect(markdown).toContain("- proceed_after_patches");
    expect(markdown).toContain("**Default:** proceed");
    expect(markdown).toContain("runaway_churn: churned 4 rounds without pulling you in");
    expect(markdown).toContain("[Combined review](/repo/backlog/reviews/item/r4/combined.md)");
  });
});

describe("startDecisionPolling", () => {
  it("single-flights reads and suppresses late results after stop", async () => {
    const first = deferred<PendingDecisionsResult>();
    const second = deferred<PendingDecisionsResult>();
    const load = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const onResult = vi.fn();
    const onError = vi.fn();
    let intervalFn: (() => void) | null = null;
    let cleared = false;
    const timers = {
      setInterval: (fn: () => void) => {
        intervalFn = fn;
        return 1;
      },
      clearInterval: () => {
        cleared = true;
      },
      now: () => 1_000,
    };

    const poller = startDecisionPolling({ load, onResult, onError, timers });
    expect(load).toHaveBeenCalledTimes(1);
    poller.tick();
    const runInterval = intervalFn;
    expect(runInterval).not.toBeNull();
    (runInterval as unknown as () => void)();
    expect(load).toHaveBeenCalledTimes(1);

    first.resolve(result([card()]));
    await Promise.resolve();
    await Promise.resolve();
    expect(onResult).toHaveBeenCalledTimes(1);

    poller.tick();
    expect(load).toHaveBeenCalledTimes(2);
    poller.stop();
    expect(cleared).toBe(true);
    second.resolve(result([card({ id: "late" })]));
    await Promise.resolve();
    await Promise.resolve();
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("backs off daemon-unreachable errors", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new EchoDaemonError())
      .mockResolvedValueOnce(result([]));
    const onResult = vi.fn();
    const onError = vi.fn();
    let now = 1_000;
    const timers = {
      setInterval: () => 1,
      clearInterval: () => undefined,
      now: () => now,
    };

    const poller = startDecisionPolling({ load, onResult, onError, timers, backoffMs: 10_000 });
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    poller.tick();
    expect(load).toHaveBeenCalledTimes(1);
    now = 12_000;
    poller.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledTimes(1);
    poller.stop();
  });
});

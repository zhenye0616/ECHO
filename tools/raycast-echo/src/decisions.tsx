import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { homedir } from "node:os";
import { useEffect, useState } from "react";
import {
  EchoDaemonError,
  pendingDecisions,
  type DecisionCard,
  type PendingDecisionsResult,
  type PendingDecisionsSourceState,
} from "./lib/mcp";

const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";
export const DECISIONS_POLL_INTERVAL_MS = 5_000;
export const DECISIONS_BACKOFF_MS = 15_000;

interface DecisionsPreferences {
  repoPath?: string;
}

interface DecisionPollerTimers {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  now: () => number;
}

export interface DecisionPollerOptions {
  load: () => Promise<PendingDecisionsResult>;
  onResult: (result: PendingDecisionsResult) => void;
  onError: (err: unknown) => void;
  intervalMs?: number;
  backoffMs?: number;
  timers?: DecisionPollerTimers;
}

export interface DecisionPollerHandle {
  stop: () => void;
  tick: () => void;
}

export default function DecisionsBoard() {
  const preferences = getPreferenceValues<DecisionsPreferences>();
  const repoPath = expandHome(preferences.repoPath ?? DEFAULT_REPO_PATH);
  const { result, isLoading, error } = usePendingDecisions(repoPath);
  return <DecisionList result={result} isLoading={isLoading} error={error} />;
}

function usePendingDecisions(repoPath: string): {
  result: PendingDecisionsResult | null;
  isLoading: boolean;
  error: string | null;
} {
  const [result, setResult] = useState<PendingDecisionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const poller = startDecisionPolling({
      load: () => pendingDecisions(repoPath),
      onResult: (next) => {
        setResult(next);
        setError(null);
        setIsLoading(false);
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
        if (err instanceof EchoDaemonError) {
          void showToast({
            style: Toast.Style.Failure,
            title: "ECHO daemon unreachable",
            message: "Decision cards will retry automatically",
          });
        }
      },
    });
    return () => poller.stop();
  }, [repoPath]);

  return { result, isLoading, error };
}

export function startDecisionPolling(options: DecisionPollerOptions): DecisionPollerHandle {
  const timers = options.timers ?? {
    setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
    clearInterval: (handle: unknown) => globalThis.clearInterval(handle as ReturnType<typeof globalThis.setInterval>),
    now: Date.now,
  };
  const intervalMs = options.intervalMs ?? DECISIONS_POLL_INTERVAL_MS;
  const backoffMs = options.backoffMs ?? DECISIONS_BACKOFF_MS;
  let stopped = false;
  let inFlight = false;
  let backoffUntil = 0;

  const tick = () => {
    if (stopped || inFlight || timers.now() < backoffUntil) return;
    inFlight = true;
    void options.load()
      .then((result) => {
        inFlight = false;
        if (stopped) return;
        backoffUntil = 0;
        options.onResult(result);
      })
      .catch((err: unknown) => {
        inFlight = false;
        if (stopped) return;
        if (err instanceof EchoDaemonError) backoffUntil = timers.now() + backoffMs;
        options.onError(err);
      });
  };

  tick();
  const interval = timers.setInterval(tick, intervalMs);
  return {
    stop: () => {
      stopped = true;
      timers.clearInterval(interval);
    },
    tick,
  };
}

export function DecisionList({
  result,
  isLoading,
  error,
}: {
  result: PendingDecisionsResult | null;
  isLoading: boolean;
  error: string | null;
}) {
  const warnings = result === null ? [] : sourceWarnings(result.source_state);
  if (error !== null) warnings.unshift(error);
  const decisions = result?.decisions ?? [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter decisions">
      {warnings.length > 0 ? (
        <List.Section title="Source warnings">
          {warnings.map((warning) => (
            <List.Item key={warning} icon={{ source: Icon.Dot, tintColor: Color.Orange }} title={warning} />
          ))}
        </List.Section>
      ) : null}
      <List.Section title="Pending decisions">
        {decisions.length > 0 ? (
          decisions.map((card) => renderDecisionRow(card))
        ) : (
          <List.Item title="No pending decisions" icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
        )}
      </List.Section>
    </List>
  );
}

function renderDecisionRow(card: DecisionCard) {
  return (
    <List.Item
      key={card.id}
      icon={{ source: Icon.Document, tintColor: card.signals.length > 0 ? Color.Orange : Color.Blue }}
      title={card.title}
      subtitle={card.whyNow}
      accessories={decisionAccessories(card)}
      detail={<List.Item.Detail markdown={decisionMarkdown(card)} />}
      actions={<DecisionActions card={card} />}
    />
  );
}

function DecisionActions({ card }: { card: DecisionCard }) {
  return (
    <ActionPanel>
      {card.sources.map((source) => (
        <Action
          key={`${card.id}:${source.label}`}
          title={`Open ${source.label}`}
          icon={Icon.Document}
          onAction={() => {
            void openDecisionSource(source);
          }}
        />
      ))}
    </ActionPanel>
  );
}

export async function openDecisionSource(
  source: { label: string; href: string },
  opener: (target: string) => Promise<void> = open,
): Promise<void> {
  await opener(source.href);
}

export function decisionAccessories(card: DecisionCard): { text: string; tooltip?: string; icon?: { source: Icon; tintColor: Color } }[] {
  const accessories: { text: string; tooltip?: string; icon?: { source: Icon; tintColor: Color } }[] = [];
  if (card.signals.length > 0) {
    accessories.push({
      text: "A1",
      tooltip: card.signals.map((signal) => signal.detail).join("; "),
      icon: { source: Icon.Dot, tintColor: Color.Orange },
    });
  }
  if (card.agents.length > 0) {
    accessories.push({ text: card.agents.join("+") });
  }
  return accessories;
}

export function decisionMarkdown(card: DecisionCard): string {
  const lines: string[] = [`# ${card.title}`, '', `**Decision:** ${card.decision}`, '', `**Why now:** ${card.whyNow}`];
  lines.push('', `**Default:** ${card.default}`);
  if (card.options.length > 0) {
    lines.push('', '**Options**', '', ...card.options.map((option) => `- ${option}`));
  }
  if (card.deadline !== undefined) lines.push('', `**Deadline:** ${card.deadline}`);
  if ((card.blocking ?? []).length > 0) {
    lines.push('', '**Blocking**', '', ...(card.blocking ?? []).map((entry) => `- ${entry}`));
  }
  if (card.agents.length > 0) {
    lines.push('', '**Agents**', '', ...card.agents.map((agent) => `- ${agent}`));
  }
  if (card.signals.length > 0) {
    lines.push('', '**Signals**', '', ...card.signals.map((signal) => `- ${signal.kind}: ${signal.detail}`));
  }
  lines.push('', '**Sources**', '', ...card.sources.map((source) => `- [${source.label}](${source.href})`));
  return lines.join('\n');
}

export function sourceWarnings(state: PendingDecisionsSourceState): string[] {
  const warnings: string[] = [];
  if (state.behind > 0) {
    warnings.push(`source ${state.behind} commit${state.behind === 1 ? '' : 's'} behind origin`);
  }
  if (state.upstream_stale) {
    warnings.push(state.upstream_checked_at === null
      ? 'remote never seen - may be stale'
      : `remote last seen ${formatAge(Date.parse(state.upstream_checked_at), Date.now())} ago - may be stale`);
  }
  if (state.dirty) warnings.push('backlog has uncommitted changes');
  if (state.partial) warnings.push('scan partial');
  return warnings;
}

function formatAge(thenMs: number, nowMs: number): string {
  if (!Number.isFinite(thenMs)) return 'unknown';
  const diffMs = Math.max(0, nowMs - thenMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

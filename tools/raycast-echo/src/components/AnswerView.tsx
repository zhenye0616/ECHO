import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveAgentInvocation, AgentProfileError, type AgentKind, type AgentInvocation } from "../lib/agent-profiles";
import { findClusters, type FindClustersCluster } from "../lib/mcp";
import { allocateSessionLogPath, findExecutable, probeEchoDaemon, startAgent, type AgentRun } from "../lib/agent-runner";
import { fetchRecentCalls, type AuditCall } from "../lib/audit";
import { launchTo, showLaunchToast, type LaunchTargetId } from "../lib/launch";
import { buildUnifiedAskPrompt } from "../lib/system-prompt";
import {
  acquireOrAwaitClusterSession,
  drainInflightWrites,
  findLatestSessionForCluster,
  formatRelativeTime,
  recordSessionEnd,
  recordSessionStart,
  recordSessionUpdate,
  type ClusterSessionIntent,
  type Session,
} from "../lib/sessions";
import { AuditTimeline } from "./AuditTimeline";

const FLUSH_INTERVAL_MS = 80;

function clusterAnswerLine(c: FindClustersCluster): string {
  const rawLabel = c.label?.trim();
  const stripped = rawLabel ? rawLabel.replace(/^discussion about\s+/i, "").trim() : "";
  const label = stripped || rawLabel || "Recent cluster";
  const atoms = c.atom_ids.length === 1 ? "1 atom" : `${c.atom_ids.length} atoms`;
  const sources = Object.entries(c.source_breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `${app}×${n}`)
    .join(" · ");
  const hints = c.open_loop_hints ?? [];
  const loopBit = (() => {
    if (hints.length === 0) return null;
    const unresolved = hints.filter((h) => h.resolved === false).length;
    return unresolved > 0 ? `⚠ ${unresolved}/${hints.length} open` : `✓ ${hints.length}/${hints.length}`;
  })();
  const recency = formatRelativeTime(c.time_range.to);
  const parts = [atoms, sources, loopBit, recency].filter((p): p is string => typeof p === "string" && p.length > 0);
  return `- ${label} — ${parts.join(" · ")}`;
}

export interface AcquireAnswerSessionOptions {
  clusterId: string;
  intent: ClusterSessionIntent;
  query: string;
  agentKind: AgentKind;
  preferences: { agentKind?: string; customCommand?: string; claudeOauthToken?: string };
  repoPath: string;
  forkedFrom?: string | null;
}

export type AcquireAnswerSessionResult =
  | { kind: "replay"; session: Session; banner: string }
  | { kind: "owner"; session: Session; invocation: AgentInvocation; subprocessLogPath: string }
  | { kind: "error"; errorKind: "profile" | "daemon" | "executable" | "unknown"; message: string };

function replayBannerFor(session: Session): string {
  if (session.status === "running") {
    return `_Replayed from in-progress session started ${formatRelativeTime(session.startedAt)} — current answer may continue to grow_`;
  }
  return `_Replayed from session asked ${formatRelativeTime(session.startedAt)}_`;
}

export async function acquireAnswerSessionForCluster(opts: AcquireAnswerSessionOptions): Promise<AcquireAnswerSessionResult> {
  let factoryInvocation: AgentInvocation | undefined;
  let factorySubprocessLogPath: string | undefined;
  let factoryError: { kind: "profile" | "daemon" | "executable"; message: string } | undefined;

  let acquired;
  try {
    acquired = await acquireOrAwaitClusterSession(opts.clusterId, opts.intent, async () => {
      if (opts.intent === "default") {
        const prior = await findLatestSessionForCluster(opts.clusterId, ["running", "done"]);
        if (prior !== null) return { session: prior, source: "existing" as const };
      }
      try {
        factoryInvocation = resolveAgentInvocation(opts.agentKind, opts.preferences, opts.repoPath, buildUnifiedAskPrompt(opts.query));
      } catch (err) {
        factoryError = { kind: "profile", message: (err as AgentProfileError).message };
        throw err;
      }
      const probe = await probeEchoDaemon();
      if (!probe.ok) {
        factoryError = { kind: "daemon", message: probe.reason };
        throw new Error(probe.reason);
      }
      const executableAvailable = await findExecutable(factoryInvocation.binary);
      if (!executableAvailable) {
        factoryError = { kind: "executable", message: factoryInvocation.binary };
        throw new Error(`agent '${factoryInvocation.binary}' not found`);
      }
      factorySubprocessLogPath = allocateSessionLogPath(factoryInvocation);
      const newSession = await recordSessionStart({
        question: opts.query,
        agentKind: opts.agentKind,
        subprocessLogPath: factorySubprocessLogPath,
        forkedFrom: opts.forkedFrom,
        clusterId: opts.clusterId,
      });
      return { session: newSession, source: "created" as const };
    });
  } catch {
    if (factoryError !== undefined) {
      return { kind: "error", errorKind: factoryError.kind, message: factoryError.message };
    }
    return { kind: "error", errorKind: "unknown", message: "Could not acquire cluster session — another caller's setup failed." };
  }

  if (acquired.source === "existing") {
    return { kind: "replay", session: acquired.session, banner: replayBannerFor(acquired.session) };
  }
  if (!acquired.createdByThisCall) {
    return { kind: "replay", session: acquired.session, banner: replayBannerFor(acquired.session) };
  }
  if (factoryInvocation === undefined || factorySubprocessLogPath === undefined) {
    return { kind: "error", errorKind: "unknown", message: "Internal: owner missing invocation or log path" };
  }
  return { kind: "owner", session: acquired.session, invocation: factoryInvocation, subprocessLogPath: factorySubprocessLogPath };
}

export interface AnswerViewProps {
  query: string;
  agentKind: AgentKind;
  preferences: { agentKind?: string; customCommand?: string; claudeOauthToken?: string };
  repoPath: string;
  forkedFrom?: string | null;
  clusterId?: string;
  forceFreshAgent?: boolean;
  onOpenSessions: () => void;
  onSessionChanged?: () => void;
  onAskAgainFromCluster?: (clusterId: string) => void;
}

export function AnswerView({
  query,
  agentKind,
  preferences,
  repoPath,
  forkedFrom,
  clusterId,
  forceFreshAgent,
  onOpenSessions,
  onSessionChanged,
  onAskAgainFromCluster,
}: AnswerViewProps) {
  const launchTs = useMemo(() => Date.now(), []);
  const [answer, setAnswer] = useState("Waiting for agent output...");
  const [isLoading, setIsLoading] = useState(true);
  const [topClusters, setTopClusters] = useState<FindClustersCluster[]>([]);
  const [auditCalls, setAuditCalls] = useState<AuditCall[]>([]);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const runnerRef = useRef<AgentRun | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let auditInterval: ReturnType<typeof setInterval> | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let buffer = "";
    let latestAudit: AuditCall[] = [];
    let sessionId: string | null = null;
    let lastFlushAt = 0;

    const clearFlushTimer = () => {
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = null;
    };
    const clearAuditInterval = () => {
      if (auditInterval !== null) clearInterval(auditInterval);
      auditInterval = null;
    };
    const flushNow = async () => {
      if (disposed) return;
      clearFlushTimer();
      lastFlushAt = Date.now();
      const nextAnswer = buffer.length > 0 ? buffer : "Waiting for agent output...";
      setAnswer(nextAnswer);
      if (sessionId !== null) await recordSessionUpdate(sessionId, { answer: nextAnswer, auditCalls: latestAudit });
    };
    const scheduleFlush = () => {
      const elapsed = Date.now() - lastFlushAt;
      if (elapsed >= FLUSH_INTERVAL_MS) void flushNow();
      else if (flushTimer === null) flushTimer = setTimeout(() => void flushNow(), FLUSH_INTERVAL_MS - elapsed);
    };
    const appendFooter = (footer: string) => {
      const sep = buffer.trim().length > 0 ? "\n\n---\n\n" : "";
      buffer += `${sep}${footer}\n`;
      void flushNow();
    };
    const auditFingerprint = (calls: readonly AuditCall[]): string =>
      calls.map((c) => `${c.ts}|${c.tool}|${c.status}|${c.duration_ms ?? "-"}`).join(",");
    let lastAuditFingerprint = "";
    const pollAudit = async (until?: number) => {
      try {
        const audit = await fetchRecentCalls({ since: launchTs - 2_000, until: until ?? Date.now() + 2_000 });
        latestAudit = audit.calls;
        if (disposed) return;
        const fp = auditFingerprint(audit.calls);
        if (fp === lastAuditFingerprint) return;
        lastAuditFingerprint = fp;
        setAuditCalls(audit.calls);
      } catch {
        if (!disposed) setAuditUnavailable(true);
      }
    };

    const renderReplay = (matched: Session, banner: string) => {
      const body = matched.answer.trim().length > 0 ? matched.answer : "_No answer captured._";
      setAnswer(`${banner}\n\n${body}`);
      setAuditCalls(matched.auditCalls);
      setIsLoading(false);
    };

    async function liveRun(invocation: AgentInvocation, started: Session): Promise<void> {
      sessionId = started.id;
      if (!disposed) setSession(started);
      onSessionChanged?.();
      const run = startAgent(invocation, started.subprocessLogPath !== null ? { sessionLogPath: started.subprocessLogPath } : {});
      runnerRef.current = run;
      auditInterval = setInterval(() => void pollAudit(), 600);

      for await (const event of run.events) {
        if (disposed) return;
        if (event.type === "stdout") {
          buffer += event.text;
          scheduleFlush();
        } else if (event.type === "footer") {
          appendFooter(event.markdown);
        } else if (event.type === "error") {
          appendFooter(`**Agent error**\n\n${event.error.message}`);
        } else if (event.type === "exit") {
          clearAuditInterval();
          clearFlushTimer();
          await pollAudit(Date.now() + 2_000);
          const finalAnswer = buffer.length > 0 ? buffer : answer;
          setAnswer(finalAnswer);
          if (sessionId !== null) {
            await drainInflightWrites(sessionId);
            await recordSessionUpdate(sessionId, { answer: finalAnswer, auditCalls: latestAudit });
            await recordSessionEnd(sessionId, {
              status: cancelledRef.current ? "cancelled" : event.code === 0 ? "done" : "errored",
              sourceBreakdown: {},
              evidenceClusters: [],
            });
            onSessionChanged?.();
          }
          setIsLoading(false);
        }
      }
    }

    async function startup() {
      // Cluster-click path: try to short-circuit to replay before any live
      // preconditions (daemon probe, exec lookup) so the user-facing "open
      // a prior answer" path stays cheap.
      if (clusterId !== undefined) {
        const intent: ClusterSessionIntent = forceFreshAgent === true ? "fresh" : "default";
        const outcome = await acquireAnswerSessionForCluster({
          clusterId,
          intent,
          query,
          agentKind,
          preferences,
          repoPath,
          forkedFrom,
        });
        if (disposed) return;

        if (outcome.kind === "error") {
          if (outcome.errorKind === "profile") setStartupError(outcome.message);
          else if (outcome.errorKind === "daemon") setStartupError(`ECHO daemon unreachable at 38478 — ${outcome.message}`);
          else if (outcome.errorKind === "executable") setStartupError(`Agent '${outcome.message}' not found`);
          else setStartupError(outcome.message);
          setIsLoading(false);
          return;
        }

        if (outcome.kind === "replay") {
          setSession(outcome.session);
          renderReplay(outcome.session, outcome.banner);
          return;
        }

        // Owner of a freshly-created session — proceed with the live run.
        try {
          const r = await findClusters();
          if (!disposed) setTopClusters(r.clusters.slice(0, 3));
        } catch {
          // Best-effort context sidebar.
        }
        await liveRun(outcome.invocation, outcome.session);
        return;
      }

      // Typed-query path (no clusterId): original live-run flow.
      let invocation: AgentInvocation;
      try {
        invocation = resolveAgentInvocation(agentKind, preferences, repoPath, buildUnifiedAskPrompt(query));
      } catch (err) {
        setStartupError((err as AgentProfileError).message);
        setIsLoading(false);
        return;
      }
      const probe = await probeEchoDaemon();
      if (disposed) return;
      if (!probe.ok) {
        setStartupError(`ECHO daemon unreachable at 38478 — ${probe.reason}`);
        setIsLoading(false);
        return;
      }
      const executableAvailable = await findExecutable(invocation.binary);
      if (disposed) return;
      if (!executableAvailable) {
        setStartupError(`Agent '${invocation.binary}' not found`);
        setIsLoading(false);
        return;
      }
      try {
        const r = await findClusters();
        if (!disposed) setTopClusters(r.clusters.slice(0, 3));
      } catch {
        // Best-effort context sidebar.
      }
      const subprocessLogPath = allocateSessionLogPath(invocation);
      const started = await recordSessionStart({ question: query, agentKind, subprocessLogPath, forkedFrom });
      await liveRun(invocation, started);
    }

    void startup();
    return () => {
      disposed = true;
      clearAuditInterval();
      clearFlushTimer();
      runnerRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (startupError !== null) {
    return (
      <Detail
        markdown={`# Ask ECHO\n\n**Could not start the agent.**\n\n${startupError}`}
        actions={<ActionPanel><Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} /></ActionPanel>}
      />
    );
  }

  const topClustersMarkdown = topClusters
    .map((c) => clusterAnswerLine(c))
    .join("\n");
  const fullMarkdown = [
    "# Ask ECHO",
    "",
    `_session=${session?.id ?? "starting"} · agent=${agentKind}_`,
    "",
    answer.trim(),
    topClustersMarkdown.length > 0 ? "\n---\n\n**Top recent clusters**\n\n" + topClustersMarkdown : "",
  ].join("\n");

  async function fire(target: LaunchTargetId) {
    try {
      const outcome = await launchTo(target, { question: query, answer, evidenceMarkdown: topClustersMarkdown });
      await showLaunchToast(outcome);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Launch failed", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={fullMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Agent" text={agentKind} />
          <Detail.Metadata.Label title="Session" text={session?.id ?? "starting"} />
          <Detail.Metadata.Label title="Status" text={isLoading ? "running" : "terminal"} />
          <AuditTimeline calls={auditUnavailable ? null : auditCalls} mode={auditUnavailable ? "errored" : isLoading ? "live" : "completed"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isLoading ? (
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={() => {
                cancelledRef.current = true;
                runnerRef.current?.cancel();
              }}
            />
          ) : (
            <>
              <Action title="Open in Cursor" icon={Icon.Code} onAction={() => void fire("cursor")} />
              <Action title="Send to Claude.ai" icon={Icon.Stars} shortcut={{ modifiers: ["cmd"], key: "1" }} onAction={() => void fire("claude_web")} />
              <Action title="Send to ChatGPT" icon={Icon.Globe} shortcut={{ modifiers: ["cmd"], key: "2" }} onAction={() => void fire("chatgpt")} />
              <Action.CopyToClipboard title="Copy Packet" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "c" }} content={answer} />
            </>
          )}
          {clusterId !== undefined && onAskAgainFromCluster !== undefined ? (
            <Action
              title="Ask Again from This Cluster"
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => onAskAgainFromCluster(clusterId)}
            />
          ) : null}
          <Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} />
        </ActionPanel>
      }
    />
  );
}

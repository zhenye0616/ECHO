import { Action, ActionPanel, Color, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveAgentInvocation, AgentProfileError, type AgentKind, type AgentInvocation } from "../lib/agent-profiles";
import { findClusters, type FindClustersCluster } from "../lib/mcp";
import { findExecutable, probeEchoDaemon, startAgent, type AgentRun } from "../lib/agent-runner";
import { fetchRecentCalls, type AuditCall } from "../lib/audit";
import { launchTo, showLaunchToast, type LaunchTargetId } from "../lib/launch";
import { buildUnifiedAskPrompt } from "../lib/system-prompt";
import {
  drainInflightWrites,
  recordSessionEnd,
  recordSessionStart,
  recordSessionUpdate,
  type Session,
} from "../lib/sessions";
import { AuditTimeline } from "./AuditTimeline";

const FLUSH_INTERVAL_MS = 80;

export interface AnswerViewProps {
  query: string;
  agentKind: AgentKind;
  preferences: { agentKind?: string; customCommand?: string; claudeOauthToken?: string };
  repoPath: string;
  forkedFrom?: string | null;
  onOpenSessions: () => void;
}

export function AnswerView({ query, agentKind, preferences, repoPath, forkedFrom, onOpenSessions }: AnswerViewProps) {
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

    async function startup() {
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

      const run = startAgent(invocation);
      runnerRef.current = run;
      const started = await recordSessionStart({ question: query, agentKind, subprocessLogPath: run.sessionLogPath, forkedFrom });
      sessionId = started.id;
      if (!disposed) setSession(started);
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
          }
          setIsLoading(false);
        }
      }
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

  const topClustersMarkdown = topClusters.map((c) => `- ${c.label?.trim() ?? c.cluster_id} (${c.atom_ids.length} atoms)`).join("\n");
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
          <Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} />
        </ActionPanel>
      }
    />
  );
}

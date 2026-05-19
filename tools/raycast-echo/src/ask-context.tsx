import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { homedir } from "node:os";
import { useEffect, useRef, useState } from "react";
import { fetchRecentCalls, type AuditCall } from "./lib/audit";
import { AgentProfileError, resolveAgentInvocation, type AgentInvocation } from "./lib/agent-profiles";
import { findExecutable, probeEchoDaemon, startAgent, type AgentRun } from "./lib/agent-runner";
import { buildAskEchoPrompt } from "./lib/system-prompt";

const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";
const FLUSH_INTERVAL_MS = 80;

interface AskEchoPreferences {
  agentKind?: string;
  customCommand?: string;
  repoPath?: string;
  claudeOauthToken?: string;
}

interface AskFormValues {
  question: string;
}

export default function AskContext() {
  const { push } = useNavigation();

  async function handleSubmit(values: AskFormValues) {
    const question = values.question.trim();
    if (question.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Question is empty" });
      return;
    }

    const preferences = getPreferenceValues<AskEchoPreferences>();
    const agentKind = preferences.agentKind ?? "codex";
    const repoPath = expandHome(preferences.repoPath ?? DEFAULT_REPO_PATH);
    const prompt = buildAskEchoPrompt(question);

    let invocation: AgentInvocation;
    try {
      invocation = resolveAgentInvocation(agentKind, preferences, repoPath, prompt);
    } catch (err) {
      await showPreferencesToast((err as AgentProfileError).message);
      return;
    }

    if (!(await probeEchoDaemon())) {
      await showToast({ style: Toast.Style.Failure, title: "ECHO daemon unreachable at 38478" });
      return;
    }

    if (!(await findExecutable(invocation.binary))) {
      await showPreferencesToast(`Agent '${invocation.binary}' not found`);
      return;
    }

    push(<AnswerView invocation={invocation} agentKind={agentKind} repoPath={repoPath} launchTs={Date.now()} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title="Question" placeholder="Ask ECHO" />
    </Form>
  );
}

function AnswerView({
  invocation,
  agentKind,
  repoPath,
  launchTs,
}: {
  invocation: AgentInvocation;
  agentKind: string;
  repoPath: string;
  launchTs: number;
}) {
  const [markdown, setMarkdown] = useState("Waiting for agent output...");
  const [isLoading, setIsLoading] = useState(true);
  const [auditCalls, setAuditCalls] = useState<AuditCall[] | null>(null);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const runnerRef = useRef<AgentRun | null>(null);

  useEffect(() => {
    let disposed = false;
    let buffer = "";
    let lastFlushAt = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let sawExit = false;

    function clearFlushTimer() {
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = null;
    }

    function flushNow() {
      if (disposed) return;
      clearFlushTimer();
      lastFlushAt = Date.now();
      setMarkdown(buffer.length > 0 ? buffer : "Waiting for agent output...");
    }

    function scheduleFlush() {
      const elapsed = Date.now() - lastFlushAt;
      if (elapsed >= FLUSH_INTERVAL_MS) {
        flushNow();
      } else if (flushTimer === null) {
        flushTimer = setTimeout(flushNow, FLUSH_INTERVAL_MS - elapsed);
      }
    }

    function appendFooter(markdownFooter: string) {
      const separator = buffer.trim().length > 0 ? "\n\n---\n\n" : "";
      buffer += `${separator}${markdownFooter}\n`;
      flushNow();
    }

    const run = startAgent(invocation);
    runnerRef.current = run;

    void (async () => {
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
          sawExit = true;
          flushNow();
          setIsLoading(false);
          try {
            const audit = await fetchRecentCalls({ since: launchTs - 2_000, until: Date.now() + 2_000 });
            if (!disposed) setAuditCalls(audit.calls);
          } catch {
            if (!disposed) setAuditUnavailable(true);
          }
        }
      }
      if (!disposed && !sawExit) setIsLoading(false);
    })();

    return () => {
      disposed = true;
      clearFlushTimer();
      run.cancel();
    };
  }, [invocation, launchTs]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <AuditMetadata agentKind={agentKind} repoPath={repoPath} calls={auditCalls} unavailable={auditUnavailable} />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" icon={Icon.Clipboard} content={markdown} />
          <Action.CopyToClipboard
            title="Copy Journal Entry Template"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
            content={buildJournalTemplate(agentKind, repoPath, auditCalls, auditUnavailable)}
          />
          {isLoading ? <Action title="Cancel" icon={Icon.XMarkCircle} onAction={() => runnerRef.current?.cancel()} /> : null}
        </ActionPanel>
      }
    />
  );
}

function AuditMetadata({
  agentKind,
  repoPath,
  calls,
  unavailable,
}: {
  agentKind: string;
  repoPath: string;
  calls: AuditCall[] | null;
  unavailable: boolean;
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Agent" text={agentKind} />
      <Detail.Metadata.Label title="Repo" text={repoPath} />
      <Detail.Metadata.Separator />
      {unavailable ? <Detail.Metadata.Label title="Audit" text="Audit unavailable" /> : null}
      {!unavailable && calls === null ? <Detail.Metadata.Label title="Audit" text="Waiting" /> : null}
      {!unavailable && calls !== null && calls.length === 0 ? <Detail.Metadata.Label title="Audit" text="No MCP calls" /> : null}
      {!unavailable && calls !== null
        ? calls.map((call, index) => (
            <Detail.Metadata.Label key={`${call.ts}-${index}`} title={`Call ${index + 1}`} text={formatAuditCall(call)} />
          ))
        : null}
    </Detail.Metadata>
  );
}

function formatAuditCall(call: AuditCall): string {
  const duration = call.duration_ms === null ? "pending" : `${Math.round(call.duration_ms)}ms`;
  return `${call.tool} · ${duration} · ${call.status}`;
}

function buildJournalTemplate(
  agentKind: string,
  repoPath: string,
  calls: AuditCall[] | null,
  auditUnavailable: boolean,
): string {
  const sources = auditUnavailable
    ? "Audit unavailable"
    : calls === null
      ? "Audit not loaded"
      : calls.length === 0
        ? "No MCP calls"
        : calls.map(formatAuditCall).join("\n");
  const count = calls === null ? "unknown" : String(calls.length);
  return `**Surface:** Ask ECHO
**Trigger:** 
**Tool and query inputs:** agent=${agentKind}; repo_path_present=${repoPath.length > 0}
**Returned shape:** tool_call_count=${count}
**Sources:** ${sources}
**Verdict:** 
**Note:** 
**Conjecture:** `;
}

async function showPreferencesToast(message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title: message,
    primaryAction: {
      title: "Open Raycast Preferences",
      onAction: () => {
        void openCommandPreferences();
      },
    },
  });
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

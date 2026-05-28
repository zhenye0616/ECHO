import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { existsSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuditTimeline } from "./components/AuditTimeline";
import {
  resolveAgentInvocation,
  normalizeAgentKind,
  AgentProfileError,
  type AgentInvocation,
  type AgentKind,
} from "./lib/agent-profiles";
import { findExecutable, startAgent, type AgentRun } from "./lib/agent-runner";
import { fetchRecentCalls, type AuditCall } from "./lib/audit";
import { buildRecapPrompt } from "./lib/recap-system-prompt";
import {
  InvalidSinceInputError,
  resolveSinceWindow,
  type ResolvedSince,
  type SinceWindowPreference,
} from "./lib/since-resolver";
import { listSessions, type Session } from "./lib/sessions";

const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";
const AUDIT_TIMEOUT_MS = 5_000;
const RECAP_MAX_RUNTIME_MS = 30_000;
const FLUSH_INTERVAL_MS = 80;

interface RecapPreferences {
  agentKind?: string;
  customCommand?: string;
  repoPath?: string;
  claudeOauthToken?: string;
  defaultSinceWindow?: SinceWindowPreference;
}

interface RecapFormValues {
  since?: string;
  windowPref?: SinceWindowPreference;
}

export interface PreparedRecapRun {
  agentKind: AgentKind;
  invocation: AgentInvocation;
  prompt: string;
  repoPath: string;
  resolvedSince: ResolvedSince;
}

export class RecapStartupError extends Error {
  constructor(message: string, readonly field: "since" | "repoPath" | "agent" = "agent") {
    super(message);
    this.name = "RecapStartupError";
  }
}

export default function RecapCommand() {
  const preferences = getPreferenceValues<RecapPreferences>();
  const { push } = useNavigation();
  const [sinceError, setSinceError] = useState<string | undefined>();
  const [repoError, setRepoError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultWindow = preferences.defaultSinceWindow ?? "last_session";

  async function handleSubmit(values: RecapFormValues) {
    setIsSubmitting(true);
    setSinceError(undefined);
    setRepoError(undefined);
    try {
      const sessions = await listSessions();
      const prepared = prepareRecapRun({
        preferences,
        values,
        sessions,
      });
      const executableAvailable = await findExecutable(prepared.invocation.binary);
      if (!executableAvailable) {
        throw new RecapStartupError(`Agent '${prepared.invocation.binary}' not found`, "agent");
      }
      push(<RecapDetail prepared={prepared} />);
    } catch (err) {
      if (err instanceof InvalidSinceInputError) {
        setSinceError(err.message);
      } else if (err instanceof RecapStartupError && err.field === "repoPath") {
        setRepoError(err.message);
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Recap failed to start", message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Recap" icon={Icon.Stars} onSubmit={(values: RecapFormValues) => void handleSubmit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="since" title="Since" placeholder="2026-05-27T23:00:00-07:00" error={sinceError} />
      <Form.Dropdown id="windowPref" title="Window" defaultValue={defaultWindow} error={repoError}>
        <Form.Dropdown.Item title="Since last session" value="last_session" />
        <Form.Dropdown.Item title="Last 24 hours" value="24h" />
        <Form.Dropdown.Item title="Last 4 hours" value="4h" />
      </Form.Dropdown>
    </Form>
  );
}

export function prepareRecapRun({
  preferences,
  values,
  sessions,
  nowMs = Date.now(),
}: {
  preferences: RecapPreferences;
  values: RecapFormValues;
  sessions: readonly Session[];
  nowMs?: number;
}): PreparedRecapRun {
  const agentKind = normalizeAgentKind(preferences.agentKind);
  const repoPath = resolveRepoPath(preferences.repoPath ?? DEFAULT_REPO_PATH);
  const resolvedSince = resolveSinceWindow(
    values.since,
    values.windowPref ?? preferences.defaultSinceWindow ?? "last_session",
    sessions,
    nowMs,
  );
  const prompt = buildRecapPrompt({ sinceIso: resolvedSince.sinceIso, repoPath });
  let invocation: AgentInvocation;
  try {
    invocation = resolveAgentInvocation(agentKind, preferences, repoPath, prompt);
  } catch (err) {
    if (err instanceof AgentProfileError) throw new RecapStartupError(err.message, "agent");
    throw err;
  }
  return {
    agentKind,
    invocation: { ...invocation, cwd: invocation.cwd ?? repoPath },
    prompt,
    repoPath,
    resolvedSince,
  };
}

export function resolveRepoPath(rawPath: string): string {
  const expanded = expandHome(rawPath.trim());
  if (!isAbsolute(expanded)) {
    throw new RecapStartupError(`Repository path must be absolute after home expansion: ${rawPath}`, "repoPath");
  }
  if (!existsSync(expanded)) {
    throw new RecapStartupError(`Repository path does not exist: ${expanded}`, "repoPath");
  }
  const stat = lstatSync(expanded);
  if (!stat.isDirectory()) {
    throw new RecapStartupError(`Repository path is not a directory: ${expanded}`, "repoPath");
  }
  if (!existsSync(join(expanded, ".git"))) {
    throw new RecapStartupError(`Repository path is not a git repo: ${expanded}`, "repoPath");
  }
  return expanded;
}

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

export function startRecapAgent(invocation: AgentInvocation): AgentRun {
  return startAgent(invocation, {
    maxRuntimeMs: RECAP_MAX_RUNTIME_MS,
    sessionLogEnabled: false,
  });
}

function RecapDetail({ prepared }: { prepared: PreparedRecapRun }) {
  const launchTs = useMemo(() => Date.now(), []);
  const [answer, setAnswer] = useState("Waiting for agent output...");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"starting" | "streaming" | "done" | "errored" | "cancelled" | "empty">("starting");
  const [auditCalls, setAuditCalls] = useState<AuditCall[]>([]);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const runnerRef = useRef<AgentRun | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUDIT_TIMEOUT_MS);
    void fetchRecentCalls({ since: launchTs - 2_000, signal: controller.signal })
      .then((audit) => {
        if (!disposed) setAuditCalls(audit.calls);
      })
      .catch(() => {
        if (!disposed) setAuditUnavailable(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [launchTs]);

  useEffect(() => {
    let disposed = false;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let lastFlushAt = 0;
    let buffer = "";

    const flushNow = () => {
      if (disposed) return;
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = null;
      lastFlushAt = Date.now();
      setAnswer(buffer.length > 0 ? buffer : "Waiting for agent output...");
    };
    const scheduleFlush = () => {
      const elapsed = Date.now() - lastFlushAt;
      if (elapsed >= FLUSH_INTERVAL_MS) flushNow();
      else if (flushTimer === null) flushTimer = setTimeout(flushNow, FLUSH_INTERVAL_MS - elapsed);
    };
    const appendFooter = (footer: string) => {
      const sep = buffer.trim().length > 0 ? "\n\n---\n\n" : "";
      buffer += `${sep}${footer}\n`;
      flushNow();
    };

    async function run() {
      const agentRun = startRecapAgent(prepared.invocation);
      runnerRef.current = agentRun;
      for await (const event of agentRun.events) {
        if (disposed) return;
        if (event.type === "stdout") {
          if (!cancelledRef.current) setStatus("streaming");
          buffer += event.text;
          scheduleFlush();
        } else if (event.type === "footer") {
          appendFooter(event.markdown);
        } else if (event.type === "error") {
          if (!cancelledRef.current) setStatus("errored");
          appendFooter(`**Agent error**\n\n${event.error.message}`);
        } else if (event.type === "exit") {
          flushNow();
          setStatus(
            cancelledRef.current
              ? "cancelled"
              : event.code !== 0
              ? "errored"
              : event.stdoutBytesSeen === 0
              ? "empty"
              : "done",
          );
          setIsLoading(false);
        }
      }
    }

    void run();
    return () => {
      disposed = true;
      if (flushTimer !== null) clearTimeout(flushTimer);
      runnerRef.current?.cancel();
    };
  }, [prepared]);

  const markdown = [
    "# Recap",
    "",
    `_since=${prepared.resolvedSince.sinceIso} (${sourceLabel(prepared.resolvedSince.source)}) · agent=${prepared.agentKind}_`,
    "",
    answer.trim(),
  ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Agent" text={prepared.agentKind} />
          <Detail.Metadata.Label title="Since" text={prepared.resolvedSince.sinceIso} />
          <Detail.Metadata.Label title="Source" text={sourceLabel(prepared.resolvedSince.source)} />
          <Detail.Metadata.Label title="Repo" text={prepared.repoPath} />
          <Detail.Metadata.Label title="Status" text={status} />
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
            <Action.CopyToClipboard title="Copy Recap" icon={Icon.Clipboard} content={answer} />
          )}
        </ActionPanel>
      }
    />
  );
}

function sourceLabel(source: ResolvedSince["source"]): string {
  switch (source) {
    case "user":
      return "user";
    case "last_session":
      return "since last session";
    case "window_24h":
      return "last 24h";
    case "window_4h":
      return "last 4h";
    case "fallback_24h":
      return "fallback 24h";
  }
}

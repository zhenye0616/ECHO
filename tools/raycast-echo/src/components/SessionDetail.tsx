import { Action, ActionPanel, Alert, Color, Detail, Icon, confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import { readFileSync, statSync } from "node:fs";
import { buildPacketMarkdown, launchTo, showLaunchToast } from "../lib/launch";
import { formatPdtTime, type Session } from "../lib/sessions";
import { AuditTimeline } from "./AuditTimeline";

export function SessionDetail({
  session,
  onFork,
  onNewAsk,
  onOpenSessions,
}: {
  session: Session;
  onFork: (session: Session) => void;
  onNewAsk: () => void;
  onOpenSessions: () => void;
}) {
  const { push } = useNavigation();
  const log = getSessionLogState(session.subprocessLogPath);
  const packet = { question: session.question, answer: session.answer, evidenceMarkdown: evidenceMarkdown(session) };

  async function fire(target: "cursor" | "claude_web" | "chatgpt" | "copy") {
    try {
      const outcome = await launchTo(target, packet);
      await showLaunchToast(outcome);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Launch failed", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <Detail
      markdown={sessionMarkdown(session)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Agent" text={session.agentKind} />
          <Detail.Metadata.Label title="Status" text={{ value: session.status, color: statusColor(session.status) }} />
          <Detail.Metadata.Label title="Started" text={formatPdtTime(session.startedAt)} />
          <Detail.Metadata.Label title="MCP calls" text={`${session.auditCalls.length}`} />
          <Detail.Metadata.Separator />
          {Object.keys(session.sourceBreakdown).length > 0 ? (
            <Detail.Metadata.TagList title="Evidence used">
              {Object.entries(session.sourceBreakdown).map(([source, n]) => (
                <Detail.Metadata.TagList.Item key={source} text={`${source} · ${n}`} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Evidence used" text="Best-effort audit shape did not include source paths" />
          )}
          {session.evidenceClusters.length > 0 ? (
            <Detail.Metadata.TagList title="Sources">
              {session.evidenceClusters.slice(0, 5).map((source) => (
                <Detail.Metadata.TagList.Item key={source} text={source} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Subprocess log" text={log.label} />
          <AuditTimeline calls={session.auditCalls} mode={session.status === "errored" ? "errored" : "completed"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Open in Cursor" icon={Icon.Code} onAction={() => void fire("cursor")} />
          <Action title="Send to Claude.ai" icon={Icon.Stars} shortcut={{ modifiers: ["cmd"], key: "1" }} onAction={() => void fire("claude_web")} />
          <Action title="Send to ChatGPT" icon={Icon.Globe} shortcut={{ modifiers: ["cmd"], key: "2" }} onAction={() => void fire("chatgpt")} />
          <Action.CopyToClipboard title="Copy Packet" icon={Icon.Clipboard} shortcut={{ modifiers: ["cmd"], key: "c" }} content={buildPacketMarkdown(packet)} />
          <Action title="Ask Again from This" icon={Icon.RotateClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => onFork(session)} />
          <Action title="New Ask" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={onNewAsk} />
          <Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} />
          {log.openable ? (
            <>
              <Action.Open title="Open Log" target={log.path} icon={Icon.Document} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action title="Tail Log" icon={Icon.Text} onAction={() => push(<Detail markdown={`# Tail Log\n\n\`\`\`\n${tailLog(log.path)}\n\`\`\``} />)} />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function sessionMarkdown(session: Session): string {
  return [
    `# ${session.question}`,
    "",
    `_agent=${session.agentKind} · status=${session.status} · started ${formatPdtTime(session.startedAt)}_`,
    "",
    session.answer.trim().length > 0 ? session.answer.trim() : "_No answer captured._",
    "",
    "> Audit window may include unrelated MCP calls from concurrent surfaces.",
  ].join("\n");
}

export interface SessionLogState {
  openable: boolean;
  label: string;
  path: string;
}

export function getSessionLogState(path: string | null): SessionLogState {
  if (path === null) return { openable: false, label: "Log unavailable - agent-runner emitted no path", path: "" };
  try {
    const stat = statSync(path);
    return { openable: true, label: `${path} · ${stat.size} bytes`, path };
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "unknown";
    return { openable: false, label: `Log unavailable at ${path} - ${code}`, path };
  }
}

export async function confirmDeleteSession(question: string): Promise<boolean> {
  return confirmAlert({
    title: "Delete session?",
    message: question,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
}

function statusColor(status: Session["status"]): Color {
  if (status === "done") return Color.Green;
  if (status === "running") return Color.Orange;
  if (status === "errored") return Color.Red;
  return Color.SecondaryText;
}

function evidenceMarkdown(session: Session): string | undefined {
  if (session.evidenceClusters.length === 0) return undefined;
  return session.evidenceClusters.map((source) => `- ${source}`).join("\n");
}

function tailLog(path: string): string {
  try {
    return readFileSync(path, "utf8").split(/\r?\n/).slice(-80).join("\n");
  } catch {
    return "";
  }
}

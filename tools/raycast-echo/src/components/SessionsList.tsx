import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { agentIcon } from "./EmptyState";
import { confirmDeleteSession, SessionDetail } from "./SessionDetail";
import {
  bucketSessions,
  canDeleteSession,
  formatPdtTime,
  useSessions,
  type Session,
} from "../lib/sessions";

type AgentFilter = "all" | "claude" | "codex" | "custom";

export function SessionsList({
  onForkSession,
  onNewAsk,
  onOpenSessions,
}: {
  onForkSession: (session: Session) => void;
  onNewAsk: () => void;
  onOpenSessions: () => void;
}) {
  const { sessions, deleteSession } = useSessions();
  const [filter, setFilter] = useState<AgentFilter>("all");
  const filtered = useMemo(
    () => sessions.filter((session) => filter === "all" || session.agentKind === filter),
    [sessions, filter],
  );
  const buckets = bucketSessions(filtered);
  return (
    <List
      isShowingDetail
      filtering
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Agent" value={filter} onChange={(value) => setFilter(value as AgentFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Claude" value="claude" />
          <List.Dropdown.Item title="Codex" value="codex" />
          <List.Dropdown.Item title="Custom" value="custom" />
        </List.Dropdown>
      }
    >
      <Section title="Today" sessions={buckets.today} {...{ onForkSession, onNewAsk, onOpenSessions, deleteSession }} />
      <Section title="Yesterday" sessions={buckets.yesterday} {...{ onForkSession, onNewAsk, onOpenSessions, deleteSession }} />
      <Section title="This week" sessions={buckets.thisWeek} {...{ onForkSession, onNewAsk, onOpenSessions, deleteSession }} />
      <Section title="Older" sessions={buckets.older} {...{ onForkSession, onNewAsk, onOpenSessions, deleteSession }} />
      <List.EmptyView icon={Icon.Stars} title="No sessions" />
    </List>
  );
}

function Section(props: {
  title: string;
  sessions: readonly Session[];
  onForkSession: (session: Session) => void;
  onNewAsk: () => void;
  onOpenSessions: () => void;
  deleteSession: (id: string) => Promise<void>;
}) {
  if (props.sessions.length === 0) return null;
  return (
    <List.Section title={props.title} subtitle={`${props.sessions.length}`}>
      {props.sessions.map((session) => (
        <SessionListRow key={session.id} session={session} {...props} />
      ))}
    </List.Section>
  );
}

export function SessionListRow({
  session,
  onForkSession,
  onNewAsk,
  onOpenSessions,
  deleteSession,
}: {
  session: Session;
  onForkSession: (session: Session) => void;
  onNewAsk: () => void;
  onOpenSessions: () => void;
  deleteSession: (id: string) => Promise<void>;
}) {
  return (
    <List.Item
      icon={agentIcon(session.agentKind)}
      title={session.question}
      subtitle={session.status}
      accessories={[{ text: `${formatPdtTime(session.startedAt)} · ${session.agentKind} · ${session.auditCalls.length} calls · ${session.evidenceClusters.length} atoms` }]}
      detail={<List.Item.Detail markdown={`# ${session.question}\n\n${session.answer || "_No answer captured._"}`} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Session"
            icon={Icon.Document}
            target={<SessionDetail session={session} onFork={onForkSession} onNewAsk={onNewAsk} onOpenSessions={onOpenSessions} />}
          />
          <Action title="Ask Again from This" icon={Icon.RotateClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => onForkSession(session)} />
          {canDeleteSession(session) ? (
            <Action
              title="Delete Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => {
                void (async () => {
                  if (await confirmDeleteSession(session.question)) await deleteSession(session.id);
                })();
              }}
            />
          ) : null}
          <Action title="Filter Sessions" icon={Icon.MagnifyingGlass} shortcut={{ modifiers: ["cmd"], key: "f" }} onAction={() => undefined} />
        </ActionPanel>
      }
    />
  );
}

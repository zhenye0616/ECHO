import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { FindClustersCluster } from "../lib/mcp";
import { bucketSessionsForEmpty, formatPdtTime, formatRelativeTime, type Session } from "../lib/sessions";

export function EmptyState({
  query,
  setQuery,
  clusters,
  isLoading,
  sessions,
  warmSession,
  renderCluster,
  onOpenSession,
  onOpenSessions,
  onForkSession,
}: {
  query: string;
  setQuery: (query: string) => void;
  clusters: readonly FindClustersCluster[];
  isLoading: boolean;
  sessions: readonly Session[];
  warmSession: Session | null;
  renderCluster: (cluster: FindClustersCluster) => ReactNode;
  onOpenSession: (session: Session) => void;
  onOpenSessions: () => void;
  onForkSession: (session: Session) => void;
}) {
  const openLoops = clusters.filter((c) => c.rank_reason.includes("has_open_loop")).slice(0, 3);
  const buckets = bucketSessionsForEmpty(sessions);
  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      throttle={false}
      isLoading={isLoading}
      searchBarPlaceholder="Ask anything, or search your memory..."
      isShowingDetail
    >
      {warmSession !== null ? (
        <List.Section title="Resume">
          <SessionRow session={warmSession} onOpenSession={onOpenSession} onForkSession={onForkSession} onOpenSessions={onOpenSessions} />
        </List.Section>
      ) : null}
      <List.Section title="Open loops · Today" subtitle={`${openLoops.length}`}>
        {openLoops.map((cluster) => renderCluster(cluster))}
      </List.Section>
      <SessionSection title="Today's sessions" sessions={buckets.today} onOpenSession={onOpenSession} onForkSession={onForkSession} onOpenSessions={onOpenSessions} />
      <SessionSection title="Yesterday" sessions={buckets.yesterday} onOpenSession={onOpenSession} onForkSession={onForkSession} onOpenSessions={onOpenSessions} />
      <SessionSection title="This week" sessions={buckets.thisWeek} onOpenSession={onOpenSession} onForkSession={onForkSession} onOpenSessions={onOpenSessions} />
      {sessions.length === 0 ? (
        <List.Section title="Sessions">
          <List.Item icon={{ source: Icon.Stars, tintColor: Color.SecondaryText }} title="Your first ask becomes a session." />
        </List.Section>
      ) : null}
      <List.EmptyView icon={{ source: Icon.Stars, tintColor: Color.SecondaryText }} title="ECHO is listening." description="Open loops and sessions appear here as you work." />
    </List>
  );
}

function SessionSection(props: { title: string; sessions: readonly Session[]; onOpenSession: (session: Session) => void; onForkSession: (session: Session) => void; onOpenSessions: () => void }) {
  if (props.sessions.length === 0) return null;
  return (
    <List.Section title={props.title} subtitle={`${props.sessions.length}`}>
      {props.sessions.map((session) => (
        <SessionRow key={session.id} session={session} {...props} />
      ))}
    </List.Section>
  );
}

export function SessionRow({
  session,
  onOpenSession,
  onForkSession,
  onOpenSessions,
}: { session: Session; onOpenSession: (session: Session) => void; onForkSession: (session: Session) => void; onOpenSessions: () => void }) {
  return (
    <List.Item
      icon={agentIcon(session.agentKind)}
      title={truncate(session.question, 60)}
      subtitle={session.status}
      accessories={[{ text: `${formatPdtTime(session.startedAt)} · ${session.agentKind} · ${session.auditCalls.length} calls`, tooltip: formatRelativeTime(session.startedAt) }]}
      actions={
        <ActionPanel>
          <Action title="Open Session" icon={Icon.Document} onAction={() => onOpenSession(session)} />
          <Action title="Ask Again from This" icon={Icon.RotateClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => onForkSession(session)} />
          <Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} />
        </ActionPanel>
      }
    />
  );
}

export function agentIcon(agentKind: Session["agentKind"]) {
  if (agentKind === "claude") return { source: Icon.Stars, tintColor: Color.Orange };
  if (agentKind === "codex") return { source: Icon.Terminal, tintColor: Color.Purple };
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}...`;
}

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { FindClustersCluster } from "../lib/mcp";
import { bucketSessionsForEmpty, formatPdtTime, formatRelativeTime, type Session } from "../lib/sessions";

const HERO_FRESHNESS_MS = 18 * 60 * 60 * 1000;

export type HeroPick =
  | { kind: "running"; session: Session }
  | { kind: "cluster"; cluster: FindClustersCluster; linkedSession: Session | null };

export function EmptyState({
  query,
  setQuery,
  clusters,
  isLoading,
  sessions,
  renderHeroCluster,
  onOpenSession,
  onOpenSessions,
  onForkSession,
  showDetail,
  nowMs,
}: {
  query: string;
  setQuery: (query: string) => void;
  clusters: readonly FindClustersCluster[];
  isLoading: boolean;
  sessions: readonly Session[];
  renderHeroCluster: (cluster: FindClustersCluster, linkedSession: Session | null) => ReactNode;
  onOpenSession: (session: Session) => void;
  onOpenSessions: () => void;
  onForkSession: (session: Session) => void;
  showDetail: boolean;
  nowMs?: number;
}) {
  const hero = pickHero(clusters, sessions, nowMs);
  const buckets = bucketSessionsForEmpty(sessions);
  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      throttle={false}
      isLoading={isLoading}
      searchBarPlaceholder="Ask anything, or search your memory..."
      isShowingDetail={showDetail}
    >
      {hero !== null ? (
        <List.Section title="Continue">
          {hero.kind === "running" ? (
            <SessionRow session={hero.session} onOpenSession={onOpenSession} onForkSession={onForkSession} onOpenSessions={onOpenSessions} />
          ) : renderHeroCluster(hero.cluster, hero.linkedSession)}
        </List.Section>
      ) : null}
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

export function pickHero(
  clusters: readonly FindClustersCluster[],
  sessions: readonly Session[],
  nowMs = Date.now(),
): HeroPick | null {
  const running = sessions.find((s) => s.status === "running");
  if (running !== undefined) return { kind: "running", session: running };

  const top = clusters[0];
  if (top === undefined || top.time_range?.to === undefined) return null;
  const topToMs = new Date(top.time_range.to).getTime();
  if (Number.isNaN(topToMs)) return null;

  const fresh = nowMs - topToMs < HERO_FRESHNESS_MS;
  const reasons = top.rank_reason ?? [];
  const unresolved = reasons.includes("has_unresolved_open_loop");
  const substrateAnchored = reasons.includes("code_session_anchor");
  const linkedSession = sessions.find((s) => s.clusterId === top.cluster_id) ?? null;
  const anchored = substrateAnchored || linkedSession !== null;
  if (fresh && unresolved && anchored) return { kind: "cluster", cluster: top, linkedSession };
  return null;
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

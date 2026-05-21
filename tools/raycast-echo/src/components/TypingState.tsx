import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import type { ReactNode } from "react";
import type { FindClustersCluster, SearchMatch } from "../lib/mcp";
import { buildForkPrompt, formatPdtTime, type Session } from "../lib/sessions";

export interface TypingStateAskOptions {
  forkedFrom?: string | null;
  clusterId?: string;
  forceFreshAgent?: boolean;
}

const ASK_TINT = { light: "#ff6363", dark: "#ff6363" };

export function TypingState({
  query,
  setQuery,
  agentKind,
  isLoading,
  clusterMatches,
  matches,
  renderCluster,
  renderMatch,
  onAsk,
  onOpenSessions,
  banner,
  showDetail,
}: {
  query: string;
  setQuery: (query: string) => void;
  agentKind: string;
  isLoading: boolean;
  clusterMatches: readonly FindClustersCluster[];
  matches: readonly SearchMatch[];
  renderCluster: (cluster: FindClustersCluster) => ReactNode;
  renderMatch: (match: SearchMatch) => ReactNode;
  onAsk: (question: string, options?: TypingStateAskOptions) => void;
  onOpenSessions: () => void;
  banner?: string;
  showDetail: boolean;
}) {
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
      <AskRow
        query={query}
        agentKind={agentKind}
        sectionTitle={banner ?? "Ask"}
        onAsk={() => onAsk(query)}
        onOpenSessions={onOpenSessions}
      />
      {clusterMatches.length > 0 ? (
        <List.Section title="Clusters" subtitle={`${clusterMatches.length}`}>
          {clusterMatches.map((cluster) => renderCluster(cluster))}
        </List.Section>
      ) : null}
      {matches.length > 0 ? (
        <List.Section title="Atoms" subtitle={`${matches.length}`}>
          {matches.map((match) => renderMatch(match))}
        </List.Section>
      ) : null}
      <List.EmptyView icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }} title={`No atoms match "${query}"`} />
    </List>
  );
}

export function ForkTypingState({
  source,
  agentKind,
  onAsk,
  onOpenSessions,
  showDetail,
}: {
  source: Session;
  agentKind: string;
  onAsk: (question: string, options?: TypingStateAskOptions) => void;
  onOpenSessions: () => void;
  showDetail: boolean;
}) {
  const prefill = source.question;
  const [typed, setTyped] = useState(prefill);
  return (
    <TypingState
      query={typed}
      setQuery={setTyped}
      agentKind={agentKind}
      isLoading={false}
      clusterMatches={[]}
      matches={[]}
      renderCluster={() => null}
      renderMatch={() => null}
      onAsk={(value) => onAsk(buildForkPrompt(source, value), { forkedFrom: source.id, clusterId: source.clusterId })}
      onOpenSessions={onOpenSessions}
      banner={`Forking from session ${formatPdtTime(source.startedAt)} PDT — add your follow-up below and press ↩ to ask`}
      showDetail={showDetail}
    />
  );
}

function AskRow({
  query,
  agentKind,
  sectionTitle,
  onAsk,
  onOpenSessions,
}: { query: string; agentKind: string; sectionTitle: string; onAsk: () => void; onOpenSessions: () => void }) {
  return (
    <List.Section title={sectionTitle}>
      <List.Item
        icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
        title={`Ask ECHO about "${query}"`}
        subtitle={`${agentKind} · ↩`}
        accessories={[{ icon: { source: Icon.Circle, tintColor: Color.Orange }, tooltip: "Ask" }]}
        detail={<List.Item.Detail markdown={`# Ask ECHO\n\n> ${query}\n\nPress Enter to synthesize this as a durable session.`} />}
        actions={
          <ActionPanel>
            <Action title="Ask ECHO" icon={{ source: Icon.Stars, tintColor: ASK_TINT }} onAction={onAsk} />
            <Action title="Browse Sessions" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onOpenSessions} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

// echo.tsx — thin router for the Raycast ECHO five-state surface.

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  derivedApp,
  formatAtomBundle,
  formatPdtTimestamp,
  type DerivedApp,
  type EchoAtom,
} from "./lib/format";
import {
  EchoDaemonError,
  findClusters,
  searchMemories,
  type FindClustersCluster,
  type SearchMatch,
} from "./lib/mcp";
import { detectPrimary, pasteIntoFrontmost, showLaunchToast, type PrimaryDetection } from "./lib/launch";
import { normalizeAgentKind, type AgentKind } from "./lib/agent-profiles";
import { useSessions, formatRelativeTime, type Session } from "./lib/sessions";
import { EmptyState } from "./components/EmptyState";
import { TypingState, ForkTypingState } from "./components/TypingState";
import { AnswerView } from "./components/AnswerView";
import { SessionsList } from "./components/SessionsList";
import { SessionDetail } from "./components/SessionDetail";
import { homedir } from "node:os";

const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";

const APP_META: Record<DerivedApp, { label: string; color: { light: string; dark: string }; icon: Icon }> = {
  claude_code: { label: "Claude", color: { light: "#d97757", dark: "#d97757" }, icon: Icon.Stars },
  cursor: { label: "Cursor", color: { light: "#3b82f6", dark: "#3b82f6" }, icon: Icon.Code },
  codex: { label: "Codex", color: { light: "#a855f7", dark: "#a855f7" }, icon: Icon.Terminal },
  git: { label: "Git", color: { light: "#f1502f", dark: "#f1502f" }, icon: Icon.CodeBlock },
  unknown: { label: "Atom", color: { light: "#6e6e73", dark: "#a1a1a6" }, icon: Icon.Dot },
};

interface EchoPreferences {
  agentKind?: string;
  customCommand?: string;
  repoPath?: string;
  claudeOauthToken?: string;
}

export default function EchoContext() {
  const [query, setQuery] = useState("");
  const { push } = useNavigation();
  const preferences = getPreferenceValues<EchoPreferences>();
  const agentKind = normalizeAgentKind(preferences.agentKind);
  const repoPath = expandHome(preferences.repoPath ?? DEFAULT_REPO_PATH);
  const { clusters, isLoadingClusters } = useClusters();
  const { matches, isLoadingMatches } = useMatches(query);
  const primary = usePrimary();
  const { sessions, warmSession } = useSessions();

  function openSessions() {
    push(<SessionsList onForkSession={openFork} onNewAsk={newAsk} onOpenSessions={openSessions} />);
  }
  function openSession(session: Session) {
    push(<SessionDetail session={session} onFork={openFork} onNewAsk={newAsk} onOpenSessions={openSessions} />);
  }
  function openFork(session: Session) {
    push(<ForkTypingState source={session} agentKind={agentKind} onAsk={runAsk} onOpenSessions={openSessions} />);
  }
  function newAsk() {
    setQuery("");
    popToRoot({ clearSearchBar: true });
  }
  function runAsk(question: string, forkedFrom?: string | null) {
    push(
      <AnswerView
        query={question}
        agentKind={agentKind}
        preferences={preferences}
        repoPath={repoPath}
        forkedFrom={forkedFrom}
        onOpenSessions={openSessions}
      />,
    );
  }

  const renderCluster = (cluster: FindClustersCluster) => (
    <ClusterRow key={cluster.cluster_id} cluster={cluster} primary={primary} onAsk={runAsk} />
  );
  const renderMatch = (match: SearchMatch) => <MatchRow key={match.id} match={match} />;

  if (query.length === 0) {
    return (
      <EmptyState
        query={query}
        setQuery={setQuery}
        clusters={clusters}
        isLoading={isLoadingClusters}
        sessions={sessions}
        warmSession={warmSession}
        renderCluster={renderCluster}
        onOpenSession={openSession}
        onOpenSessions={openSessions}
        onForkSession={openFork}
      />
    );
  }

  const lower = query.toLowerCase();
  const clusterMatches = clusters.filter((c) => c.label?.toLowerCase().includes(lower) ?? false).slice(0, 5);
  return (
    <TypingState
      query={query}
      setQuery={setQuery}
      agentKind={agentKind}
      isLoading={isLoadingMatches || isLoadingClusters}
      clusterMatches={clusterMatches}
      matches={matches}
      renderCluster={renderCluster}
      renderMatch={renderMatch}
      onAsk={runAsk}
      onOpenSessions={openSessions}
    />
  );
}

function useClusters() {
  const [clusters, setClusters] = useState<FindClustersCluster[]>([]);
  const [isLoadingClusters, setIsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await findClusters();
        if (!cancelled) setClusters(r.clusters);
      } catch (err) {
        if (!cancelled && err instanceof EchoDaemonError) await showDaemonToast();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { clusters, isLoadingClusters };
}

function useMatches(query: string) {
  const debounced = useDebouncedValue(query, 200);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [isLoadingMatches, setIsLoading] = useState(false);
  useEffect(() => {
    if (debounced.length === 0) {
      setMatches([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      try {
        const r = await searchMemories(debounced, 50);
        if (!cancelled) setMatches(r.matches);
      } catch (err) {
        if (!cancelled && err instanceof EchoDaemonError) await showDaemonToast();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);
  return { matches, isLoadingMatches };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function usePrimary(): PrimaryDetection | null {
  const [primary, setPrimary] = useState<PrimaryDetection | null>(null);
  useEffect(() => { void detectPrimary().then(setPrimary); }, []);
  return primary;
}

function ClusterRow({ cluster, primary, onAsk }: { cluster: FindClustersCluster; primary: PrimaryDetection | null; onAsk: (query: string) => void }) {
  const askQuery = cluster.label?.trim().length ? `tell me about "${cluster.label.trim()}"` : "summarize this cluster";
  return (
    <List.Item
      icon={appIconFor(dominantApp(cluster))}
      title={cluster.label?.trim() || `${cluster.atom_ids.length} atoms`}
      subtitle={cluster.rank_reason.includes("has_open_loop") ? "Open loop" : `${cluster.atom_ids.length} atoms`}
      accessories={[{ text: formatRelativeTime(cluster.time_range.to), tooltip: formatPdtTimestamp(cluster.time_range.to) }]}
      detail={<List.Item.Detail markdown={clusterBundleMarkdown(cluster)} />}
      actions={
        <ActionPanel>
          <Action title="Ask ECHO about This Cluster" icon={Icon.Stars} shortcut={{ modifiers: ["cmd"], key: "a" }} onAction={() => onAsk(askQuery)} />
          <Action.CopyToClipboard title="Copy Bundle" icon={Icon.Clipboard} content={clusterBundleMarkdown(cluster)} />
          <Action title="Paste in Frontmost App" icon={Icon.ArrowDown} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} onAction={() => void pasteCluster(cluster, primary)} />
        </ActionPanel>
      }
    />
  );
}

function MatchRow({ match }: { match: SearchMatch }) {
  const app = derivedApp(match.source);
  return (
    <List.Item
      icon={appIconFor(app)}
      title={titleForMatch(match)}
      subtitle={narrativeForMatch(match)}
      accessories={[{ text: formatRelativeTime(match.timestamp), tooltip: formatPdtTimestamp(match.timestamp) }]}
      detail={<List.Item.Detail markdown={match.content} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Atom" icon={Icon.Clipboard} content={formatAtomBundle([match as unknown as EchoAtom])} />
          <Action.Paste title="Paste in Frontmost App" icon={Icon.ArrowDown} content={formatAtomBundle([match as unknown as EchoAtom])} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
        </ActionPanel>
      }
    />
  );
}

function dominantApp(c: FindClustersCluster): DerivedApp {
  let best: DerivedApp = "unknown";
  let bestN = -1;
  for (const [app, n] of Object.entries(c.source_breakdown)) {
    if (n > bestN && app in APP_META) {
      bestN = n;
      best = app as DerivedApp;
    }
  }
  return best;
}

function appIconFor(app: DerivedApp) {
  const meta = APP_META[app];
  return { source: meta.icon, tintColor: meta.color };
}

function clusterBundleMarkdown(c: FindClustersCluster): string {
  const sources = Object.entries(c.source_breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `- ${APP_META[app as DerivedApp]?.label ?? app}: ${n}`)
    .join("\n");
  return [`# ${c.label?.trim() ?? `${c.atom_ids.length} atoms`}`, "", sources, "", `<!-- ECHO cluster ${c.cluster_id} -->`].join("\n");
}

function titleForMatch(m: SearchMatch): string {
  const firstLine = m.content.split("\n").find((line) => line.trim().length > 0) ?? "";
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}...` : firstLine || "(empty)";
}

function narrativeForMatch(m: SearchMatch): string {
  switch (derivedApp(m.source)) {
    case "git": return "committed to repo";
    case "cursor": return "while editing";
    case "claude_code": return "in conversation with Claude";
    case "codex": return "asked Codex";
    default: return "captured atom";
  }
}

async function pasteCluster(cluster: FindClustersCluster, primary: PrimaryDetection | null) {
  try {
    const outcome = await pasteIntoFrontmost({ question: cluster.label ?? "cluster", answer: clusterBundleMarkdown(cluster) });
    await showLaunchToast(outcome);
  } catch (err) {
    await showToast({ style: Toast.Style.Failure, title: "Paste failed", message: err instanceof Error ? err.message : String(err) });
  }
  void primary;
}

async function showDaemonToast() {
  await showToast({ style: Toast.Style.Failure, title: "ECHO daemon unreachable", message: "Check 'npm run daemon' in Project_echo" });
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

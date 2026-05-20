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
import { useEffect, useMemo, useState } from "react";
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
  getAtoms,
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
  const clusterPreviews = useClusterPreviews(clusters);
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
    <ClusterRow
      key={cluster.cluster_id}
      cluster={cluster}
      previews={clusterPreviews.get(cluster.cluster_id) ?? null}
      primary={primary}
      onAsk={runAsk}
    />
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

const CLUSTER_PREVIEW_ATOMS_PER_CLUSTER = 3;

// Fetches the first N atom bodies per cluster in a single batched get_atoms
// call so ClusterRow's detail panel can show actual evidence instead of just
// `source_breakdown` counts. Fingerprint keyed on (cluster_id, sampled atom
// ids) — re-fetches only when the cluster set or the sampled ids change.
function useClusterPreviews(clusters: readonly FindClustersCluster[]): Map<string, EchoAtom[]> {
  const [previews, setPreviews] = useState<Map<string, EchoAtom[]>>(new Map());
  const sample = useMemo(
    () => clusters.map((c) => ({ cluster_id: c.cluster_id, ids: c.atom_ids.slice(0, CLUSTER_PREVIEW_ATOMS_PER_CLUSTER) })),
    [clusters],
  );
  const fingerprint = useMemo(
    () => sample.map((s) => `${s.cluster_id}:${s.ids.join("|")}`).join(","),
    [sample],
  );
  useEffect(() => {
    const uniqueIds = Array.from(new Set(sample.flatMap((s) => s.ids)));
    if (uniqueIds.length === 0) {
      setPreviews(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await getAtoms(uniqueIds);
        if (cancelled) return;
        const byId = new Map(r.atoms.map((a) => [a.id, a]));
        const next = new Map<string, EchoAtom[]>();
        for (const s of sample) {
          const atoms = s.ids.map((id) => byId.get(id)).filter((a): a is EchoAtom => Boolean(a));
          if (atoms.length > 0) next.set(s.cluster_id, atoms);
        }
        setPreviews(next);
      } catch {
        // Best-effort. Detail panel falls back to metadata-only when previews are empty.
      }
    })();
    return () => { cancelled = true; };
  // sample is derived from fingerprint; the effect re-runs when the fingerprint changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
  return previews;
}

function ClusterRow({ cluster, previews, primary, onAsk }: { cluster: FindClustersCluster; previews: readonly EchoAtom[] | null; primary: PrimaryDetection | null; onAsk: (query: string) => void }) {
  const askQuery = cluster.label?.trim().length ? `tell me about "${cluster.label.trim()}"` : "summarize this cluster";
  const isOpenLoop = cluster.rank_reason.includes("has_open_loop");
  const titleText = cluster.label?.trim() || atomsLabel(cluster.atom_ids.length);
  const sourcesSummary = sourceBreakdownSummary(cluster.source_breakdown);
  const subtitle = [isOpenLoop ? "Open loop" : null, sourcesSummary].filter((s) => s !== null && s.length > 0).join(" · ");
  const bundle = clusterBundleMarkdown(cluster, previews);
  return (
    <List.Item
      icon={appIconFor(dominantApp(cluster))}
      title={titleText}
      subtitle={subtitle.length > 0 ? subtitle : atomsLabel(cluster.atom_ids.length)}
      accessories={[{ text: formatRelativeTime(cluster.time_range.to), tooltip: formatPdtTimestamp(cluster.time_range.to) }]}
      detail={<List.Item.Detail markdown={bundle} />}
      actions={
        <ActionPanel>
          <Action title="Ask ECHO about This Cluster" icon={Icon.Stars} onAction={() => onAsk(askQuery)} />
          <Action.CopyToClipboard title="Copy Bundle" icon={Icon.Clipboard} content={bundle} />
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
      accessories={matchAccessories(match)}
      detail={<List.Item.Detail markdown={matchDetailMarkdown(match)} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Atom" icon={Icon.Clipboard} content={formatAtomBundle([match as unknown as EchoAtom])} />
          <Action.Paste title="Paste in Frontmost App" icon={Icon.ArrowDown} content={formatAtomBundle([match as unknown as EchoAtom])} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
        </ActionPanel>
      }
    />
  );
}

const INTERESTING_METADATA_KEYS = ["session_id", "composer_id", "workspace_id", "repo_root", "role", "model", "file", "path", "branch", "tool", "type"] as const;

function matchAccessories(match: SearchMatch): { text: string; tooltip?: string }[] {
  const acc: { text: string; tooltip?: string }[] = [];
  if ((match.truncations ?? []).length > 0) {
    acc.push({ text: "…", tooltip: `truncated: ${(match.truncations ?? []).join(", ")}` });
  }
  acc.push({ text: formatRelativeTime(match.timestamp), tooltip: formatPdtTimestamp(match.timestamp) });
  return acc;
}

function matchDetailMarkdown(match: SearchMatch): string {
  const headerLines: string[] = [];
  headerLines.push(`_${formatPdtTimestamp(match.timestamp)} · \`${match.source}\`_`);
  const metaPairs: string[] = [];
  for (const key of INTERESTING_METADATA_KEYS) {
    const raw = match.metadata?.[key];
    if (raw === undefined || raw === null) continue;
    const value = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (value.length === 0) continue;
    const trimmed = value.length > 80 ? `${value.slice(0, 80)}…` : value;
    metaPairs.push(`\`${key}\`: ${trimmed}`);
  }
  if (metaPairs.length > 0) headerLines.push(`_${metaPairs.join(" · ")}_`);
  const truncations = match.truncations ?? [];
  if (truncations.length > 0) {
    headerLines.push(`> ⚠️ Truncated: ${truncations.join(", ")}${match.bytes_elided ? ` (~${match.bytes_elided}B elided)` : ""}`);
  }
  return [...headerLines, "", "---", "", match.content].join("\n");
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

function atomsLabel(n: number): string {
  return n === 1 ? "1 atom" : `${n} atoms`;
}

function sourceBreakdownSummary(breakdown: Record<string, number>): string {
  return Object.entries(breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `${APP_META[app as DerivedApp]?.label ?? app}×${n}`)
    .join(" · ");
}

const CLUSTER_PREVIEW_SNIPPET_CHARS = 280;

function clusterPreviewSnippet(content: string | undefined): string {
  const text = (content ?? "").trim();
  if (text.length === 0) return "_(empty atom)_";
  const collapsed = text.replace(/\s+/g, " ");
  return collapsed.length > CLUSTER_PREVIEW_SNIPPET_CHARS
    ? `${collapsed.slice(0, CLUSTER_PREVIEW_SNIPPET_CHARS)}…`
    : collapsed;
}

function clusterBundleMarkdown(c: FindClustersCluster, previews: readonly EchoAtom[] | null): string {
  const title = c.label?.trim() || atomsLabel(c.atom_ids.length);
  const isOpenLoop = c.rank_reason.includes("has_open_loop");
  const breakdown = sourceBreakdownSummary(c.source_breakdown);
  const span = `${formatPdtTimestamp(c.time_range.from)} → ${formatPdtTimestamp(c.time_range.to)}`;
  const metaLine = [isOpenLoop ? "Open loop" : null, atomsLabel(c.atom_ids.length), breakdown, span]
    .filter((s) => s !== null && s.length > 0)
    .join(" · ");
  const otherReasons = c.rank_reason.filter((r) => r !== "has_open_loop");
  const whyLine = otherReasons.length > 0 ? `_why: ${otherReasons.join(", ")}_` : "";

  let evidenceBlock: string;
  if (previews === null) {
    evidenceBlock = "_loading preview…_";
  } else if (previews.length === 0) {
    evidenceBlock = "_(no atom preview available)_";
  } else {
    evidenceBlock = previews
      .map((a) => {
        const appLabel = APP_META[derivedApp(a.source)]?.label ?? derivedApp(a.source);
        const truncated = (a.truncations ?? []).length > 0 ? " · _truncated_" : "";
        return `### ${appLabel} · ${formatPdtTimestamp(a.timestamp)}${truncated}\n\n${clusterPreviewSnippet(a.content)}`;
      })
      .join("\n\n");
    const remaining = c.atom_ids.length - previews.length;
    if (remaining > 0) evidenceBlock += `\n\n_+${remaining} more atom${remaining === 1 ? "" : "s"} in this cluster_`;
  }

  const lines = [`# ${title}`, "", `_${metaLine}_`];
  if (whyLine.length > 0) lines.push(whyLine);
  lines.push("", "**Preview**", "", evidenceBlock, "", `<!-- ECHO cluster ${c.cluster_id} -->`);
  return lines.join("\n");
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
    const outcome = await pasteIntoFrontmost({ question: cluster.label ?? "cluster", answer: clusterBundleMarkdown(cluster, null) });
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

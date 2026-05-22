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
  formatHeroLine,
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
import { EmptyState, agentIcon } from "./components/EmptyState";
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

export interface RunAskOptions {
  forkedFrom?: string | null;
  clusterId?: string;
  forceFreshAgent?: boolean;
}

export default function EchoContext() {
  const [query, setQuery] = useState("");
  // Default detail panel CLOSED so list rows get full Raycast width — without
  // this, titles like "Statellite_Detection" get truncated to "Sta...". The
  // founder can flip detail on per-row via the "Toggle Detail" action
  // (cmd-shift-d) on any cluster/atom row.
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = () => setShowDetail((v) => !v);
  const { push } = useNavigation();
  const preferences = getPreferenceValues<EchoPreferences>();
  const agentKind = normalizeAgentKind(preferences.agentKind);
  const repoPath = expandHome(preferences.repoPath ?? DEFAULT_REPO_PATH);
  const { clusters, isLoadingClusters } = useClusters();
  const clusterPreviews = useClusterPreviews(clusters);
  const { matches, isLoadingMatches } = useMatches(query);
  const primary = usePrimary();
  const { sessions, refresh: refreshSessions } = useSessions();

  function openSessions() {
    push(<SessionsList onForkSession={openFork} onNewAsk={newAsk} onOpenSessions={openSessions} />);
  }
  function openSession(session: Session) {
    push(<SessionDetail session={session} onFork={openFork} onNewAsk={newAsk} onOpenSessions={openSessions} />);
  }
  function openFork(session: Session) {
    push(<ForkTypingState source={session} agentKind={agentKind} onAsk={runAsk} onOpenSessions={openSessions} showDetail={showDetail} />);
  }
  function newAsk() {
    setQuery("");
    popToRoot({ clearSearchBar: true });
  }
  function runAsk(question: string, options: RunAskOptions = {}) {
    push(
      <AnswerView
        query={question}
        agentKind={agentKind}
        preferences={preferences}
        repoPath={repoPath}
        forkedFrom={options.forkedFrom}
        clusterId={options.clusterId}
        forceFreshAgent={options.forceFreshAgent}
        onOpenSessions={openSessions}
        onSessionChanged={() => void refreshSessions()}
        onAskAgainFromCluster={(cid) => runAsk(question, { clusterId: cid, forceFreshAgent: true })}
      />,
    );
  }

  const renderCluster = (cluster: FindClustersCluster) => (
    <ClusterRow
      key={cluster.cluster_id}
      cluster={cluster}
      previews={clusterPreviews.get(cluster.cluster_id) ?? null}
      primary={primary}
      sessions={sessions}
      onAsk={runAsk}
      onToggleDetail={toggleDetail}
    />
  );
  const renderHeroCluster = (cluster: FindClustersCluster, linkedSession: Session | null) => (
    <ClusterRow
      key={`hero-${cluster.cluster_id}`}
      cluster={cluster}
      previews={clusterPreviews.get(cluster.cluster_id) ?? null}
      primary={primary}
      sessions={sessions}
      onAsk={runAsk}
      onToggleDetail={toggleDetail}
      heroPresentation={buildHeroPresentation(cluster, linkedSession)}
    />
  );
  const renderMatch = (match: SearchMatch) => <MatchRow key={match.id} match={match} onToggleDetail={toggleDetail} />;

  if (query.length === 0) {
    return (
      <EmptyState
        query={query}
        setQuery={setQuery}
        clusters={clusters}
        isLoading={isLoadingClusters}
        sessions={sessions}
        renderHeroCluster={renderHeroCluster}
        onOpenSession={openSession}
        onOpenSessions={openSessions}
        onForkSession={openFork}
        showDetail={showDetail}
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
      showDetail={showDetail}
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

const CLUSTER_PREVIEW_ATOMS_PER_CLUSTER = 10;
const CLUSTER_ATOM_FETCH_CAP = 50; // get_atoms maxItems

// Fetches the N most-recent atom bodies per cluster for both the visual
// evidence sample and the aggregation window (files/tools meta lines).
// `find_clusters` returns atom_ids sorted lexicographically by UUID — useless
// for recency. We pass up to 50 atom_ids with `prefer: "newest_first"` so
// the daemon sorts by timestamp DESC; we keep the first N from the returned
// order. Fingerprint keyed on (cluster_id, sampled atom ids).
function useClusterPreviews(clusters: readonly FindClustersCluster[]): Map<string, EchoAtom[]> {
  const [previews, setPreviews] = useState<Map<string, EchoAtom[]>>(new Map());
  const sample = useMemo(
    () => clusters.map((c) => ({ cluster_id: c.cluster_id, ids: c.atom_ids.slice(-CLUSTER_ATOM_FETCH_CAP) })),
    [clusters],
  );
  const fingerprint = useMemo(
    () => sample.map((s) => `${s.cluster_id}:${s.ids.join("|")}`).join(","),
    [sample],
  );
  useEffect(() => {
    if (sample.length === 0) {
      setPreviews(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, EchoAtom[]>();
      // Per-cluster fetch with newest_first so each cluster's recency contract
      // is honored independently (a single batched call would mix clusters).
      await Promise.all(sample.map(async (s) => {
        if (s.ids.length === 0) return;
        try {
          const r = await getAtoms(s.ids, { prefer: "newest_first" });
          if (cancelled) return;
          const recent = r.atoms.slice(0, CLUSTER_PREVIEW_ATOMS_PER_CLUSTER);
          if (recent.length > 0) next.set(s.cluster_id, recent);
        } catch {
          // Best-effort per cluster; detail panel falls back to metadata-only when empty.
        }
      }));
      if (!cancelled) setPreviews(next);
    })();
    return () => { cancelled = true; };
  // sample is derived from fingerprint; the effect re-runs when the fingerprint changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
  return previews;
}

export interface ClusterResumeState {
  primaryActionTitle: string;
  primaryActionIcon: Icon;
  resumeChip: { text: string; tooltip?: string } | null;
}

interface ClusterAccessory {
  text: string;
  tooltip?: string;
}

interface ClusterHeroPresentation {
  title: string;
  subtitle: string;
  linkedSession: Session | null;
  accessory: ClusterAccessory;
}

const CLUSTER_RESUME_STATUSES: ReadonlyArray<Session["status"]> = ["running", "done"];

export function deriveClusterResumeState(cluster: FindClustersCluster, sessions: readonly Session[]): ClusterResumeState {
  const latest = sessions.find((s) => s.clusterId === cluster.cluster_id && CLUSTER_RESUME_STATUSES.includes(s.status));
  if (latest === undefined) {
    return {
      primaryActionTitle: "Ask ECHO about This Cluster",
      primaryActionIcon: Icon.Stars,
      resumeChip: null,
    };
  }
  if (latest.status === "running") {
    return {
      primaryActionTitle: "Open Prior Answer",
      primaryActionIcon: Icon.Document,
      resumeChip: { text: "Running", tooltip: `started ${formatRelativeTime(latest.startedAt)}` },
    };
  }
  return {
    primaryActionTitle: "Open Prior Answer",
    primaryActionIcon: Icon.Document,
    resumeChip: { text: `Answered ${formatRelativeTime(latest.completedAt ?? latest.startedAt)}` },
  };
}

export function unresolvedOpenLoopCount(cluster: FindClustersCluster): number {
  return (cluster.open_loop_hints ?? []).filter((h) => h.resolved === false).length;
}

function buildHeroPresentation(cluster: FindClustersCluster, linkedSession: Session | null): ClusterHeroPresentation {
  const app = dominantApp(cluster);
  const sourceSummary = sourceBreakdownSummary(cluster.source_breakdown);
  return {
    title: formatHeroLine(cluster.label, unresolvedOpenLoopCount(cluster)),
    subtitle: formatRelativeTime(cluster.time_range.to),
    linkedSession,
    accessory: linkedSession !== null
      ? { text: linkedSession.agentKind, tooltip: `linked session started ${formatRelativeTime(linkedSession.startedAt)}` }
      : { text: APP_META[app].label, tooltip: sourceSummary.length > 0 ? sourceSummary : undefined },
  };
}

export function ClusterRow({
  cluster,
  previews,
  primary,
  sessions,
  onAsk,
  onToggleDetail,
  heroPresentation,
}: {
  cluster: FindClustersCluster;
  previews: readonly EchoAtom[] | null;
  primary: PrimaryDetection | null;
  sessions: readonly Session[];
  onAsk: (query: string, options?: RunAskOptions) => void;
  onToggleDetail: () => void;
  heroPresentation?: ClusterHeroPresentation;
}) {
  const askQuery = cluster.label?.trim().length ? `tell me about "${cluster.label.trim()}"` : "summarize this cluster";
  const titleText = displayLabel(cluster.label) ?? labelFromPreviews(previews) ?? atomsLabel(cluster.atom_ids.length);
  const sourcesSummary = sourceBreakdownSummary(cluster.source_breakdown);
  const subtitle = sourcesSummary.length > 0 ? sourcesSummary : atomsLabel(cluster.atom_ids.length);
  const bundle = clusterBundleMarkdown(cluster, previews);
  const resume = deriveClusterResumeState(cluster, sessions);

  // With detail panel closed by default, rows get the full Raycast width and
  // can carry several accessory chips comfortably: open-loop status, dominant
  // file (when one clearly dominates), session-resume state (when a prior
  // cluster session exists), and recency. Each is gated on meaningful data
  // so empty/codex-only clusters don't get spurious chips.
  const accessories = heroPresentation !== undefined
    ? [heroPresentation.accessory]
    : clusterAccessories(cluster, previews, resume);


  return (
    <List.Item
      icon={heroPresentation?.linkedSession !== undefined && heroPresentation.linkedSession !== null ? agentIcon(heroPresentation.linkedSession.agentKind) : appIconFor(dominantApp(cluster))}
      title={heroPresentation?.title ?? titleText}
      subtitle={heroPresentation?.subtitle ?? subtitle}
      accessories={accessories}
      detail={<List.Item.Detail markdown={bundle} />}
      actions={
        <ActionPanel>
          <Action title={resume.primaryActionTitle} icon={resume.primaryActionIcon} onAction={() => onAsk(askQuery, { clusterId: cluster.cluster_id })} />
          <Action title="Ask Again from This Cluster" icon={Icon.RotateClockwise} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} onAction={() => onAsk(askQuery, { clusterId: cluster.cluster_id, forceFreshAgent: true })} />
          <Action.CopyToClipboard title="Copy Bundle" icon={Icon.Clipboard} content={bundle} />
          <Action title="Paste in Frontmost App" icon={Icon.ArrowDown} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} onAction={() => void pasteCluster(cluster, primary)} />
          <Action title="Toggle Detail Panel" icon={Icon.Sidebar} shortcut={{ modifiers: ["cmd", "shift"], key: "d" }} onAction={onToggleDetail} />
        </ActionPanel>
      }
    />
  );
}

function clusterAccessories(
  cluster: FindClustersCluster,
  previews: readonly EchoAtom[] | null,
  resume: ClusterResumeState,
): ClusterAccessory[] {
  const accessories: ClusterAccessory[] = [];
  const loopChip = openLoopChipText(cluster);
  if (loopChip !== null) {
    const stats = openLoopStats(cluster);
    accessories.push({
      text: loopChip,
      tooltip: stats !== null ? `${stats.total} open-loop hint${stats.total === 1 ? "" : "s"} (${stats.unresolved} unresolved)` : undefined,
    });
  }
  const fileChip = dominantFileChipText(previews);
  if (fileChip !== null) {
    const top = topFilesFromPreviews(previews, 1)[0];
    accessories.push({ text: fileChip, tooltip: top !== undefined ? `${top.path} (${top.count}× across recent atoms)` : undefined });
  }
  if (resume.resumeChip !== null) {
    accessories.push(resume.resumeChip);
  }
  accessories.push({ text: formatRelativeTime(cluster.time_range.to), tooltip: formatPdtTimestamp(cluster.time_range.to) });
  return accessories;
}

function MatchRow({ match, onToggleDetail }: { match: SearchMatch; onToggleDetail: () => void }) {
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
          <Action title="Toggle Detail Panel" icon={Icon.Sidebar} shortcut={{ modifiers: ["cmd", "shift"], key: "d" }} onAction={onToggleDetail} />
        </ActionPanel>
      }
    />
  );
}

const INTERESTING_METADATA_KEYS = ["session_id", "composer_id", "workspace_id", "repo_root", "role", "model", "reasoning_effort", "is_continuation", "context", "thinking", "file", "path", "branch", "tool", "type"] as const;

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

// The daemon's auto-labeler emits "discussion about <X>" for nearly every
// cluster. In Raycast's narrow dock width that 16-char prefix consumes the
// budget that should land the differentiating part of the label, so every
// row ends up rendered as "dis..." — strip it client-side. The full label
// is still available via `cluster.label` for ask-query construction.
function displayLabel(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/^discussion about\s+/i, "").trim();
  return stripped.length > 0 ? stripped : trimmed;
}

// When the daemon's labeler returns null (small or mixed clusters), derive a
// label from previews in two passes: (1) dominant `repo_root` basename when
// available — works for claude_code + codex atoms, skips temp working trees;
// (2) first non-empty USER line of the most-recent preview content — works
// for cursor atoms (which lack repo_root because the extractor doesn't
// resolve workspace_id → folder name yet) and any other source where
// repo_root isn't populated. Pass (2) is truncated to ~40 chars so it fits
// the row title without crowding the chips. Daemon-side fix for cursor
// repo_root is V1.5+ (see backlog/_followups.md).
function labelFromPreviews(previews: readonly EchoAtom[] | null): string | null {
  if (previews === null || previews.length === 0) return null;

  // Pass 1: dominant repo_root basename.
  const counts = new Map<string, number>();
  for (const a of previews) {
    const root = (a.metadata as { repo_root?: unknown } | undefined)?.repo_root;
    if (typeof root !== "string" || root.length === 0) continue;
    if (/\/var\/folders\/|\/private\/var\/folders\/|\/tmp\//.test(root)) continue;
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top !== undefined) {
    const basename = top[0].split("/").filter((s) => s.length > 0).pop();
    if (basename !== undefined && basename.length > 0) return basename;
  }

  // Pass 2: first non-empty USER line from the most-recent preview.
  for (const a of previews) {
    const content = (a.content ?? "").trim();
    if (content.length === 0) continue;
    let body = content;
    if (body.startsWith("USER:")) body = body.slice("USER:".length).trimStart();
    const firstLine = body.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
    if (firstLine.length === 0) continue;
    return firstLine.length > 40 ? `${firstLine.slice(0, 39)}…` : firstLine;
  }

  return null;
}

function sourceBreakdownSummary(breakdown: Record<string, number>): string {
  return Object.entries(breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `${APP_META[app as DerivedApp]?.label ?? app}×${n}`)
    .join(" · ");
}

function openLoopStats(cluster: FindClustersCluster): { total: number; unresolved: number } | null {
  const hints = cluster.open_loop_hints ?? [];
  if (hints.length === 0) return null;
  const unresolved = hints.filter((h) => h.resolved === false).length;
  return { total: hints.length, unresolved };
}

function openLoopChipText(cluster: FindClustersCluster): string | null {
  const stats = openLoopStats(cluster);
  if (stats === null) return null;
  return stats.unresolved > 0 ? `⚠ ${stats.unresolved}/${stats.total} open` : `✓ ${stats.total}/${stats.total}`;
}

const FILES_DOMINANCE_THRESHOLD = 3;

function topFilesFromPreviews(previews: readonly EchoAtom[] | null, limit = 3): { path: string; count: number }[] {
  if (previews === null || previews.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of previews) {
    const files = (a.metadata as { files_referenced?: unknown } | undefined)?.files_referenced;
    if (!Array.isArray(files)) continue;
    for (const f of files) {
      if (typeof f !== "string" || f.length === 0) continue;
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }));
}

function dominantFileChipText(previews: readonly EchoAtom[] | null): string | null {
  const top = topFilesFromPreviews(previews, 1)[0];
  if (top === undefined || top.count < FILES_DOMINANCE_THRESHOLD) return null;
  return `📄 ${shortFileLabel(top.path)}`;
}

function shortFileLabel(path: string): string {
  const parts = path.split("/").filter((s) => s.length > 0);
  const basename = parts[parts.length - 1] ?? path;
  const lastTwo = parts.slice(-2).join("/");
  // Keep `parent/basename` when it stays short (preserves disambiguation
  // like `src/echo.tsx`). Drop the parent when the combo exceeds 18 chars
  // — at that point the parent is usually redundant with the row title
  // (e.g., `Statellite_Detection/.gitignore` → just `.gitignore`).
  if (lastTwo.length <= 18) return lastTwo;
  return basename.length > 22 ? `${basename.slice(0, 21)}…` : basename;
}

function topToolsFromPreviews(previews: readonly EchoAtom[] | null, limit = 4): { tool: string; n: number }[] {
  if (previews === null || previews.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of previews) {
    const tools = (a.metadata as { tool_calls_by_name?: unknown } | undefined)?.tool_calls_by_name;
    if (typeof tools !== "object" || tools === null) continue;
    for (const [tool, n] of Object.entries(tools as Record<string, unknown>)) {
      if (typeof n !== "number" || n <= 0) continue;
      counts.set(tool, (counts.get(tool) ?? 0) + n);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tool, n]) => ({ tool, n }));
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
  const title = displayLabel(c.label) ?? labelFromPreviews(previews) ?? atomsLabel(c.atom_ids.length);
  const stats = openLoopStats(c);
  const loopMeta = stats !== null
    ? (stats.unresolved > 0 ? `Open loop (${stats.unresolved}/${stats.total} unresolved)` : `Open loop (${stats.total}/${stats.total} resolved)`)
    : null;
  const breakdown = sourceBreakdownSummary(c.source_breakdown);
  const span = `${formatPdtTimestamp(c.time_range.from)} → ${formatPdtTimestamp(c.time_range.to)}`;
  const metaLine = [loopMeta, atomsLabel(c.atom_ids.length), breakdown, span]
    .filter((s) => s !== null && s.length > 0)
    .join(" · ");
  const otherReasons = (c.rank_reason ?? []).filter((r) => r !== "has_open_loop");
  const whyLine = otherReasons.length > 0 ? `_why: ${otherReasons.join(", ")}_` : "";

  const topFiles = topFilesFromPreviews(previews, 3);
  const filesLine = topFiles.length > 0
    ? `_📄 ${topFiles.map((f) => `${shortFileLabel(f.path)} (${f.count}×)`).join(" · ")}_`
    : "";
  const topTools = topToolsFromPreviews(previews, 4);
  const toolsLine = topTools.length > 0
    ? `_🔧 ${topTools.map((t) => `${t.tool}×${t.n}`).join(" · ")}_`
    : "";

  const VISUAL_PREVIEW_CAP = 3;
  let evidenceBlock: string;
  if (previews === null) {
    evidenceBlock = "_loading preview…_";
  } else if (previews.length === 0) {
    evidenceBlock = "_(no atom preview available)_";
  } else {
    const visualPreviews = previews.slice(0, VISUAL_PREVIEW_CAP);
    evidenceBlock = visualPreviews
      .map((a) => {
        const appLabel = APP_META[derivedApp(a.source)]?.label ?? derivedApp(a.source);
        const truncated = (a.truncations ?? []).length > 0 ? " · _truncated_" : "";
        return `### ${appLabel} · ${formatPdtTimestamp(a.timestamp)}${truncated}\n\n${clusterPreviewSnippet(a.content)}`;
      })
      .join("\n\n");
    const remaining = c.atom_ids.length - visualPreviews.length;
    if (remaining > 0) evidenceBlock += `\n\n_+${remaining} more atom${remaining === 1 ? "" : "s"} in this cluster_`;
  }

  // Blank lines between meta blocks force markdown to render each as its own
  // paragraph; without them, adjacent `_..._` lines collapse into a single
  // run-on paragraph in Raycast's renderer.
  const lines = [`# ${title}`, "", `_${metaLine}_`];
  if (whyLine.length > 0) lines.push("", whyLine);
  if (filesLine.length > 0) lines.push("", filesLine);
  if (toolsLine.length > 0) lines.push("", toolsLine);
  lines.push("", "**Preview**", "", evidenceBlock);
  return lines.join("\n");
}

function titleForMatch(m: SearchMatch): string {
  // Source-aware first-line extraction. Codex bakes USER + ASSISTANT into a
  // single content string per turn-pair (see daemon-side codex.ts turn-pair
  // assembly); the naive first-line scan would land on the USER prompt's
  // first line, which for tool/reviewer ticks is a verbose system-prompt
  // prefix. Skip past the ASSISTANT: marker when present so the title
  // reflects what the agent actually said. Other sources fall through to the
  // existing first-non-empty-line behavior.
  let body = m.content;
  if (derivedApp(m.source) === "codex") {
    const idx = body.indexOf("\nASSISTANT:");
    if (idx !== -1) body = body.slice(idx + "\nASSISTANT:".length);
  }
  const firstLine = body.split("\n").find((line) => line.trim().length > 0) ?? "";
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

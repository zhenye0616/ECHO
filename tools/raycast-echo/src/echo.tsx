// echo.tsx — ECHO unified overlay (⌘⇧E).
//
// Implements "Direction C — sticky launch footer" from the ECHO Unified
// Overlay v2 design handoff (api.anthropic.com/v1/design/h/RUJMrBiUzdvBv9LgCVL2Jw).
//
// One omnibox surface:
//   • Empty input → Open loops · Today · Recent asks
//   • Typing      → synthetic "Ask ECHO about <query>" row + matching clusters/atoms
//   • Ask answer  → streamed agent output + evidence + launch row in the ActionPanel
//   • Cluster     → existing cluster-detail behavior + "Ask about this" bridge
//
// Raycast doesn't expose a true sticky-footer primitive, so the launch row is
// expressed as: (1) primary actions in the answer view's ActionPanel (↩, ⌘1,
// ⌘2, ⌘3, ⌘⇧C), and (2) a closing "Launch with this context" block at the
// bottom of the markdown body. Together they give the launch action the
// visual + keyboard gravity the design calls for.

import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  useNavigation,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  derivedApp,
  formatAtomBundle,
  formatPdtTimestamp,
  type DerivedApp,
  type EchoAtom,
} from "./lib/format";
import {
  type FindClustersCluster,
  type SearchMatch,
  EchoDaemonError,
  findClusters,
  getAtoms,
  searchMemories,
} from "./lib/mcp";
import {
  detectPrimary,
  launchTo,
  pasteIntoFrontmost,
  showLaunchToast,
  type LaunchTargetId,
  type PrimaryDetection,
} from "./lib/launch";
import { useRecentAsks, type RecentAsk } from "./lib/recent-asks";
import {
  resolveAgentInvocation,
  type AgentInvocation,
  AgentProfileError,
} from "./lib/agent-profiles";
import {
  findExecutable,
  probeEchoDaemon,
  startAgent,
  type AgentRun,
} from "./lib/agent-runner";
import { buildUnifiedAskPrompt } from "./lib/system-prompt";
import { fetchRecentCalls, type AuditCall } from "./lib/audit";
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";

// ============================================================
// Constants
// ============================================================
const DEFAULT_REPO_PATH = "~/Desktop/Project_echo";
const FLUSH_INTERVAL_MS = 80;

const APP_META: Record<
  DerivedApp,
  { label: string; color: { light: string; dark: string }; icon: Icon }
> = {
  claude_code: { label: "Claude", color: { light: "#d97757", dark: "#d97757" }, icon: Icon.Stars },
  cursor: { label: "Cursor", color: { light: "#3b82f6", dark: "#3b82f6" }, icon: Icon.Code },
  codex: { label: "Codex", color: { light: "#a855f7", dark: "#a855f7" }, icon: Icon.Terminal },
  git: { label: "Git", color: { light: "#f1502f", dark: "#f1502f" }, icon: Icon.CodeBlock },
  unknown: { label: "Atom", color: { light: "#6e6e73", dark: "#a1a1a6" }, icon: Icon.Dot },
};

const ASK_TINT = { light: "#ff6363", dark: "#ff6363" };
const LAUNCH_TINT: Record<LaunchTargetId, { light: string; dark: string }> = {
  cursor: { light: "#3b82f6", dark: "#3b82f6" },
  claude_app: { light: "#d97757", dark: "#d97757" },
  claude_web: { light: "#d97757", dark: "#d97757" },
  chatgpt: { light: "#10a37f", dark: "#10a37f" },
  copy: { light: "#9ca3af", dark: "#9ca3af" },
};

interface EchoPreferences {
  agentKind?: string;
  customCommand?: string;
  repoPath?: string;
  claudeOauthToken?: string;
}

// ============================================================
// Helpers shared with search-context.tsx (kept inline to avoid
// disturbing the legacy command's file during this rollout)
// ============================================================
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function isDerivedApp(value: string): value is DerivedApp {
  return value === "cursor" || value === "claude_code" || value === "codex" || value === "git" || value === "unknown";
}

function dominantApp(c: FindClustersCluster): DerivedApp {
  let best: DerivedApp = "unknown";
  let bestN = -1;
  for (const [app, n] of Object.entries(c.source_breakdown)) {
    if (n > bestN && isDerivedApp(app)) {
      bestN = n;
      best = app;
    }
  }
  return best;
}

function formatRelTime(iso: string, now = Date.now()): string {
  const dt = now - new Date(iso).getTime();
  if (dt < MIN) return "just now";
  if (dt < HOUR) return `${Math.floor(dt / MIN)}m`;
  if (dt < DAY) return `${Math.floor(dt / HOUR)}h`;
  return `${Math.floor(dt / DAY)}d`;
}

function appIconFor(app: DerivedApp) {
  const m = APP_META[app];
  return { source: m.icon, tintColor: m.color };
}

function narrativeForCluster(c: FindClustersCluster): string {
  const dom = dominantApp(c);
  const label = APP_META[dom].label;
  if (c.rank_reason.includes("has_open_loop")) return `Open loop — last touched in ${label}`;
  if (c.rank_reason.includes("dense")) return `${c.atom_ids.length} atoms, mostly in ${label}`;
  return `Recent activity in ${label}`;
}

function narrativeForMatch(m: SearchMatch): string {
  switch (derivedApp(m.source)) {
    case "git": return `committed to ${repoName(m.source)}`;
    case "cursor": return `while editing ${basename(m.source)}`;
    case "claude_code": return "in conversation with Claude";
    case "codex": return "asked Codex";
    default: return "captured atom";
  }
}

function repoName(source: string): string {
  const m = source.match(/git:.*?\/([^/#]+?)(?:\.git)?(?:#.*)?$/);
  return m?.[1] ?? "repo";
}

function basename(source: string): string {
  const m = source.match(/([^/]+)$/);
  return m?.[1] ?? source;
}

function titleForMatch(m: SearchMatch): string {
  const firstLine = m.content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.length > 90 ? firstLine.slice(0, 90) + "…" : firstLine || "(empty)";
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

function isOpenLoop(c: FindClustersCluster): boolean {
  return c.rank_reason.includes("has_open_loop");
}

function isToday(c: FindClustersCluster, now = Date.now()): boolean {
  const t = new Date(c.time_range.to).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return t >= today.getTime();
}

// ============================================================
// Data hooks
// ============================================================
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return d;
}

async function showDaemonToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "ECHO daemon unreachable",
    message: "Check 'npm run daemon' in Project_echo",
  });
}

function useClusters() {
  const [clusters, setClusters] = useState<FindClustersCluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await findClusters();
        if (!cancelled) {
          setClusters(r.clusters);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { clusters, isLoadingClusters: isLoading };
}

function useMatches(query: string) {
  const debounced = useDebouncedValue(query, 200);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        if (!cancelled) {
          setMatches(r.matches);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsLoading(false);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);
  return { matches, isLoadingMatches: isLoading };
}

function usePrimary(): PrimaryDetection | null {
  const [primary, setPrimary] = useState<PrimaryDetection | null>(null);
  useEffect(() => { void detectPrimary().then(setPrimary); }, []);
  return primary;
}

// ============================================================
// Main view
// ============================================================
export default function EchoContext() {
  const [query, setQuery] = useState("");
  const { clusters, isLoadingClusters } = useClusters();
  const { matches, isLoadingMatches } = useMatches(query);
  const primary = usePrimary();
  const { items: recentAsks, record: recordAsk } = useRecentAsks();

  // ----- Empty input → Open loops · Today · Recent asks -----
  if (query.length === 0) {
    const openLoops = clusters.filter(isOpenLoop).slice(0, 3);
    const today = clusters.filter((c) => !isOpenLoop(c) && isToday(c)).slice(0, 5);
    return (
      <List
        searchText={query}
        onSearchTextChange={setQuery}
        filtering={false}
        throttle={false}
        isLoading={isLoadingClusters}
        searchBarPlaceholder="Ask anything, or search your memory…"
        isShowingDetail
      >
        {openLoops.length > 0 && (
          <List.Section title="Open loops" subtitle={`${openLoops.length}`}>
            {openLoops.map((c) => (
              <ClusterRow key={c.cluster_id} cluster={c} primary={primary} onLaunch={recordAsk} />
            ))}
          </List.Section>
        )}
        {today.length > 0 && (
          <List.Section title="Today" subtitle={`${today.length}`}>
            {today.map((c) => (
              <ClusterRow key={c.cluster_id} cluster={c} primary={primary} onLaunch={recordAsk} />
            ))}
          </List.Section>
        )}
        {recentAsks.length > 0 && (
          <List.Section title="Recent asks" subtitle={`${recentAsks.length}`}>
            {recentAsks.map((ra) => (
              <RecentAskRow key={ra.id} ask={ra} primary={primary} onLaunch={recordAsk} />
            ))}
          </List.Section>
        )}
        <List.EmptyView
          icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
          title="ECHO is listening."
          description="Nothing clustered yet. Open Cursor, start a Claude session, or make a commit — your context will appear within the minute."
        />
      </List>
    );
  }

  // ----- Typing → synthetic ask row + clusters + atoms -----
  const clusterMatches = clusters
    .filter((c) => (c.label?.toLowerCase().includes(query.toLowerCase()) ?? false))
    .slice(0, 5);
  const packetClusters = clusterMatches.length > 0 ? clusterMatches : clusters.slice(0, 3);
  const packetAtomCount = packetClusters.reduce((acc, c) => acc + c.atom_ids.length, 0);

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      throttle={false}
      isLoading={isLoadingMatches || isLoadingClusters}
      searchBarPlaceholder="Ask anything, or search your memory…"
      isShowingDetail
    >
      <List.Section title="Ask">
        <AskRow
          query={query}
          packetClusters={packetClusters.length}
          packetAtoms={packetAtomCount}
          primary={primary}
          onLaunch={recordAsk}
        />
      </List.Section>
      {clusterMatches.length > 0 && (
        <List.Section title="Clusters" subtitle={`${clusterMatches.length}`}>
          {clusterMatches.map((c) => (
            <ClusterRow key={c.cluster_id} cluster={c} primary={primary} onLaunch={recordAsk} />
          ))}
        </List.Section>
      )}
      {matches.length > 0 && (
        <List.Section title="Atoms" subtitle={`${matches.length}`}>
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </List.Section>
      )}
      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        title={`No atoms match "${query}"`}
        description={
          isLoadingMatches
            ? "Searching…"
            : "ECHO does keyword search. Press ⏎ on the Ask row above to synthesize from recent memory anyway."
        }
      />
    </List>
  );
}

// ============================================================
// The synthetic Ask row
// ============================================================
function AskRow({
  query,
  packetClusters,
  packetAtoms,
  primary,
  onLaunch,
}: {
  query: string;
  packetClusters: number;
  packetAtoms: number;
  primary: PrimaryDetection | null;
  onLaunch: (q: string, t: LaunchTargetId) => Promise<void>;
}) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [
    { tag: { value: `${packetClusters} clusters · ${packetAtoms} atoms`, color: ASK_TINT } },
  ];

  const detail = (
    <List.Item.Detail
      markdown={[
        `# Ask ECHO`,
        "",
        `_will synthesize from ${packetClusters} clusters · ${packetAtoms} atoms_`,
        "",
        `> "${query}"`,
        "",
        "Press ⏎ to synthesize. ECHO will produce a short answer, show the evidence it used, and offer a one-keystroke launch into Cursor / Claude / ChatGPT.",
        "",
        "**ECHO won't finish the work — your AI tool will.**",
      ].join("\n")}
    />
  );

  return (
    <List.Item
      icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
      title={`Ask ECHO about "${query}"`}
      subtitle="will synthesize from memory"
      accessories={accessories}
      detail={detail}
      actions={
        <ActionPanel>
          <Action
            title="Ask ECHO"
            icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
            onAction={() => push(<AnswerView query={query} primary={primary} onLaunch={onLaunch} />)}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================
// Cluster row (works in both empty + typing states)
// ============================================================
function ClusterRow({
  cluster,
  primary,
  onLaunch,
}: {
  cluster: FindClustersCluster;
  primary: PrimaryDetection | null;
  onLaunch: (q: string, t: LaunchTargetId) => Promise<void>;
}) {
  const { push } = useNavigation();
  const dom = dominantApp(cluster);
  const accessories: List.Item.Accessory[] = [];
  if (isOpenLoop(cluster)) {
    accessories.push({ icon: { source: Icon.RotateClockwise, tintColor: Color.Orange }, tooltip: "Open loop" });
  }
  accessories.push({ text: formatRelTime(cluster.time_range.to), tooltip: formatPdtTimestamp(cluster.time_range.to) });

  const askQuery = cluster.label?.trim().length
    ? `tell me about "${cluster.label.trim()}"`
    : "summarize this cluster";

  return (
    <List.Item
      icon={appIconFor(dom)}
      title={cluster.label?.trim() || `${cluster.atom_ids.length} atoms`}
      subtitle={narrativeForCluster(cluster)}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Atoms" text={`${cluster.atom_ids.length}`} />
              <List.Item.Detail.Metadata.Label
                title="Time range"
                text={`${formatPdtTimestamp(cluster.time_range.from)} – ${formatPdtTimestamp(cluster.time_range.to)}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Sources">
                {Object.entries(cluster.source_breakdown)
                  .filter(([, n]) => n > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([app, n]) => {
                    const meta = isDerivedApp(app) ? APP_META[app] : APP_META.unknown;
                    return (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={app}
                        text={`${meta.label} · ${n}`}
                        color={meta.color}
                      />
                    );
                  })}
              </List.Item.Detail.Metadata.TagList>
              {cluster.rank_reason.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Ranked by">
                  {cluster.rank_reason.map((r) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={r}
                      text={r.replace(/_/g, " ")}
                      color={r === "has_open_loop" ? Color.Orange : Color.SecondaryText}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Ask ECHO about This Cluster"
            icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
            onAction={() => push(<AnswerView query={askQuery} primary={primary} onLaunch={onLaunch} />)}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.CopyToClipboard
            title="Copy Bundle to Clipboard"
            content={clusterBundleMarkdown(cluster)}
            icon={Icon.Clipboard}
          />
          <Action.Paste
            title="Paste in Frontmost App"
            content={clusterBundleMarkdown(cluster)}
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

function clusterBundleMarkdown(c: FindClustersCluster): string {
  const sources = Object.entries(c.source_breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `- ${(isDerivedApp(app) ? APP_META[app].label : app)}: ${n}`)
    .join("\n");
  return [
    `# ${c.label?.trim() ?? `${c.atom_ids.length} atoms`}`,
    `_${formatPdtTimestamp(c.time_range.from)} – ${formatPdtTimestamp(c.time_range.to)} · ${c.atom_ids.length} atoms_`,
    "",
    `> ${narrativeForCluster(c)}`,
    "",
    sources,
    "",
    `<!-- ECHO cluster ${c.cluster_id} -->`,
  ].join("\n");
}

// ============================================================
// Match row — kept lightweight; deep inspect lives in search-context
// ============================================================
function MatchRow({ match }: { match: SearchMatch }) {
  const app = derivedApp(match.source);
  return (
    <List.Item
      icon={appIconFor(app)}
      title={titleForMatch(match)}
      subtitle={narrativeForMatch(match)}
      accessories={[{ text: formatRelTime(match.timestamp), tooltip: formatPdtTimestamp(match.timestamp) }]}
      detail={
        <List.Item.Detail
          markdown={[
            `**${match.source}**  `,
            `_${formatPdtTimestamp(match.timestamp)}_`,
            "",
            app === "cursor" || app === "git" ? "```\n" + match.content + "\n```" : match.content,
          ].join("\n")}
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Atom"
            content={formatAtomBundleSingle(match)}
            icon={Icon.Clipboard}
          />
          <Action.Paste
            title="Paste in Frontmost App"
            content={formatAtomBundleSingle(match)}
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}

function formatAtomBundleSingle(m: SearchMatch): string {
  return formatAtomBundle([m as unknown as EchoAtom]);
}

// ============================================================
// Recent ask row (empty state)
// ============================================================
function RecentAskRow({
  ask,
  primary,
  onLaunch,
}: {
  ask: RecentAsk;
  primary: PrimaryDetection | null;
  onLaunch: (q: string, t: LaunchTargetId) => Promise<void>;
}) {
  const { push } = useNavigation();
  return (
    <List.Item
      icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
      title={`"${ask.question}"`}
      subtitle={`relaunched to ${ask.launchedTo}`}
      accessories={[{ text: formatRelTime(ask.at), tooltip: formatPdtTimestamp(ask.at) }]}
      actions={
        <ActionPanel>
          <Action
            title="Re-Run This Ask"
            icon={{ source: Icon.Stars, tintColor: ASK_TINT }}
            onAction={() => push(<AnswerView query={ask.question} primary={primary} onLaunch={onLaunch} />)}
          />
        </ActionPanel>
      }
    />
  );
}

// ============================================================
// AnswerView — pushed Detail with streamed agent output + launch row
// ============================================================
function AnswerView({
  query,
  primary,
  onLaunch,
}: {
  query: string;
  primary: PrimaryDetection | null;
  onLaunch: (q: string, t: LaunchTargetId) => Promise<void>;
}) {
  const preferences = getPreferenceValues<EchoPreferences>();
  const agentKind = preferences.agentKind ?? "codex";
  const repoPath = expandHome(preferences.repoPath ?? DEFAULT_REPO_PATH);
  const launchTs = useMemo(() => Date.now(), []);

  const [answer, setAnswer] = useState("Waiting for agent output…");
  const [isLoading, setIsLoading] = useState(true);
  const [evidence, setEvidence] = useState<FindClustersCluster[]>([]);
  const [auditCalls, setAuditCalls] = useState<AuditCall[] | null>(null);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const runnerRef = useRef<AgentRun | null>(null);

  // Resolve invocation + collect evidence (top clusters) in parallel
  useEffect(() => {
    let disposed = false;

    async function startup() {
      let invocation: AgentInvocation;
      try {
        invocation = resolveAgentInvocation(agentKind, preferences, repoPath, buildUnifiedAskPrompt(query));
      } catch (err) {
        setStartupError((err as AgentProfileError).message);
        setIsLoading(false);
        return;
      }
      if (!(await probeEchoDaemon())) {
        setStartupError("ECHO daemon unreachable at 38478");
        setIsLoading(false);
        return;
      }
      if (!(await findExecutable(invocation.binary))) {
        setStartupError(`Agent '${invocation.binary}' not found`);
        setIsLoading(false);
        return;
      }
      // Evidence: top 3 clusters from the daemon (best-effort; failure is silent)
      try {
        const r = await findClusters();
        if (!disposed) setEvidence(r.clusters.slice(0, 3));
      } catch {
        // ignore
      }

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
        setAnswer(buffer.length > 0 ? buffer : "Waiting for agent output…");
      }
      function scheduleFlush() {
        const elapsed = Date.now() - lastFlushAt;
        if (elapsed >= FLUSH_INTERVAL_MS) flushNow();
        else if (flushTimer === null) flushTimer = setTimeout(flushNow, FLUSH_INTERVAL_MS - elapsed);
      }
      function appendFooter(footer: string) {
        const sep = buffer.trim().length > 0 ? "\n\n---\n\n" : "";
        buffer += `${sep}${footer}\n`;
        flushNow();
      }

      const run = startAgent(invocation);
      runnerRef.current = run;

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
    }

    void startup();
    return () => {
      disposed = true;
      runnerRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (startupError !== null) {
    return (
      <Detail
        markdown={`# Ask ECHO\n\n**Could not start the agent.**\n\n${startupError}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Daemon Trace Viewer" url="http://127.0.0.1:38479/" />
          </ActionPanel>
        }
      />
    );
  }

  const evidenceMarkdown = evidence.length > 0
    ? evidence.map((c) => `- ${c.label?.trim() ?? c.cluster_id} (${c.atom_ids.length} atoms)`).join("\n")
    : "";

  const launchBlock = renderLaunchBlock(primary);
  const fullMarkdown = [
    `# Ask ECHO`,
    "",
    `_synthesizing from ${evidence.length} clusters · "${query}"_`,
    "",
    answer.trim(),
    evidence.length > 0 ? "\n---\n\n**Evidence used**\n\n" + evidenceMarkdown : "",
    "\n---\n",
    launchBlock,
  ].join("\n");

  function packet() {
    return {
      question: query,
      answer,
      evidenceMarkdown: evidenceMarkdown.length > 0 ? evidenceMarkdown : undefined,
    };
  }

  async function fire(target: LaunchTargetId) {
    const outcome = await launchTo(target, packet());
    await showLaunchToast(outcome);
    await onLaunch(query, target);
  }

  async function pasteToPrimaryCursor() {
    const outcome = await pasteIntoFrontmost(packet());
    await showLaunchToast(outcome);
    await onLaunch(query, "cursor");
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={fullMarkdown}
      metadata={
        <AnswerMetadata
          agentKind={agentKind}
          primary={primary}
          calls={auditCalls}
          unavailable={auditUnavailable}
        />
      }
      actions={
        <ActionPanel>
          {primary?.id === "cursor" ? (
            <Action
              title="Send to Cursor"
              icon={{ source: Icon.Code, tintColor: LAUNCH_TINT.cursor }}
              onAction={pasteToPrimaryCursor}
            />
          ) : null}
          {primary?.id === "claude_app" ? (
            <Action
              title="Send to Claude"
              icon={{ source: Icon.Stars, tintColor: LAUNCH_TINT.claude_app }}
              onAction={() => fire("claude_app")}
            />
          ) : null}
          {primary?.id === "chatgpt" ? (
            <Action
              title="Send to ChatGPT"
              icon={{ source: Icon.Globe, tintColor: LAUNCH_TINT.chatgpt }}
              onAction={() => fire("chatgpt")}
            />
          ) : null}
          {primary === null ? (
            <Action
              title="Send to Cursor"
              icon={{ source: Icon.Code, tintColor: LAUNCH_TINT.cursor }}
              onAction={() => fire("cursor")}
            />
          ) : null}
          <Action
            title="Send to Claude.ai"
            icon={{ source: Icon.Stars, tintColor: LAUNCH_TINT.claude_web }}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
            onAction={() => fire("claude_web")}
          />
          <Action
            title="Send to ChatGPT"
            icon={{ source: Icon.Globe, tintColor: LAUNCH_TINT.chatgpt }}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
            onAction={() => fire("chatgpt")}
          />
          <Action
            title="Copy Context + Prompt"
            icon={{ source: Icon.Clipboard, tintColor: LAUNCH_TINT.copy }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => fire("copy")}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Answer Only"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              content={answer}
            />
            {isLoading ? (
              <Action
                title="Cancel"
                icon={Icon.XMarkCircle}
                onAction={() => runnerRef.current?.cancel()}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderLaunchBlock(primary: PrimaryDetection | null): string {
  const primaryLabel = primary === null
    ? "Send to Cursor"
    : primary.id === "cursor"
      ? `Send to Cursor — ${primary.hint}`
      : primary.id === "claude_app"
        ? `Send to Claude — ${primary.hint}`
        : primary.id === "chatgpt"
          ? `Send to ChatGPT — ${primary.hint}`
          : "Send to Cursor";
  return [
    "## Launch with this context",
    "",
    "_ECHO won't finish the work — your AI tool will._",
    "",
    `- **↩** ${primaryLabel}`,
    "- **⌘1** Send to Claude.ai",
    "- **⌘2** Send to ChatGPT",
    "- **⌘⇧C** Copy context + prompt",
  ].join("\n");
}

function AnswerMetadata({
  agentKind,
  primary,
  calls,
  unavailable,
}: {
  agentKind: string;
  primary: PrimaryDetection | null;
  calls: AuditCall[] | null;
  unavailable: boolean;
}) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Agent" text={agentKind} />
      <Detail.Metadata.Label title="Primary" text={primary?.hint ?? "Cursor (default)"} />
      <Detail.Metadata.Separator />
      {unavailable ? <Detail.Metadata.Label title="Audit" text="Audit unavailable" /> : null}
      {!unavailable && calls === null ? <Detail.Metadata.Label title="Audit" text="Waiting" /> : null}
      {!unavailable && calls !== null && calls.length === 0 ? (
        <Detail.Metadata.Label title="Audit" text="No MCP calls" />
      ) : null}
      {!unavailable && calls !== null
        ? calls.map((call, i) => (
            <Detail.Metadata.Label key={`${call.ts}-${i}`} title={`Call ${i + 1}`} text={formatAuditCall(call)} />
          ))
        : null}
    </Detail.Metadata>
  );
}

function formatAuditCall(call: AuditCall): string {
  const duration = call.duration_ms === null ? "pending" : `${Math.round(call.duration_ms)}ms`;
  return `${call.tool} · ${duration} · ${call.status}`;
}

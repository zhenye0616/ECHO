// search-context.tsx — ECHO hotkey overlay (⌘⇧E)
// Implements Direction C (Storytelling) from the Claude Design handoff
// at api.anthropic.com/v1/design/h/91GV5Hxa5Yxb3hUu2j2vtw.
//
// Adapts the design's mock-data overlay.tsx to real MCP-call data via
// lib/mcp.ts. Preserves the existing `formatAtomBundle` contract
// (exercised by test/format.test.ts) by making it one of the Copy as…
// submenu options; the primary Copy action uses the design's richer
// cluster/match-shaped markdown.

import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Icon,
  List,
  LocalStorage,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  getAtom,
  getAtoms,
  searchMemories,
} from "./lib/mcp";

const TRACE_VIEWER_URL = "http://127.0.0.1:38479/";

// ============================================================
// Source-app visual palette (from design's APP_META)
// ============================================================
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

function appIcon(app: DerivedApp) {
  const m = APP_META[app];
  return { source: m.icon, tintColor: m.color };
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

function isDerivedApp(value: string): value is DerivedApp {
  return value === "cursor" || value === "claude_code" || value === "codex" || value === "git" || value === "unknown";
}

// ============================================================
// Time bucketing (from design's timeBucket / bucketsOf)
// ============================================================
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const BUCKET_ORDER = ["Last hour", "Today", "Yesterday", "This week", "Older"] as const;
type Bucket = (typeof BUCKET_ORDER)[number];

function timeBucket(iso: string, now = Date.now()): Bucket {
  const t = new Date(iso).getTime();
  const dt = now - t;
  if (dt < HOUR) return "Last hour";
  const today0 = new Date(now);
  today0.setHours(0, 0, 0, 0);
  const item0 = new Date(t);
  item0.setHours(0, 0, 0, 0);
  const days = Math.round((today0.getTime() - item0.getTime()) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "This week";
  return "Older";
}

function formatRelTime(iso: string, now = Date.now()): string {
  const dt = now - new Date(iso).getTime();
  if (dt < MIN) return "just now";
  if (dt < HOUR) return `${Math.floor(dt / MIN)}m`;
  if (dt < DAY) return `${Math.floor(dt / HOUR)}h`;
  return `${Math.floor(dt / DAY)}d`;
}

function formatRange(r: { from: string; to: string }): string {
  const f = new Date(r.from);
  const t = new Date(r.to);
  const sameDay = f.toDateString() === t.toDateString();
  const fStr = formatPdtTimestamp(f.toISOString());
  const tStr = sameDay
    ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t)
    : formatPdtTimestamp(t.toISOString());
  return `${fStr} – ${tStr}`;
}

function bucketsOf<T>(items: readonly T[], getISO: (t: T) => string): [Bucket, T[]][] {
  const groups: Partial<Record<Bucket, T[]>> = {};
  for (const it of items) {
    const b = timeBucket(getISO(it));
    (groups[b] ??= []).push(it);
  }
  return BUCKET_ORDER.filter((b) => (groups[b]?.length ?? 0) > 0).map((b) => [b, groups[b] ?? []] as [Bucket, T[]]);
}

// ============================================================
// Narrative subtitles (from design's narrativeForCluster/Match)
// ============================================================
function narrativeForCluster(c: FindClustersCluster): string {
  const dom = dominantApp(c);
  const label = APP_META[dom].label;
  if (c.rank_reason.includes("has_open_loop")) {
    return `Open loop — last touched in ${label}`;
  }
  if (c.rank_reason.includes("dense")) {
    return `${c.atom_ids.length} atoms, mostly in ${label}`;
  }
  return `Recent activity in ${label}`;
}

function narrativeForMatch(m: SearchMatch): string {
  switch (derivedApp(m.source)) {
    case "git":
      return `committed to ${repoName(m.source)}`;
    case "cursor":
      return `while editing ${basename(m.source)}`;
    case "claude_code":
      return "in conversation with Claude";
    case "codex":
      return "asked Codex";
    default:
      return "captured atom";
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

// ============================================================
// Bundle templates — three formats users can paste
// (from design's bundlesForCluster / bundlesForMatch)
// + an "atoms" fallback that uses our existing formatAtomBundle
// (preserves test/format.test.ts contract)
// ============================================================
interface Bundles {
  markdown: string;
  plain: string;
  chat: string;
  atoms: string;
}

function bundlesForCluster(c: FindClustersCluster, atoms: readonly EchoAtom[]): Bundles {
  const label = c.label?.trim() ?? sourceBreakdownLabel(c.source_breakdown);
  const narrative = narrativeForCluster(c);
  const sources = Object.entries(c.source_breakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => `- ${(isDerivedApp(app) ? APP_META[app].label : app)}: ${n}`)
    .join("\n");

  const markdown = [
    `# ${label}`,
    `_${formatRange(c.time_range)} · ${c.atom_ids.length} atoms_`,
    "",
    `> ${narrative}`,
    "",
    sources,
    "",
    `<!-- ECHO cluster ${c.cluster_id} -->`,
  ].join("\n");

  const plain = [label, narrative, `(${c.atom_ids.length} atoms, ${formatRange(c.time_range)})`].join("\n\n");

  const chat = [
    `Here's the context from my last ${c.atom_ids.length} interactions on "${label}":`,
    "",
    markdown,
    "",
    "Given this, please [your question here].",
  ].join("\n");

  return { markdown, plain, chat, atoms: formatAtomBundle(atoms) };
}

function bundlesForMatch(m: SearchMatch): Bundles {
  const pdt = formatPdtTimestamp(m.timestamp);
  const markdown = [
    "# Atom",
    `_${m.source} · ${pdt}_`,
    "",
    m.content,
    "",
    `<!-- ECHO atom ${m.id} -->`,
  ].join("\n");

  const plain = m.content;

  const chat = [
    `From ${narrativeForMatch(m)} (${formatRelTime(m.timestamp)} ago):`,
    "",
    m.content,
    "",
    "Given this, please [your question here].",
  ].join("\n");

  return { markdown, plain, chat, atoms: formatAtomBundle([m]) };
}

function sourceBreakdownLabel(b: Record<string, number>): string {
  const total = Object.values(b).reduce((s, n) => s + n, 0);
  const top = Object.entries(b)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([app]) => (isDerivedApp(app) ? APP_META[app].label : app))
    .join(" + ");
  return top.length > 0 ? `${top} · ${total} atoms` : `Cluster · ${total} atoms`;
}

// ============================================================
// Source filter dropdown (from design's SourceDropdown)
// ============================================================
type Filter = "all" | DerivedApp;
type ViewMode = "list" | "grid";

function SourceDropdown({ kind, value, onChange }: { kind: "list" | "grid"; value: Filter; onChange: (v: Filter) => void }) {
  const Dropdown = kind === "grid" ? Grid.Dropdown : List.Dropdown;
  const Item = kind === "grid" ? Grid.Dropdown.Item : List.Dropdown.Item;
  return (
    <Dropdown tooltip="Filter by source" storeValue value={value} onChange={(v) => onChange(v as Filter)}>
      <Item title="All sources" value="all" icon={Icon.AppWindowGrid2x2} />
      <Dropdown.Section>
        {(["claude_code", "cursor", "codex", "git"] as DerivedApp[]).map((app) => (
          <Item key={app} title={APP_META[app].label} value={app} icon={{ source: APP_META[app].icon, tintColor: APP_META[app].color }} />
        ))}
      </Dropdown.Section>
    </Dropdown>
  );
}

function filterClusters(cs: readonly FindClustersCluster[], f: Filter): FindClustersCluster[] {
  if (f === "all") return [...cs];
  return cs.filter((c) => (c.source_breakdown[f] ?? 0) > 0);
}

function filterMatches(ms: readonly SearchMatch[], f: Filter): SearchMatch[] {
  if (f === "all") return [...ms];
  return ms.filter((m) => derivedApp(m.source) === f);
}

// ============================================================
// View-mode persistence (LocalStorage)
// ============================================================
function useViewMode(): [ViewMode, React.Dispatch<React.SetStateAction<ViewMode>>] {
  const [view, setView] = useState<ViewMode>("list");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void LocalStorage.getItem<string>("echo.view").then((v) => {
      if (v === "grid" || v === "list") setView(v);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) void LocalStorage.setItem("echo.view", view);
  }, [view, hydrated]);

  return [view, setView];
}

// ============================================================
// Data hooks — real MCP calls with debounced search
// ============================================================
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
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
    async function load() {
      try {
        const result = await findClusters();
        if (!cancelled) {
          setClusters(result.clusters);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setClusters([]);
          setIsLoading(false);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
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
    async function load() {
      try {
        const result = await searchMemories(debounced, 50);
        if (!cancelled) {
          setMatches(result.matches);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setMatches([]);
          setIsLoading(false);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return { matches, isLoadingMatches: isLoading };
}

// ============================================================
// Main command
// ============================================================
export default function SearchContext() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useViewMode();

  const { clusters, isLoadingClusters } = useClusters();
  const { matches, isLoadingMatches } = useMatches(query);

  const filteredClusters = useMemo(() => filterClusters(clusters, filter), [clusters, filter]);
  const filteredMatches = useMemo(() => filterMatches(matches, filter), [matches, filter]);

  const toggleView = useCallback(() => {
    setView((v) => (v === "list" ? "grid" : "list"));
  }, [setView]);

  // ----- Typed input → matches (always List, time-sectioned) -----
  if (query.length > 0) {
    return (
      <List
        searchText={query}
        onSearchTextChange={setQuery}
        filtering={false}
        throttle={false}
        isLoading={isLoadingMatches}
        searchBarPlaceholder="Search ECHO…"
        searchBarAccessory={<SourceDropdown kind="list" value={filter} onChange={setFilter} />}
        isShowingDetail
      >
        {bucketsOf(filteredMatches, (m) => m.timestamp).map(([bucket, items]) => (
          <List.Section key={bucket} title={bucket} subtitle={`${items.length}`}>
            {items.map((m) => (
              <MatchItem key={m.id} match={m} onToggleView={toggleView} />
            ))}
          </List.Section>
        ))}
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title={`No atoms match "${query}"`}
          description={
            isLoadingMatches
              ? "Searching…"
              : `Searched across ${totalAtoms(clusters)} clustered atoms. ECHO does keyword search — try a different phrasing.`
          }
        />
      </List>
    );
  }

  // ----- Empty input → clusters (List default, Grid alt) -----
  if (view === "grid") {
    return (
      <Grid
        searchText={query}
        onSearchTextChange={setQuery}
        filtering={false}
        throttle={false}
        isLoading={isLoadingClusters}
        searchBarPlaceholder="Search ECHO…"
        searchBarAccessory={<SourceDropdown kind="grid" value={filter} onChange={setFilter} />}
        columns={4}
        inset={Grid.Inset.Small}
        fit={Grid.Fit.Contain}
      >
        {bucketsOf(filteredClusters, (c) => c.time_range.to).map(([bucket, items]) => (
          <Grid.Section key={bucket} title={bucket} subtitle={`${items.length}`}>
            {items.map((c) => (
              <ClusterGridItem key={c.cluster_id} cluster={c} onToggleView={toggleView} />
            ))}
          </Grid.Section>
        ))}
        <Grid.EmptyView
          icon={{ source: Icon.Stars, tintColor: { light: "#ff6363", dark: "#ff6363" } }}
          title="ECHO is listening."
          description="Nothing clustered yet. Open Cursor, start a Claude session, or make a commit — your context will appear within the minute."
        />
      </Grid>
    );
  }

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      throttle={false}
      isLoading={isLoadingClusters}
      searchBarPlaceholder="Search ECHO…"
      searchBarAccessory={<SourceDropdown kind="list" value={filter} onChange={setFilter} />}
      isShowingDetail
    >
      {bucketsOf(filteredClusters, (c) => c.time_range.to).map(([bucket, items]) => (
        <List.Section key={bucket} title={bucket} subtitle={`${items.length}`}>
          {items.map((c) => (
            <ClusterListItem key={c.cluster_id} cluster={c} onToggleView={toggleView} />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        icon={{ source: Icon.Stars, tintColor: { light: "#ff6363", dark: "#ff6363" } }}
        title="ECHO is listening."
        description="Nothing clustered yet. Open Cursor, start a Claude session, or make a commit — your context will appear within the minute."
      />
    </List>
  );
}

function totalAtoms(cs: readonly FindClustersCluster[]): number {
  return cs.reduce((acc, c) => acc + c.atom_ids.length, 0);
}

// ============================================================
// Cluster row (List)
// ============================================================
function ClusterListItem({ cluster, onToggleView }: { cluster: FindClustersCluster; onToggleView: () => void }) {
  const dom = dominantApp(cluster);
  const hasLoop = cluster.rank_reason.includes("has_open_loop");
  const atomIds = useMemo(() => cluster.atom_ids.slice(0, 3), [cluster.atom_ids]);
  const [atoms, setAtoms] = useState<EchoAtom[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (atomIds.length === 0) {
      setAtoms([]);
      return;
    }
    async function load() {
      try {
        const result = await getAtoms(atomIds);
        if (!cancelled) setAtoms(result.atoms);
      } catch (err) {
        if (!cancelled) {
          setAtoms([]);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [atomIds]);

  const accessories: List.Item.Accessory[] = [];
  if (hasLoop) {
    accessories.push({ icon: { source: Icon.RotateClockwise, tintColor: Color.Orange }, tooltip: "Open loop" });
  }
  accessories.push({ text: formatRelTime(cluster.time_range.to), tooltip: formatPdtTimestamp(cluster.time_range.to) });

  const bundles = bundlesForCluster(cluster, atoms);

  return (
    <List.Item
      icon={appIcon(dom)}
      title={cluster.label?.trim() || sourceBreakdownLabel(cluster.source_breakdown)}
      subtitle={narrativeForCluster(cluster)}
      accessories={accessories}
      keywords={[...Object.keys(cluster.source_breakdown), ...cluster.rank_reason]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Atoms" text={`${cluster.atom_ids.length}`} />
              <List.Item.Detail.Metadata.Label title="Time range" text={formatRange(cluster.time_range)} />
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
              {cluster.rank_reason.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Ranked by">
                  {cluster.rank_reason.map((r) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={r}
                      text={r.replace(/_/g, " ")}
                      color={r === "has_open_loop" ? Color.Orange : Color.SecondaryText}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ItemActions
          bundles={bundles}
          openTarget={null}
          rawJson={JSON.stringify(cluster, null, 2)}
          onToggleView={onToggleView}
        />
      }
    />
  );
}

// ============================================================
// Cluster card (Grid)
// ============================================================
function ClusterGridItem({ cluster, onToggleView }: { cluster: FindClustersCluster; onToggleView: () => void }) {
  const dom = dominantApp(cluster);
  const hasLoop = cluster.rank_reason.includes("has_open_loop");
  const atomIds = useMemo(() => cluster.atom_ids.slice(0, 3), [cluster.atom_ids]);
  const [atoms, setAtoms] = useState<EchoAtom[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (atomIds.length === 0) {
      setAtoms([]);
      return;
    }
    async function load() {
      try {
        const result = await getAtoms(atomIds);
        if (!cancelled) setAtoms(result.atoms);
      } catch (err) {
        if (!cancelled) {
          setAtoms([]);
          if (err instanceof EchoDaemonError) await showDaemonToast();
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [atomIds]);

  const subtitle = `${narrativeForCluster(cluster)}${hasLoop ? "  ↻" : ""}  ·  ${formatRelTime(cluster.time_range.to)}`;
  const bundles = bundlesForCluster(cluster, atoms);

  return (
    <Grid.Item
      content={{ value: { source: APP_META[dom].icon, tintColor: APP_META[dom].color }, tooltip: cluster.label ?? "" }}
      title={cluster.label?.trim() || sourceBreakdownLabel(cluster.source_breakdown)}
      subtitle={subtitle}
      keywords={[...Object.keys(cluster.source_breakdown), ...cluster.rank_reason]}
      actions={
        <ItemActions
          bundles={bundles}
          openTarget={null}
          rawJson={JSON.stringify(cluster, null, 2)}
          onToggleView={onToggleView}
        />
      }
    />
  );
}

// ============================================================
// Match row (List)
// ============================================================
function MatchItem({ match, onToggleView }: { match: SearchMatch; onToggleView: () => void }) {
  const app = derivedApp(match.source);
  const bundles = bundlesForMatch(match);
  const detail = detailMarkdown(match);
  const openTarget = sourceOpenTarget(match.source);

  return (
    <List.Item
      icon={appIcon(app)}
      title={titleForMatch(match)}
      subtitle={narrativeForMatch(match)}
      accessories={[{ text: formatRelTime(match.timestamp), tooltip: formatPdtTimestamp(match.timestamp) }]}
      keywords={[app, match.id]}
      detail={<List.Item.Detail markdown={detail} />}
      actions={
        <ItemActions
          bundles={bundles}
          openTarget={openTarget}
          rawJson={JSON.stringify(match, null, 2)}
          onToggleView={onToggleView}
          fetchHydrated={async () => {
            try {
              const result = await getAtom(match.id);
              return JSON.stringify(result, null, 2);
            } catch (err) {
              if (err instanceof EchoDaemonError) await showDaemonToast();
              return null;
            }
          }}
        />
      }
    />
  );
}

function titleForMatch(m: SearchMatch): string {
  const firstLine = m.content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.length > 90 ? firstLine.slice(0, 90) + "…" : firstLine || "(empty)";
}

function detailMarkdown(m: SearchMatch): string {
  const head = `**${m.source}**  \n_${formatPdtTimestamp(m.timestamp)}_`;
  const app = derivedApp(m.source);
  const isCode = app === "cursor" || app === "git";
  const body = isCode ? "```\n" + m.content + "\n```" : m.content;
  return `${head}\n\n${body}`;
}

/**
 * Resolve an atom's source to something openable.
 * git: → repo dir (Finder)
 * fs: → file path (default app)
 * else → null (no useful action; spec ⌘O shows nothing)
 */
function sourceOpenTarget(source: string): { target: string; title: string } | null {
  const git = source.match(/^git:(.+?)(?:#.*)?$/);
  if (git) return { target: git[1], title: "Open Repo in Finder" };

  const fs = source.match(/^fs:(.+)$/);
  if (fs) return { target: fs[1], title: "Open File" };

  return null;
}

// ============================================================
// Action menu (from design's ItemActions)
// ============================================================
function ItemActions({
  bundles,
  openTarget,
  rawJson,
  onToggleView,
  fetchHydrated,
}: {
  bundles: Bundles;
  openTarget: { target: string; title: string } | null;
  rawJson: string;
  onToggleView: () => void;
  fetchHydrated?: () => Promise<string | null>;
}) {
  return (
    <ActionPanel>
      {/* ----- Primary ----- */}
      <Action.CopyToClipboard title="Copy Bundle to Clipboard" content={bundles.markdown} icon={Icon.Clipboard} />
      <Action.Paste
        title="Paste in Frontmost App"
        content={bundles.markdown}
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      />
      <ActionPanel.Submenu title="Copy as…" icon={Icon.Document} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
        <Action.CopyToClipboard title="Markdown (default)" content={bundles.markdown} icon={Icon.Text} />
        <Action.CopyToClipboard title="Plain text" content={bundles.plain} icon={Icon.MinusCircle} />
        <Action.CopyToClipboard title="Chat prompt" content={bundles.chat} icon={Icon.SpeechBubble} />
        <Action.CopyToClipboard title="Atoms (verbatim)" content={bundles.atoms} icon={Icon.Tray} />
      </ActionPanel.Submenu>

      {/* ----- Navigate ----- */}
      <ActionPanel.Section>
        {openTarget !== null ? (
          <Action.Open
            title={openTarget.title}
            target={openTarget.target}
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        ) : null}
        <Action
          title="Open Daemon Trace Viewer"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          onAction={() => open(TRACE_VIEWER_URL)}
        />
      </ActionPanel.Section>

      {/* ----- Debug ----- */}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Raw JSON (debug)"
          content={rawJson}
          icon={Icon.CodeBlock}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {fetchHydrated !== undefined ? (
          <Action
            title="Copy Hydrated Atom JSON (debug)"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              const json = await fetchHydrated();
              if (json !== null) {
                await navigator.clipboard?.writeText?.(json).catch(() => undefined);
                await showToast({ style: Toast.Style.Success, title: "Hydrated JSON copied" });
              }
            }}
          />
        ) : null}
        <Action
          title="Toggle View — List ↔ Grid"
          icon={Icon.AppWindowGrid2x2}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={onToggleView}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

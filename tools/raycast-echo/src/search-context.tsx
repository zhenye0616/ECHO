import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { derivedApp, formatAtomBundle, formatPdtTimestamp, type EchoAtom } from "./lib/format";
import {
  type FindClustersCluster,
  type GetAtomResult,
  type SearchMatch,
  findClusters,
  getAtom,
  getAtoms,
  searchMemories,
} from "./lib/mcp";

const TRACE_VIEWER_URL = "http://127.0.0.1:38479/";

export default function SearchContext() {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, 200);
  const [clusters, setClusters] = useState<FindClustersCluster[]>([]);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const query = debouncedSearchText.trim();
  const isSearching = query.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (query.length === 0) {
          const result = await findClusters();
          if (!cancelled) {
            setClusters(result.clusters);
            setMatches([]);
          }
        } else {
          const result = await searchMemories(query, 15);
          if (!cancelled) {
            setMatches(result.matches);
            setClusters([]);
          }
        }
      } catch {
        if (!cancelled) {
          setClusters([]);
          setMatches([]);
          await showDaemonToast();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const hasResults = isSearching ? matches.length > 0 : clusters.length > 0;

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search ECHO context"
      searchText={searchText}
      throttle={false}
    >
      {isSearching
        ? matches.map((match) => <MatchItem key={match.id} match={match} />)
        : clusters.map((cluster) => <ClusterItem key={cluster.cluster_id} cluster={cluster} />)}
      {!isLoading && !hasResults ? (
        <List.EmptyView title={isSearching ? `no matches for \`${query}\`.` : "no recent context — typing will search the full corpus."} />
      ) : null}
    </List>
  );
}

function MatchItem({ match }: { match: SearchMatch }) {
  const [result, setResult] = useState<GetAtomResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const atom = await getAtom(match.id);
        if (!cancelled) setResult(atom);
      } catch {
        if (!cancelled) await showDaemonToast();
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [match.id]);

  const atom = result?.atom ?? null;
  const bundle = atom === null ? "" : formatAtomBundle([atom]);
  const detail = atom === null ? loadingOrErrorMarkdown(result) : bundle;

  return (
    <List.Item
      icon={Icon.Text}
      title={`${derivedApp(match.source)} · ${formatPdtTimestamp(match.timestamp)}`}
      subtitle={trimSubtitle(match.content)}
      detail={<List.Item.Detail markdown={detail} />}
      actions={
        <ActionPanel>
          <BundleActions bundle={bundle} />
          {atom !== null ? <OpenSourceAction source={atom.source} /> : null}
          <OpenTraceAction />
          {result !== null ? <CopyRawJsonAction result={result} /> : null}
        </ActionPanel>
      }
    />
  );
}

function ClusterItem({ cluster }: { cluster: FindClustersCluster }) {
  const atomIds = useMemo(() => cluster.atom_ids.slice(0, 3), [cluster.atom_ids]);
  const [atoms, setAtoms] = useState<EchoAtom[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (atomIds.length === 0) {
        setAtoms([]);
        return;
      }
      try {
        const result = await getAtoms(atomIds, "minimal");
        if (!cancelled) setAtoms(result.atoms);
      } catch {
        if (!cancelled) await showDaemonToast();
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [atomIds]);

  const bundle = atoms === null ? "" : formatAtomBundle(atoms);

  return (
    <List.Item
      icon={Icon.List}
      title={cluster.label?.trim() || sourceBreakdownTitle(cluster.source_breakdown)}
      subtitle={`${cluster.rank_reason.join(", ")} · ${formatTimeRange(cluster.time_range)}`}
      detail={<List.Item.Detail markdown={bundle || "Loading context..."} />}
      actions={
        <ActionPanel>
          <BundleActions bundle={bundle} />
          <OpenTraceAction />
        </ActionPanel>
      }
    />
  );
}

function BundleActions({ bundle }: { bundle: string }) {
  return (
    <>
      <Action title="Copy" icon={Icon.Clipboard} onAction={() => copyBundle(bundle)} />
      {bundle.length > 0 ? <Action.Paste title="Paste" icon={Icon.TextCursor} content={bundle} shortcut={{ modifiers: ["cmd"], key: "enter" }} /> : null}
    </>
  );
}

function OpenSourceAction({ source }: { source: string }) {
  return <Action title="Open Source" icon={Icon.Finder} shortcut={{ modifiers: ["cmd"], key: "o" }} onAction={() => openSource(source)} />;
}

function OpenTraceAction() {
  return (
    <Action
      title="Open Trace Viewer"
      icon={Icon.Globe}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      onAction={() => open(TRACE_VIEWER_URL)}
    />
  );
}

function CopyRawJsonAction({ result }: { result: GetAtomResult }) {
  return (
    <Action
      title="Copy Raw Atom JSON"
      icon={Icon.Code}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={() => Clipboard.copy(JSON.stringify(result, null, 2))}
    />
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

async function copyBundle(bundle: string) {
  if (bundle.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Context still loading" });
    return;
  }
  await Clipboard.copy(bundle);
  await showToast({ style: Toast.Style.Success, title: "ECHO context copied" });
}

async function openSource(source: string) {
  const file = sourceFilePath(source);
  if (file === null) {
    await showToast({ style: Toast.Style.Failure, title: "no source file" });
    return;
  }
  await open(file);
}

function sourceFilePath(source: string): string | null {
  if (!source.startsWith("fs:")) return null;
  const file = source.slice("fs:".length);
  return file.startsWith("/") ? file : null;
}

async function showDaemonToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "ECHO daemon unreachable",
    message: "Check 'npm run daemon' in Project_echo",
  });
}

function loadingOrErrorMarkdown(result: GetAtomResult | null): string {
  if (result === null) return "Loading context...";
  if (result.atom === null) return `Unable to load atom: ${result.error_code}`;
  return "";
}

function sourceBreakdownTitle(sourceBreakdown: Record<string, number>): string {
  const parts = Object.entries(sourceBreakdown)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([source, count]) => `${source} ${count}`);
  return parts.length > 0 ? parts.join(" · ") : "unknown";
}

function formatTimeRange(range: { from: string; to: string }): string {
  return `${formatPdtTimestamp(range.from)}..${formatPdtTimestamp(range.to)}`;
}

function trimSubtitle(content: string): string {
  return content.length <= 120 ? content : `${content.slice(0, 120)}...`;
}

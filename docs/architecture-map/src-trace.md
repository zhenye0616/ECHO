# `src/trace/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 8 files.

### `src/trace/auto-expand.ts` — single-source-recent noise predicate for auto-expand/rank demotion

**Purpose:** Defines the "single-source-recent" heuristic (a cluster from exactly one source app whose newest atom is within 5 minutes of now) used to decide whether the no-args auto-expand path should widen its window because all returned clusters are just the calling session's own noise.

**Depends on:** `src/normalize/types.js` (`NormalizedContextEvent`), `src/trace/types.js` (`Cluster`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SINGLE_SOURCE_RECENT_THRESHOLD_MS` | const | `src/trace/auto-expand.ts:25` | 300,000ms (5 min) recency threshold calibrated to the empirical trigger of calling-session noise being a few minutes old. |
| `isSingleSourceRecent(cluster, atomsById, nowMs)` | function | `src/trace/auto-expand.ts:36` | Returns true iff the cluster has exactly one source app in `source_breakdown` AND its latest resolvable atom timestamp is within the threshold of `nowMs`; returns false if no atom timestamp is parsable. |
| `noUsefulCluster(clusters, atomsById, nowMs)` | function | `src/trace/auto-expand.ts:59` | Returns true iff every cluster in the input is single-source-recent; vacuously true for an empty list, preserving the legacy empty-only auto-expand trigger. |

### `src/trace/cluster.ts` — artifact-sharing graph builder and connected-component clustering

**Purpose:** Builds a similarity graph over normalized atoms based on shared artifacts within a time window, then computes connected components as raw clusters; also filters out edges whose only shared artifacts are low-signal (scope/session) roles.

**Depends on:** `src/normalize/types.js` (`ArtifactRef`, `NormalizedContextEvent`), `src/trace/role.js` (`roleOf`), `src/trace/types.js` (`ArtifactKey`, `Edge`, `Graph`, `RawCluster`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_WINDOW_HOURS` | const | `src/trace/cluster.ts:5` | Default 4-hour window used to bound "same session" edges when clustering atoms by shared artifacts. |
| `artifactKey(a)` | function | `src/trace/cluster.ts:7` | Builds the canonical `provider:type:id` string key for an `ArtifactRef`. |
| `typeFromArtifactKey(key)` | function | `src/trace/cluster.ts:14` | Extracts the artifact-type token (second colon-delimited segment) from an `ArtifactKey`, tolerant of colons embedded in the id. |
| `filterRedundantEdges(edges)` | function | `src/trace/cluster.ts:26` | Drops edges whose every shared artifact resolves to role `scope` or `session` (kept whole otherwise), so pure "same repo/same conversation" edges don't inflate clusters. |
| `buildGraph(atoms, windowHours)` | function | `src/trace/cluster.ts:37` | Groups atoms by shared artifact key, then for each pair of atoms sharing an artifact within `windowHours` of each other creates a `shared_artifact` edge with high confidence; returns nodes + sorted deterministic edge list. |
| `connectedComponents(graph)` | function | `src/trace/cluster.ts:113` | Union-find over graph nodes/edges to produce `RawCluster` groups (atom_ids + their internal edges), sorted deterministically by minimum atom id. |

### `src/trace/hints.ts` — open-loop hint extraction and forward-scan resolution

**Purpose:** Scans a time-ordered atom list for "open loop" signals (trailing questions, unresolved assistant questions, TODO/FIXME markers, explicit follow-up phrasing) embedded in each atom's `open_loop_hints`, extracts hint text, and resolves each hint against later atoms using per-kind rules.

**Depends on:** `src/normalize/types.js` (`ArtifactRef`, `NormalizedContextEvent`), `src/trace/types.js` (`Confidence`, `OpenLoopHintEnriched`, `OpenLoopHintKind`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FOLLOWUP_RE` | const | `src/trace/hints.ts:4` | Regex matching "follow up" / "come back to" / "will do later" phrasing, case-insensitive. |
| `TODO_RE` | const | `src/trace/hints.ts:5` | Regex matching a `TODO:`/`FIXME:` marker plus its trailing single-line text. |
| `KIND_CONFIDENCE` | const | `src/trace/hints.ts:7` | Maps each `OpenLoopHintKind` to a fixed `Confidence` level (high for questions/TODOs, medium for unresolved-assistant-q and explicit-followup). |
| `KNOWN_KINDS` | const | `src/trace/hints.ts:14` | Enumerates the four recognized hint kinds, used to filter out unknown hint strings from upstream data. |
| `PendingHint` | interface | `src/trace/hints.ts:21` | Internal shape for a not-yet-resolved hint: originating atom index/id, kind, extracted text, confidence. |
| `enrichHints(atoms)` | function | `src/trace/hints.ts:33` | Walks atoms in ascending time order, collects every known-kind hint with extracted text, then resolves each via `resolveHint`; returns the enriched hint list. |
| `resolveHint(hint, atoms)` | function | `src/trace/hints.ts:60` | Looks up the hint's originating atom and calls `findResolver` to determine if/how it was later resolved, building the final `OpenLoopHintEnriched` record. |
| `findResolver(kind, hintAtom, atoms, hintIndex)` | function | `src/trace/hints.ts:79` | Dispatches to the kind-specific resolver function; `explicit_followup` never auto-resolves in V1. |
| `findResolverQ(hintAtom, atoms, hintIndex)` | function | `src/trace/hints.ts:99` | R1.Q rule: finds the next atom in the same conversation artifact that is not itself a question. |
| `findResolverAQ(hintAtom, atoms, hintIndex)` | function | `src/trace/hints.ts:116` | R1.AQ rule: finds the next atom in the same conversation with a `user` actor and non-empty trimmed content. |
| `findResolverTodo(hintAtom, atoms, hintIndex)` | function | `src/trace/hints.ts:135` | R1.TODO rule: finds a later atom whose `state.delta.artifact_id` matches one of the hint atom's file artifact ids. |
| `conversationArtifactKey(atom)` | function | `src/trace/hints.ts:161` | Returns the `provider:type:id` key of the atom's `conversation`-type artifact, or undefined if none exists. |
| `atomIsQuestion(atom)` | function | `src/trace/hints.ts:171` | True if the atom's trimmed input or output text ends with `?`. |
| `hasUserActor(atom)` | function | `src/trace/hints.ts:179` | True if any of the atom's actors has role `user`. |
| `hasNonEmptyContent(atom)` | function | `src/trace/hints.ts:183` | True if the atom's trimmed input or output has length ≥ 1. |
| `isKnownKind(s)` | function | `src/trace/hints.ts:190` | Type guard checking membership in `KNOWN_KINDS`. |
| `extractHintText(kind, input, output)` | function | `src/trace/hints.ts:194` | Extracts the relevant hint text per kind: last question sentence, TODO/FIXME match, or surrounding phrase around a follow-up regex match. |
| `lastQuestion(text)` | function | `src/trace/hints.ts:217` | Returns the last sentence of `text` if the trimmed text ends with `?`, else undefined. |
| `surroundingPhrase(source, matchStart, matchLen)` | function | `src/trace/hints.ts:227` | Returns the full line of `source` containing the regex match, trimmed. |

### `src/trace/index.ts` — trace module entrypoint: builds the recent-work-context response

**Purpose:** Orchestrates the full trace pipeline — normalize+window-filter raw capture events, compute open-loop hints, build the artifact-sharing graph and clusters, rank clusters, truncate to an atom limit, and assemble the final `RecentWorkContextResponse` with truncation metadata and warnings. Re-exports the public trace API surface.

**Depends on:** `node:crypto` (`createHash`), `src/storage/interface.js` (`CaptureEvent`), `src/normalize/types.js` (`ArtifactRef`, `NormalizedContextEvent`), `src/trace/cluster.js`, `src/trace/hints.js`, `src/trace/labels.js`, `src/trace/rank.js`, `src/trace/types.js`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SCHEMA_VERSION` | const | `src/trace/index.ts:51` | Response schema version constant (1), embedded in output and used as a cluster-id hash-input salt. |
| `buildRecentWorkContext(events, query, normalize)` | function | `src/trace/index.ts:53` | Main entrypoint: normalizes events (collecting per-error-message warning counts), window-filters and sorts atoms, computes window-wide source breakdown, enriches open-loop hints, builds the graph/clusters, applies optional artifact_hint filtering, ranks clusters, truncates by atom `limit`, and returns the full response including a "clusters dropped by limit" warning. |
| `buildWarnings(errCounts)` | function | `src/trace/index.ts:221` | Converts the per-error-message count map into human-readable warning strings, pluralizing the "×events skipped" suffix. |
| `compareByOccurredAt(a, b)` | function | `src/trace/index.ts:231` | Canonical ascending string comparator on `time.occurred_at`, used to re-sort atoms after storage's DESC-ordered fetch. |
| `makeClusterId(atomIds)` | function | `src/trace/index.ts:242` | Computes a deterministic `ctx_<8-hex>` cluster id by sha256-hashing the schema version + sorted atom-id list. |
| `topArtifacts(atoms, n)` | function | `src/trace/index.ts:249` | Counts distinct artifacts per cluster (deduped per-atom) and returns the top `n` by count, tie-broken lexically by key. |
| `countByApp(atoms)` | function | `src/trace/index.ts:275` | Tallies atom counts per `source.app`, producing the `source_breakdown` record. |
| `computeTimeRange(atoms)` | function | `src/trace/index.ts:283` | Computes the min/max `occurred_at` string across a cluster's atoms as `{from, to}`. |
| `TruncResult` | interface | `src/trace/index.ts:297` | Shape returned by `truncate`: final clusters, whether truncation occurred, and total atoms returned. |
| `truncate(clusters, atomsById, limit)` | function | `src/trace/index.ts:303` | If total atoms ≤ limit, returns clusters unchanged; otherwise drops oldest atoms from lowest-rank clusters first (dropping whole clusters if emptied) until the limit is met, trimming each affected cluster's edges to the surviving atom set. |

### `src/trace/labels.ts` — heuristic cluster label generation

**Purpose:** Produces a short human-readable label for a cluster (e.g. "edits to foo.ts") by finding the dominant shared artifact and the most common action verb across its atoms.

**Depends on:** `src/normalize/types.js` (`ArtifactRef`, `NormalizedContextEvent`), `src/trace/cluster.js` (`artifactKey`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VERB_MAP` | const | `src/trace/labels.ts:4` | Maps raw action verbs/kinds (message, commit, edit, edits, apply_patch, read, write, search, run, open) to humanized label verbs. |
| `heuristicLabel(atoms)` | function | `src/trace/labels.ts:17` | Counts distinct artifacts across atoms, picks the dominant one (tie-break: non-conversation preferred, then count, then lexical), requires count ≥ 2, computes the modal action verb, and returns `"<verb> <label>"`; returns undefined if no atoms, no qualifying dominant artifact, or the artifact yields no usable label. |
| `labelFromArtifact(art)` | function | `src/trace/labels.ts:74` | Returns the artifact's explicit `label` if present, else the tail segment of its id; conversation artifacts with no explicit label return undefined (opaque ids aren't user-meaningful). |
| `idTail(id)` | function | `src/trace/labels.ts:85` | Strips everything up through the last occurrence of `::`, `/`, or `:` (in that trial order) to return the trailing segment of an artifact id. |
| `humanizeVerb(verbRaw)` | function | `src/trace/labels.ts:96` | Looks up `verbRaw` (lowercased) in `VERB_MAP`, defaulting to `"work on"` when undefined or unmapped. |

### `src/trace/rank.ts` — cluster ranking signals and sort order

**Purpose:** Computes per-cluster rank signals (recency, artifact-hint match, open-loop presence, code-session anchoring, density, cross-tool spread) and sorts clusters by a multi-key priority chain, with an optional V1.6 single-source-recent demotion partition for the auto-expand path.

**Depends on:** `src/normalize/types.js` (`NormalizedContextEvent`), `src/trace/auto-expand.js` (`isSingleSourceRecent`), `src/trace/cluster.js` (`artifactKey`), `src/trace/types.js` (`Cluster`, `Query`, `RankSignals`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RECENT_HOURS` | const | `src/trace/rank.ts:6` | 1-hour lookback window (relative to query.until) used for the `recent_activity` signal. |
| `CODE_SESSION_ARTIFACT_TYPES` | const | `src/trace/rank.ts:7` | Set of artifact types (`repo`, `file`, `commit`) that count as a code-session anchor. |
| `RankOptions` | interface | `src/trace/rank.ts:29` | Options for `rankClusters`: `demoteSingleSourceRecent` flag and the `nowMs` reference instant required to evaluate it. |
| `rankReasonsFor(cluster, atomsById, query)` | function | `src/trace/rank.ts:38` | Computes signals for a cluster and converts truthy ones into an ordered list of rank-reason strings (recent_activity, matches_artifact_hint, has_open_loop, has_unresolved_open_loop, code_session_anchor, dense, cross_tool). |
| `signalsFor(cluster, atomsById, query)` | function | `src/trace/rank.ts:55` | Computes the full `RankSignals` object: whether any atom falls within the recent-hours cutoff, whether any atom matches `query.artifact_hint`, open-loop presence/unresolved state, code-session anchoring (code artifact, git-app atom, or ≥3 distinct source apps), density (≥5 atoms), and cross-tool (≥3 distinct apps). |
| `SortKey` | interface | `src/trace/rank.ts:115` | Internal per-cluster decorated sort record: `singleSourceRecent` primary partition plus the legacy 5-key chain (hint, openLoop, recent, size, negMedianAge) and the cluster reference. |
| `rankClusters(clusters, atomsById, query, options)` | function | `src/trace/rank.ts:130` | Decorates each cluster with sort keys (computing median atom age and the optional single-source-recent partition when `demoteSingleSourceRecent` + `nowMs` are supplied), then sorts descending by signal strength with `singleSourceRecent` ascending as the strict primary partition, falling back to `cluster_id` for determinism. |

### `src/trace/role.ts` — artifact-type-to-role taxonomy

**Purpose:** Classifies artifact types into `work` / `session` / `scope` / `unknown` roles so `cluster.ts`'s edge filter can distinguish artifacts carrying real cross-tool signal from broad-scope or session-restatement artifacts.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ArtifactRole` | type | `src/trace/role.ts:11` | Union of the four role categories: `'work' \| 'session' \| 'scope' \| 'unknown'`. |
| `TYPE_TO_ROLE` | const | `src/trace/role.ts:13` | Maps known artifact type strings (repo, workspace, account, org → scope; conversation, thread, channel → session; file, pr, issue, branch, commit, doc, crm_record, task, meeting, email_thread, record → work) to their `ArtifactRole`. |
| `roleOf(artifactType)` | function | `src/trace/role.ts:39` | Looks up the lowercased artifact type in `TYPE_TO_ROLE`, defaulting to `'unknown'` for unrecognized types (kept, not dropped, by the edge filter). |

### `src/trace/types.ts` — shared type definitions for the trace module

**Purpose:** Declares the core data shapes used across the trace pipeline: query input/echo, clusters, edges, open-loop hints, rank signals, graph structures, and the final `RecentWorkContextResponse` returned by the MCP tool.

**Depends on:** `src/normalize/types.js` (`ArtifactRef`, `NormalizedContextEvent`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ArtifactKey` | type | `src/trace/types.ts:3` | String alias for the canonical `provider:type:id` artifact key. |
| `ArtifactHint` | interface | `src/trace/types.ts:5` | Shape of a caller-supplied artifact hint: `provider`, `type`, `id`. |
| `ResponseFormat` | type | `src/trace/types.ts:11` | Union `'full' \| 'minimal' \| 'skeleton'` controlling response verbosity. |
| `Query` | interface | `src/trace/types.ts:13` | Trace query input: `since`, `until`, optional `artifact_hint`, `window_hours`, `limit`, `format`, and `repo_path` (item 037 scope, passed through but not filtered by the trace builder itself). |
| `QueryEcho` | interface | `src/trace/types.ts:27` | Normalized echo of the query included in the response, with all optional fields resolved to concrete values or `null`. |
| `EdgeKind` | type | `src/trace/types.ts:38` | Currently only `'shared_artifact'`. |
| `Confidence` | type | `src/trace/types.ts:40` | Union `'high' \| 'medium' \| 'low'`. |
| `Edge` | interface | `src/trace/types.ts:42` | Graph edge between two atom ids: kind, shared `artifact_ids`, and confidence. |
| `OpenLoopHintKind` | type | `src/trace/types.ts:50` | Union of the four hint kinds: `ends_with_question`, `unresolved_assistant_q`, `contains_todo`, `explicit_followup`. |
| `OpenLoopHintEnriched` | interface | `src/trace/types.ts:56` | A resolved/unresolved open-loop hint record: atom id, kind, extracted text, confidence, resolved flag, and optional resolving atom id. |
| `Cluster` | interface | `src/trace/types.ts:65` | Full cluster record: id, rank, rank_reason list, optional label, anchor artifacts, atom_ids, edges, open_loop_hints, source_breakdown, time_range. |
| `Truncation` | interface | `src/trace/types.ts:78` | Truncation metadata: atoms/clusters returned vs. total, whether truncation occurred, and optional window-wide `source_breakdown`. |
| `RecentWorkContextResponse` | interface | `src/trace/types.ts:91` | Top-level MCP tool response shape: schema_version, tool name, echoed query, clusters, atoms map, truncation, warnings. |
| `RankSignals` | interface | `src/trace/types.ts:101` | Boolean signal bundle per cluster used for ranking: recent_activity, matches_artifact_hint, has_unresolved_open_loop, has_open_loop, code_session_anchor, dense, cross_tool. |
| `Graph` | interface | `src/trace/types.ts:111` | Simple node-id-list + edge-list graph shape used before connected-components. |
| `RawCluster` | interface | `src/trace/types.ts:116` | Pre-enrichment cluster shape: atom_ids plus the edges internal to that cluster. |

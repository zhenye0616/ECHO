# `tests/trace/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 9 files.

### `tests/trace/auto-expand.test.ts` — unit tests for auto-expand suppression predicate

**Purpose:** Exercises `src/trace/auto-expand.ts`'s `isSingleSourceRecent` and `noUsefulCluster` predicates (item 032 AC4), which decide whether the get_recent_work_context auto-expand path should suppress a set of clusters as "noise" (single-source, recent, low-value).

**Depends on:** `src/trace/auto-expand.js` (isSingleSourceRecent, noUsefulCluster, SINGLE_SOURCE_RECENT_THRESHOLD_MS), `src/trace/types.js` (Cluster), `src/normalize/types.js` (NormalizedContextEvent), `tests/trace/fixtures/atoms.js` (makeAtom).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `buildAtomMap(atoms)` | function | `tests/trace/auto-expand.test.ts:16` | Builds a `Map<id, NormalizedContextEvent>` from a list of atoms for test setup. |
| `makeCluster(opts)` | function | `tests/trace/auto-expand.test.ts:20` | Constructs a minimal `Cluster` fixture with given id, atom_ids, and source_breakdown. |
| `describe: "isSingleSourceRecent"` | test suite | `tests/trace/auto-expand.test.ts:45` | Covers single-key-and-recent=true, multi-key=false, single-key-but-old=false, uses latest atom not oldest, and inclusive threshold boundary. |
| `describe: "noUsefulCluster"` | test suite | `tests/trace/auto-expand.test.ts:137` | Covers vacuous-true on empty input, true when all clusters are single-source-recent, false when all single-source but old, and false on mixed single-source-recent + multi-source-recent sets. |

### `tests/trace/build.test.ts` — end-to-end tests for the trace/get_recent_work_context builder

**Purpose:** Exercises `buildRecentWorkContext` from `src/trace/index.ts`, the top-level orchestration function that normalizes capture events, clusters them, ranks clusters, and shapes the final `get_recent_work_context` response (schema, truncation, warnings, query echo). Covers windowing, determinism, artifact-hint filtering, truncation/warning behavior, normalizer-failure resilience, performance, the V1.5 edge-filter (item 019), V1 open-loop-hint enrichment (item 020), and the V1.5 cross-gap DESC/ASC re-sort + window_hours passthrough (item 021).

**Depends on:** `src/storage/interface.js` (CaptureEvent), `src/normalize/types.js` (NormalizedContextEvent), `src/trace/index.js` (buildRecentWorkContext), `src/trace/role.js` (roleOf), `src/trace/types.js` (Query), `tests/trace/fixtures/atoms.js` (makeAtom, AtomSpec).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `typeFromArtifactKey(key)` | function | `tests/trace/build.test.ts:11` | Parses an `ArtifactKey` string (`provider:type:id`) to extract the middle `type` segment, mirroring the parser in `src/trace/cluster.ts`. |
| `asCapture(specs)` | function | `tests/trace/build.test.ts:19` | Converts `AtomSpec[]` fixtures into `{ events, normalize }` — a `CaptureEvent[]` plus a normalize function that looks up pre-built `NormalizedContextEvent`s by id. |
| `describe: "buildRecentWorkContext"` | test suite | `tests/trace/build.test.ts:44` | Covers empty-input response shape, since/until window filtering, deterministic cluster_id, inline atoms keyed by id, artifact_hint filtering, atom-level and cluster-level truncation with warnings, JSON roundtrip fidelity, 3-thread end-to-end ranking, normalizer-throw resilience with deduped warnings, and a 500-atom performance bound (<500ms). |
| `describe: "V1.5 trace edge-filter (item 019)"` | test suite (nested) | `tests/trace/build.test.ts:403` | Verifies retained edges always carry a work/unknown-role artifact, that atom_ids/rank_reason are unaffected by edge filtering, and that `query.format` defaults to/echoes `'full'`/`'minimal'`. |
| `describe: "V1 trace patch — open-loop resolution heuristics (item 020)"` | test suite (nested) | `tests/trace/build.test.ts:502` | Verifies enriched `open_loop_hints[]` carry `resolved`/`resolved_by_atom_id`, and that resolved + unresolved hints can coexist in one cluster. |
| `describe: "V1.5 cross-gap (item 021)"` | test suite (nested) | `tests/trace/build.test.ts:587` | Verifies atoms are re-sorted ascending after a DESC storage fetch (cluster_id/time_range determinism), `window_hours` is echoed verbatim, and a wide `window_hours` lets far-apart atoms still cluster. |

### `tests/trace/cluster.test.ts` — unit tests for graph-building and edge-filtering

**Purpose:** Exercises `src/trace/cluster.ts`'s `artifactKey`, `buildGraph`, `connectedComponents`, and `filterRedundantEdges` — the graph-construction and connected-components clustering core, plus the V1.5 scope/session-role edge filter that drops edges whose only shared artifacts are non-work-role (item 019).

**Depends on:** `src/trace/cluster.js` (artifactKey, buildGraph, connectedComponents, filterRedundantEdges), `src/trace/types.js` (Edge), `tests/trace/fixtures/atoms.js` (makeAtom, AtomSpec).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "artifactKey"` | test suite | `tests/trace/cluster.test.ts:11` | Verifies `artifactKey` joins `provider:type:id` into a single string. |
| `describe: "buildGraph + connectedComponents"` | test suite | `tests/trace/cluster.test.ts:19` | Covers empty input, singleton clusters, shared-artifact edges within a time window, window-hours boundary exclusion/inclusion (4h vs 6h), disjoint atoms, empty-artifacts atoms, 3-atom chains, two disjoint pairs, and multi-artifact edges merging into one edge with combined artifact_ids. |
| `describe: "filterRedundantEdges (V1.5 trace edge-filter)"` | test suite | `tests/trace/cluster.test.ts:236` | Local `edge()` fixture helper plus cases: drops repo-only edges, drops conversation-only edges, drops repo+conversation-only edges, keeps edges with a work-role artifact, keeps mixed edges without trimming artifact_ids, keeps unknown-type edges (generalizability default), keeps empty-artifact_ids edges, and two end-to-end K5-graph filtering scenarios (all-filtered vs only-file-sharing-pair-survives). |

### `tests/trace/fixtures/atoms.ts` — shared atom-fixture factory for trace tests

**Purpose:** Provides `makeAtom`, the single fixture constructor used across all trace test files to build `NormalizedContextEvent` objects from a compact `AtomSpec` (id, app, timestamp, artifacts, optional verb/kind/input/output/hints/actors/state), avoiding duplicated boilerplate normalization shape across test files.

**Depends on:** `src/normalize/types.js` (ActorRef, NormalizedContextEvent, ObservedState).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AtomSpec` | interface | `tests/trace/fixtures/atoms.ts:7` | Compact fixture-input shape: id, app, occurred_at, artifacts list, plus optional verb, kind, input, output, hints, actors, state. |
| `makeAtom(spec)` | function | `tests/trace/fixtures/atoms.ts:21` | Builds a full `NormalizedContextEvent` from an `AtomSpec`, filling schema_version, time, source (with a synthetic `fs:fixture/<id>` raw_pointer), actors (default `[{role:'user'}]`), action.kind, artifacts (mapping label if present), and provenance; conditionally sets action.verb/input/output, open_loop_hints (if non-empty), and state. |

### `tests/trace/hints.test.ts` — unit tests for open-loop hint enrichment and resolution

**Purpose:** Exercises `enrichHints` from `src/trace/hints.ts`, which extracts human-readable text/confidence for raw hint kinds (`ends_with_question`, `unresolved_assistant_q`, `contains_todo`, `explicit_followup`) and, per item 020, determines whether each hint is later "resolved" by a subsequent atom under rules R1.Q, R1.AQ, R1.TODO, and R1.FU.

**Depends on:** `src/trace/hints.js` (enrichHints), `tests/trace/fixtures/atoms.js` (makeAtom).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "enrichHints"` | test suite | `tests/trace/hints.test.ts:5` | Covers empty-hints atoms, each of the 4 hint kinds extracting correct text/confidence, multiple hints per atom, multiple atoms, dropping hints when text can't be extracted, ignoring unknown hint kinds, and order preservation across atoms. |
| `describe: "R1 resolution (item 020)"` | test suite (nested) | `tests/trace/hints.test.ts:157` | Covers R1.Q (user-question resolved by later non-question turn in same conversation; not resolved by another question, across conversations, or without a conversation artifact), R1.AQ (assistant question resolved by user reply; not resolved by another assistant turn), R1.TODO (resolved by a later edit to the same file artifact; not resolved by edits to a different file or when hint atom lacks file artifacts), R1.FU (explicit_followup is always unresolved regardless of later "closure-like" atoms), resolved_by_atom_id picks the earliest qualifying atom (not latest), and resolved=false when no later atoms exist. |

### `tests/trace/labels.test.ts` — unit tests for heuristic cluster labeling

**Purpose:** Exercises `heuristicLabel` from `src/trace/labels.ts`, which derives a short human-readable label (e.g. "discussion about x.ts", "work on bar") for a cluster from its atoms' most-repeated artifact and dominant verb.

**Depends on:** `src/trace/labels.js` (heuristicLabel), `tests/trace/fixtures/atoms.js` (makeAtom).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "heuristicLabel"` | test suite | `tests/trace/labels.test.ts:5` | Covers empty input → undefined, no artifact repeated ≥2× → undefined, conversation-only cluster → undefined, verb-to-phrase mapping ("message"→"discussion about <file>", "commit"→"work on <repo>", "edit"→"edits to <file>", unknown verb→"work on"), fallback to id-tail when artifact has no label, and tie-breaking preference for non-conversation artifacts when counts tie. |

### `tests/trace/rank.test.ts` — unit tests for cluster ranking signals and ordering

**Purpose:** Exercises `signalsFor`, `rankReasonsFor`, and `rankClusters` from `src/trace/rank.ts` — the per-cluster boolean signal computation (recent_activity, matches_artifact_hint, has_open_loop, has_unresolved_open_loop, dense, cross_tool, code_session_anchor) and the multi-key sort that orders clusters for the response, including the V1.6 item-032 `demoteSingleSourceRecent` strict-partition override.

**Depends on:** `src/normalize/types.js` (ArtifactRef, NormalizedContextEvent), `src/trace/rank.js` (rankClusters, rankReasonsFor, signalsFor), `src/trace/types.js` (Cluster, Query), `tests/trace/fixtures/atoms.js` (makeAtom).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `buildAtomMap(atoms)` | function | `tests/trace/rank.test.ts:8` | Builds a `Map<id, NormalizedContextEvent>` for test setup. |
| `makeCluster(opts)` | function | `tests/trace/rank.test.ts:12` | Constructs a `Cluster` fixture with configurable atom_ids, open_loop_hints, source_breakdown, and anchor_artifacts. |
| `describe: "rankReasonsFor"` | test suite | `tests/trace/rank.test.ts:37` | Covers each signal firing/not-firing condition: recent_activity (within/outside 1h of query.until), matches_artifact_hint, has_open_loop (any hints) vs has_unresolved_open_loop (only unresolved hints), dense (≥5 atoms), cross_tool (≥3 source apps), and code_session_anchor from anchor_artifacts type, from a `git`-sourced atom, and confirming cluster_id alone does not trigger it. |
| `describe: "rankClusters"` | test suite | `tests/trace/rank.test.ts:226` | Covers artifact_hint dominating ordering, open-loop cluster ranking above non-open-loop of equal size, the item-032 strict-partition demotion (`demoteSingleSourceRecent=true` forces single-source-recent clusters strictly below all others even when their per-signal score would otherwise dominate; and behaves as a no-op tiebreak when all clusters are uniformly single-source-recent), and ties resolved by larger cluster size. |

### `tests/trace/repo-identity-cross-adapter.test.ts` — held-out cross-adapter repo-identity contract tests

**Purpose:** A blind, independent-oracle regression test (written before the fix) verifying that claude_code, codex, and git capture sources for the SAME checkout with a shared git remote all resolve to the SAME canonical repo artifact id (the normalized remote URL) — required for cross-tool cluster joining, consistent file-artifact keys, and machine-independence (same remote, different local path/OS). Drives the real `normalizeEvents` + `buildGraph`/`connectedComponents` pipeline end-to-end rather than mocking normalization.

**Depends on:** `src/trace/cluster.js` (artifactKey, buildGraph, connectedComponents), `src/normalize/artifacts.js` (normalizeRemoteUrl), `src/normalize/index.js` (normalizeEvents), `src/normalize/types.js` (ArtifactRef, NormalizedContextEvent), `src/storage/interface.js` (CaptureEvent).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `claudeCodeEvent(overrides)` | function | `tests/trace/repo-identity-cross-adapter.test.ts:51` | Builds a fixture `CaptureEvent` for a claude_code turn on the shared checkout, embedding the shared remote URL under several plausible metadata keys (origin_url, git.origin_url, git_state.origin_url). |
| `codexEvent(overrides)` | function | `tests/trace/repo-identity-cross-adapter.test.ts:84` | Builds a fixture `CaptureEvent` for a codex turn on the same checkout, carrying the remote under `metadata.git.origin_url` (today's known-working behavior, used as the anchor). |
| `gitEvent(overrides)` | function | `tests/trace/repo-identity-cross-adapter.test.ts:113` | Builds a fixture `CaptureEvent` for a git commit on the same checkout, embedding the remote under several plausible metadata keys (origin_url, remote_url, git.origin_url, git_state.origin_url). |
| `repoArtifactOf(atom)` | function | `tests/trace/repo-identity-cross-adapter.test.ts:138` | Extracts the single `type: 'repo'` artifact from a normalized atom, throwing if absent. |
| `fileArtifactsOf(atom)` | function | `tests/trace/repo-identity-cross-adapter.test.ts:146` | Extracts all `type: 'file'` artifacts from a normalized atom. |
| `CANONICAL_REPO_ID` | const | `tests/trace/repo-identity-cross-adapter.test.ts:151` | The expected canonical repo id (`normalizeRemoteUrl(SHARED_REMOTE)`) every source must resolve to. |
| `describe: "R1 — cross-adapter repo identity (shared remote → one identity)"` | test suite | `tests/trace/repo-identity-cross-adapter.test.ts:153` | Verifies all three sources resolve to the same canonical repo id equal to `CANONICAL_REPO_ID`; the three atoms join into ONE connected component; derived file artifacts for the same relative path share one repo-id-prefixed artifact key across tools; and machine independence — same remote but different local root/OS (POSIX vs Windows) still resolves to one identity and joins into one component. |

### `tests/trace/role.test.ts` — unit tests for the artifact-type→role registry

**Purpose:** Exercises `roleOf` from `src/trace/role.ts` (V1.5 item 019), which classifies an artifact `type` string into `scope`, `session`, `work`, or `unknown` — used by the edge filter in `src/trace/cluster.ts` to decide which shared-artifact edges carry real work signal.

**Depends on:** `src/trace/role.js` (roleOf).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "roleOf — V1.5 type→role registry"` | test suite | `tests/trace/role.test.ts:4` | Verifies scope types (repo, workspace, account, org), session types (conversation, thread, channel), work types (file, pr, issue, branch, commit, doc, crm_record, task, meeting, email_thread, record), unknown fallback for unrecognized types and the empty string, and case-insensitive normalization via `toLowerCase`. |

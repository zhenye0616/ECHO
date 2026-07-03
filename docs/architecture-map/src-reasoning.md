# `src/reasoning/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `src/reasoning/causal.ts` — Layer 4 query-time causal-link derivation

**Purpose:** Pure functions that derive causal/relational edges (tool-touch chains, git state-transition edges, cross-tool task clusters) on demand from `CaptureEvent` sequences, without persisting a denormalised graph in the database. Consumed by MCP tools, render-trace, and future audit UI to assemble reasoning traces around a given event.

**Depends on:** `src/capture/extractors/_shared.js` (`laneOf`), `src/capture/extractors/_turn_meta.js` (`FILE_INPUT_REGEX`), `src/storage/interface.js` (`CaptureEvent` type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ToolTouchEdge` | interface | `src/reasoning/causal.ts:17` | Edge between two events that touched the same file, with timestamps and gap_ms. |
| `StateTransitionEdge` | interface | `src/reasoning/causal.ts:31` | Edge between consecutive events in a repo whose git head_sha/dirty state differs. |
| `TaskCluster` | interface | `src/reasoning/causal.ts:47` | A group of events for one repo_root within an idle-window, with lane breakdown. |
| `DEFAULT_TASK_IDLE_MS` | const | `src/reasoning/causal.ts:61` | Default 60-minute idle gap threshold used to split task clusters. |
| `safeMd(evt)` | function | `src/reasoning/causal.ts:65` | Returns an event's metadata object, defaulting to `{}` if absent. |
| `repoRoot(evt)` | function | `src/reasoning/causal.ts:69` | Extracts the `repo_root` string field from event metadata, if present. |
| `tsMs(evt)` | function | `src/reasoning/causal.ts:75` | Parses the event's ISO timestamp into epoch milliseconds, defaulting to 0 if invalid. |
| `filesTouchedBy(evt)` | function | `src/reasoning/causal.ts:80` | Collects the set of file paths an event touched, from `files_referenced` and by regex-matching file-path-style args inside `tool_calls`. |
| `gitState(evt)` | function | `src/reasoning/causal.ts:103` | Extracts `head_sha` and `dirty_count` from an event's `git_state` metadata field. |
| `deriveToolTouchEdges(events)` | function | `src/reasoning/causal.ts:120` | Sorts events by time and emits an edge between successive touches of the same file, computing gap_ms between them. |
| `deriveStateTransitionEdges(events)` | function | `src/reasoning/causal.ts:150` | Groups events by repo_root, sorts by time, and emits an edge between consecutive events whose head_sha or dirty_count changed. |
| `deriveTaskClusters(events, idleMs)` | function | `src/reasoning/causal.ts:194` | Groups events by repo_root and splits into clusters whenever the gap between consecutive events exceeds `idleMs`, recording per-lane source counts via `laneOf`. |
| `ReasoningTrace` | interface | `src/reasoning/causal.ts:245` | Bundle of an anchor event's task cluster, predecessor/successor events, tool-touch edges, and state-transition edges. |
| `reasoningTraceFor(events, anchorId)` | function | `src/reasoning/causal.ts:259` | Finds the anchor event, its task cluster, and returns predecessors/successors within the cluster plus derived tool-touch and state-transition edges scoped to that cluster; returns null if the anchor isn't found. |

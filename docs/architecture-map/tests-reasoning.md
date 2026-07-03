# `tests/reasoning/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/reasoning/causal.test.ts` — unit tests for causal reasoning derivation module

**Purpose:** Exercises `src/reasoning/causal.ts` (`deriveStateTransitionEdges`, `deriveTaskClusters`, `deriveToolTouchEdges`, `reasoningTraceFor`) against synthetic `CaptureEvent` fixtures, covering tool-touch edge derivation via shared file references (including regex extraction from `tool_calls[].args`), git head/dirty-count state transitions scoped per repo, idle-window/repo-based task clustering with per-lane source counts, and the composed reasoning trace (predecessors/successors/edges) around an anchor event.

**Depends on:** `src/reasoning/causal.js` (deriveStateTransitionEdges, deriveTaskClusters, deriveToolTouchEdges, reasoningTraceFor), `src/storage/interface.js` (CaptureEvent type), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `evt(opts)` | function | `tests/reasoning/causal.test.ts:11` | Builds a synthetic `CaptureEvent` fixture with auto-incrementing id, given source/timestamp/metadata, empty content. |
| `describe: "deriveToolTouchEdges"` | describe block | `tests/reasoning/causal.test.ts:26` | Covers edge emission when two events reference the same file (via `files_referenced` or extracted from `tool_calls[].args`), no edge when files differ, and correct chaining across 3 sequential same-file events. |
| `describe: "deriveStateTransitionEdges"` | describe block | `tests/reasoning/causal.test.ts:83` | Covers edge emission on `head_sha` change between consecutive same-repo events, no edge when git_state is unchanged, dirty-count-only edges when head stays the same but `dirty_count` flips, and no edges across differing `repo_root` values. |
| `describe: "deriveTaskClusters"` | describe block | `tests/reasoning/causal.test.ts:124` | Covers grouping same-repo events within the idle window into one cluster, splitting into separate clusters when the idle window is exceeded, separating clusters by repo even within the time window, and counting events per source lane (cc/codex/git/cursor) via `by_source`. |
| `describe: "reasoningTraceFor"` | describe block | `tests/reasoning/causal.test.ts:157` | Covers building a trace around an anchor event that returns predecessor/successor events plus associated tool-touch and state-transition edges, and returns null when the anchor id is absent from the events array. |

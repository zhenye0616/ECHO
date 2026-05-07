# Run log — 2026-05-06-018-recent-work-context-tool

**Agent persona:** 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
**Branch:** agent/recent-work-context-tool
**Worktree:** ~/Desktop/Project_echo--recent-work-context-tool
**Head SHA:** 574057d09e7c14e3dbbe3dd807bad5e912cadb11
**Date:** 2026-05-07

## Run 1

### What I implemented

The V1.5 trace layer and the `get_recent_work_context` MCP tool, exactly as
specified in the backlog item. Six modules under `src/trace/`:

- `types.ts` — response shape (`RecentWorkContextResponse`, `Cluster`, `Edge`,
  `OpenLoopHintEnriched`, `Truncation`, `Query`, `QueryEcho`, `ArtifactKey`,
  `RankSignals`, `Graph`, `RawCluster`, `ArtifactHint`).
- `cluster.ts` — `artifactKey()`, `buildGraph(atoms, windowHours)`,
  `connectedComponents(graph)`. Pairs sharing an artifact within the time
  window (default 4h) become edges. Multiple shared artifacts collapse into a
  single edge with merged `artifact_ids`. Connected components computed via
  union-find.
- `rank.ts` — `signalsFor()`, `rankReasonsFor()`, `rankClusters()`. Recent =
  any atom within 1h of `query.until`. Sort tuple: artifact_hint match →
  open_loop → recent → size → newer median → cluster_id (deterministic
  tiebreak).
- `labels.ts` — `heuristicLabel()`. Picks dominant artifact (≥2 occurrences,
  prefers non-conversation), maps `action.verb || action.kind` mode through
  a verb table (`message → "discussion about"`, `commit → "work on"`,
  `edit → "edits to"`, etc.), composes `<verb> <artifact-label-or-tail>`.
  Returns `undefined` when no dominant artifact or only opaque conversation
  ids.
- `hints.ts` — `enrichHints()`. Maps each known per-atom hint kind
  (`ends_with_question`, `unresolved_assistant_q`, `contains_todo`,
  `explicit_followup`) into `{atom_id, kind, text, confidence}`, extracting
  text from `action.input`/`action.output`. Drops a hint if no text can be
  extracted.
- `index.ts` — `buildRecentWorkContext(events, query, normalize)`. Pure
  end-to-end pipeline: normalize → window-filter → graph → components →
  cluster fields (cluster_id is `"ctx_" + sha256_hex(schema_version +
  sorted(atom_ids).join(',')).slice(0, 8)`) → optional artifact_hint filter
  → rank → truncate by atom limit (lowest-rank cluster's oldest atoms drop
  first) → response. Re-exports the public API.

The MCP tool wrapper:

- `src/mcp/tools/recent-work-context.ts` — `getRecentWorkContext()` resolves
  default time window (`now - 4h` … `now`) at the boundary using `Date.now()`
  (the trace module remains pure), clamps `limit` to `[1, 500]`, overfetches
  storage at `limit * 10`, runs candidates through `normalizeEvent`,
  delegates to `buildRecentWorkContext`. `registerRecentWorkContext()`
  registers the tool on an `McpServer` with the documented description and
  zod input schema (since/until validated as ISO 8601, artifact_hint as
  structured object, limit as number).
- `src/mcp/server.ts` — registers the new tool alongside `echo_ping` and
  `search_memories` inside `createSession()`.

### Files modified (per spec `files_to_modify`)

- `src/trace/index.ts` (new, 245 lines)
- `src/trace/types.ts` (new, 95 lines)
- `src/trace/cluster.ts` (new, 132 lines)
- `src/trace/rank.ts` (new, 117 lines)
- `src/trace/labels.ts` (new, 100 lines)
- `src/trace/hints.ts` (new, 90 lines)
- `src/mcp/tools/recent-work-context.ts` (new, 102 lines)
- `src/mcp/server.ts` (+2 lines: import + register call)
- `tests/trace/cluster.test.ts` (new, 192 lines, 11 tests)
- `tests/trace/rank.test.ts` (new, 173 lines, 9 tests)
- `tests/trace/labels.test.ts` (new, 162 lines, 9 tests)
- `tests/trace/hints.test.ts` (new, 154 lines, 9 tests)
- `tests/trace/build.test.ts` (new, 233 lines, 9 tests including perf)
- `tests/mcp/tools/recent-work-context.test.ts` (new, 196 lines, 5 tests)
- `tests/trace/fixtures/atoms.ts` (new, 42 lines — shared test atom builder)

Branch: `agent/recent-work-context-tool` @ `574057d09e7c14e3dbbe3dd807bad5e912cadb11`.

### Decisions made during implementation

- **`now` reference for "recent_activity"** — the spec says trace module is
  pure and never reads the clock. I chose `query.until` as the "now" anchor:
  `recent` = any atom within 1h of `query.until`. Natural and pure.
- **Edge confidence** — defaults to `'high'` for `shared_artifact` per the
  algorithm sketch; never downgraded in V1.5.
- **Cluster ordering pre-rank** — `connectedComponents()` sorts clusters by
  smallest atom_id so output is deterministic before ranking.
- **Tiebreak on equal rank tuples** — falls back to `cluster_id` lexical
  order, ensuring full determinism.
- **Truncation semantics** — drops atoms from the lowest-ranked cluster's
  *oldest* atoms first. Edges referencing dropped atoms are removed; if a
  cluster ends up empty it's dropped entirely. `truncation.atoms_returned`
  reflects post-trim count.
- **Label heuristic — non-conversation tiebreak** — when two artifacts tie
  in occurrence count, prefer non-conversation. A pure-conversation cluster
  with no useful tail returns `undefined`.
- **Hint text fallback** — if input/output is empty for a hint kind, the
  hint is dropped. Matches spec: heuristic-only, no LLM.

### Acceptance criteria status

- [x] New MCP tool `get_recent_work_context` registered alongside
  `echo_ping` and `search_memories`. Verified via `tools/list` integration
  test ("all three tools are registered").
- [x] Input schema with documented optional defaults; ISO 8601 validation;
  structured `artifact_hint`. Tested via "returns a tool error on a malformed
  since timestamp".
- [x] Tool description matches spec wording.
- [x] `src/trace/` modules present with correct public APIs.
- [x] `buildRecentWorkContext` is a pure function — verified by purity grep
  (`grep -RE "Date.now|fs\\.|require\\('fs'\\)|import.*from 'fs'|fetch\\(|http"
  src/trace/` returns zero hits).
- [x] Connected-components clustering with `|Δt| ≤ window_hours` edge
  filter; default 4h, configurable per call. Tested in cluster.test.ts.
- [x] Response is JSON-roundtrippable with `schema_version: 1`. Tested in
  build.test.ts ("roundtrips through JSON.parse/stringify without loss").
- [x] MCP wrapper queries storage with `limit*10` overfetch and runs
  candidates through `normalizeEvent`.
- [x] Open-loop hints enriched at trace layer; atom shape unchanged.
- [x] Cluster `label?` heuristic-only, optional. Returns undefined when
  heuristic produces nothing useful.
- [x] Performance — 500-atom synthetic test asserts <500ms wall-clock; runs
  in ~50–80 ms locally on M-series.
- [x] No new dependencies. `node:crypto` used only for cluster_id hashing.
- [x] Per-module unit tests + tool-level integration test against seeded
  `MemoryStorage` (5 claude-code events forming 1 cluster keyed by shared
  repo + file artifacts; verifies clusters/atoms/inline shape).
- [x] `npm run typecheck`, `npm run lint`, and the trace+MCP tests run
  clean.

### Test output

#### Trace + MCP tool tests (deterministic, isolated run)

```
$ npx vitest run tests/trace tests/mcp/tools/recent-work-context.test.ts

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--recent-work-context-tool

 ✓ tests/trace/labels.test.ts (9 tests) 6ms
 ✓ tests/trace/rank.test.ts (9 tests) 8ms
 ✓ tests/trace/hints.test.ts (9 tests) 10ms
 ✓ tests/trace/cluster.test.ts (11 tests) 13ms
 ✓ tests/trace/build.test.ts (9 tests) 67ms
 ✓ tests/mcp/tools/recent-work-context.test.ts (5 tests) 248ms

 Test Files  6 passed (6)
      Tests  52 passed (52)
   Duration  1.27s
```

#### `npm run typecheck` and `npm run lint`

```
$ npm run typecheck
> tsc --noEmit
(clean — no output)

$ npm run lint
> eslint . --max-warnings 0
(clean — no output)
```

#### `npm test` — full suite

Full suite shows pre-existing chokidar lifecycle flake (documented in item
014's review_notes — `tests/capture/extractors/cursor.test.ts`,
`tests/capture/surfaces/fs-watcher.test.ts`, `tests/daemon/lifecycle.test.ts`).
None of my changes touch those surfaces. With `--pool=forks
--poolOptions.forks.singleFork=true` the suite is 390/391 (only daemon
lifecycle still flaky). Default-pool runs are 387/391 — the 4 flaky tests
that intermittently time out are exactly the three files documented as
flaky in item 014.

```
$ npm test
...
Test Files  2 failed | 27 passed (29)
     Tests  4 failed | 387 passed (391)

$ npx vitest run --pool=forks --poolOptions.forks.singleFork=true
Test Files  1 failed | 28 passed (29)
     Tests  1 failed | 390 passed (391)
```

All 52 tests added by this item pass deterministically in every run.

### Open questions for founder

None — the spec was complete and unambiguous. Two items worth flagging for
post-merge consideration (not blocking):

- **Real-world cluster coalescence via shared repo artifact.** When events
  from different files in the same repo land within the 4h window, the repo
  artifact alone joins them into one cluster. This is *correct* per the
  spec's algorithm (any shared artifact = edge). Whether this matches the
  founder's intuition for "coherent work thread" boundaries is one of the
  things the v1.5 dogfooding loop is meant to surface (already noted in the
  trace-layer design doc under "What V1.5 will teach us").
- **Pre-existing chokidar test flake.** Same race documented in
  `backlog/complete/2026-04-30-014-mcp-search-memories.md` — unchanged. My
  added tests do not exacerbate it; the failures continue to be in the same
  three files (`cursor.test.ts`, `fs-watcher.test.ts`, `lifecycle.test.ts`)
  with the same 5 s timeout signature.

### Drift events caught

None. Every implementation choice maps to an explicit acceptance criterion
or a "Decisions made" decision recorded in this log. Specific temptations
that I noticed and rejected:

- "Add a `score` field" — explicitly rejected by codex redline pass; spec
  says rank + rank_reason only.
- "Persist clusters in a traces table for cache" — spec marks this V2.
- "Try to identify `temporal_near` edges since they're documented as
  future-list" — spec explicitly rules them out for V1.5.
- "Surface a UI/trace viewer" — V2.

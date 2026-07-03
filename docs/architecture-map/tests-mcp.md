# `tests/mcp/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 21 files.

### `tests/mcp/cursor-workspace-resolver.test.ts` — Cursor workspace/composer resolver tests

**Purpose:** Exercises `src/mcp/cursor-workspace-resolver.js` — resolving a repo path to the active Cursor composer (`resolveCursorComposerForRepoPath`), the inverse workspace_id→repo_root lookup (`resolveRepoRootForWorkspaceId`, item 037/AC1), and the shared `normaliseRepoPath` path helper. Builds a hermetic fixture mirroring Cursor's on-disk `workspaceStorage/<hash>/{workspace.json,state.vscdb}` and global `state.vscdb` (`cursorDiskKV`) layout using a real temp-dir `better-sqlite3` database.

**Depends on:** `../../src/mcp/cursor-workspace-resolver.js`, `better-sqlite3`, `node:fs`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `buildFixture(opts)` | function | `tests/mcp/cursor-workspace-resolver.test.ts:44` | Builds a temp-dir Cursor-layout fixture: writes `workspace.json` + `state.vscdb` (ItemTable) per workspace and a global `state.vscdb` (cursorDiskKV) with composer records; returns paths + cleanup callback. |
| `describe: "resolveCursorComposerForRepoPath"` | describe | `tests/mcp/cursor-workspace-resolver.test.ts:97` | Covers forward resolution: repo path → {workspace_id, composer_id} by max lastUpdatedAt/createdAt, URL-decoding, non-file:// skip, malformed JSON handling, empty allComposers, trailing-slash normalization, post-migration `selectedComposerIds`/`lastFocusedComposerIds` shape, and union-of-shapes defense-in-depth. |
| `describe: "resolveRepoRootForWorkspaceId (item 037 / AC1)"` | describe | `tests/mcp/cursor-workspace-resolver.test.ts:355` | Covers inverse resolution: workspace_id → absolute repo folder, including URL-decoding, missing workspace, missing/non-file folder, and trailing-slash stripping. |
| `describe: "normaliseRepoPath (item 037 export)"` | describe | `tests/mcp/cursor-workspace-resolver.test.ts:458` | Verifies the shared path-normalization helper strips a single trailing slash, no-ops otherwise, and preserves root `"/"`. |

### `tests/mcp/envelope-find-get-chain.test.ts` — decomposition byte-envelope test (item 030 AC9)

**Purpose:** Validates the V1.6 item 030 acceptance-#9 contract that the decomposed `find_clusters(skeleton)` + `get_atoms(minimal)` call chain costs no more bytes than the compound `get_recent_work_context(minimal)` call, on an apples-to-apples fully-materialized fixture.

**Depends on:** `../../src/mcp/tools/find-clusters.js`, `../../src/mcp/tools/get-atoms.js`, `../../src/mcp/tools/recent-work-context.js`, `../../src/storage/memory.js`, `../../src/storage/interface.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ccTurn(i, filePath, ts)` | function | `tests/mcp/envelope-find-get-chain.test.ts:27` | Builds a realistic-density claude_code capture event (long content + 5 tool_calls) referencing `filePath` at timestamp `ts` for fixture generation. |
| `describe: "envelope: find_clusters + get_atoms ≤ get_recent_work_context (apples-to-apples)"` | describe | `tests/mcp/envelope-find-get-chain.test.ts:59` | Asserts chain bytes (find_clusters skeleton + get_atoms minimal on the compound call's materialized IDs) ≤ compound call bytes, both under the 25k ceiling; and that find_clusters alone stays under 10k chars on a 24h/30-atom lookback. |

### `tests/mcp/find-clusters.test.ts` — `find_clusters` MCP tool tests

**Purpose:** Exercises `src/mcp/tools/find-clusters.js` (item 030/037/038): full un-clipped `atom_ids[]` per cluster vs the skeleton 50-cap, graph-membership/rank parity against the raw trace builder, envelope cost/ceiling enforcement, `view=compact` projection, auto-expand (4h→24h) behavior, per-cluster and response-level truncation, and `repo_path` scoping.

**Depends on:** `../../src/mcp/tools/find-clusters.js`, `../../src/storage/memory.js`, `../../src/normalize/index.js`, `../../src/trace/index.js`, `../../src/storage/interface.js`, `../../src/mcp/tools/get-atoms.js` (dynamic import), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `claudeCodeTurn(i, filePath, ts)` | function | `tests/mcp/find-clusters.test.ts:21` | Builds a claude_code USER+ASSISTANT capture event referencing `filePath`, tagged with `surface`, `cwd`, `session_id` metadata for clustering. |
| `gitCommit(i, filePath, ts)` | function | `tests/mcp/find-clusters.test.ts:38` | Builds a git-surface capture event representing a commit touching `filePath`. |
| `describe: "find_clusters"` | describe | `tests/mcp/find-clusters.test.ts:51` | Core suite: full atom_ids beyond the 50-skeleton-cap, graph-membership+rank equality vs `buildRecentWorkContext`, <10k cost target, no-args 4h→24h auto-expand (empty + single-source-recent triggers), `result_caps` truncation summary, `view=rich` (default) byte-parity, unknown-view rejection, `view=compact` shape/rank_reason/label-null, open_loop_hints capping, per-cluster atom_ids hard cap (200) with head+tail retention, response-level 25k byte ceiling trimming clusters, compact-view response cap sizing, and resume-call round-trip into `get_atoms(prefer=newest_first)`. |
| `describe: "Item 038 / AC3 — find_clusters({repo_path}) inherits 037 forwarding"` | describe | `tests/mcp/find-clusters.test.ts:662` | Regression pinning that `repo_path` scoping by `metadata.repo_root` still works after the cluster engine moved to `internal/`. |

### `tests/mcp/get-atom.test.ts` — `get_atom` single-atom retrieval tool tests

**Purpose:** Exercises `src/mcp/tools/get-atom.js` — the "recovery" tool that returns one atom with content verbatim (never clipped) while metadata is projected, enforcing the 25k response ceiling and distinguishing `atom_too_large_for_wire` from `atom_not_found`.

**Depends on:** `../../src/mcp/tools/get-atom.js`, `../../src/storage/memory.js`, `../../src/storage/interface.js`, `../../src/mcp/wire-shape/caps.js`, `../../src/mcp/wire-shape/match.js` (dynamic import), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `evShape(i, overrides)` | function | `tests/mcp/get-atom.test.ts:7` | Builds a minimal fs-sourced capture event fixture with overridable content/metadata for get_atom tests. |
| `describe: "get_atom"` | describe | `tests/mcp/get-atom.test.ts:20` | Covers: content verbatim + metadata projection with truncations cleanup (removes stale "content" truncation flag); Codex-realistic 10KB content + 130KB tool_calls metadata recovery; content-too-large → `atom_too_large_for_wire` with `source` populated; 22KB just-fits success path; missing-ID → `atom_not_found`; round-trip recovery of content that `projectMatch` (search path) would have clipped; empty-id rejection; and no-metadata atom shape. |

### `tests/mcp/get-atoms.test.ts` — `get_atoms` batch retrieval tool tests

**Purpose:** Exercises `src/mcp/tools/get-atoms.js` — batch atom fetch by ID list with request-order preservation, dropped-ID reporting, content/metadata projection, `view` (rich/compact) and `fields[]` narrowing, response-budget prefix-drop behavior, and `prefer='newest_first'` resume-friendly ordering (item 032 AC4).

**Depends on:** `../../src/mcp/tools/get-atoms.js`, `../../src/storage/memory.js`, `../../src/storage/interface.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `evShape(i, overrides)` | function | `tests/mcp/get-atoms.test.ts:6` | Builds a minimal fs-sourced capture event fixture with overridable content/metadata for get_atoms tests. |
| `describe: "get_atoms"` | describe | `tests/mcp/get-atoms.test.ts:19` | Core suite: requested-order return, missing-ID reporting, empty-truncations baseline, content-cap truncation + `content_bytes_elided`, tool_calls projection truncation label, `fields[]` narrowing, `view=rich` byte-parity with default, `view=compact` shape/dropped-fields, compact+fields[] composition, empty/over-MAX atom_ids rejection, unknown-view rejection, deterministic prefix-drop on 25k overflow (contiguous tail dropped), compact-view prefix-drop sizing, first-atom-alone-exceeds-ceiling edge case, and a regression pinning the final envelope (not a tentative one) respects the 25k ceiling with many missing IDs. |
| `describe: "prefer='newest_first' (item 032)"` | describe | `tests/mcp/get-atoms.test.ts:329` | Covers descending-timestamp ordering, missing IDs appended last, dedup-to-first-occurrence under newest_first, `as_requested` default preserving duplicate-passthrough, oldest-atoms-dropped-first demotion under budget overflow, and envelope ceiling enforcement under newest_first. |

### `tests/mcp/pending-decisions.test.ts` — `pending_decisions` MCP tool + playbook adapter tests

**Purpose:** Exercises `src/mcp/tools/pending-decisions.js` and its playbook adapter `src/mcp/tools/internal/decision-source-playbook.js` — projecting founder-facing "decision cards" from backlog review-round `combined.md` files (explicit escalation, runaway-churn A1 signal after 4 blind rounds, `next_round` as the unresolved marker, active-item scan limiting) and reporting git upstream freshness (behind-count, dirty, stale/offline fetch handling).

**Depends on:** `../../src/mcp/tools/internal/decision-source-playbook.js`, `../../src/mcp/tools/pending-decisions.js`, `../../src/mcp/server.js`, `../../src/storage/memory.js`, `node:fs`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `frontmatter(fields)` | function | `tests/mcp/pending-decisions.test.ts:23` | Serializes a key/value map into a YAML-frontmatter + body markdown string for fixture files. |
| `writeItem(root, stage, id)` | function | `tests/mcp/pending-decisions.test.ts:32` | Writes a minimal backlog item markdown file into `backlog/<stage>/<id>.md`. |
| `writeCombined(root, itemId, round, fields)` | function | `tests/mcp/pending-decisions.test.ts:40` | Writes a `backlog/reviews/<itemId>/r<round>/combined.md` fixture with configurable `escalated_to_founder`, `next_round`, `combined_verdict`. |
| `makeRepo()` | function | `tests/mcp/pending-decisions.test.ts:62` | Creates a temp-dir fixture repo with the four backlog stage directories pre-created. |
| `fakeGit(argsByCall)` | function | `tests/mcp/pending-decisions.test.ts:71` | Builds a stub `GitRunner` that dispatches on the joined argv to return canned `{ok, stdout, timedOut}` results, for simulating git fetch/rev-parse/rev-list/status. |
| `describe: "pending_decisions playbook adapter"` | describe | `tests/mcp/pending-decisions.test.ts:75` | Covers explicit founder-escalation cards, card removal once an item leaves active backlog dirs, A1 runaway-churn firing after 4 consecutive blind rounds (and reset on founder touch), `next_round` (not request.md presence) as the unresolved marker, tolerance of legacy combined.md missing `escalated_to_founder`, a real-repo regression against item 072's actual review sequence, and active-scan-limit partial-result reporting. |
| `describe: "pending_decisions freshness"` | describe | `tests/mcp/pending-decisions.test.ts:170` | Covers git-derived `source_state` (local/upstream head, behind-count, dirty), stale-upstream-checked-at retention on a later fetch failure, and hung-fetch treated as offline/stale while cards still return. |
| `describe: "pending_decisions MCP registration"` | describe | `tests/mcp/pending-decisions.test.ts:258` | Verifies `pending_decisions` is registered by `startMcpServer` and that `registerPendingDecisions` wires a read-only-hinted tool handler without storage dependencies. |

### `tests/mcp/recent-calls-endpoint.test.ts` — `GET /mcp/recent-calls` audit endpoint tests

**Purpose:** Exercises the HTTP audit endpoint (backed by `src/mcp/request-log.js`) that surfaces recent MCP tool-call records for every runtime-registered tool, driving each tool through a live `startMcpServer` instance with minimal valid arguments.

**Depends on:** `../../src/mcp/request-log.js`, `../../src/mcp/server.js`, `../../src/storage/memory.js`, `../fixtures/stdout.js`, `@modelcontextprotocol/sdk/client/index.js`, `@modelcontextprotocol/sdk/client/streamableHttp.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/recent-calls-endpoint.test.ts:27` | Opens an MCP `StreamableHTTPClientTransport` client against `url`, runs `fn`, and always closes the client. |
| `rawPost(url, body)` | function | `tests/mcp/recent-calls-endpoint.test.ts:38` | Issues a raw JSON-RPC POST to the MCP endpoint and returns `{status, text}`. |
| `recentCalls(baseUrl, since)` | function | `tests/mcp/recent-calls-endpoint.test.ts:50` | Fetches `GET {baseUrl}/mcp/recent-calls?since=` and parses the JSON `RecentCallsResponse`. |
| `minimalArgs(tool)` | function | `tests/mcp/recent-calls-endpoint.test.ts:56` | Returns minimal valid arguments per registered tool name (echo_ping, search_memories, get_recent_work_context, find_clusters, get_atoms, wait_for_new_turns, get_atom, echo_resolve_mru, get_role_state, list_task_states, pending_decisions, coord_emit, propose_decision) so each can be smoke-called; throws for any unhandled registered tool. |
| `describe: "GET /mcp/recent-calls"` | describe | `tests/mcp/recent-calls-endpoint.test.ts:95` | Verifies every runtime-registered tool is logged exactly once through the wrapper with correct ts/duration/args_shape/result_shape/status, and that recent-calls filtering by `status` works while `HEAD /mcp` stays 405. |

### `tests/mcp/request-log.test.ts` — in-memory MCP call ring buffer + shutdown-flush tests

**Purpose:** Exercises `src/mcp/request-log.js` — the ring-buffer recorder of recent MCP calls (`beginRecentMcpCall`/`finishRecentMcpCall`/`failRecentMcpCall`/`readRecentMcpCalls`) and the atomic tmp-then-rename shutdown flush to JSONL (`flushRecentMcpCallLog`, item 067 AC3).

**Depends on:** `../../src/mcp/request-log.js`, `node:fs` (mocked via `vi.mock`), `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `okResult(structuredContent)` | function | `tests/mcp/request-log.test.ts:36` | Builds a successful MCP tool-call result envelope (`content` + `structuredContent`) fixture. |
| `errorResult(text)` | function | `tests/mcp/request-log.test.ts:43` | Builds an `isError:true` MCP tool-call result envelope fixture with a text message. |
| `describe: "recent MCP request log"` | describe | `tests/mcp/request-log.test.ts:50` | Covers insertion-order + redacted-shape read-back, pending→ok/error transitions (both thrown-exception and `isError` envelope paths), 1000-entry ring cap eviction (oldest dropped), since/until/status filtering, and no-op behavior when finishing an already-evicted pending call. |
| `withTmpDir(fn)` | function | `tests/mcp/request-log.test.ts:145` | Creates/cleans up a temp directory for shutdown-flush file-write tests. |
| `readJsonLines(path)` | function | `tests/mcp/request-log.test.ts:154` | Reads a JSONL file and parses each non-empty line into an object. |
| `describe: "flushRecentMcpCallLog"` | describe | `tests/mcp/request-log.test.ts:144` | Covers mixed-status flush (ok/error/pending→`killed_during_shutdown`), writing an empty file for an empty ring, full-ring overwrite (not append) on repeated flush, and the atomic tmp-then-rename write mechanism (writeFileSync to `.tmp`, renameSync into place, in that call order). |

### `tests/mcp/server.test.ts` — `startMcpServer` HTTP/MCP transport tests

**Purpose:** Exercises `src/mcp/server.js`'s `startMcpServer` — ephemeral-port loopback-only binding, `echo_ping` tool behavior, `view=compact` structuredContent validation for `find_clusters`/`get_atoms`, graceful `stop()`, startup logging, and the stateless StreamableHTTP transport's HTTP method/session-header handling (item 027 regressions).

**Depends on:** `../../src/mcp/server.js`, `../../src/storage/memory.js`, `../fixtures/stdout.js`, `@modelcontextprotocol/sdk/client/index.js`, `@modelcontextprotocol/sdk/client/streamableHttp.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/server.test.ts:23` | Opens an MCP client transport against `url`, runs `fn`, and always closes the client. |
| `rawPost(url, body, extraHeaders)` | function | `tests/mcp/server.test.ts:229` | Issues a raw JSON-RPC POST with optional extra headers (e.g. stale `Mcp-Session-Id`) and returns `{status, headers, text}`. |
| `describe: "startMcpServer"` | describe | `tests/mcp/server.test.ts:34` | Covers: ephemeral-port boot + stable URL shape; 127.0.0.1-only binding; `echo_ping` listed via tools/list with description; `echo_ping` returns pong/received/ts (with and without a message arg); `find_clusters`/`get_atoms` `view=compact` produce valid structuredContent (omitting `query`/`result_caps`, present `clusters`/`atoms`); `stop()` closes the listener so later connections fail; startup log line shape (`source: mcp.server`, `message: started`, host/port/url payload); stale `Mcp-Session-Id` header with no prior initialize still succeeds (HTTP 200, stateless transport); raw `initialize` returns `application/json` with no session header; `GET`/`DELETE /mcp` return 405 with `Allow: POST` and a JSON-RPC-style error body (with and without a stale session header); and the advertised URL shape is loopback-only. |

### `tests/mcp/tools/echo-ping.test.ts` — MCP tool test for echo_ping

**Purpose:** Exercises `src/mcp/tools` echo_ping registration via a real `startMcpServer` + MCP SDK client, verifying item 025's outputSchema/structuredContent/readOnlyHint contract.

**Depends on:** `@modelcontextprotocol/sdk` (Client, StreamableHTTPClientTransport), `src/mcp/server.js` (startMcpServer, McpServerHandle), `src/storage/memory.js` (MemoryStorage), `tests/fixtures/stdout.js` (captureStdout)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/tools/echo-ping.test.ts:27` | Opens a StreamableHTTP MCP client connection to the given URL, runs `fn` against it, and always closes the client afterward. |
| `describe: "echo_ping (item 025: outputSchema + structuredContent + readOnlyHint)"` | describe | `tests/mcp/tools/echo-ping.test.ts:41` | Starts/stops an in-memory-backed MCP server per test and asserts `tools/list` advertises `outputSchema` + `readOnlyHint: true` for `echo_ping`, and that `tools/call` returns matching `content` (JSON text) and `structuredContent` with `pong`, `received`, `ts` fields. |

### `tests/mcp/tools/echo-resolve-mru.test.ts` — MCP tool test for echo_resolve_mru (item 038 AC1)

**Purpose:** Unit + end-to-end coverage (≥15 cases) of `echoResolveMru` from `src/mcp/tools/echo-resolve-mru.js` — per-source-app MRU resolution (claude_code, codex, cursor, git), repo_path scoping, Cursor's two-phase legacy-composer fallback, git's two-path OR reconciliation, mixed literal-path/app-name inputs, validation, and its composition with `search_memories`; also verifies the registered MCP handler and the removal of `tail_session` (AC2 closure).

**Depends on:** `@modelcontextprotocol/sdk` (Client, StreamableHTTPClientTransport), `node:os` (homedir), `src/mcp/tools/echo-resolve-mru.js` (echoResolveMru, EchoResolveMruResult), `src/mcp/tools/search-memories.js` (searchMemories), `src/mcp/server.js` (startMcpServer, McpServerHandle), `src/storage/memory.js` (MemoryStorage), `src/storage/interface.js` (CaptureEvent), `tests/fixtures/stdout.js` (captureStdout)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/tools/echo-resolve-mru.test.ts:40` | Opens a StreamableHTTP MCP client, runs `fn`, then closes the client. |
| `ts(min)` | function | `tests/mcp/tools/echo-resolve-mru.test.ts:58` | Builds an ISO timestamp at `2026-05-11T10:<min>:00Z` for deterministic ordering in fixtures. |
| `ev(source, timestamp, content, metadata?)` | function | `tests/mcp/tools/echo-resolve-mru.test.ts:62` | Constructs an `Omit<CaptureEvent,'id'>` object, including `metadata` only when provided. |
| `describe: "echoResolveMru — matrix: each source_app, with/without repo_path"` | describe | `tests/mcp/tools/echo-resolve-mru.test.ts:73` | Covers the 8-case matrix (claude_code/codex/cursor/git × with/without repo_path), including Cursor Phase 1 (repo_root hit) behavior. |
| `describe: "echoResolveMru — git two-path OR (R3 Codex #2 port from 037 AC6 Note 2)"` | describe | `tests/mcp/tools/echo-resolve-mru.test.ts:224` | Verifies legacy git atoms (source-only, no metadata.repo_root) are recoverable via path B of the OR, and that no-match yields a null slot. |
| `describe: "echoResolveMru — mixed input types + validation"` | describe | `tests/mcp/tools/echo-resolve-mru.test.ts:253` | Tests mixed literal-path + app-name `sources` entries, empty-array rejection, non-absolute `repo_path` rejection, and trailing-slash normalization. |
| `describe: "echoResolveMru — end-to-end composition with search_memories (Codex R2 HIGH #2 closure)"` | describe | `tests/mcp/tools/echo-resolve-mru.test.ts:296` | Confirms that composing the resolved `desc.source`/`desc.filter` into `search_memories` recovers only atoms for the named repo, with cross-repo leakage structurally impossible. |
| `describe: "echoResolveMru — registered-handler integration"` | describe | `tests/mcp/tools/echo-resolve-mru.test.ts:329` | Verifies `tools/list` advertises `echo_resolve_mru` with descriptor language, confirms `tail_session` is no longer advertised (AC2), and checks `callTool` response shape. |

### `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts` — git-repo fixture builder for list_task_states tests

**Purpose:** Builds a throwaway git repository under a temp dir seeded with `backlog/task-state/**` role pointers and `backlog/<stage>/*.md` stage items covering ready/claimed/pending_review/complete/stage-less/malformed-anchor cases, used by `list-task-states-batching.test.ts` to exercise `listTaskStates`'s batched git reads against realistic repo shape.

**Depends on:** `node:child_process` (execFileSync), `node:fs` (mkdirSync, mkdtempSync, rmSync, writeFileSync), `node:os` (tmpdir), `node:path` (join)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ListTaskStatesFixture` | interface | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:6` | Shape returned by the builder: `repoRoot`, resolved `ref` (HEAD SHA), and a `cleanup()` callback. |
| `BuildFixtureOptions` | interface | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:12` | Optional knobs: `extraCompleteTasks` (bulk-generate N complete-stage tasks) and `bodyPaddingBytes` (inflate pointer bodies for high-cardinality tests). |
| `GIT_ENV` | const | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:17` | Fixed author/committer name, email, and date env vars so fixture commits are deterministic. |
| `git(repoRoot, args, env?)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:26` | Runs a git subcommand synchronously in `repoRoot` with merged env, returning stdout as utf-8. |
| `pointerBody(taskId, specStage, bodyPaddingBytes?)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:34` | Renders a well-formed task-state pointer markdown body with `canonical_anchors` pointing at `backlog/<specStage>/<taskId>.md`, optionally padded with an HTML comment to inflate byte size. |
| `malformedPointerBody(taskId)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:54` | Renders a pointer body whose `canonical_anchors` section includes an unsupported `bogus_key`, to exercise degraded anchor parsing. |
| `writeTaskState(repoRoot, taskId, role, body)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:73` | Writes `backlog/task-state/<taskId>/<role>.md` (role is `strategist`/`builder`/`round-state`), creating directories as needed. |
| `writeStageItem(repoRoot, taskId, stage)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:84` | Writes a minimal `backlog/<stage>/<taskId>.md` spec stub with frontmatter `id: <taskId>`. |
| `buildListTaskStatesFixture(options?)` | function | `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts:90` | Initializes a temp git repo, seeds ready/claimed/pending_review/complete/stage-less/malformed-anchor fixture tasks (plus optional bulk complete tasks), commits everything, and returns `{ repoRoot, ref, cleanup }`; on any failure, removes the temp dir and rethrows. |

### `tests/mcp/tools/list-task-states-batching.test.ts` — batched-git-read tests for list_task_states (item 111)

**Purpose:** Verifies `listTaskStates` (`src/mcp/tools/list-task-states.js`) issues a fixed 8-child-process git budget (rev-parse, 5×ls-tree, one batched cat-file, one log) regardless of task-state cardinality, matches a checked-in baseline JSON fixture, cleans up injected `cat-file --batch` failures without leaking children, and scales its stdout buffer for high-cardinality output.

**Depends on:** `node:fs` (readFileSync), `src/mcp/tools/list-task-states.js` (listTaskStates, ListTaskStatesResult), `src/mcp/util/role-state-git.js` (defaultGitRunner, GitError, GitRunOptions, GitRunResult, GitRunner), `tests/mcp/tools/fixtures/build-list-task-states-fixture.js` (buildListTaskStatesFixture), `tests/mcp/tools/fixtures/list-task-states-baseline.json`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `LedgerEntry` | interface | `tests/mcp/tools/list-task-states-batching.test.ts:16` | Recorded shape of one git invocation: `args`, `inputLines` (stdin line count), `maxBuffer`, `stdoutBytes`. |
| `baseline` | const | `tests/mcp/tools/list-task-states-batching.test.ts:23` | Parsed `list-task-states-baseline.json` fixture used as the expected `ListTaskStatesResult` for byte-for-byte comparison. |
| `ledgerRunner(ledger)` | function | `tests/mcp/tools/list-task-states-batching.test.ts:27` | Wraps `defaultGitRunner`, appending a `LedgerEntry` for every git call so tests can assert the exact sequence/count of child-process invocations. |
| `describe: "111 — list_task_states batched git reads"` | describe | `tests/mcp/tools/list-task-states-batching.test.ts:43` | Asserts the fixed 8-call git sequence and exact baseline match; asserts repeated `cat-file --batch` parse failures throw `GitError` and leave zero active batch children each time; asserts a 600-extra-task, 2048-byte-padded fixture still uses exactly 8 git calls with a growth-sized stdout/maxBuffer for the batched cat-file call. |

### `tests/mcp/tools/recent-work-context.test.ts` — MCP tool test for get_recent_work_context

**Purpose:** Large end-to-end + unit test suite for `src/mcp/tools/recent-work-context.js` (and the `src/mcp/internal/cluster-engine.js` it wraps), covering the deprecation marker, full tool registry list, cluster/atom response shape, `artifact_hint` focusing, `format` parameter (minimal/full/skeleton) truncation and byte-budget behavior, open-loop-hint resolution, cross-gap window inference + naive-timestamp TZ guardrail, storage-cap warnings, raw-fs-watcher filtering, window-wide `source_breakdown`, `repo_path` filtering (item 037 AC4), no-args resume auto-expand (V1.5.7), and the item 038 AC3 shim-vs-engine parity contract.

**Depends on:** `node:fs` (readFileSync), `node:path` (dirname, join), `node:url` (fileURLToPath), `@modelcontextprotocol/sdk` (Client, StreamableHTTPClientTransport), `src/mcp/tools/recent-work-context.js` (DEFAULT_LIMIT, STORAGE_OVERFETCH, applySkeletonAtom, applySkeletonCluster, buildSkeletonResponse, getRecentWorkContext, hasTzMarker), `src/mcp/internal/cluster-engine.js` (getRecentWorkContext, dynamically imported for parity test), `src/mcp/server.js` (startMcpServer, McpServerHandle), `src/storage/memory.js` (MemoryStorage), `src/storage/interface.js` (CaptureEvent), `src/trace/types.js` (RecentWorkContextResponse), `tests/fixtures/stdout.js` (captureStdout), `tests/mcp/fixtures/recent-work-context-realistic-claude-code.json`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/tools/recent-work-context.test.ts:32` | Opens a StreamableHTTP MCP client, runs `fn`, then closes the client. |
| `tsPlus(minutes)` | function | `tests/mcp/tools/recent-work-context.test.ts:50` | Returns an ISO timestamp offset from module-level `SINCE` by the given minutes. |
| `ccEvent(session, turn, ts, files, io)` | function | `tests/mcp/tools/recent-work-context.test.ts:54` | Builds a synthetic claude-code turn-pair `CaptureEvent` with `session_id`/`turn_index`/`repo_root`/`files_referenced`/`git_state` metadata. |
| `seedScenario(store)` | function | `tests/mcp/tools/recent-work-context.test.ts:75` | Appends a 5-event two-session (s1/s2) fixture spanning two files, used as the default scenario for most tests in the file. |
| `describe: "get_recent_work_context (end-to-end via MCP server)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:101` | Covers tools/list description + deprecation marker, full 15-tool registry check, base cluster/atom response shape, `artifact_hint` focusing, and malformed-`since` error handling; nests `format parameter`, `open-loop resolution`, and `cross-gap window + naive-timestamp guardrail` sub-suites. |
| `bigCcEvent(session, turn, tsIso, repoRoot, fileIdx)` | function | `tests/mcp/tools/recent-work-context.test.ts:597` | Builds a realistic-size (short-payload) claude-code atom distributed across `repoRoot/src/file<fileIdx>.ts` for multi-cluster fixtures. |
| `longCcEvent(session, turn, tsIso, repoRoot, fileIdx)` | function | `tests/mcp/tools/recent-work-context.test.ts:620` | Builds a claude-code atom with an 800+-char input/output payload to exercise the 500-char minimal-format truncation. |
| `describe: "item 025: cost-safer defaults + structured output + readOnlyHint"` | describe | `tests/mcp/tools/recent-work-context.test.ts:574` | Verifies default `limit`/`format='minimal'` caps atom count and truncates input/output, envelope byte-size stays under 25,000 chars on a 200-atom fixture, `format='full'` bypasses truncation, and tools/list advertises outputSchema/readOnlyHint/description defaults; verifies `structuredContent` matches parsed text content. |
| `describe: "hasTzMarker (item 022 Bug F: regex broadening)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:763` | Unit-tests `hasTzMarker` against Z, +HH:MM, -HH:MM, +HHMM, +HH, and naive (no-marker) timestamp strings. |
| `describe: "storage-cap warning + raw-FS filter (item 022 Bugs B + C)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:793` | Verifies the storage-cap warning fires exactly when `events.length === limit * STORAGE_OVERFETCH` and not below cap, and that raw fs-watcher noise events (`metadata.surface==='fs'`) are excluded from the trace input while same-prefix claude-code conversation atoms are kept. |
| `describe: "item 028: format='skeleton' on realistic-density fixture"` | describe | `tests/mcp/tools/recent-work-context.test.ts:885` | Loads a real-shape 20-atom/1-cluster fixture and verifies: fixture cardinality sanity; minimal-mode envelope exceeds 25,000 chars (documents the gap); `buildSkeletonResponse` keeps envelope under 12,500 chars; `applySkeletonAtom`/`applySkeletonCluster` strip artifacts/actors/provenance/context/conversation/edges/anchor_artifacts while retaining IDs, `action.summary` head-clip, and reduced `{atom_id,resolved}` hints; round-trips `format='skeleton'` through the live MCP server; asserts the three-format ladder is documented and schema-accepted. |
| `describe: "skeleton-mode V1.5.7 cluster bounds (Gap 4)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:1120` | Probes `applySkeletonCluster` directly with synthetic `Cluster` shapes to verify `atom_ids`/`open_loop_hints` head+tail clipping with `*_omitted` counts and a `truncated` flag above their caps (50/30 respectively), and verbatim pass-through with no `truncated` flag below cap. |
| `describe: "no-args resume auto-expand (V1.5.7 polish 2026-05-09)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:1200` | Verifies a no-args call auto-retries at a 24h window (with an `[AUTO_EXPAND]`-prefixed warning) when the default 4h window returns 0 clusters; verifies no auto-expand when an explicit `since` is passed or when the 4h pass already found clusters; verifies a single retry only (still empty, still warned) when even 24h has no activity. |
| `describe: "truncation.source_breakdown (item 029)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:1299` | Seeds three disjoint source-app clusters (claude_code/cursor/codex) and verifies the window-wide `truncation.source_breakdown` still reports every source's atom count even when `limit` truncation drops entire sibling clusters, and sums to `atoms_total_in_window`; also verifies the field is populated even absent truncation. Defines local `tsAt`, `ccEventClustering`, `cursorEventClustering`, `codexEventClustering` helpers. |
| `describe: "getRecentWorkContext repo_path (item 037 / AC4)"` | describe | `tests/mcp/tools/recent-work-context.test.ts:1445` | Verifies `repo_path` filtering excludes atoms from other repos end-to-end, rejects non-absolute `repo_path`, and normalizes a trailing-slash `repo_path` to match stored no-slash `repo_root`. |
| `describe: "Item 038 / AC3 — recent_work_context shim parity"` | describe | `tests/mcp/tools/recent-work-context.test.ts:1531` | Verifies the `recent-work-context.js` shim's `getRecentWorkContext` produces output identical to calling `src/mcp/internal/cluster-engine.js`'s implementation directly, that the registered MCP handler still advertises the tool with the `[DEPRECATED` marker and `find_clusters` mention, and that the handler's response shape matches a direct shim call. |

### `tests/mcp/tools/search-memories.test.ts` — unit + e2e tests for the `search_memories` MCP tool

**Purpose:** Exercises `src/mcp/tools/search-memories.ts` (`searchMemories` pure handler) and the `search_memories` MCP tool end-to-end via `startMcpServer`. Covers filtering (query substring, source_prefix/source/source_app/metadata_match/repo_path), pagination (cursor, ties, until+cursor interplay), limit clamping, TZ-naive warnings, per-match content/metadata envelope caps (Bug A), fs-watcher exclusion (Gap 3), and malformed-input error handling.

**Depends on:** `src/mcp/tools/search-memories.js`, `src/mcp/server.js`, `src/storage/memory.js`, `src/storage/interface.js`, `tests/fixtures/stdout.js`; external: `@modelcontextprotocol/sdk`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `withClient(url, fn)` | function | `tests/mcp/tools/search-memories.test.ts:20` | Connects an MCP `Client` over `StreamableHTTPClientTransport` to the given URL, runs `fn`, and always closes the client. |
| `seedFixtureEvents(store)` | function | `tests/mcp/tools/search-memories.test.ts:32` | Appends a fixed fixture of 3 cursor-chat + 3 claude-code + 2 git capture events with varied timestamps/content into a `MemoryStorage`. |
| `describe: "searchMemories (pure handler)"` | describe | `tests/mcp/tools/search-memories.test.ts:82` | Verifies DESC ordering, query substring (case-insensitive), source_prefix filters, since/until window bounds, limit clamping (1–50), query_echo reflection, metadata presence, and empty-match cases. |
| `describe: "searchMemories Bug A — per-match content envelope cap"` | describe | `tests/mcp/tools/search-memories.test.ts:272` | Verifies content under cap passes verbatim, content over cap is head+marker+tail elided with `bytes_elided`, and the total JSON envelope for 10×~100KB matches stays under 25k bytes including metadata (tool_calls) projection. |
| `describe: "searchMemories Gap 3 — fs-watcher meta-events must be excluded"` | describe | `tests/mcp/tools/search-memories.test.ts:410` | Verifies fs-watcher meta-events (`metadata.surface === 'fs'`) are excluded both when filtering by `source_app` and in whole-store substring search. |
| `describe: "searchMemories Gap 6 — TZ-naive timestamp warning parity"` | describe | `tests/mcp/tools/search-memories.test.ts:480` | Verifies `warnings` array is always present, TZ-naive `since`/`until` emit a single `[TZ]`-prefixed warning, TZ-marked inputs emit none, and naive windows still filter as local time. |
| `describe: "search_memories (end-to-end via MCP server)"` | describe | `tests/mcp/tools/search-memories.test.ts:551` | Verifies tools/list description, filtered DESC-sorted tool invocation results, and graceful `isError` (not a crash) on malformed since/until, plus a combined-filter envelope check. |
| `describe: "search_memories item 025 (outputSchema + readOnlyHint + source_app + cursor)"` | describe | `tests/mcp/tools/search-memories.test.ts:652` | Verifies tools/list advertises outputSchema/readOnlyHint/source_app enum, structuredContent matches text JSON, source_app↔source_prefix equivalence for codex/granola, metadata_match scalar/array semantics for Granola signals, source_prefix-wins-on-conflict precedence, cursor pagination (60-row, same-ms ties, substring-query post-filter slice, cursor+until interplay), malformed-cursor error shapes, and description content checks. |
| `describe: "searchMemories — AC0 source (exact) + metadata_match"` | describe | `tests/mcp/tools/search-memories.test.ts:1250` | Verifies `source` exact filter vs `source_prefix`/`source_app` precedence, `metadata_match` filtering and whitelist-violation errors, `repo_path` + `metadata_match.repo_root` conflict detection and merge, backward compatibility, and cursor pagination over an exact `source` filter. |

### `tests/mcp/util/fs-exclusion.test.ts` — tests for the shared fs-watcher exclusion helper and a CI anti-regression grep-scan

**Purpose:** Exercises `src/mcp/util/fs-exclusion.ts` (`EXCLUDE_FS_SURFACE`, `withFsExclusion`) and enforces (via a repo-wide scan) that no other file under `src/mcp` re-hardcodes the `exclude_metadata_surface: [...]` literal, closing the Bug B regression loop structurally.

**Depends on:** `src/mcp/util/fs-exclusion.js`; external: `node:fs`, `node:path`, `node:url`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `walk(dir)` | function | `tests/mcp/util/fs-exclusion.test.ts:46` | Recursively scans `.ts` files under `src/mcp` (excluding the helper itself) for lines matching the inline `exclude_metadata_surface: [` pattern, collecting offending path/line/text. |
| `describe: "fs-exclusion helper"` | describe | `tests/mcp/util/fs-exclusion.test.ts:13` | Verifies `EXCLUDE_FS_SURFACE` equals `['fs']`, `withFsExclusion` adds the exclusion to a filter, and mutating the returned array does not alias/mutate the shared constant. |
| `describe: "AC5 — exclude_metadata_surface single source of truth"` | describe | `tests/mcp/util/fs-exclusion.test.ts:38` | Runs the `walk` grep-scan over `src/mcp` and fails with a detailed offender list if any inline `exclude_metadata_surface: [...]` literal is found outside the helper file. |

### `tests/mcp/wait-for-new-turns.test.ts` — tests for the `wait_for_new_turns` MCP tool

**Purpose:** Exercises `src/mcp/tools/wait-for-new-turns.ts` (`resolveSources`, `waitForNewTurns`, `WAIT_MAX_SOURCES`). Covers source resolution (exact vs source_app prefix), input validation, immediate/poll-wake happy paths, statelessness across parallel calls, `repo_path` filtering, IDs-only response shape (item 038 AC4), and the lossless-chaining `next_since`/overflow-paging contract (Fix ⑤).

**Depends on:** `src/mcp/tools/wait-for-new-turns.js`, `src/storage/memory.js`, `src/storage/interface.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ev(source, ts, content)` | function | `tests/mcp/wait-for-new-turns.test.ts:10` | Builds an `Omit<CaptureEvent, 'id'>` fixture with the given source/timestamp/content (default `'turn'`). |
| `describe: "wait_for_new_turns — source resolution"` | describe | `tests/mcp/wait-for-new-turns.test.ts:14` | Verifies `resolveSources` maps source_app names to prefix matches (distinct from MRU), literal source paths to exact matches, and mixed inputs correctly. |
| `describe: "wait_for_new_turns — validation"` | describe | `tests/mcp/wait-for-new-turns.test.ts:37` | Verifies rejection of empty `sources`, `sources` exceeding `WAIT_MAX_SOURCES`, malformed/invalid-calendar `since`, and acceptance of `timeout=0` for immediate return. |
| `describe: "wait_for_new_turns — happy path"` | describe | `tests/mcp/wait-for-new-turns.test.ts:86` | Verifies immediate return when newer content exists, strict-after-`since` boundary exclusion (with and without timezone offsets), timeout with empty `turn_ids`, poll-loop wake on late arrival, and source_app prefix matching across multiple sessions. |
| `describe: "wait_for_new_turns — stateless (acceptance #3 — 3 parallel calls with disjoint sources)"` | describe | `tests/mcp/wait-for-new-turns.test.ts:194` | Verifies 3 parallel calls with disjoint sources don't cross-contaminate and that repeated identical calls are idempotent (no per-call mutable state). |
| `describe: "wait_for_new_turns repo_path (item 037 / AC5)"` | describe | `tests/mcp/wait-for-new-turns.test.ts:239` | Verifies baseline behavior without `repo_path`, filtering by `metadata.repo_root`, rejection of non-absolute `repo_path`, and trailing-slash normalization. |
| `describe: "wait_for_new_turns — AC4 IDs-only response shape"` | describe | `tests/mcp/wait-for-new-turns.test.ts:324` | Verifies `turn_ids` are delivered in chronological ASC order, no `content`/`metadata`/`truncations` fields leak onto the response (envelope stays under 1000 bytes even with a 130KB atom), and the wait→get_atoms round-trip recovers full bodies. |
| `describe: "wait_for_new_turns — Fix ⑤ lossless chaining (next_since + overflow paging)"` | describe | `tests/mcp/wait-for-new-turns.test.ts:425` | Verifies `next_since` reflects max returned-turn timestamp (not wall clock) so ingest-lagged turns aren't lost, bursts >20 page via chained `next_since` calls without loss, same-timestamp boundary groups are never split, window-truncated tie groups are held back whole and delivered complete on chaining, and a same-ms group exceeding the fetch window is the documented lossy floor with an explicit warning. |

### `tests/mcp/wire-shape/compact-rank-reason.test.ts` — tests for `compactCluster`'s rank_reason allowlist

**Purpose:** Exercises `src/mcp/wire-shape/compact.ts` (`compactCluster`), specifically the allowlist that filters `rank_reason` entries in the compact cluster projection.

**Depends on:** `src/mcp/wire-shape/compact.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "compactCluster rank_reason allowlist"` | describe | `tests/mcp/wire-shape/compact-rank-reason.test.ts:13` | Verifies the three allowed compact rank reasons (`has_open_loop`, `has_unresolved_open_loop`, `code_session_anchor`) are preserved in original order, and any non-allowlisted future reason string is dropped. |

### `tests/mcp/wire-shape/compact.test.ts` — tests for the compact wire-shape projection of clusters and atoms

**Purpose:** Exercises `src/mcp/wire-shape/compact.ts` (`compactCluster`, `compactAtom`) together with `src/mcp/wire-shape/match.ts` (`projectMatch`). Verifies per-source-app (claude_code, cursor, codex, git) metadata field allowlists, dropping of debug plumbing, dedup of duplicated "thinking" text against content, and shrinking heavy tool metadata below a 2KB budget.

**Depends on:** `src/mcp/wire-shape/compact.js`, `src/mcp/wire-shape/match.js`, `src/storage/interface.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "compactCluster"` | describe | `tests/mcp/wire-shape/compact.test.ts:6` | Verifies compact cluster fields are kept, truncation companions (`atom_ids_truncated`, `open_loop_hints_omitted`) are preserved, `rank_reason` is filtered to `has_open_loop` only, `rank` is dropped, and useful labels are preserved while low-signal ones (UUID-only) are nulled. |
| `describe: "compactAtom"` | describe | `tests/mcp/wire-shape/compact.test.ts:51` | Verifies per-source metadata allowlisting: claude_code keeps promoted fields (model, permission_mode, branch) and drops debug plumbing (mtime, byte_offset, cli_version); cursor keeps continuation/context subsets and non-duplicated thinking, dropping thinking when content already starts with it; codex keeps model/reasoning_effort/git branch while shrinking heavy tool_calls metadata below 2KB; git atoms keep only universal metadata fields. |

### `tests/mcp/wire-shape/match.test.ts` — tests for `projectMatch`'s content/metadata caps and truncation vocabulary

**Purpose:** Exercises `src/mcp/wire-shape/match.ts` (`projectMatch`) and `src/mcp/wire-shape/caps.ts` (`WIRE_SHAPE_CAPS`). Verifies the per-match content cap (head+marker+tail elision), per-metadata-value cap (elision vs. tool_calls trajectory projection), the `truncations` vocabulary (`content`, `metadata.<key>`, `metadata.<key>:projected`), and a realistic-density multi-match envelope size check.

**Depends on:** `src/mcp/wire-shape/caps.js`, `src/mcp/wire-shape/match.js`, `src/storage/interface.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ev(overrides)` | function | `tests/mcp/wire-shape/match.test.ts:6` | Builds a fixed-id `CaptureEvent` fixture with `overrides` merged over defaults (id, source, timestamp, empty content). |
| `describe: "projectMatch — content cap"` | describe | `tests/mcp/wire-shape/match.test.ts:16` | Verifies content under the cap passes verbatim with no `bytes_elided`, and content over cap is head+marker+tail clipped with `bytes_elided` populated. |
| `describe: "projectMatch — per-metadata-value cap"` | describe | `tests/mcp/wire-shape/match.test.ts:36` | Verifies all-small metadata passes verbatim, large variadic `tool_calls` values are projected to a name trajectory (not opaqued) while small neighbours pass through, and multiple oversized non-tool_calls keys are elided with `metadata_keys_elided` listing each. |
| `describe: "projectMatch — truncations vocabulary (V1.6 item 030)"` | describe | `tests/mcp/wire-shape/match.test.ts:102` | Verifies `truncations` is always present (empty when nothing clipped), content-cap firing adds `"content"`, per-key metadata cap firing adds `"metadata.<key>"`, tool_calls projector reshape adds `"metadata.<key>:projected"` (distinct from plain elision), and multiple simultaneous triggers emit distinct entries. |
| `describe: "projectMatch — realistic-density envelope"` | describe | `tests/mcp/wire-shape/match.test.ts:164` | Verifies 10 matches each carrying ~100KB `tool_calls` metadata serialize under 25k bytes total via trajectory projection, and that the trajectory preserves workflow shape (ordered tool names) across mixed tool-call sequences. |

### `tests/mcp/wire-shape/tool-calls.test.ts` — tests for the `tool_calls` → workflow-trajectory projector

**Purpose:** Exercises `src/mcp/wire-shape/tool-calls.ts` (`projectToolCallsTrajectory`), the function that reshapes a raw `tool_calls` array into a compact name trajectory + histogram to preserve agent-workflow signal while shrinking byte size.

**Depends on:** `src/mcp/wire-shape/tool-calls.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "projectToolCallsTrajectory — workflow trajectory projection"` | describe | `tests/mcp/wire-shape/tool-calls.test.ts:4` | Verifies happy-path projection to `{trajectory, by_name, original_count, bytes_elided}`, a 100-entry array projecting to <2KB (vs ~700KB original), empty-array handling, `null` return for non-array/non-conforming values, and `null` return for arrays with shape-foreign entries (no partial/misleading projection). |

# `src/mcp/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 32 files.

### `src/mcp/cursor-workspace-resolver.ts` — Cursor workspace/composer resolution

**Purpose:** Resolves the most-recently-active Cursor composer for a given repo path (and the inverse: repo root for a workspace_id) by reading Cursor's own SQLite storage (`workspaceStorage/*/state.vscdb`, `globalStorage/state.vscdb`), independent of ECHO's own captured metadata. Used to bridge repo-path-scoped queries with Cursor's internal identifiers.

**Depends on:** `../logging/index.js`, `better-sqlite3`, `node:fs`, `node:os`, `node:path`, `node:url`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_CURSOR_GLOBAL_DB_PATH` | const | `src/mcp/cursor-workspace-resolver.ts:14` | Default path to Cursor's global `state.vscdb`, matching the cursor extractor's default. |
| `DEFAULT_CURSOR_WORKSPACE_STORAGE_DIR` | const | `src/mcp/cursor-workspace-resolver.ts:15` | Default path to Cursor's `workspaceStorage/` directory. |
| `CursorComposerResolution` | interface | `src/mcp/cursor-workspace-resolver.ts:17` | Shape `{workspace_id, composer_id}` returned by successful resolution. |
| `normaliseRepoPath(p)` | function | `src/mcp/cursor-workspace-resolver.ts:29` | Strips a single trailing path separator so caller-supplied repo paths compare equal to stored `metadata.repo_root`. |
| `findWorkspaceForRepoPath(normalisedRepoPath, workspaceStorageDir)` | function | `src/mcp/cursor-workspace-resolver.ts:57` | Scans `workspaceStorage/*/workspace.json` for a `folder` URL decoding to the target repo path; picks the most-recently-touched `state.vscdb` on multi-match, warn-logging each skip condition. |
| `listComposerIdsForWorkspace(workspaceDbPath)` | function | `src/mcp/cursor-workspace-resolver.ts:151` | Reads `ItemTable['composer.composerData']` from a workspace DB and unions composer ids from both the legacy `allComposers[]` shape and the current `selectedComposerIds`/`lastFocusedComposerIds` shape. |
| `pickMostRecentlyActiveComposer(globalDbPath, composerIds)` | function | `src/mcp/cursor-workspace-resolver.ts:225` | Queries `cursorDiskKV` for `composerData:<id>` rows and returns the id with the largest `lastUpdatedAt` (falling back to `createdAt`). |
| `resolveCursorComposerForRepoPath(repoPath, globalDbPath?, workspaceStorageDir?)` | function | `src/mcp/cursor-workspace-resolver.ts:302` | Public entry point: repo path → `{workspace_id, composer_id}` or `null`, composing the three helpers above. |
| `resolveRepoRootForWorkspaceId(workspace_id, workspaceStorageDir?)` | function | `src/mcp/cursor-workspace-resolver.ts:339` | Inverse lookup (item 037/AC1): workspace_id → normalised absolute repo root path by reading and decoding that workspace's `workspace.json`. |

### `src/mcp/internal/cluster-engine.ts` — cluster-discovery engine (strategy-internal)

**Purpose:** Canonical, non-tool-exposed engine that queries storage, builds a windowed trace, and returns ranked clusters of related captured events; implements no-args 4h→24h auto-expand, fs-watcher exclusion, repo_path scoping, and minimal-format content trimming. Consumed by `find_clusters` and the deprecated `recent_work_context` wrapper.

**Depends on:** `../../normalize/index.js`, `../../normalize/types.js`, `../../storage/interface.js`, `../../trace/auto-expand.js`, `../../trace/index.js`, `../../trace/types.js`, `../util/fs-exclusion.js`, `../util/iso8601.js`, `../util/repo-path.js`, `../wire-shape/caps.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_LIMIT` | const | `src/mcp/internal/cluster-engine.ts:35` | Default result cap (20) chosen to stay under the ~25k-char tool-result budget. |
| `MAX_LIMIT` | const | `src/mcp/internal/cluster-engine.ts:36` | Hard ceiling (500) on caller-supplied `limit`. |
| `DEFAULT_WINDOW_HOURS` | const | `src/mcp/internal/cluster-engine.ts:37` | Default clustering window (4h) when no args given. |
| `STORAGE_OVERFETCH` | const | `src/mcp/internal/cluster-engine.ts:38` | Multiplier applied to `limit` for the underlying storage query, to detect silent truncation. |
| `NO_ARGS_AUTO_EXPAND_WINDOW_HOURS` | const | `src/mcp/internal/cluster-engine.ts:43` | Expanded window (24h) used when a no-args call's 4h pass yields nothing useful. |
| `MINIMAL_CONTENT_CAP` | const | `src/mcp/internal/cluster-engine.ts:47` | Re-exported per-field content cap for `format='minimal'`, sourced from `WIRE_SHAPE_CAPS`. |
| `RecentWorkContextParams` | interface | `src/mcp/internal/cluster-engine.ts:49` | Input params: since/until/artifact_hint/limit/window_hours/format/repo_path. |
| `truncateForMinimal(s)` | function | `src/mcp/internal/cluster-engine.ts:63` | Truncates a string to `MINIMAL_CONTENT_CAP`, appending a "chars omitted" marker. |
| `applyMinimal(atom)` | function | `src/mcp/internal/cluster-engine.ts:73` | Applies `truncateForMinimal` to an atom's `action.input`/`action.output`, returning a new atom only if changed. |
| `clampLimit(input)` | function | `src/mcp/internal/cluster-engine.ts:87` | Floors and clamps a caller `limit` into `[1, MAX_LIMIT]`, defaulting to `DEFAULT_LIMIT`. |
| `inferWindowHours(sinceMs, untilMs, explicit)` | function | `src/mcp/internal/cluster-engine.ts:98` | Computes clustering window: explicit value wins, else spans ≤4h reuse the span, longer spans cap at 24h. |
| `runRecentWorkContextPass(storage, since, until, limit, windowHours, format, artifactHint, normalisedRepoPath)` | function | `src/mcp/internal/cluster-engine.ts:113` | Single query+trace-build pass: queries storage with fs-exclusion and optional repo_root match, builds the response via `buildRecentWorkContext`, and appends a storage-cap-hit warning when the overfetch limit was reached. |
| `getRecentWorkContext(storage, params, now?)` | function | `src/mcp/internal/cluster-engine.ts:180` | Top-level engine entry: resolves defaults, validates/normalises `repo_path`, runs the first pass, triggers the 4h→24h auto-expand (with single-source-recent rank demotion) when the initial pass is "useless", appends TZ-naive warnings, and applies minimal-format trimming. |

### `src/mcp/parse-anchors.ts` — canonical_anchors block parser

**Purpose:** Parses the `## canonical_anchors` bulleted block out of role-typed task-state pointer file bodies into a typed `{spec, reviews?}` structure, used by 046's task-state read tools. TypeScript-only in V1; any Python consumer must port against the shared fixture file.

**Depends on:** none (pure string parsing)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ParsedAnchors` | interface | `src/mcp/parse-anchors.ts:11` | Successful parse shape: `{spec: string, reviews?: string}`. |
| `AnchorParseFailure` | interface | `src/mcp/parse-anchors.ts:16` | Failure shape carrying a best-effort `spec` plus `_parse_error` reason string. |
| `ALLOWED_KEYS` | const | `src/mcp/parse-anchors.ts:24` | Set of the only recognised anchor keys (`spec`, `reviews`) — new keys must be added here plus a fixture. |
| `REQUIRED_KEYS` | const | `src/mcp/parse-anchors.ts:25` | Tuple of required keys (`spec`). |
| `parseAnchors(body)` | function | `src/mcp/parse-anchors.ts:47` | Scans body lines for the `## canonical_anchors` heading, collects `- key: value` bullets until the next `## ` heading, and returns `ParsedAnchors` on success or `AnchorParseFailure` on missing heading, unrecognised line, unknown key, duplicate key, or missing required key. |
| `isParseFailure(r)` | function | `src/mcp/parse-anchors.ts:116` | Type guard: true if `r` carries `_parse_error`. |

### `src/mcp/request-log.ts` — in-memory ring log + shutdown flush of MCP tool calls

**Purpose:** Instruments the MCP server's `registerTool` to record a bounded ring buffer of recent tool invocations (args/result shapes, timing, status), exposes a filtered reader for the `/mcp/recent-calls` HTTP endpoint, and flushes the ring atomically to disk on graceful shutdown, rewriting any still-pending entry as `killed_during_shutdown`.

**Depends on:** `node:fs`, `@modelcontextprotocol/sdk/server/mcp.js`, `@modelcontextprotocol/sdk/types.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RecentMcpCallStatus` | type | `src/mcp/request-log.ts:21` | Union `'pending' \| 'ok' \| 'error' \| 'killed_during_shutdown'`. |
| `RecentMcpCall` | interface | `src/mcp/request-log.ts:23` | Public ring-entry shape: ts, tool, args_shape, result_shape, duration_ms, status. |
| `RecentMcpCallFilters` | interface | `src/mcp/request-log.ts:32` | Query filters (since/until/status) for `readRecentMcpCalls`. |
| `MutableRecentMcpCall` | interface | `src/mcp/request-log.ts:38` | Internal ring-entry shape extending `RecentMcpCall` with a monotonic `id`. |
| `ToolResultLike` | interface | `src/mcp/request-log.ts:42` | Minimal shape of an MCP `CallToolResult` used for projection (content/structuredContent/isError). |
| `MAX_CALLS` | const | `src/mcp/request-log.ts:48` | Ring buffer cap (1000 entries). |
| `instrumentMcpServer(server)` | function | `src/mcp/request-log.ts:53` | Monkey-patches `server.registerTool` so every tool call is wrapped with begin/finish/fail logging around the original callback. |
| `beginRecentMcpCall(tool, args, now?)` | function | `src/mcp/request-log.ts:81` | Pushes a new `pending` ring entry with a projected args shape; evicts oldest entries beyond `MAX_CALLS`. |
| `finishRecentMcpCall(id, tool, result, now?)` | function | `src/mcp/request-log.ts:96` | Marks a ring entry `ok`/`error` based on `isError`, sets duration, and projects the result shape. |
| `failRecentMcpCall(id, tool, err, now?)` | function | `src/mcp/request-log.ts:113` | Marks a ring entry `error` on thrown exception and records duration + projected thrown-error shape. |
| `readRecentMcpCalls(filters?)` | function | `src/mcp/request-log.ts:122` | Returns cloned, filtered (since/until/status) ring entries for the recent-calls HTTP endpoint. |
| `resetRecentMcpCallLogForTests()` | function | `src/mcp/request-log.ts:132` | Clears the ring and resets the id counter; test-only. |
| `flushRecentMcpCallLog(path, now?)` | function | `src/mcp/request-log.ts:137` | Rewrites any pending entry as `killed_during_shutdown`, serialises the ring to JSONL, and writes it atomically via tmp-file + `renameSync`. |
| `publicClone(entry)` | function | `src/mcp/request-log.ts:168` | Deep-clones a mutable ring entry into its public `RecentMcpCall` shape (drops `id`). |
| `cloneShape(shape)` | function | `src/mcp/request-log.ts:179` | JSON round-trip deep clone helper for args/result shape objects. |
| `projectArgs(tool, args)` | function | `src/mcp/request-log.ts:183` | Per-tool switch producing a compact, non-sensitive projection of call arguments (lengths/presence/counts rather than raw values) for each known MCP tool name. |
| `projectResult(tool, result)` | function | `src/mcp/request-log.ts:288` | Per-tool switch producing a compact projection of a successful tool result (counts, presence flags, content length) for each known MCP tool name. |
| `projectErrorResult(result)` | function | `src/mcp/request-log.ts:405` | Projects an `isError` tool result to `{is_error: true, content_text_length}`. |
| `projectThrownError(err)` | function | `src/mcp/request-log.ts:412` | Projects a thrown exception to `{is_error: true, content_text_length: message.length}`. |
| `isToolErrorEnvelope(result)` | function | `src/mcp/request-log.ts:420` | Checks whether a result object has `isError === true`. |
| `parseTextJson(envelope)` | function | `src/mcp/request-log.ts:424` | Extracts and JSON-parses the first `text` content block of a tool result envelope, if any. |
| `objectOrEmpty(value)` | function | `src/mcp/request-log.ts:434` | Returns `value` if it's a non-array object, else `{}`. |
| `stringValue(value)` | function | `src/mcp/request-log.ts:441` | Returns `value` if a string, else `null`. |
| `booleanValue(value)` | function | `src/mcp/request-log.ts:445` | Returns `value` if a boolean, else `null`. |
| `numberValue(value)` | function | `src/mcp/request-log.ts:449` | Returns `value` if a finite number, else `null`. |
| `stringLength(value)` | function | `src/mcp/request-log.ts:453` | Returns `value.length` if a string, else `null`. |
| `arrayLength(value)` | function | `src/mcp/request-log.ts:457` | Returns `value.length` if an array, else `null`. |
| `keyCount(value)` | function | `src/mcp/request-log.ts:461` | Alias for `objectKeyCount`. |
| `objectKeyCount(value)` | function | `src/mcp/request-log.ts:465` | Returns the number of own keys of `value` coerced via `objectOrEmpty`. |
| `nestedArrayTotal(value, key)` | function | `src/mcp/request-log.ts:470` | Sums `item[key].length` across an array of objects (e.g. total atom_ids across clusters). |
| `isPresent(value)` | function | `src/mcp/request-log.ts:480` | True if `value` is neither `undefined` nor `null`. |
| `contentTextLengthOf(result)` | function | `src/mcp/request-log.ts:484` | Sums the length of all `text`-type content blocks in a tool result. |

### `src/mcp/server.ts` — MCP HTTP daemon: server bootstrap + tool registration

**Purpose:** Starts the ECHO MCP daemon's HTTP server (StreamableHTTP transport, stateless per-request `McpServer`), loads coord-roles config and the deadline tracker as hard startup gates, registers all MCP tools per request (search, clusters, atoms, task-state, coord substrate), and exposes a `/mcp/recent-calls` diagnostic GET endpoint plus graceful shutdown.

**Depends on:** `@modelcontextprotocol/sdk/server/mcp.js`, `@modelcontextprotocol/sdk/server/streamableHttp.js`, `node:http`, `../coord/deadlines.js`, `../coord/roles.js`, `../logging/index.js`, `../storage/interface.js`, `./request-log.js`, `./tools/coord-emit.js`, `./tools/coord-invoke.js`, `./tools/coord-status.js`, `./tools/echo-ping.js`, `./tools/echo-resolve-mru.js`, `./tools/find-clusters.js`, `./tools/get-atom.js`, `./tools/get-atoms.js`, `./tools/get-role-state.js`, `./tools/list-task-states.js`, `./tools/pending-decisions.js`, `./tools/recent-work-context.js`, `./tools/search-memories.js`, `./tools/wait-for-new-turns.js`, `../surfaces/ceo-slack-responder/propose-decision-tool.js` (optional dynamic import)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProposeDecisionRegistrar` | type | `src/mcp/server.ts:30` | Function type `(server: McpServer) => void` for the optionally-loaded propose_decision tool. |
| `McpServerHandle` | interface | `src/mcp/server.ts:32` | Return shape of `startMcpServer`: `{stop, port, url}`. |
| `StartMcpServerOptions` | interface | `src/mcp/server.ts:38` | Startup options: port, host, repo_root, coord_roles_path, enable_deadlines, deadline_heartbeat_ms, deadline_reconciliation_ms. |
| `resolveRepoRoot(option?)` | function | `src/mcp/server.ts:75` | Resolves repo root: explicit option > `ECHO_REPO_ROOT` env > `process.cwd()`. |
| `isOptionalProposeDecisionMissing(err)` | function | `src/mcp/server.ts:82` | Detects a module-not-found error specifically for the optional `ceo-slack-responder/propose-decision-tool` module. |
| `loadOptionalProposeDecisionTool()` | function | `src/mcp/server.ts:91` | Dynamically imports the optional propose-decision tool registrar, swallowing only the expected module-not-found error and rethrowing anything else. |
| `MAX_BODY_BYTES` | const | `src/mcp/server.ts:104` | 4MiB cap on incoming HTTP request bodies. |
| `BodyTooLargeError` | class | `src/mcp/server.ts:106` | Thrown by `readJsonBody` when the accumulated body exceeds `MAX_BODY_BYTES`. |
| `readJsonBody(req)` | function | `src/mcp/server.ts:112` | Streams and concatenates the request body up to the size cap, then best-effort JSON-parses it (returns `undefined` on parse failure or empty body). |
| `methodNotAllowed(res, method, allow?)` | function | `src/mcp/server.ts:131` | Writes a 405 JSON-RPC error response with an `Allow` header. |
| `handleRecentCalls(req, res, host, boundPort)` | function | `src/mcp/server.ts:151` | Handles GET `/mcp/recent-calls`: parses since/until/status query params and writes the filtered `readRecentMcpCalls` result as JSON; returns `false` for non-matching paths. |
| `parseNumberParam(raw, fallback)` | function | `src/mcp/server.ts:184` | Parses a numeric query param, returning `fallback` for empty/absent and `null` for non-finite. |
| `parseStatusParam(raw)` | function | `src/mcp/server.ts:190` | Validates a `status` query param against the `RecentMcpCallStatus` union, returning `undefined` for absent and `null` for invalid. |
| `startMcpServer(storage, options?)` | function | `src/mcp/server.ts:198` | Main entry: resolves host/port/repo_root, loads coord-roles config (throws on bad config = hard startup gate), constructs+awaits the `DeadlineTracker` reconstruction (hard gate) unless `enable_deadlines===false`, defines `handlePost` (creates a fresh `McpServer` + transport per request, derives `X-Echo-Role`, registers all tools, connects, handles, then closes transport+server), creates the raw `http.Server`, listens, and returns `{port, url, stop}` where `stop` halts the deadline tracker then closes the HTTP server. |

### `src/mcp/tools/_cursor.ts` — pagination cursor encode/decode helpers

**Purpose:** Shared composite-cursor (`{timestamp, id}`) encoding utilities used by all paginating MCP retrieval tools, extracted from `search-memories.ts` so `next_cursor` is portable across tools.

**Depends on:** `../../storage/interface.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DecodedCursor` | interface | `src/mcp/tools/_cursor.ts:9` | Cursor shape `{timestamp: string, id: string}`. |
| `BeforeFilter` | type | `src/mcp/tools/_cursor.ts:18` | Alias of `DecodedCursor`, used at storage-filter call sites as `filter.before`. |
| `CursorDecodeError` | class | `src/mcp/tools/_cursor.ts:20` | Error thrown by `decodeCursor` on any malformed input, with a message instructing callers to pass back the prior `next_cursor` verbatim. |
| `encodeCursor(c)` | function | `src/mcp/tools/_cursor.ts:27` | Base64-encodes a JSON-serialised `DecodedCursor`. |
| `decodeCursor(raw)` | function | `src/mcp/tools/_cursor.ts:31` | Base64-decodes and JSON-parses a cursor string, validating it is an object with string `timestamp` and `id` fields; throws `CursorDecodeError` on any failure. |
| `emitCursor(rows, limitApplied)` | function | `src/mcp/tools/_cursor.ts:61` | Given an overfetched (`limit+1`) row array, slices to `limitApplied` and emits a `next_cursor` from the last kept row when an overflow row was present. |

### `src/mcp/tools/coord-emit.ts` — coord_emit MCP write tool

**Purpose:** The narrow append seam for the coord substrate: validates coord-event input, server-derives the emitter identity/source from the `X-Echo-Role` header (resolved before registration), canonicalizes the timestamp, appends a coord atom (`metadata.surface='coord'`) through the shared storage path, and updates the deadline tracker's serial lane.

**Depends on:** `@modelcontextprotocol/sdk/server/mcp.js`, `zod`, `../../coord/deadlines.js`, `../../coord/identity.js`, `../../coord/roles.js`, `../../coord/source.js`, `../../coord/types.js`, `../../coord/validate.js`, `../../capture/pipeline.js`, `../../storage/interface.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SCHEMA_VERSION` | const | `src/mcp/tools/coord-emit.ts:28` | Literal schema version (1) embedded in `CoordEmitResult`. |
| `COORD_EMIT_DESCRIPTION` | const | `src/mcp/tools/coord-emit.ts:30` | Long-form tool description explaining the coord-substrate append contract, identity derivation, and non-pollution defaults. |
| `CoordEmitResult` | interface | `src/mcp/tools/coord-emit.ts:33` | Tool output shape: `{schema_version, tool, id, source}`. |
| `coordEmitOutputSchema` | const | `src/mcp/tools/coord-emit.ts:44` | Zod output-schema object mirroring `CoordEmitResult`. |
| `CoordEmitDependencies` | interface | `src/mcp/tools/coord-emit.ts:51` | Registration deps: `storage`, `coordRoles`, `xEchoRoleHeader`, optional `deadlines` tracker. |
| `registerCoordEmit(server, deps)` | function | `src/mcp/tools/coord-emit.ts:67` | Resolves emitter identity once per request (capturing any identity error for later rejection), registers the `coord_emit` tool with its zod input schema, and on call: validates input via `validateCoordEmitInput`, derives `source`, builds and appends the coord atom with `metadata.coord.{event_type,schema_version,tier,subject_role,correlation_id|tick_run_id,expected_by?,payload?}`, best-effort ingests into the deadline tracker (swallowing tracker errors), and returns the result envelope or an `isError` response on any thrown error. |

### `src/mcp/tools/coord-invoke.ts` — coord_invoke MCP write tool (strategist active-trigger)

**Purpose:** Strategist-side surface that validates a reviewer-invocation request, resolves the reviewer wrapper's absolute path via the coord path gate, synchronously appends a `coord:reviewer_invoked` atom (opening the pre-spawn deadline before any child can emit `tick_start`), then spawns the wrapper as a detached fire-and-forget child process with the request/correlation bound via env vars.

**Depends on:** `node:child_process`, `@modelcontextprotocol/sdk/server/mcp.js`, `zod`, `../../logging/index.js`, `../../coord/deadlines.js`, `../../coord/internal-emitter.js`, `../../coord/paths.js`, `../../coord/roles.js`, `../../storage/interface.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `log` | const | `src/mcp/tools/coord-invoke.ts:44` | Module logger scoped to `coord.invoke`. |
| `SCHEMA_VERSION` | const | `src/mcp/tools/coord-invoke.ts:46` | Literal schema version (1). |
| `UUID4_RE` | const | `src/mcp/tools/coord-invoke.ts:51` | Regex enforcing canonical lowercase UUIDv4 shape (version nibble + variant byte). |
| `COORD_INVOKE_DESCRIPTION` | const | `src/mcp/tools/coord-invoke.ts:53` | Long-form description of the invoke contract: role/request_path/correlation_id validation, wrapper env vars, async-failure handling. |
| `CoordInvokeResult` | interface | `src/mcp/tools/coord-invoke.ts:56` | Output shape: `{schema_version, tool, reviewer_invoked_id, wrapper_path}`. |
| `coordInvokeOutputSchema` | const | `src/mcp/tools/coord-invoke.ts:65` | Zod output-schema object mirroring `CoordInvokeResult`. |
| `CoordInvokeDependencies` | interface | `src/mcp/tools/coord-invoke.ts:72` | Registration deps: `storage`, `coordRoles`, required `deadlines` tracker. |
| `registerCoordInvoke(server, deps)` | function | `src/mcp/tools/coord-invoke.ts:80` | Registers the `coord_invoke` tool; on call: validates `correlation_id` against `UUID4_RE`, validates `request_path` via `resolveCoordRequestPath`, resolves the wrapper path via `resolveReviewerWrapperPath` (throwing plain `Error` on `CoordPathError`), synchronously emits `reviewer_invoked` via `emitReviewerInvoked`, spawns the wrapper detached with `shell:false`/`stdio:'ignore'`/`cwd:REPO_ROOT` and the three coord env vars, attaches an `error` listener before `unref()` to prevent daemon crashes on async spawn failure, and returns the result envelope. |

### `src/mcp/tools/coord-status.ts` — coord_status MCP read tool

**Purpose:** Read-only operator surface returning open deadlines, recent missed deadlines, per-(role, expected_event_type) unresolved last-miss slots, per-role last-tick timing, and daemon uptime — computed via one O(coord-atom-count) paginated scan plus the deadline tracker's in-memory snapshot.

**Depends on:** `@modelcontextprotocol/sdk/server/mcp.js`, `zod`, `../../coord/deadlines.js`, `../../coord/roles.js`, `../../storage/interface.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CoordStatusOpenDeadline` | interface | `src/mcp/tools/coord-status.ts:27` | Open-deadline row shape: tier, subject_role, event_type, key, expected_by, age_sec. |
| `CoordStatusRecentMiss` | interface | `src/mcp/tools/coord-status.ts:37` | Recent-missed-deadline row shape. |
| `CoordStatusLastMissSlot` | interface | `src/mcp/tools/coord-status.ts:46` | Per-slot unresolved last-miss row shape. |
| `CoordStatusPerRoleLastTick` | interface | `src/mcp/tools/coord-status.ts:58` | Per-role last tick_start/tick_end/duration/scheduler_health rows. |
| `CoordStatusResult` | interface | `src/mcp/tools/coord-status.ts:69` | Full tool output shape aggregating all the above plus daemon_uptime_sec and last_reconstruction_watermark. |
| `COORD_STATUS_DESCRIPTION` | const | `src/mcp/tools/coord-status.ts:86` | Tool description summarising the returned fields and O(n) perf budget. |
| `coordStatusOutputSchema` | const | `src/mcp/tools/coord-status.ts:89` | Zod output schema (loosely typed as records/arrays for nested fields) mirroring `CoordStatusResult`. |
| `CoordStatusDependencies` | interface | `src/mcp/tools/coord-status.ts:101` | Registration deps: storage, coordRoles, deadlines, serverStartedAt, optional test clock `now`. |
| `RECENT_MISSED_LIMIT` | const | `src/mcp/tools/coord-status.ts:111` | Cap (200) on the `recent_missed` list. |
| `HORIZON_FLOOR_SEC` | const | `src/mcp/tools/coord-status.ts:112` | Minimum horizon (24h in seconds) for the recent-missed scan window. |
| `SlotKey` | interface | `src/mcp/tools/coord-status.ts:114` | `{subject_role, expected_event_type}` key pair used to build the slot universe. |
| `buildSlotUniverse(config)` | function | `src/mcp/tools/coord-status.ts:119` | Derives the deduplicated set of (role, expected_event_type) slots from `coord-roles.json`'s `role.events[*].expects`. |
| `maxHorizonSec(config)` | function | `src/mcp/tools/coord-status.ts:140` | Computes the max `max_deadline_sec` across all roles/events, floored at `HORIZON_FLOOR_SEC`. |
| `buildCoordStatus(deps)` | function | `src/mcp/tools/coord-status.ts:150` | Core computation: takes the deadline tracker's snapshot for open deadlines, then paginates `storage.iterateCoordAtomsByAppendOrder` in pages of 5000 tracking last-miss/last-close per slot, recent misses within horizon, and per-role tick_start/tick_end/scheduler_health bookkeeping; assembles and returns the full `CoordStatusResult`. |
| `registerCoordStatus(server, deps)` | function | `src/mcp/tools/coord-status.ts:363` | Registers the read-only `coord_status` MCP tool, delegating to `buildCoordStatus` and returning its result or an `isError` envelope on thrown error. |

### `src/mcp/tools/echo-ping.ts` — echo_ping connectivity-check tool

**Purpose:** Trivial MCP tool that confirms the daemon is reachable, echoing back an optional message with a timestamp.

**Depends on:** `@modelcontextprotocol/sdk/server/mcp.js`, `zod`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `echoPingOutputSchema` | const | `src/mcp/tools/echo-ping.ts:7` | Zod output schema `{pong: boolean, received?: string, ts: string}`. |
| `registerEchoPing(server)` | function | `src/mcp/tools/echo-ping.ts:13` | Registers the `echo_ping` MCP tool: returns `{pong: true, ts: now, received?: message}` for any call. |

### `src/mcp/tools/echo-resolve-mru.ts` — MRU source resolver MCP tool

**Purpose:** Implements `echo_resolve_mru`, an atomic primitive that resolves the most-recently-active source under one or more predicates (source-app name or literal source path), optionally scoped to a `repo_path`, returning `search_memories`-ready descriptors (source + filter) without fetching atom bodies. Handles special-case two-phase Cursor legacy composer resolution and two-path OR git resolution.

**Depends on:** `src/mcp/storage/interface.ts` (types `CaptureEvent`, `QueryFilter`, `Storage`), `src/mcp/cursor-workspace-resolver.ts` (`resolveCursorComposerForRepoPath`), `src/mcp/util/fs-exclusion.ts` (`withFsExclusion`), `src/mcp/util/repo-path.ts` (`assertAbsoluteRepoPath`, `normaliseRepoPath`), `src/mcp/util/source-app.ts` (`buildSourceAppMap`, `SOURCE_APP_VALUES`, `SourceApp`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ECHO_RESOLVE_MRU_MAX_SOURCES` | const | `src/mcp/tools/echo-resolve-mru.ts:32` | Hard cap (8) on the number of `sources` entries accepted per call. |
| `ECHO_RESOLVE_MRU_DESCRIPTION` | const | `src/mcp/tools/echo-resolve-mru.ts:34` | Long-form tool description covering parameters, per-source-app resolution rules, and canonical composition patterns. |
| `ResolvedSourceDescriptor` | interface | `src/mcp/tools/echo-resolve-mru.ts:51` | Descriptor shape `{source, filter: {metadata_match?, repo_path?}, phase?}` returned per resolved source. |
| `EchoResolveMruResult` | interface | `src/mcp/tools/echo-resolve-mru.ts:65` | Top-level result shape: `sources` map, optional echoed `repo_path`, `warnings[]`. |
| `EchoResolveMruParams` | interface | `src/mcp/tools/echo-resolve-mru.ts:73` | Input params: `sources: string[]`, optional `repo_path`. |
| `EchoResolveMruInjections` | interface | `src/mcp/tools/echo-resolve-mru.ts:78` | Test injection seam for overriding `resolveCursorComposer`. |
| `isSourceAppName(s)` | function | `src/mcp/tools/echo-resolve-mru.ts:87` | Type-guards whether a string is one of the known `SourceApp` values. |
| `newestMatching(storage, filter)` | function | `src/mcp/tools/echo-resolve-mru.ts:94` | Queries storage for the single newest row matching a filter (limit=1), relying on DESC ordering. |
| `resolveAppNameEntry(storage, app, normalisedRepoPath, rawRepoPath, injections)` | function | `src/mcp/tools/echo-resolve-mru.ts:99` | Resolves a source-app-name entry: special-cased two-phase logic for `cursor` (metadata.repo_root then legacy composer fallback) and two-path-OR logic for `git` (metadata.repo_root vs exact `git:<path>` source), default single-prefix query otherwise. |
| `resolveLiteralSourceEntry(storage, literal, normalisedRepoPath)` | function | `src/mcp/tools/echo-resolve-mru.ts:195` | Resolves a literal source-path entry via exact match, optionally scoped by repo_path metadata. |
| `echoResolveMru(storage, params, injections)` | function | `src/mcp/tools/echo-resolve-mru.ts:212` | Core resolution logic: validates `sources` array bounds, normalises `repo_path`, resolves each entry in parallel (app-name vs literal), assembles the result map. |
| `descriptorSchema` | const | `src/mcp/tools/echo-resolve-mru.ts:263` | Zod schema for a `ResolvedSourceDescriptor`. |
| `echoResolveMruOutputSchema` | const | `src/mcp/tools/echo-resolve-mru.ts:272` | Zod output schema for the MCP tool registration. |
| `registerEchoResolveMru(server, storage)` | function | `src/mcp/tools/echo-resolve-mru.ts:278` | Registers the `echo_resolve_mru` MCP tool with input/output schemas and the async handler wrapping `echoResolveMru`. |

### `src/mcp/tools/find-clusters.ts` — cheap cross-source cluster discovery MCP tool

**Purpose:** Implements `find_clusters`, the discovery counterpart to `get_atoms` that replaces the compound `get_recent_work_context` tool. Wraps the cluster engine (`getRecentWorkContext`) to return full un-capped `atom_ids[]` per cluster plus response-level byte-budget enforcement, distinct from per-cluster and per-field truncation.

**Depends on:** `src/mcp/storage/interface.ts` (`Storage`), `src/trace/types.ts` (`Cluster`, `ResponseFormat`), `src/mcp/wire-shape/compact.ts` (`compactCluster`, `ViewMode`), `src/mcp/internal/cluster-engine.ts` (`getRecentWorkContext`, `MAX_LIMIT`), `src/mcp/util/iso8601.ts` (`isoString`), `src/mcp/tools/recent-work-context.ts` (`SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FIND_CLUSTERS_RESPONSE_BYTE_CEILING` | const | `src/mcp/tools/find-clusters.ts:43` | Hard 25,000-char ceiling for the JSON-stringified response. |
| `PER_CLUSTER_ATOM_IDS_HARD_CAP` | const | `src/mcp/tools/find-clusters.ts:53` | Cap (200) on a single cluster's `atom_ids[]` before head+tail truncation kicks in. |
| `FIND_CLUSTERS_DESCRIPTION` | const | `src/mcp/tools/find-clusters.ts:55` | Tool description covering the `window_hours` vs `since`/`until` distinction, no-args auto-expand behavior, and response shape. |
| `FindClustersParams` | interface | `src/mcp/tools/find-clusters.ts:75` | Input params: `since`, `until`, `window_hours`, `format`, `view`, `repo_path`. |
| `FindClustersCluster` | interface | `src/mcp/tools/find-clusters.ts:87` | Per-cluster wire shape: `cluster_id`, `rank`, `rank_reason`, full `atom_ids[]` (with optional truncation flags), `source_breakdown`, `time_range`, `label`, capped `open_loop_hints[]`. |
| `FindClustersResult` | interface | `src/mcp/tools/find-clusters.ts:111` | Top-level result: `schema_version`, `tool`, `query`, `clusters[]`, `result_caps`, `warnings[]`. |
| `validateView(view)` | function | `src/mcp/tools/find-clusters.ts:137` | Validates the `view` param is `'compact'`/`'rich'`, defaulting to `'rich'`; throws on invalid value. |
| `clipOpenLoopHintsArray(arr, cap)` | function | `src/mcp/tools/find-clusters.ts:143` | Head+tail clips an array to `cap` entries, returning kept items and omitted count. |
| `projectCluster(c)` | function | `src/mcp/tools/find-clusters.ts:153` | Projects an engine `Cluster` into `FindClustersCluster`: applies per-cluster atom_ids hard cap (head+tail) and open_loop_hints cap. |
| `findClusters(storage, params, now)` | function | `src/mcp/tools/find-clusters.ts:191` | Core logic: calls `getRecentWorkContext` with `MAX_LIMIT`, projects clusters, applies optional compact view, then iteratively trims trailing (lowest-rank) clusters until the serialized envelope fits under the byte ceiling. |
| `findClustersOutputSchema` | const | `src/mcp/tools/find-clusters.ts:295` | Zod output schema for the MCP tool registration. |
| `registerFindClusters(server, storage)` | function | `src/mcp/tools/find-clusters.ts:320` | Registers the `find_clusters` MCP tool, including repo_path-validation error surfacing via `isError`. |

### `src/mcp/tools/get-atom.ts` — single-atom verbatim content recovery MCP tool

**Purpose:** Implements `get_atom`, an escape hatch for recovering the verbatim `content` of one atom when a prior `search_memories`/`get_atoms` call reported truncation. Metadata is still projected (per-key cap + tool_calls reshape) and embeddings excluded; content bypasses the wire-shape clip.

**Depends on:** `src/mcp/storage/interface.ts` (`Storage`), `src/mcp/wire-shape/match.ts` (`projectMatch`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GET_ATOM_RESPONSE_BYTE_CEILING` | const | `src/mcp/tools/get-atom.ts:37` | 25,000-char envelope ceiling, kept as a separate constant from `GET_ATOMS_RESPONSE_BYTE_CEILING` so the two can diverge independently. |
| `GET_ATOM_DESCRIPTION` | const | `src/mcp/tools/get-atom.ts:39` | Tool description: when to use it, cost class, and the canonical recovery pattern with error codes. |
| `GetAtomParams` | interface | `src/mcp/tools/get-atom.ts:56` | Input params: `id: string`. |
| `GetAtomAtom` | interface | `src/mcp/tools/get-atom.ts:64` | Wire shape: `id`, `source`, `timestamp`, verbatim `content`, projected `metadata?`, `truncations[]`. |
| `GetAtomSuccessResult` | interface | `src/mcp/tools/get-atom.ts:73` | Success envelope: `schema_version`, `tool`, `atom`, `atom_size_bytes`, `warnings`. |
| `GetAtomErrorResult` | interface | `src/mcp/tools/get-atom.ts:81` | Error envelope with `atom: null` and `error_code` of `'atom_too_large_for_wire'` or `'atom_not_found'`. |
| `GetAtomResult` | type | `src/mcp/tools/get-atom.ts:91` | Union of success/error result shapes. |
| `NOT_FOUND_WARNING(id)` | function | `src/mcp/tools/get-atom.ts:93` | Builds the warning string for a stale/unknown atom id. |
| `TOO_LARGE_WARNING` | const | `src/mcp/tools/get-atom.ts:98` | Fixed warning string for the atom-too-large-for-wire case. |
| `getAtom(storage, params)` | function | `src/mcp/tools/get-atom.ts:103` | Core logic: validates `id`, fetches by id (returns `atom_not_found` if absent), projects via `projectMatch`, overrides content verbatim and strips `"content"` from truncations, checks the serialized envelope against the byte ceiling and returns `atom_too_large_for_wire` if exceeded. |
| `getAtomAtomSchema` | const | `src/mcp/tools/get-atom.ts:175` | Zod schema for `GetAtomAtom`. |
| `getAtomOutputSchema` | const | `src/mcp/tools/get-atom.ts:184` | Zod output schema for the MCP tool registration. |
| `registerGetAtom(server, storage)` | function | `src/mcp/tools/get-atom.ts:194` | Registers the `get_atom` MCP tool with input/output schemas and async handler. |

### `src/mcp/tools/get-atoms.ts` — targeted multi-atom body-fetch MCP tool

**Purpose:** Implements `get_atoms`, the targeted body-fetch counterpart to `find_clusters` — takes up to 50 atom IDs and returns projected bodies with deterministic prefix-drop on envelope overflow, supporting `fields[]` projection, `format`, `prefer` ordering (`as_requested`/`newest_first`), and `view` (compact/rich).

**Depends on:** `src/mcp/storage/interface.ts` (`CaptureEvent`, `Storage`), `src/mcp/wire-shape/compact.ts` (`compactAtom`, `CompactAtom`, `ViewMode`), `src/mcp/wire-shape/match.ts` (`projectMatch`, `ProjectedMatch`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GET_ATOMS_RESPONSE_BYTE_CEILING` | const | `src/mcp/tools/get-atoms.ts:25` | 25,000-char hard ceiling for the JSON response. |
| `GET_ATOMS_MAX_IDS` | const | `src/mcp/tools/get-atoms.ts:31` | Soft cap (50) on `atom_ids` per call, mirroring `search_memories`'s MAX_LIMIT. |
| `GET_ATOMS_DESCRIPTION` | const | `src/mcp/tools/get-atoms.ts:33` | Tool description covering parameters, truncation trust signals, and the deterministic prefix-drop rule. |
| `GetAtomsPrefer` | type | `src/mcp/tools/get-atoms.ts:57` | `'as_requested' \| 'newest_first'`. |
| `GetAtomsParams` | interface | `src/mcp/tools/get-atoms.ts:59` | Input params: `atom_ids`, `fields?`, `format?`, `prefer?`, `view?`. |
| `GetAtomsAtom` | interface | `src/mcp/tools/get-atoms.ts:69` | Wire shape per atom: `id`, `source`, `timestamp`, optional `content`/`metadata`, `truncations[]`, elided-byte counters. |
| `GetAtomsResult` | interface | `src/mcp/tools/get-atoms.ts:87` | Top-level result: `schema_version`, `tool`, `atoms[]`, `atoms_dropped`, `atoms_dropped_ids[]`, `warnings[]`. |
| `ALWAYS_KEEP_FIELDS` | const | `src/mcp/tools/get-atoms.ts:100` | Set of fields (`id`,`source`,`timestamp`,`truncations`) always retained regardless of `fields[]` projection. |
| `validateView(view)` | function | `src/mcp/tools/get-atoms.ts:102` | Validates/defaults the `view` param; throws on invalid value. |
| `projectAtom(e, fields, view)` | function | `src/mcp/tools/get-atoms.ts:112` | Projects a `CaptureEvent` through `projectMatch`, narrows by `fields[]` if given, applies compact view, and computes serialized byte size. |
| `applyCompactFields(atom, fields)` | function | `src/mcp/tools/get-atoms.ts:165` | Re-applies `fields[]` narrowing on top of an already-compacted atom. |
| `buildProcessOrder(atom_ids, fetchedById, prefer)` | function | `src/mcp/tools/get-atoms.ts:202` | Builds the iteration/drop order: verbatim under `as_requested`; deduped, timestamp-desc-sorted existing IDs followed by missing IDs under `newest_first`. |
| `getAtoms(storage, params)` | function | `src/mcp/tools/get-atoms.ts:240` | Core logic: validates bounds, fetches atoms, builds process order, iteratively appends projected atoms while tracking worst-case envelope size, rolling back (deterministic prefix-drop) and warning when overflow occurs, including the "first atom alone too large" case. |
| `getAtomsAtomSchema` | const | `src/mcp/tools/get-atoms.ts:348` | Zod schema for `GetAtomsAtom`. |
| `getAtomsOutputSchema` | const | `src/mcp/tools/get-atoms.ts:359` | Zod output schema for the MCP tool registration. |
| `registerGetAtoms(server, storage)` | function | `src/mcp/tools/get-atoms.ts:368` | Registers the `get_atoms` MCP tool with input/output schemas and async handler. |

### `src/mcp/tools/get-role-state.ts` — role-typed task-state pointer reader MCP tool

**Purpose:** Implements `get_role_state`, which reads the raw content of one role-typed task-state pointer file (`backlog/task-state/<task_id>/<role>.md`) at a pinned git commit SHA, resolving the ref once and echoing the resolved SHA so callers can pin follow-up reads.

**Depends on:** `src/mcp/util/role-state-git.ts` (`commitTimeForPathAtRef`, `GitError`, `pathExistsAtRef`, `readBlobAtRef`, `resolveRefOnce`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ROLE_VALUES` | const | `src/mcp/tools/get-role-state.ts:21` | Tuple of valid roles: `strategist`, `builder`, `round-state`. |
| `Role` | type | `src/mcp/tools/get-role-state.ts:22` | Union type derived from `ROLE_VALUES`. |
| `GetRoleStateResult` | interface | `src/mcp/tools/get-role-state.ts:24` | Result shape: `content`, `last_updated`, `source_path`, `line_count`, `ref`. |
| `getRoleStateOutputSchema` | const | `src/mcp/tools/get-role-state.ts:32` | Zod output schema for the MCP tool registration. |
| `buildSourcePath(taskId, role)` | function | `src/mcp/tools/get-role-state.ts:40` | Builds the pointer file path `backlog/task-state/<taskId>/<role>.md`. |
| `getRoleState(repoRoot, taskId, role, inputRef)` | function | `src/mcp/tools/get-role-state.ts:44` | Resolves the ref once, checks the path exists at that SHA (throws `GitError` if not), reads the blob, computes commit time and newline-aware `line_count`. |
| `registerGetRoleState(server, repoRoot)` | function | `src/mcp/tools/get-role-state.ts:74` | Registers the `get_role_state` MCP tool with input/output schemas and async handler, mapping `GitError` to an `isError` response. |

### `src/mcp/tools/internal/decision-card-types.ts` — decision-card shared type definitions

**Purpose:** Defines the shared TypeScript interfaces for the `pending_decisions` tool's DecisionCard projection — signal kinds, source links, the card shape itself, git freshness source-state, and the overall result envelope. Pure types, no logic.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DecisionSignal` | interface | `src/mcp/tools/internal/decision-card-types.ts:1` | Signal shape `{kind: 'runaway_churn', detail}` flagging churned review rounds. |
| `DecisionSourceLink` | interface | `src/mcp/tools/internal/decision-card-types.ts:6` | Label+href pair pointing at a source artifact (combined review, round dir, backlog item). |
| `DecisionCard` | interface | `src/mcp/tools/internal/decision-card-types.ts:11` | Full decision-card shape: id, title, decision, whyNow, options, default, deadline?, blocking?, agents, sources, signals. |
| `PendingDecisionsSourceState` | interface | `src/mcp/tools/internal/decision-card-types.ts:25` | Git freshness/dirtiness state: local/upstream heads, behind count, staleness, dirty flag, scan stats. |
| `PendingDecisionsResult` | interface | `src/mcp/tools/internal/decision-card-types.ts:36` | Top-level `pending_decisions` result: schema_version, tool, decisions[], source_breakdown, source_state, optional result_caps. |

### `src/mcp/tools/internal/decision-source-playbook.ts` — active-backlog decision-card projector

**Purpose:** Scans active backlog items (`ready`, `claimed`, `pending_review`) and their review rounds (`backlog/reviews/<id>/r*/combined.md`), applying a minimal frontmatter parser to detect unresolved rounds needing founder attention (escalated or churned past a stale-touch threshold), and projects them into `DecisionCard`s consumed by `pending_decisions`.

**Depends on:** `src/mcp/tools/internal/decision-card-types.ts` (`DecisionCard`, `DecisionSignal`); external: `node:fs`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_STALE_TOUCH_THRESHOLD` | const | `src/mcp/tools/internal/decision-source-playbook.ts:5` | Default (4) consecutive non-escalated round count that triggers a runaway-churn signal. |
| `DEFAULT_ACTIVE_ITEM_SCAN_LIMIT` | const | `src/mcp/tools/internal/decision-source-playbook.ts:6` | Default cap (100) on active items scanned per call. |
| `ACTIVE_BACKLOG_DIRS` | const | `src/mcp/tools/internal/decision-source-playbook.ts:8` | Tuple of backlog stage directories scanned for active items: `ready`, `claimed`, `pending_review`. |
| `CombinedRound` | interface | `src/mcp/tools/internal/decision-source-playbook.ts:16` | One parsed review round: `round`, `path`, `frontmatter`. |
| `PlaybookDecisionProjection` | interface | `src/mcp/tools/internal/decision-source-playbook.ts:22` | Projection result: decisions[], source_breakdown, scanned_items, partial. |
| `ProjectPlaybookDecisionsOptions` | interface | `src/mcp/tools/internal/decision-source-playbook.ts:29` | Options: `staleTouchThreshold?`, `scanLimit?`. |
| `projectPlaybookDecisions(repoRoot, options)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:34` | Lists active items (capped), reads each item's latest review round, filters to unresolved rounds, computes blind-round churn count and signals, and builds a `DecisionCard` for escalated or signaled items. |
| `readCombinedRounds(repoRoot, itemId)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:88` | Reads and parses all `r<N>/combined.md` frontmatter files for an item, sorted by round number. |
| `consecutiveBlindRoundCount(rounds)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:103` | Counts consecutive most-recent rounds that were NOT escalated to the founder. |
| `listActiveItems(repoRoot)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:113` | Lists `.md` files across the three active backlog stage directories, sorted by path. |
| `buildSignals(blindRoundCount, threshold)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:126` | Returns a `runaway_churn` signal if `blindRoundCount >= threshold`, else empty. |
| `buildDecisionCard(args)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:136` | Assembles a full `DecisionCard` from an item's latest round frontmatter, escalation state, and signals. |
| `isUnresolved(fm)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:178` | Returns true when a round's `next_round` field is null/undefined/empty. |
| `agentsFromCombined(fm)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:183` | Extracts reviewer agent names from frontmatter keys ending in `_response`. |
| `parseFrontmatterFile(path)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:190` | Reads a file and parses its `---`-delimited YAML-like frontmatter block into a flat key/value map (top-level scalars only). |
| `parseScalar(rawValue)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:204` | Parses a frontmatter scalar value into null/boolean/number/string, stripping inline comments and quotes. |
| `stripInlineComment(value)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:221` | Strips a `#`-prefixed inline comment from a YAML scalar line, respecting quoted strings. |
| `stringField(fm, key)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:235` | Returns a frontmatter field as a non-empty string, else null. |
| `booleanField(fm, key)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:240` | Returns a frontmatter field as a boolean, else null. |
| `shortItemNumber(itemId)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:245` | Extracts the 3-digit item number from a dated backlog item id. |
| `cleanTitle(title)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:249` | Collapses whitespace and trims a title string. |
| `relativeToRepo(repoRoot, path)` | function | `src/mcp/tools/internal/decision-source-playbook.ts:253` | Converts an absolute path to repo-relative if it lies under `repoRoot`, else returns it unchanged. |

### `src/mcp/tools/list-task-states.ts` — task-state pointer discovery MCP tool

**Purpose:** Implements `list_task_states`, which walks `backlog/task-state/` at a single pinned commit SHA and returns one entry per task directory (roles present, parsed canonical anchors, cross-referenced backlog stage), guaranteeing all reads see the same tree snapshot to avoid HEAD-race inconsistencies.

**Depends on:** `src/mcp/parse-anchors.ts` (`isParseFailure`, `parseAnchors`, `ParsedAnchors`), `src/mcp/util/role-state-git.ts` (`commitTimesForPathsAtRef`, `defaultGitRunner`, `GitError`, `GitRunner`, `listTreeAtRef`, `readBlobsAtRef`, `resolveRefOnce`), `src/mcp/tools/get-role-state.ts` (`ROLE_VALUES`, `Role`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `STAGE_VALUES` | const | `src/mcp/tools/list-task-states.ts:25` | Tuple of backlog stage names: `ready`, `claimed`, `pending_review`, `complete`. |
| `Stage` | type | `src/mcp/tools/list-task-states.ts:26` | Union type derived from `STAGE_VALUES`. |
| `TaskStateEntry` | interface | `src/mcp/tools/list-task-states.ts:28` | Per-task entry: task_id, stage, roles_present, ref path, last_updated, canonical_anchors (or parse-error fallback). |
| `ListTaskStatesResult` | interface | `src/mcp/tools/list-task-states.ts:37` | Top-level result: `task_states[]`, `ref`. |
| `anchorsShape` | const | `src/mcp/tools/list-task-states.ts:42` | Zod schema for the canonical_anchors shape (optional spec/reviews/_parse_error). |
| `entryShape` | const | `src/mcp/tools/list-task-states.ts:48` | Zod schema for a `TaskStateEntry`. |
| `listTaskStatesOutputSchema` | const | `src/mcp/tools/list-task-states.ts:57` | Zod output schema for the MCP tool registration. |
| `resolveStagesAtRef(repoRoot, sha, runner)` | function | `src/mcp/tools/list-task-states.ts:62` | Lists `backlog/<stage>/*.md` at the pinned SHA for each stage and builds a task_id→stage map. |
| `EntryDraft` | interface | `src/mcp/tools/list-task-states.ts:76` | Intermediate per-task draft before body/commit-time reads: taskId, stage, rolesPresent, anchorSourcePath. |
| `buildEntry(draft, body, lastUpdated)` | function | `src/mcp/tools/list-task-states.ts:83` | Parses anchors from the pointer body and assembles the final `TaskStateEntry`. |
| `ListTaskStatesParams` | interface | `src/mcp/tools/list-task-states.ts:98` | Input params: `role?`, `binding?` (reserved no-op), `stage?`, `ref?`. |
| `ListTaskStatesOptions` | interface | `src/mcp/tools/list-task-states.ts:105` | Options bag: `gitRunner?` injection seam. |
| `listTaskStates(repoRoot, params, options)` | function | `src/mcp/tools/list-task-states.ts:109` | Core logic: resolves ref once, lists the task-state tree, cross-references stages, buckets pointer files by task_id and role, filters by `role`/`stage` params, batch-reads bodies and commit times for anchor source paths, builds and sorts entries by task_id. |
| `registerListTaskStates(server, repoRoot)` | function | `src/mcp/tools/list-task-states.ts:178` | Registers the `list_task_states` MCP tool with input/output schemas and async handler, mapping `GitError` to `isError`. |

### `src/mcp/tools/pending-decisions.ts` — founder decision-feed MCP tool

**Purpose:** Implements `pending_decisions`, a zero-LLM, read-only tool that projects `DecisionCard`s from a repo's active backlog/review state (via `projectPlaybookDecisions`) plus git freshness metadata (local/upstream head divergence, dirty working tree, upstream-fetch caching), giving the founder a live feed of decisions awaiting attention.

**Depends on:** `src/mcp/tools/internal/decision-card-types.ts` (`PendingDecisionsResult`, `PendingDecisionsSourceState`), `src/mcp/tools/internal/decision-source-playbook.ts` (`DEFAULT_ACTIVE_ITEM_SCAN_LIMIT`, `projectPlaybookDecisions`), `src/mcp/util/repo-path.ts` (`assertAbsoluteRepoPath`, `normaliseRepoPath`); external: `node:child_process`, `node:fs/promises`, `node:path`, `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PendingDecisionsParams` | interface | `src/mcp/tools/pending-decisions.ts:20` | Input params: `repo_path: string`. |
| `GitRunOptions` | interface | `src/mcp/tools/pending-decisions.ts:24` | Options for a git invocation: `timeoutMs`, optional `env`. |
| `GitRunResult` | interface | `src/mcp/tools/pending-decisions.ts:29` | Result of a git invocation: `ok`, `stdout`, optional `timedOut`. |
| `GitRunner` | type | `src/mcp/tools/pending-decisions.ts:35` | Function type `(repoRoot, args, options) => Promise<GitRunResult>`, the injection seam for git calls. |
| `RegisterPendingDecisionsDeps` | interface | `src/mcp/tools/pending-decisions.ts:37` | Injectable deps: `now?`, `git?`, `refreshWindowMs?`, `fetchTimeoutMs?`, `scanLimit?`. |
| `RefreshCacheEntry` | interface | `src/mcp/tools/pending-decisions.ts:45` | Per-repo cache entry: `lastAttemptMs`, `lastSuccessIso`. |
| `refreshCache` | const | `src/mcp/tools/pending-decisions.ts:50` | Module-level `Map<repoRoot, RefreshCacheEntry>` throttling `git fetch` calls. |
| `resetPendingDecisionsGitCache()` | function | `src/mcp/tools/pending-decisions.ts:52` | Clears the module-level refresh cache (test utility). |
| `pendingDecisions(params, deps)` | function | `src/mcp/tools/pending-decisions.ts:56` | Core logic: validates/normalises `repo_path`, projects playbook decisions, builds source state (git freshness), assembles the `PendingDecisionsResult` including optional `result_caps` when the scan was partial. |
| `buildSourceState(repoRoot, projection, deps)` | function | `src/mcp/tools/pending-decisions.ts:84` | Maybe-refreshes the upstream fetch cache, then reads local HEAD, upstream HEAD, behind-count, dirty status (scoped to `backlog`), and upstream-checked-at staleness. |
| `maybeRefreshUpstream(repoRoot, now, git, refreshWindowMs, fetchTimeoutMs)` | function | `src/mcp/tools/pending-decisions.ts:118` | Throttled `git fetch origin main` with prompt-disabling env vars, only runs if outside the refresh window. |
| `upstreamCheckedAtIso(repoRoot, git, timeoutMs)` | function | `src/mcp/tools/pending-decisions.ts:147` | Determines the last-fetch timestamp from the in-memory cache or by stat-ing `refs/remotes/origin/main` / its reflog file. |
| `runGit(repoRoot, args, options)` | function | `src/mcp/tools/pending-decisions.ts:170` | Default `GitRunner` implementation via `execFile('git', ...)` with timeout and SIGKILL handling. |
| `pendingDecisionsOutputSchema` | const | `src/mcp/tools/pending-decisions.ts:198` | Zod output schema for the MCP tool registration. |
| `registerPendingDecisions(server, deps)` | function | `src/mcp/tools/pending-decisions.ts:216` | Registers the `pending_decisions` MCP tool with input/output schemas and async handler. |

### `src/mcp/tools/recent-work-context.ts` — deprecated compound cluster+body context tool

**Purpose:** Implements the legacy `get_recent_work_context` MCP tool (deprecated in favor of `find_clusters` + `get_atoms`), now a thin wrapper/re-export shim around the canonical cluster engine (`src/mcp/internal/cluster-engine.ts`); still contains the skeleton wire-shape transform used by both this tool and `find_clusters`.

**Depends on:** `src/mcp/storage/interface.ts` (`Storage`), `src/normalize/types.ts` (`NormalizedContextEvent`, `SourceRef`, `TimeRef`), `src/trace/types.ts` (`Cluster`, `RecentWorkContextResponse`, `ResponseFormat`), `src/mcp/internal/cluster-engine.ts` (`getRecentWorkContext`, `RecentWorkContextParams`, plus re-exported constants), `src/mcp/util/iso8601.ts` (`isoString`, `hasTzMarker`, `TZ_NAIVE_WARNING`), `src/mcp/wire-shape/caps.ts` (`WIRE_SHAPE_CAPS`); external: `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RECENT_WORK_CONTEXT_DEPRECATION_MARKER` | const | `src/mcp/tools/recent-work-context.ts:45` | Deprecation banner text prepended to the tool description, with a migration recipe to `find_clusters` + `get_atoms`. |
| `RECENT_WORK_CONTEXT_DESCRIPTION` | const | `src/mcp/tools/recent-work-context.ts:90` | Full tool description: deprecation marker plus usage, format ladder (skeleton/minimal/full), and no-args auto-expand behavior. |
| `SKELETON_SUMMARY_CAP` | const | `src/mcp/tools/recent-work-context.ts:147` | Head-clip length (from `WIRE_SHAPE_CAPS.skeleton_summary`) for the synthesized skeleton-atom action summary. |
| `SKELETON_CLUSTER_ATOM_IDS_CAP` | const | `src/mcp/tools/recent-work-context.ts:153` | Per-cluster cap (50) on skeleton-mode `atom_ids[]`. |
| `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP` | const | `src/mcp/tools/recent-work-context.ts:154` | Per-cluster cap (30) on skeleton-mode `open_loop_hints[]`; re-used by `find_clusters.ts`. |
| `SkeletonAtom` | interface | `src/mcp/tools/recent-work-context.ts:156` | Stripped atom shape for skeleton mode: id, time, source, action{kind, summary?}. |
| `SkeletonOpenLoopHint` | interface | `src/mcp/tools/recent-work-context.ts:166` | Stripped hint shape: `atom_id`, `resolved`. |
| `SkeletonCluster` | interface | `src/mcp/tools/recent-work-context.ts:171` | Stripped cluster shape with capped atom_ids/open_loop_hints and omission/truncated flags. |
| `SkeletonResponse` | interface | `src/mcp/tools/recent-work-context.ts:188` | Full skeleton-mode response envelope mirroring `RecentWorkContextResponse` but with skeleton clusters/atoms. |
| `applySkeletonAtom(atom)` | function | `src/mcp/tools/recent-work-context.ts:198` | Converts a `NormalizedContextEvent` into a `SkeletonAtom`, synthesizing a capped `action.summary` from input/output. |
| `clipArray(arr, cap)` | function | `src/mcp/tools/recent-work-context.ts:216` | Head+tail clips an array to `cap`, returning kept items and omitted count. |
| `applySkeletonCluster(cluster)` | function | `src/mcp/tools/recent-work-context.ts:226` | Converts a `Cluster` into a `SkeletonCluster`, clipping atom_ids and open_loop_hints and setting omission/truncated flags. |
| `buildSkeletonResponse(response)` | function | `src/mcp/tools/recent-work-context.ts:252` | Builds a full `SkeletonResponse` by mapping every atom and cluster through the skeleton transforms. |
| `recentWorkContextOutputSchema` | const | `src/mcp/tools/recent-work-context.ts:270` | Permissive Zod output schema for the MCP tool registration. |
| `registerRecentWorkContext(server, storage)` | function | `src/mcp/tools/recent-work-context.ts:280` | Registers the deprecated `get_recent_work_context` MCP tool, dispatching to `getRecentWorkContext` and optionally transforming to `SkeletonResponse` when `format==='skeleton'`. |

### `src/mcp/tools/search-memories.ts` — `search_memories` MCP tool: substring search over captured atoms

**Purpose:** Implements the `search_memories` MCP tool, which searches captured atoms by free-text substring, three-way source selection (`source` > `source_prefix` > `source_app`), time range, `repo_path` scoping, and arbitrary `metadata_match` predicates; returns cursor-paginated, wire-shape-capped matches with query echo and warnings.

**Depends on:** `src/enrich/granola-signals.js`, `src/storage/interface.js`, `src/mcp/util/fs-exclusion.js`, `src/mcp/util/iso8601.js`, `src/mcp/util/repo-path.js`, `src/mcp/util/source-app.js`, `src/mcp/wire-shape/match.js`, `src/mcp/tools/_cursor.js`, `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SEARCH_MEMORIES_DESCRIPTION` | const | `src/mcp/tools/search-memories.ts:24` | Tool description string documenting the 3-way source precedence, metadata_match, repo_path, and cursor pagination contract. |
| `DEFAULT_LIMIT` | const | `src/mcp/tools/search-memories.ts:27` | Default result page size (10). |
| `MAX_LIMIT` | const | `src/mcp/tools/search-memories.ts:28` | Maximum allowed `limit` value (50). |
| `MetadataMatchValue` | type | `src/mcp/tools/search-memories.ts:29` | Union type: a scalar string or string array for metadata_match equality/membership. |
| `TOOL_METADATA_MATCH_KEYS` | const | `src/mcp/tools/search-memories.ts:31` | Whitelist of metadata_match keys accepted at the tool layer (storage whitelist plus signal-specific keys). |
| `SOURCE_APP_MAP` | const | `src/mcp/tools/search-memories.ts:48` | Module-load-resolved map from SourceApp to filesystem source prefix via `buildSourceAppMap()`. |
| `SearchMatch` | interface | `src/mcp/tools/search-memories.ts:50` | Wire shape of one returned match, including clip/elision/projection/truncation metadata. |
| `SearchResult` | interface | `src/mcp/tools/search-memories.ts:82` | Full tool response shape: matches, pagination, query_echo, and warnings. |
| `SearchMemoriesParams` | interface | `src/mcp/tools/search-memories.ts:120` | Input parameter shape for `searchMemories()`. |
| `clampLimit(input)` | function | `src/mcp/tools/search-memories.ts:146` | Floors and clamps a caller-supplied limit into `[1, MAX_LIMIT]`, defaulting to `DEFAULT_LIMIT`. |
| `sortDesc(events)` | function | `src/mcp/tools/search-memories.ts:152` | Sorts events by timestamp DESC then id DESC, mirroring storage's ORDER BY contract. |
| `metadataMatchValuesContain(expected, actual)` | function | `src/mcp/tools/search-memories.ts:165` | Checks scalar equality or array membership for a metadata_match value. |
| `metadataValue(event, key)` | function | `src/mcp/tools/search-memories.ts:169` | Reads `event.source` for key `'source'` or a string metadata field otherwise. |
| `matchesMetadata(event, metadataMatch)` | function | `src/mcp/tools/search-memories.ts:175` | Returns true only if every metadata_match key/value pair matches the event. |
| `queryMatches(event, query)` | function | `src/mcp/tools/search-memories.ts:186` | Case-insensitive substring test against event content and `metadata.canonical_subject`. |
| `requestedGranolaSignals(effectiveSource, effectivePrefix, metadataMatch)` | function | `src/mcp/tools/search-memories.ts:193` | Detects whether the caller's filters target Granola derived-signal atoms, to trigger current-manifest-run restriction. |
| `storageMetadataMatchFrom(metadataMatch)` | function | `src/mcp/tools/search-memories.ts:215` | Projects the caller's metadata_match down to only storage-whitelisted string-valued keys for forwarding to `storage.query`. |
| `searchMemories(storage, params)` | function | `src/mcp/tools/search-memories.ts:226` | Core implementation: validates/normalises repo_path, resolves 3-way source precedence, validates/merges metadata_match, builds the QueryFilter (with fs and coord-atom exclusion), queries storage, applies query/metadata/Granola-signal filters, paginates via cursor, and projects matches through `projectMatch`. |
| `searchMatchSchema` | const | `src/mcp/tools/search-memories.ts:429` | Zod schema for one wire-shaped search match, shared across retrieval tools. |
| `searchMemoriesOutputSchema` | const | `src/mcp/tools/search-memories.ts:456` | Zod outputSchema object for the full `search_memories` tool response, used for `tools/list` and structured-content validation. |
| `registerSearchMemories(server, storage)` | function | `src/mcp/tools/search-memories.ts:479` | Registers the `search_memories` tool on the MCP server, wiring input schema, output schema, and error-to-isError translation for cursor/repo_path validation errors. |

### `src/mcp/tools/wait-for-new-turns.ts` — `wait_for_new_turns` MCP tool: stateless long-poll for new captured atoms

**Purpose:** Implements `wait_for_new_turns`, a stateless blocking long-poll tool that waits until new atoms land at any of N sources (exact source paths, source-app prefixes, or an explicit `source_prefix`), returning IDs-only results with lossless `next_since` chaining and tie-group-aware overflow paging.

**Depends on:** `src/storage/interface.js`, `src/util/timestamp.js`, `src/mcp/util/fs-exclusion.js`, `src/mcp/util/iso8601.js`, `src/mcp/util/repo-path.js`, `src/mcp/util/source-app.js`, `@modelcontextprotocol/sdk/server/mcp.js`, `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SCHEMA_VERSION` | const | `src/mcp/tools/wait-for-new-turns.ts:30` | Response schema version literal (1). |
| `WAIT_MAX_SOURCES` | const | `src/mcp/tools/wait-for-new-turns.ts:32` | Max number of entries allowed in `sources[]` (8). |
| `WAIT_DEFAULT_TIMEOUT_SECONDS` | const | `src/mcp/tools/wait-for-new-turns.ts:33` | Default long-poll timeout (30s). |
| `WAIT_MAX_TIMEOUT_SECONDS` | const | `src/mcp/tools/wait-for-new-turns.ts:34` | Maximum allowed timeout (60s). |
| `WAIT_DEFAULT_POLL_INTERVAL_MS` | const | `src/mcp/tools/wait-for-new-turns.ts:35` | Poll interval between storage re-checks (1000ms). |
| `WAIT_MAX_RETURNED_TURNS` | const | `src/mcp/tools/wait-for-new-turns.ts:39` | Cap on turns returned per call (20). |
| `WAIT_PER_POLL_LIMIT_PER_SOURCE` | const | `src/mcp/tools/wait-for-new-turns.ts:48` | Per-source raw fetch window size (2*cap+1) sized to detect overflow and absorb boundary tie groups. |
| `SOURCE_APP_SET` | const | `src/mcp/tools/wait-for-new-turns.ts:53` | Set of recognised source_app names resolved via prefix match. |
| `WAIT_FOR_NEW_TURNS_DESCRIPTION` | const | `src/mcp/tools/wait-for-new-turns.ts:55` | Long tool description documenting parameters, IDs-only response, chaining, overflow paging, and polling fallback pattern. |
| `WaitForNewTurnsParams` | interface | `src/mcp/tools/wait-for-new-turns.ts:100` | Input params: sources, source_prefix, since, timeout, repo_path. |
| `WaitForNewTurnsResult` | interface | `src/mcp/tools/wait-for-new-turns.ts:127` | Output shape: turn_ids, next_since, timed_out, warnings. |
| `ResolvedSources` | interface | `src/mcp/tools/wait-for-new-turns.ts:140` | Internal split of `sources[]` into exact source paths vs source-app prefixes. |
| `resolveSources(sources)` | function | `src/mcp/tools/wait-for-new-turns.ts:149` | Splits mixed `sources[]` entries into exact literal sources and source-app FS prefixes via `buildSourceAppMap()`. |
| `PollPage` | interface | `src/mcp/tools/wait-for-new-turns.ts:163` | One poll pass's result: rows, overflow flag, and tie-group-incomplete flag. |
| `pollOnce(storage, resolved, since, normalisedRepoPath)` | function | `src/mcp/tools/wait-for-new-turns.ts:183` | Fans out one storage query per exact source/prefix (ASC order), merges by id, strict-after filters on `since`, sorts, and pages the oldest cap-sized window while never splitting a same-timestamp boundary group; detects window-full horizons to avoid unprovable-complete tie groups. |
| `sleep(ms)` | const/function | `src/mcp/tools/wait-for-new-turns.ts:284` | Promise-based delay helper. |
| `ISO_RE` | const | `src/mcp/tools/wait-for-new-turns.ts:286` | Regex validating a loose ISO 8601 timestamp shape for `since`. |
| `WaitForNewTurnsOptions` | interface | `src/mcp/tools/wait-for-new-turns.ts:288` | Test-only overrides: pollIntervalMs and injectable clock (`now`). |
| `waitForNewTurns(storage, params, options)` | function | `src/mcp/tools/wait-for-new-turns.ts:299` | Core implementation: validates sources/source_prefix disjunction, since format, repo_path; loops `pollOnce` until data arrives or deadline passes; computes lossless `next_since` and overflow/tie-group warnings. |
| `waitOutputSchema` | const | `src/mcp/tools/wait-for-new-turns.ts:424` | Zod outputSchema for the `wait_for_new_turns` tool response. |
| `registerWaitForNewTurns(server, storage)` | function | `src/mcp/tools/wait-for-new-turns.ts:433` | Registers the `wait_for_new_turns` tool on the MCP server with input/output schemas and error-to-isError translation. |

### `src/mcp/util/fs-exclusion.ts` — shared fs-watcher meta-event exclusion helper

**Purpose:** Centralises the `exclude_metadata_surface: ['fs']` filter that every retrieval tool must apply to hide raw fs-watcher change events from query results, closing a recurring bug where each new tool re-hardcoded the literal.

**Depends on:** `src/storage/interface.js`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EXCLUDE_FS_SURFACE` | const | `src/mcp/util/fs-exclusion.ts:20` | Readonly canonical surface-exclusion tuple `['fs']`. |
| `withFsExclusion(filter)` | function | `src/mcp/util/fs-exclusion.ts:25` | Returns a copy of the given QueryFilter with `exclude_metadata_surface` set to a fresh `['fs']` array. |

### `src/mcp/util/iso8601.ts` — shared ISO-8601 timestamp validation + TZ-naive warning

**Purpose:** Provides the shared ISO-8601 regex/zod schema used by since/until-bearing MCP tools, plus a TZ-marker check and canonical warning string for timestamps parsed as local time.

**Depends on:** `zod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `TZ_MARKER_RE` | const | `src/mcp/util/iso8601.ts:16` | Regex matching the four legal ISO 8601 TZ marker forms (Z, ±HH:MM, ±HHMM, ±HH). |
| `hasTzMarker(s)` | function | `src/mcp/util/iso8601.ts:18` | Tests whether a string ends with a recognised TZ marker. |
| `TZ_NAIVE_WARNING` | const | `src/mcp/util/iso8601.ts:32` | Canonical `[TZ]`-prefixed warning string emitted when since/until lacks a TZ specifier. |
| `ISO8601_RE` | const | `src/mcp/util/iso8601.ts:39` | Permissive structural ISO 8601 regex (date+time prefix only, TZ optional) used for schema validation. |
| `isoString` | const | `src/mcp/util/iso8601.ts:41` | Zod string schema enforcing `ISO8601_RE` with a descriptive error message. |

### `src/mcp/util/repo-path.ts` — shared `repo_path` validation + normalization

**Purpose:** Provides the shared validation (must be absolute) and re-exported normalisation function for the `repo_path` parameter used across `search_memories`, `find_clusters`/`recent_work_context`, `wait_for_new_turns`, and `echo_resolve_mru`.

**Depends on:** `node:path`, `src/mcp/cursor-workspace-resolver.js`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `normaliseRepoPath` | re-export | `src/mcp/util/repo-path.ts:27` | Re-exported from `cursor-workspace-resolver.ts` so capture and retrieval share one normalisation function. |
| `assertAbsoluteRepoPath(toolName, repo_path)` | function | `src/mcp/util/repo-path.ts:35` | Throws a `<toolName>: repo_path must be absolute` Error when `repo_path` is not an absolute filesystem path. |

### `src/mcp/util/role-state-git.ts` — pinned-SHA git plumbing for role-typed task-state tools

**Purpose:** Shared git-read primitives for the role-typed task-state MCP tools (item 046), implementing the "resolve ref once, read everything at that pinned SHA" contract to avoid torn reads from a moving HEAD; reads only committed history, never working-tree state.

**Depends on:** `node:child_process`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GitError` | class | `src/mcp/util/role-state-git.ts:17` | Error subclass carrying captured stderr for git-plumbing failures. |
| `DEFAULT_GIT_MAX_BUFFER_BYTES` | const | `src/mcp/util/role-state-git.ts:26` | Default max buffer size (64MB) for spawned git subprocess output. |
| `GitRunOptions` | interface | `src/mcp/util/role-state-git.ts:28` | Options for a git invocation: optional stdin `input` and `maxBuffer`. |
| `GitRunResult` | interface | `src/mcp/util/role-state-git.ts:33` | Result of a git invocation: exit code, stdout/stderr strings, and raw stdout Buffer. |
| `GitRunner` | type | `src/mcp/util/role-state-git.ts:40` | Function type for a pluggable git runner, enabling test injection. |
| `defaultGitRunner` | const | `src/mcp/util/role-state-git.ts:42` | Default `GitRunner` implementation using `spawnSync('git', ...)` with configurable stdin/maxBuffer. |
| `gitCapture(repoRoot, args, runner, options)` | function | `src/mcp/util/role-state-git.ts:63` | Internal wrapper invoking the runner with a default maxBuffer applied. |
| `resolveRefOnce(repoRoot, inputRef, runner)` | function | `src/mcp/util/role-state-git.ts:82` | Resolves `inputRef` (default `HEAD`) to a full commit SHA via `git rev-parse --verify <ref>^{commit}`, throwing `GitError` on failure; the returned SHA is meant to be pinned for the rest of the call. |
| `readBlobAtRef(repoRoot, sha, repoRelativePath, runner)` | function | `src/mcp/util/role-state-git.ts:98` | Reads a file's raw blob content at a given commit via `git show <sha>:<path>`, throwing `GitError` on failure. |
| `pathExistsAtRef(repoRoot, sha, repoRelativePath, runner)` | function | `src/mcp/util/role-state-git.ts:114` | Cheap existence check via `git cat-file -e <sha>:<path>`. |
| `listTreeAtRef(repoRoot, sha, repoRelativeDir, runner)` | function | `src/mcp/util/role-state-git.ts:127` | Lists all file paths recursively under a directory at a given commit via `git ls-tree -r --name-only`. |
| `readBlobsAtRef(repoRoot, sha, repoRelativePaths, runner)` | function | `src/mcp/util/role-state-git.ts:146` | Batch-reads multiple blobs at one SHA via `git cat-file --batch`, parsing the batch protocol's headers/sizes to return a Map of path to content; throws `GitError` on malformed/missing entries. |
| `commitTimesForPathsAtRef(repoRoot, sha, repoRelativePaths, runner)` | function | `src/mcp/util/role-state-git.ts:197` | Computes the most recent commit time for each of several `backlog/task-state/` paths in one `git log --name-only` pass. |
| `commitTimeForPathAtRef(repoRoot, sha, repoRelativePath, runner)` | function | `src/mcp/util/role-state-git.ts:235` | Returns the ISO-8601 commit time of the most recent commit modifying a single path (looking back from `sha`), falling back to the pinned commit's own time if the path has no history. |

### `src/mcp/util/source-app.ts` — shared source-app vocabulary + FS-prefix mapping

**Purpose:** Single source of truth for the `SourceApp` enum vocabulary and its mapping to literal filesystem/API source prefixes, used by every source_app-bearing MCP retrieval tool.

**Depends on:** `node:os`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SOURCE_APP_VALUES` | const | `src/mcp/util/source-app.ts:10` | Tuple of recognised source-app names: cursor, claude_code, codex, git, granola. |
| `SourceApp` | type | `src/mcp/util/source-app.ts:11` | Union type derived from `SOURCE_APP_VALUES`. |
| `buildSourceAppMap()` | function | `src/mcp/util/source-app.ts:17` | Builds a `Record<SourceApp, string>` mapping each app name to its canonical source prefix (home-dir-relative FS paths for cursor/claude_code/codex, `git:` for git, `api:granola` for granola). |

### `src/mcp/wire-shape/caps.ts` — declarative wire-shape size caps table

**Purpose:** Single source of truth for byte/char caps applied when projecting captured atoms onto the MCP wire (content clipping, per-metadata-value clipping, minimal/skeleton action clipping), sized to keep multi-match tool responses within the consumer tool-result budget.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `WIRE_SHAPE_CAPS` | const | `src/mcp/wire-shape/caps.ts:14` | Object of named caps: `match_content` (2000), `metadata_value` (1000), `minimal_action` (500), `skeleton_summary` (200), each documented with the regression bug that motivated it. |

### `src/mcp/wire-shape/clip.ts` — shared string/metadata clipping helpers

**Purpose:** Implements the two low-level clipping primitives used by the wire-shape projectors: head+tail string clipping with an elision marker, and per-key metadata value clipping that opaques oversized values while passing small ones through verbatim.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `marker(elidedChars)` | function | `src/mcp/wire-shape/clip.ts:19` | Formats the standard elision marker string embedding the dropped character count. |
| `ClipResult` | interface | `src/mcp/wire-shape/clip.ts:23` | Shape of a single-string clip result: the (possibly clipped) value and bytes_elided count. |
| `clipString(s, cap)` | function | `src/mcp/wire-shape/clip.ts:31` | Clips a string to `cap` chars via head+marker+tail when it exceeds the cap; returns the original verbatim (bytes_elided=0) otherwise. |
| `ClippedMetadata` | interface | `src/mcp/wire-shape/clip.ts:41` | Shape of a metadata-clip result: the clipped metadata object, total bytes_elided, and list of elided keys. |
| `clipMetadataValues(metadata, cap)` | function | `src/mcp/wire-shape/clip.ts:55` | Iterates a metadata bag, replacing any value whose JSON-stringified form exceeds `cap` with `{__elided:true, original_size:N}`, tracking bytes dropped and touched keys; silently drops unserializable values. |

### `src/mcp/wire-shape/compact.ts` — cluster/atom "compact" view-mode projector

**Purpose:** Implements the `compact` view-mode shape for clusters and atoms surfaced by trace/cluster-oriented tools, stripping per-source-app metadata down to a curated small set of fields (session_id, repo_root, branch, tool call counts, cursor context, codex config) and nulling out UUID-fallback labels.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ViewMode` | type | `src/mcp/wire-shape/compact.ts:1` | Union of `'compact' \| 'rich'` view modes. |
| `CompactClusterInput` | interface | `src/mcp/wire-shape/compact.ts:3` | Input shape for `compactCluster`: cluster_id, rank_reason, atom_ids, truncation markers, source_breakdown, time_range, label, open_loop_hints. |
| `CompactRankReason` | type | `src/mcp/wire-shape/compact.ts:16` | Union of the three rank-reason strings allowed in the compact shape. |
| `CompactCluster` | interface | `src/mcp/wire-shape/compact.ts:21` | Output shape of a compacted cluster, mirroring the input but with `rank_reason` filtered and `label` nullable. |
| `CompactAtomInput` | interface | `src/mcp/wire-shape/compact.ts:34` | Input shape for `compactAtom`: id, source, timestamp, content, metadata, truncations. |
| `CompactAtom` | interface | `src/mcp/wire-shape/compact.ts:43` | Output shape of a compacted atom. |
| `UUID_FALLBACK_LABEL` | const | `src/mcp/wire-shape/compact.ts:52` | Regex matching the auto-generated "discussion about `<uuid>`" fallback cluster label, so it can be nulled out in compact mode. |
| `COMPACT_RANK_REASONS` | const | `src/mcp/wire-shape/compact.ts:54` | Set of the three rank-reason strings retained in compact mode. |
| `isCompactRankReason(reason)` | function | `src/mcp/wire-shape/compact.ts:60` | Type-guard testing membership in `COMPACT_RANK_REASONS`. |
| `compactCluster(cluster)` | function | `src/mcp/wire-shape/compact.ts:64` | Projects a cluster onto the compact shape: copies core fields, nulls UUID-fallback labels, filters rank_reason to the compact vocabulary, and passes through truncation/omission counters. |
| `compactAtom(atom)` | function | `src/mcp/wire-shape/compact.ts:85` | Projects an atom onto the compact shape, delegating metadata reduction to `compactMetadata`. |
| `compactMetadata(source, content, metadata)` | function | `src/mcp/wire-shape/compact.ts:100` | Builds the curated compact metadata object: common fields (session_id, repo_root, tool_call_total, tool_calls_by_name, files_referenced) plus source-kind-specific fields (claude_code: model/permission_mode/branch; cursor: is_continuation/context/thinking; codex: codex config/git branch) inferred via `inferSourceKind`. |
| `copyIfPresent(src, dest, key)` | function | `src/mcp/wire-shape/compact.ts:141` | Copies `src[key]` to `dest[key]` only if defined. |
| `copyIfPositiveNumber(src, dest, key)` | function | `src/mcp/wire-shape/compact.ts:149` | Copies `src[key]` to `dest[key]` only if it is a number greater than zero. |
| `compactCursorContext(value)` | function | `src/mcp/wire-shape/compact.ts:158` | Extracts attached_files/referenced_files/deleted_files from a Cursor `context` metadata value. |
| `compactCodexConfig(value)` | function | `src/mcp/wire-shape/compact.ts:168` | Extracts model/reasoning_effort from a codex config metadata value. |
| `compactCodexGit(gitValue, gitStateValue)` | function | `src/mcp/wire-shape/compact.ts:177` | Extracts the git branch from either a `git` or `git_state` metadata value. |
| `inferSourceKind(source, metadata)` | function | `src/mcp/wire-shape/compact.ts:187` | Infers whether an atom is claude_code/cursor/codex/git/unknown from `metadata.surface` or, as fallback, the source string's path shape. |
| `recordValue(value)` | function | `src/mcp/wire-shape/compact.ts:200` | Type-guard/cast narrowing an unknown value to a plain (non-array, non-null) object record, or undefined. |

### `src/mcp/wire-shape/match.ts` — single wire-shape projector for atom-shape retrieval tools

**Purpose:** Provides `projectMatch`, the single projection point used by `search_memories` and `get_atoms` to cap atom content/metadata for the wire, applying the tool_calls trajectory reshape before the standard per-key metadata cap, and emitting the unified `truncations` trust-signal vocabulary.

**Depends on:** `src/storage/interface.js`, `src/mcp/wire-shape/caps.js`, `src/mcp/wire-shape/clip.js`, `src/mcp/wire-shape/tool-calls.js`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProjectedMatch` | interface | `src/mcp/wire-shape/match.ts:20` | Wire shape of one projected atom match: id/source/timestamp/content plus optional elision/projection metadata and always-present `truncations`. |
| `projectMatch(e)` | function | `src/mcp/wire-shape/match.ts:82` | Projects a raw `CaptureEvent` onto the wire-safe shape: clips content via `clipString`, pre-projects `metadata.tool_calls` via `projectToolCallsTrajectory` (adding a `tool_calls_by_name` histogram), then applies the standard per-key `clipMetadataValues` cap to the remainder, populating `truncations` with `"content"`, `"metadata.<key>"` (lossy elision), and `"metadata.<key>:projected"` (reshape) entries. |

### `src/mcp/wire-shape/tool-calls.ts` — `metadata.tool_calls` trajectory projector

**Purpose:** Specialised projection restoring a compact workflow trajectory (ordered tool-name list plus a name-count histogram) from a large raw `tool_calls` array that would otherwise be opaqued by the standard per-key metadata cap.

**Depends on:** none.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ToolCallLike` | interface | `src/mcp/wire-shape/tool-calls.ts:21` | Minimal shape check interface requiring a string `name` field. |
| `isToolCallLike(v)` | function | `src/mcp/wire-shape/tool-calls.ts:25` | Type-guard testing whether a value has a string `name` property. |
| `ToolCallsTrajectoryProjection` | interface | `src/mcp/wire-shape/tool-calls.ts:34` | Output shape: ordered `trajectory` name list, `by_name` histogram, `bytes_elided`, and `original_count`. |
| `projectToolCallsTrajectory(value)` | function | `src/mcp/wire-shape/tool-calls.ts:56` | Projects a `metadata.tool_calls` array to its name trajectory plus histogram when every entry is name-bearing; returns an empty-but-present trajectory for an empty array, and `null` (signalling fallback to standard capping) when the array is missing or any entry has a non-shape-conforming type. |

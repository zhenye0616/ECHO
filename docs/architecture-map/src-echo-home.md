# `src/echo-home/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 22 files.

### `src/echo-home/adapter-sync.ts` — top-level orchestrator for syncing ECHO into all agent vendors' home directories

**Purpose:** Implements `syncAll()`, the entry point that installs/updates ECHO's skills, roles, workflows, and per-vendor MCP/config registrations across Codex, Claude Code, and Cursor into `~/.echo` and each vendor's home dir. Coordinates directory-symlink guards, repo-root resolution, an advisory cross-process lock, and per-agent dispatch, returning a structured `SyncResult` with conflicts/errors instead of throwing.

**Depends on:** `./paths.js` (ECHO_HOME_PATHS, InstallProfile), `./roles.js` (DEFAULT_ROLE_FILENAMES), `./adapters/markers.js`, `./adapters/codex-config.js`, `./adapters/claude-code-mcp.js`, `./adapters/cursor-config.js`, `./adapters/skill-sync.js`, `./adapters/role-sync.js`, `./adapters/workflow-sync.js`, `./adapters/atomic-write.js`, node:fs, node:os, node:path, node:url, node:crypto.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AgentKind` | type | `src/echo-home/adapter-sync.ts:41` | Union of the three supported agent vendors: `codex`, `claude-code`, `cursor`. |
| `AdapterSyncProfile` | interface | `src/echo-home/adapter-sync.ts:43` | Per-agent sync inputs: path overrides, desired/previous ECHO section text, MCP server config, Claude Code registration deps, force flag. |
| `SyncAllOpts` | interface | `src/echo-home/adapter-sync.ts:59` | Options for `syncAll`: MCP URL, repo/skills/roles/workflows source dirs, default role/workflow lists, install profile. |
| `AdapterErrorCode` | type | `src/echo-home/adapter-sync.ts:71` | Enumerates errno-style codes plus PARSE_ERROR/RETRY_CONFLICT/MISSING_REQUIRED_INPUT/UNSUPPORTED_VALUE/UNKNOWN used across adapters. |
| `AdapterError` | interface | `src/echo-home/adapter-sync.ts:86` | Structured error shape (code, file, operation, message, optional field/type) returned instead of thrown exceptions. |
| `ConfigConflict` | interface | `src/echo-home/adapter-sync.ts:95` | Conflict shape for config-file (TOML/JSON) value disagreements with unified diff. |
| `MarkerConflict` | interface | `src/echo-home/adapter-sync.ts:104` | Conflict shape for marker-block (CLAUDE.md/AGENTS.md) text disagreements. |
| `TargetSymlinkConflict` | interface | `src/echo-home/adapter-sync.ts:113` | Conflict raised when the write target is itself a symlink. |
| `MalformedMarkerConflict` | interface | `src/echo-home/adapter-sync.ts:119` | Conflict raised when BEGIN/END ECHO markers are missing/duplicated/out of order. |
| `SyncConflict` | type | `src/echo-home/adapter-sync.ts:124` | Discriminated union of the four conflict kinds above. |
| `AgentResult` | type | `src/echo-home/adapter-sync.ts:130` | Per-agent dispatch outcome: ok branch with files_written/actions/skipped, or failure branch with conflicts/errors. |
| `SyncResult` | interface | `src/echo-home/adapter-sync.ts:147` | Overall `syncAll` return value aggregating skills/agents/roles/workflows results plus top-level lock/repoRoot/symlink errors and `overallOk`. |
| `errnoCode(err)` | function | `src/echo-home/adapter-sync.ts:162` | Narrows a caught error's `.code` to the known `AdapterErrorCode` set, defaulting to UNKNOWN. |
| `shellQuote(s)` | function | `src/echo-home/adapter-sync.ts:181` | Single-quotes a string for safe shell embedding, escaping embedded quotes. |
| `shellEscapedRmHint(lockPath)` | function | `src/echo-home/adapter-sync.ts:185` | Builds the human-readable "remove the lockfile with `rm --...`" hint message. |
| `emptyOkResult(targetDir)` | function | `src/echo-home/adapter-sync.ts:189` | Constructs a trivially-ok `PopulateEchoSkillsResult` with empty copied/skipped lists. |
| `lockUnavailablePopulateResult()` | function | `src/echo-home/adapter-sync.ts:193` | Constructs the failure `PopulateEchoSkillsResult` used when the sync lock could not be acquired. |
| `DEFAULT_WORKFLOW_FILENAMES` | const | `src/echo-home/adapter-sync.ts:197` | Default workflow filename list, currently `['change-review.toml']`. |
| `skippedRoles(defaultRoles)` | function | `src/echo-home/adapter-sync.ts:199` | Builds a no-op `RoleSyncResult` (action `noop` for every role) for non-dogfood install profiles. |
| `skippedWorkflows(defaultWorkflows)` | function | `src/echo-home/adapter-sync.ts:206` | Builds a no-op `WorkflowSyncResult` for non-dogfood install profiles. |
| `walkUpwardForRepoRoot(startDir)` | function | `src/echo-home/adapter-sync.ts:217` | Walks up to 64 parent directories from `startDir` looking for a directory containing both `package.json` and `assets/echo-skills`. |
| `resolveRepoRoot(opts)` | function | `src/echo-home/adapter-sync.ts:234` | Resolves the repo root from `opts.repoRoot` if given, else from this module's own file location via `walkUpwardForRepoRoot`. |
| `assertPathComponentsAreNotSymlinks(dirPath, rootBoundary)` | function | `src/echo-home/adapter-sync.ts:250` | Walks every path component between `rootBoundary` and `dirPath` and lstat's each, returning an `AdapterError` if any component is a symlink or the walk exceeds depth 64. |
| `LockHandle` | interface | `src/echo-home/adapter-sync.ts:315` | Holds the lock file path, acquisition token, and the exit/SIGINT/SIGTERM handler closures registered for cleanup. |
| `releaseLockIfOwned(lockPath, myToken)` | function | `src/echo-home/adapter-sync.ts:323` | Reads the lock file's JSON, and unlinks it only if its `acquisitionToken` matches `myToken` (best-effort, swallows errors). |
| `acquireLock(stateDir)` | function | `src/echo-home/adapter-sync.ts:335` | Acquires the cross-process advisory lock at `<stateDir>/adapter-sync.lock` via write-temp-then-`linkSync` (hardlink is atomic create-if-absent); on EEXIST returns a RETRY_CONFLICT error with a shell hint; registers exit/SIGINT/SIGTERM release handlers. |
| `releaseLock(handle)` | function | `src/echo-home/adapter-sync.ts:427` | Removes the registered process signal listeners and releases the lock if still owned. |
| `defaultConfigFile(kind)` | function | `src/echo-home/adapter-sync.ts:438` | Returns the default config file path per agent kind: `<codexHome>/config.toml` for codex, `~/.cursor/mcp.json` for cursor, undefined for claude-code. |
| `defaultInstructionsFile(kind)` | function | `src/echo-home/adapter-sync.ts:444` | Returns the default instructions file: `<codexHome>/AGENTS.md` for codex, `~/.claude/CLAUDE.md` for claude-code. |
| `defaultCommandsDir(kind)` | function | `src/echo-home/adapter-sync.ts:450` | Returns `~/.claude/commands` for claude-code, undefined otherwise. |
| `defaultCodexHome()` | function | `src/echo-home/adapter-sync.ts:455` | Resolves `$CODEX_HOME` if set/non-blank, else `~/.codex`. |
| `defaultCodexSkillsDir()` | function | `src/echo-home/adapter-sync.ts:461` | Returns `<codexHome>/skills`. |
| `isString(v)` | function | `src/echo-home/adapter-sync.ts:465` | Type-guard for `typeof v === 'string'`. |
| `syncAll(profiles, opts)` | function | `src/echo-home/adapter-sync.ts:473` | Main orchestration: (1) symlink-guards target dirs, (2) resolves repo root, (3) acquires the advisory lock, (4) populates `~/.echo/skills`, (5) dispatches each agent profile, (6) syncs default roles/workflows once (dogfood profile only), (7) releases the lock, (8) computes `overallOk`. |
| `computeOverallOk(skillsPopulated, agents, roles, workflowsResult, defaultWorkflows, opts)` | function | `src/echo-home/adapter-sync.ts:625` | Determines the aggregate success flag: requires skills populated with ≥1 copied file, every agent ok, every role action acceptable (copied/noop, or user-modified if `allowUserModifiedRoles`), and workflows synced without errors or missing required sources. |
| `dispatchAgent(profile, skills)` | function | `src/echo-home/adapter-sync.ts:658` | Per-agent dispatch: for codex syncs skills+markers+TOML config; for claude-code syncs markers+claude-skills+MCP CLI registration; for cursor syncs the JSON config; aggregates files_written/actions/conflicts/errors/skipped into an `AgentResult`. |
| `handleClaudeCodeMcpRegistration(profile, actions, skipped)` | async function | `src/echo-home/adapter-sync.ts:751` | Invokes `registerClaudeCodeMcpServer` when `profile.mcpServerConfig.url` is set, formatting the resulting action (including exit-code/detail suffixes) into `actions`; skips if no URL. |
| `handleMarkersForAgent(kind, profile, instructionsFile, filesWritten, actions, conflicts, errors)` | function | `src/echo-home/adapter-sync.ts:772` | Validates `instructionsFile`/`echoSection` are present, calls `mergeWithMarkers`, and routes the result into conflicts/filesWritten/actions or a MISSING_REQUIRED_INPUT error. |
| `handleCodexConfig(profile, configFile, filesWritten, actions, conflicts, errors)` | function | `src/echo-home/adapter-sync.ts:823` | Validates `configFile`/`mcpServerConfig`, calls `syncCodexMcpBlock`, and routes conflict/noop/write results; catches thrown errors via `toAdapterError`. |
| `handleCursorConfig(profile, configFile, filesWritten, actions, conflicts, errors)` | function | `src/echo-home/adapter-sync.ts:871` | Validates `configFile`/`mcpServerConfig`, calls `syncCursorMcpEntry`, and routes conflict/noop/write results; catches thrown errors via `toAdapterError`. |
| `handleCodexSkills(sourceDir, targetDir, profile, filesWritten, actions, errors, skipped)` | function | `src/echo-home/adapter-sync.ts:919` | Validates `targetDir`, calls `syncCodexSkills`, records copied files as actions, treats zero-copied as an EEXIST error (with a message distinguishing "all skipped" vs "source empty"). |
| `handleClaudeSkills(commandsDir, filesWritten, actions, errors, skipped)` | function | `src/echo-home/adapter-sync.ts:967` | Validates `commandsDir`, calls `syncClaudeSkills` from `~/.echo/skills` into it, records copied files, treats zero-copied as an EEXIST error. |
| `toAdapterError(err, file, operation)` | function | `src/echo-home/adapter-sync.ts:1012` | Converts a caught exception (`AtomicWriteError`, `SkillSyncError`, `RenderError`, `TomlParseError`, `CursorJsonParseError`, or generic) into the uniform `AdapterError` shape. |

### `src/echo-home/adapters/atomic-write.ts` — crash-safe file writer with symlink and permission handling

**Purpose:** Provides `atomicWrite()`, the single low-level primitive every adapter in this directory uses to write files: writes to a unique temp file then `renameSync`s it into place, refuses to write through symlinks unless explicitly allowed, preserves/tightens file mode (locking secret-sensitive files to 0600), and normalizes all fs errors into a typed `AtomicWriteError`.

**Depends on:** node:fs, node:os, node:path, node:crypto; none internal.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AtomicWriteErrorCode` | type | `src/echo-home/adapters/atomic-write.ts:16` | Enumerated errno-style codes (EACCES/ENOSPC/.../UNKNOWN) for `AtomicWriteError`. |
| `AtomicWriteError` | class | `src/echo-home/adapters/atomic-write.ts:27` | Error subclass carrying `code` and `file`, thrown by `atomicWrite` on any fs failure. |
| `AtomicWriteOpts` | interface | `src/echo-home/adapters/atomic-write.ts:38` | Input to `atomicWrite`: filePath, content (string/Buffer), optional `secretSensitive` and `followSymlink` flags. |
| `__setAtomicWriteTestHook(hook)` | function | `src/echo-home/adapters/atomic-write.ts:53` | Test-only hook registration invoked synchronously with each temp filename right before rename; used to test unique-temp-name behavior (AC9). Production code must not call it. |
| `SECRET_SENSITIVE_ALLOWLIST` | const | `src/echo-home/adapters/atomic-write.ts:59` | Absolute paths (`~/.codex/config.toml`, `~/.cursor/mcp.json`) that are always treated as secret-sensitive (mode 0600) even without an explicit flag. |
| `isAllowlistedSecretPath(absPath)` | function | `src/echo-home/adapters/atomic-write.ts:64` | Checks membership in `SECRET_SENSITIVE_ALLOWLIST`. |
| `errnoCode(err)` | function | `src/echo-home/adapters/atomic-write.ts:68` | Narrows a caught error's `.code` to `AtomicWriteErrorCode`, defaulting to UNKNOWN. |
| `bestEffortUnlink(path)` | function | `src/echo-home/adapters/atomic-write.ts:87` | Unlinks a path, swallowing any error (used for temp-file cleanup on failure paths). |
| `atomicWrite(opts)` | function | `src/echo-home/adapters/atomic-write.ts:95` | Core routine: lstat's the target (missing/regular/symlink), refuses symlink targets unless `followSymlink`, resolves the real write path via `realpathSync` when following, computes the file mode (secret-sensitive → 0600, else preserve existing mode or default 0666), writes content to a `<path>.<pid>.<rand>.tmp` file, re-applies the mode via `fchmodSync`, invokes the test hook, then `renameSync`s the temp file over the target; converts every failure into `AtomicWriteError` and cleans up temp files on error. |

### `src/echo-home/adapters/claude-code-mcp.ts` — spawns the `claude mcp add` CLI to register ECHO as an MCP server

**Purpose:** Registers ECHO's MCP server with the Claude Code CLI by shelling out to `claude mcp add --transport http --scope user echo <url>`, with a bounded timeout, bounded stdout/stderr capture, and classification of the result (added / already-exists / cli-unavailable / timeout / error) so `adapter-sync.ts` can log an action without throwing.

**Depends on:** `../../util/subprocess.js` (resolveCommand), node:child_process, node:fs.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ClaudeCodeMcpSpawnResult` | interface | `src/echo-home/adapters/claude-code-mcp.ts:5` | Shape returned by a spawn implementation: exitCode, stdout, stderr, timedOut. |
| `ClaudeCodeMcpRegisterDeps` | interface | `src/echo-home/adapters/claude-code-mcp.ts:12` | Injectable deps for `registerClaudeCodeMcpServer`: custom `spawn` function, `timeoutMs`, `outputLimit`. |
| `ClaudeCodeMcpRegisterAction` | type | `src/echo-home/adapters/claude-code-mcp.ts:22` | Union of possible registration outcomes: mcp-add, already-exists (unverified), cli-unavailable, timeout, error. |
| `ClaudeCodeMcpRegisterResult` | interface | `src/echo-home/adapters/claude-code-mcp.ts:29` | Return shape of `registerClaudeCodeMcpServer`: action, command string, optional detail/exitCode. |
| `CLAUDE_CODE_MCP_TIMEOUT_MS` | const | `src/echo-home/adapters/claude-code-mcp.ts:36` | Default spawn timeout, 30000ms. |
| `claudeCodeMcpAddArgs(mcpServerUrl)` | function | `src/echo-home/adapters/claude-code-mcp.ts:39` | Builds the CLI arg array `['mcp','add','--transport','http','--scope','user','echo', mcpServerUrl]`. |
| `claudeCodeMcpAddCommand(mcpServerUrl)` | function | `src/echo-home/adapters/claude-code-mcp.ts:43` | Renders the full shell command string for logging/error messages. |
| `appendBounded(current, chunk, limit)` | function | `src/echo-home/adapters/claude-code-mcp.ts:47` | Appends `chunk` to `current` capped at `limit` characters, stopping accumulation once the cap is reached. |
| `realSpawn(cmd, args, opts)` | function | `src/echo-home/adapters/claude-code-mcp.ts:53` | Default spawn implementation: resolves the real command via `resolveCommand`, spawns it with piped stdio, enforces `opts.timeoutMs` via SIGTERM, accumulates bounded stdout/stderr, resolves with `ClaudeCodeMcpSpawnResult`. |
| `detail(stdout, stderr)` | function | `src/echo-home/adapters/claude-code-mcp.ts:93` | Combines stdout+stderr, trims, truncates to 200 chars for a compact error detail string (undefined if empty). |
| `alreadyExists(text)` | function | `src/echo-home/adapters/claude-code-mcp.ts:98` | Regex-tests whether CLI output indicates the MCP server "echo" already exists. |
| `registerClaudeCodeMcpServer(mcpServerUrl, deps)` | async function | `src/echo-home/adapters/claude-code-mcp.ts:102` | Runs `claude mcp add ...` via the injectable spawn, classifying ENOENT as cli-unavailable, timeout as timeout, exit 0 as mcp-add, "already exists" output as already-exists, anything else as error. |

### `src/echo-home/adapters/codex-config.ts` — byte-range TOML editor for `~/.codex/config.toml`'s `[mcp_servers.echo]` block

**Purpose:** Adds/updates/no-ops the `[mcp_servers.echo]` table in Codex's `config.toml` without a comment-losing full reparse: it locates the exact byte-range slice of that table (including any `mcp_servers.echo.*` descendant subtables) via a hand-rolled line scanner, and only uses `smol-toml` to parse/compare that isolated slice. Preserves user-owned keys not previously written by ECHO and surfaces disagreements as a structured conflict with a unified diff, or auto-force-overwrites when `force` is set.

**Depends on:** `smol-toml` (parse), `./atomic-write.js` (atomicWrite), node:fs, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CodexConfigOpts` | interface | `src/echo-home/adapters/codex-config.ts:19` | Input to `syncCodexMcpBlock`: filePath, desired serverConfig, previousServerConfig, force flag. |
| `CodexAction` | type | `src/echo-home/adapters/codex-config.ts:26` | `add \| update \| noop \| conflict`. |
| `CodexConfigConflict` | interface | `src/echo-home/adapters/codex-config.ts:28` | Conflict payload: filePath, current/expected/proposed values, unifiedDiff. |
| `RenderError` | class | `src/echo-home/adapters/codex-config.ts:37` | Thrown when a config value's type isn't in the supported TOML value vocabulary (string/finite-number/boolean/string[]/Record<string,string>); carries `field` and `typeName`. |
| `TomlParseError` | class | `src/echo-home/adapters/codex-config.ts:48` | Thrown when the isolated slice fails to parse as TOML or lacks the expected `mcp_servers.echo` shape; carries `filePath` and `firstLine`. |
| `CodexConfigResult` | type | `src/echo-home/adapters/codex-config.ts:58` | Discriminated result of `syncCodexMcpBlock`: add/update/noop, or conflict with a `CodexConfigConflict`. |
| `TARGET_HEADER` | const | `src/echo-home/adapters/codex-config.ts:64` | The literal TOML header line `[mcp_servers.echo]`. |
| `TARGET_TABLE_NAME` | const | `src/echo-home/adapters/codex-config.ts:65` | Dotted table name `mcp_servers.echo` used for header-name matching. |
| `escapeBasicString(s)` | function | `src/echo-home/adapters/codex-config.ts:67` | Escapes backslash/quote/newline/CR/tab for embedding in a TOML basic string. |
| `isPlainObject(v)` | function | `src/echo-home/adapters/codex-config.ts:76` | Type-guard for non-array, non-null object. |
| `renderValue(value, field)` | function | `src/echo-home/adapters/codex-config.ts:80` | Renders a scalar/array value to TOML literal text; throws `RenderError` for non-finite numbers or non-string array elements or unsupported types. |
| `renderInlineKeys(config)` | function | `src/echo-home/adapters/codex-config.ts:114` | Renders the sorted key/value pairs of the echo config as dotted-key TOML lines, expanding one level of nested plain-object values into `key.subKey = "..."` lines (values there must be strings). |
| `findTargetSlice(text)` | function | `src/echo-home/adapters/codex-config.ts:149` | Scans `text` line-by-line to find the `[mcp_servers.echo]` header and returns the `{start,end}` byte range extending through any `mcp_servers.echo.*` descendant headers until the next non-descendant table header or EOF; returns null if absent. |
| `parseSliceUnwrap(slice, filePath)` | function | `src/echo-home/adapters/codex-config.ts:199` | Parses the isolated slice with `smol-toml` and unwraps down to `parsed.mcp_servers.echo`, throwing `TomlParseError` at each validation failure. |
| `deepEqual(a, b)` | function | `src/echo-home/adapters/codex-config.ts:221` | Recursive structural equality for arrays/objects/primitives. |
| `renderTargetBlock(config)` | function | `src/echo-home/adapters/codex-config.ts:243` | Renders the full `[mcp_servers.echo]\n<keys>\n` block text for a config object. |
| `simpleUnifiedDiff(a, b)` | function | `src/echo-home/adapters/codex-config.ts:248` | Produces a naive line-set-based unified diff between JSON-stringified `a` and `b` for conflict reporting. |
| `hasOwn(obj, key)` | function | `src/echo-home/adapters/codex-config.ts:261` | `Object.prototype.hasOwnProperty` wrapper. |
| `previousKeysUnchanged(current, previous)` | function | `src/echo-home/adapters/codex-config.ts:265` | Checks that every key/value in `previous` still deep-equals the corresponding entry in `current` (i.e. the user hasn't touched ECHO-owned keys). |
| `mergeWithUserOwnedKeys(current, previous, desired)` | function | `src/echo-home/adapters/codex-config.ts:275` | Merges `desired` over `current`, but preserves any `current` key not present in `previous` (keys the user added that ECHO never wrote). |
| `ensureParentDir(filePath)` | function | `src/echo-home/adapters/codex-config.ts:288` | `mkdirSync(dirname(filePath), {recursive:true})`. |
| `syncCodexMcpBlock(opts)` | function | `src/echo-home/adapters/codex-config.ts:292` | Top-level entry: creates the file with the target block if absent; if the header is missing, appends it; otherwise extracts+parses the existing slice, and depending on equality / user-owned-key preservation / `force`, returns noop, writes an update via byte-range splice, or returns a conflict with diff. |

### `src/echo-home/adapters/cursor-config.ts` — JSON mutator for `~/.cursor/mcp.json`'s `mcpServers.echo` entry

**Purpose:** Adds/updates/no-ops the `mcpServers.echo` entry in Cursor's `mcp.json` via full `JSON.parse`/`JSON.stringify(obj, null, 2)` round-trip (accepting loss of exotic whitespace/comments as a stated V1 tradeoff), mirroring codex-config.ts's user-owned-key preservation and conflict/force semantics.

**Depends on:** `./atomic-write.js` (atomicWrite), node:fs, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CursorConfigOpts` | interface | `src/echo-home/adapters/cursor-config.ts:13` | Input to `syncCursorMcpEntry`: filePath, serverConfig (url + headers), previousServerConfig, force. |
| `CursorAction` | type | `src/echo-home/adapters/cursor-config.ts:20` | `add \| update \| noop \| conflict`. |
| `CursorConfigConflict` | interface | `src/echo-home/adapters/cursor-config.ts:22` | Conflict payload: filePath, current/expected/proposed values, unifiedDiff. |
| `CursorJsonParseError` | class | `src/echo-home/adapters/cursor-config.ts:31` | Thrown when the existing `mcp.json` fails to parse or has the wrong shape (non-object root, non-object `mcpServers`); carries `filePath` and `firstLine`. |
| `CursorConfigResult` | type | `src/echo-home/adapters/cursor-config.ts:41` | Discriminated result of `syncCursorMcpEntry`: add/update/noop, or conflict. |
| `isPlainObject(v)` | function | `src/echo-home/adapters/cursor-config.ts:47` | Type-guard for non-array, non-null object. |
| `deepEqual(a, b)` | function | `src/echo-home/adapters/cursor-config.ts:51` | Recursive structural equality for arrays/objects/primitives. |
| `simpleUnifiedDiff(a, b)` | function | `src/echo-home/adapters/cursor-config.ts:73` | Naive line-set-based diff between JSON-stringified `a`/`b`. |
| `hasOwn(obj, key)` | function | `src/echo-home/adapters/cursor-config.ts:86` | `hasOwnProperty` wrapper. |
| `previousKeysUnchanged(current, previous)` | function | `src/echo-home/adapters/cursor-config.ts:90` | Checks every `previous` key/value still deep-equals `current`'s. |
| `mergeWithUserOwnedKeys(current, previous, desired)` | function | `src/echo-home/adapters/cursor-config.ts:100` | Merges `desired` over `current`, preserving keys in `current` absent from `previous`. |
| `ensureParentDir(filePath)` | function | `src/echo-home/adapters/cursor-config.ts:113` | `mkdirSync(dirname(filePath), {recursive:true})`. |
| `syncCursorMcpEntry(opts)` | function | `src/echo-home/adapters/cursor-config.ts:117` | Top-level entry: creates `{mcpServers:{echo:serverConfig}}` if the file doesn't exist; else parses existing JSON (throwing `CursorJsonParseError` on malformed root/`mcpServers`), and depending on whether `echo` is absent/equal/non-object/user-owned-key-safe/`force`, writes add/update or returns noop/conflict, always re-serializing the *entire* document via `JSON.stringify(doc, null, 2)`. |

### `src/echo-home/adapters/markers.ts` — BEGIN/END-marker block merger for instructions files (CLAUDE.md, AGENTS.md)

**Purpose:** Manages ECHO's delimited section (`<!-- BEGIN ECHO -->` ... `<!-- END ECHO -->`) inside arbitrary user-owned markdown instructions files: appends the section if absent, replaces it if unchanged-since-last-ECHO-write or `force`, and reports a conflict (with diff) if the user has hand-edited the section since ECHO last wrote it. Detects symlinked targets and malformed (duplicated/out-of-order) marker pairs as separate conflict kinds.

**Depends on:** `./atomic-write.js` (atomicWrite), node:fs, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `BEGIN_MARKER` | const | `src/echo-home/adapters/markers.ts:5` | Literal `<!-- BEGIN ECHO -->`. |
| `END_MARKER` | const | `src/echo-home/adapters/markers.ts:6` | Literal `<!-- END ECHO -->`. |
| `MarkerOpts` | interface | `src/echo-home/adapters/markers.ts:8` | Input to `mergeWithMarkers`: filePath, echoSection, previousEchoSection, force. |
| `MarkerAction` | type | `src/echo-home/adapters/markers.ts:15` | `append \| replace \| noop \| conflict`. |
| `MarkerConflictMarker` | interface | `src/echo-home/adapters/markers.ts:17` | Conflict when the current inside-marker text differs from both expected and desired, with unified diff. |
| `MarkerConflictTargetSymlink` | interface | `src/echo-home/adapters/markers.ts:26` | Conflict when the target file itself is a symlink. |
| `MarkerConflictMalformed` | interface | `src/echo-home/adapters/markers.ts:32` | Conflict when marker counts/ordering are malformed (not exactly one well-ordered BEGIN/END pair, and not zero of both). |
| `MarkerConflict` | type | `src/echo-home/adapters/markers.ts:37` | Union of the three conflict shapes above. |
| `MarkerResult` | type | `src/echo-home/adapters/markers.ts:42` | Discriminated result of `mergeWithMarkers`: append/replace/noop with filePath, or conflict with a `MarkerConflict`. |
| `countOccurrences(haystack, needle)` | function | `src/echo-home/adapters/markers.ts:48` | Counts non-overlapping occurrences of `needle` in `haystack`. |
| `simpleUnifiedDiff(label, a, b)` | function | `src/echo-home/adapters/markers.ts:59` | Naive line-set-based diff between two text blocks, labeled with `label` in the header lines. |
| `ensureParentDir(filePath)` | function | `src/echo-home/adapters/markers.ts:70` | `mkdirSync(dirname(filePath), {recursive:true})`. |
| `mergeWithMarkers(opts)` | function | `src/echo-home/adapters/markers.ts:74` | Core routine: symlink-guards the target; reads existing content (or treats ENOENT as empty); counts BEGIN/END markers to classify as no-markers / well-formed-pair / malformed, returning a malformed-marker conflict for the latter; if no markers, appends a new marker block (creating the file if needed); if well-formed, extracts the current inside-text (stripping one leading/trailing newline) and returns noop if it already equals `echoSection`, replaces via splice if it equals `previousEchoSection` or `force` is set, else returns a marker conflict with diff. |

### `src/echo-home/adapters/role-sync.ts` — one-shot copier for ECHO's default role files into `~/.echo/roles`

**Purpose:** Copies each name in a fixed `defaults` list from a packaged roles source directory into the user's `~/.echo/roles` target directory exactly once per name, detecting and reporting (without overwriting) any target the user has since hand-modified or turned into a symlink, and reporting per-role source-missing/error states rather than throwing.

**Depends on:** `./atomic-write.js` (atomicWrite), node:fs, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RoleSyncOpts` | interface | `src/echo-home/adapters/role-sync.ts:5` | Input to `syncDefaultRoles`: sourceDir, targetDir, defaults (role filenames). |
| `RolePerFileAction` | type | `src/echo-home/adapters/role-sync.ts:11` | `copied \| noop \| user-modified \| source-missing \| error`. |
| `RolePerFileConflict` | interface | `src/echo-home/adapters/role-sync.ts:13` | Conflict payload for a user-modified role: filePath, sourceBytes, userBytes, optional targetIsSymlink. |
| `AdapterErrorShape` | interface | `src/echo-home/adapters/role-sync.ts:20` | Local structural copy of the adapter error shape (code/file/operation/message) used for role errors. |
| `RolePerFileResult` | type | `src/echo-home/adapters/role-sync.ts:27` | Discriminated per-role result matching each `RolePerFileAction`. |
| `RoleSyncResult` | interface | `src/echo-home/adapters/role-sync.ts:34` | Aggregate return of `syncDefaultRoles`: per-role results plus a flat `rolesErrors` list. |
| `errnoCode(err)` | function | `src/echo-home/adapters/role-sync.ts:39` | Extracts a string `.code` off a caught error, defaulting to UNKNOWN. |
| `syncDefaultRoles(opts)` | function | `src/echo-home/adapters/role-sync.ts:47` | For each default role: reads source bytes (source-missing on ENOENT), lstat's the target (symlink → user-modified conflict), reads existing target bytes and compares to source (equal → noop, different → user-modified conflict with both byte buffers), else atomically writes the source bytes and marks `copied`; a failed `mkdirSync` on targetDir short-circuits every role to the same mkdir error. |

### `src/echo-home/adapters/skill-sync.ts` — three-hop skill-file distribution: repo assets → `~/.echo/skills` → per-vendor commands/skills dirs

**Purpose:** Implements the pipeline that copies ECHO's packaged `.md` skill files first into `~/.echo/skills` (profile-filtered by an `audience: customer|dogfood` frontmatter field), then fans out into Claude Code's `~/.claude/commands` (flat `.md` copy) and Codex's native `<codexHome>/skills/<name>/SKILL.md` layout (with a `name:` frontmatter upsert), enforcing that certain codex-required skills exist and pass the profile filter before any writes happen.

**Depends on:** `./atomic-write.js` (atomicWrite, AtomicWriteError), `../paths.js` (InstallProfile), node:fs, node:path.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PopulateEchoSkillsResult` | type | `src/echo-home/adapters/skill-sync.ts:6` | Discriminated result of `populateEchoSkills`: ok with copied/skipped/targetDir, or failure with sourceDir/targetDir/error message. |
| `SyncClaudeSkillsResult` | interface | `src/echo-home/adapters/skill-sync.ts:10` | Return shape of `syncClaudeSkills`: copied, skipped, targetDir. |
| `SyncCodexSkillsResult` | interface | `src/echo-home/adapters/skill-sync.ts:16` | Return shape of `syncCodexSkills`: copied, skipped, targetDir. |
| `SkillSyncOpts` | interface | `src/echo-home/adapters/skill-sync.ts:22` | Shared input shape: sourceDir, targetDir, optional profile. |
| `SkillSyncError` | class | `src/echo-home/adapters/skill-sync.ts:28` | Error subclass carrying `code` (ENOENT/EISDIR/UNKNOWN), `file`, `operation` (read/stat); thrown when a codex-required skill source is missing/unreadable/excluded. |
| `CODEX_REQUIRED_SKILLS` | const | `src/echo-home/adapters/skill-sync.ts:40` | List of skill filenames that must exist and pass the profile filter before `syncCodexSkills` writes anything; currently `['using-echo-mcp.md']`. |
| `audienceFor(content)` | function | `src/echo-home/adapters/skill-sync.ts:42` | Parses a leading YAML-ish frontmatter block for an `audience:` value (`customer`/`dogfood`), defaulting to `customer` if absent/unparseable. |
| `includedForProfile(content, profile)` | function | `src/echo-home/adapters/skill-sync.ts:54` | True if `profile==='dogfood'` (everything included) or the skill's own audience is `customer`. |
| `listMdFiles(dir)` | function | `src/echo-home/adapters/skill-sync.ts:58` | Lists and sorts `.md`-suffixed entries of a directory. |
| `skillSyncErrorCode(err)` | function | `src/echo-home/adapters/skill-sync.ts:64` | Narrows a caught error's `.code` to ENOENT/EISDIR/UNKNOWN. |
| `assertRequiredCodexSkill(sourceDir, fileName, profile)` | function | `src/echo-home/adapters/skill-sync.ts:72` | Lstat's + reads the required skill source and checks it passes `includedForProfile`, throwing `SkillSyncError` on any failure — used as a pre-flight gate before `syncCodexSkills` writes anything. |
| `upsertCodexNameFrontmatter(skillName, content)` | function | `src/echo-home/adapters/skill-sync.ts:119` | Inserts or overwrites a `name: <skillName>` line inside the file's YAML frontmatter block (or synthesizes a new frontmatter block if none exists), needed because Codex's SKILL.md format requires an explicit `name` field. |
| `populateEchoSkills(opts)` | function | `src/echo-home/adapters/skill-sync.ts:146` | First hop: lists `.md` files in `sourceDir`, ensures `targetDir` exists, and for each regular (non-symlink) file passing the profile filter, atomically writes it into `targetDir`, treating an `EEXIST` from atomicWrite (symlinked target) as a skip; returns a discriminated ok/failure result and never throws. |
| `syncClaudeSkills(opts)` | function | `src/echo-home/adapters/skill-sync.ts:228` | Second hop for Claude Code: copies every regular `.md` file from `~/.echo/skills` into the commands dir verbatim, skipping symlinked targets; throws on hard failures (propagated to caller's try/catch). |
| `syncCodexSkills(opts)` | function | `src/echo-home/adapters/skill-sync.ts:272` | Second hop for Codex: pre-validates `CODEX_REQUIRED_SKILLS` via `assertRequiredCodexSkill` (throws before any writes if invalid), then for each profile-included regular `.md` source file writes `<targetDir>/<skillName>/SKILL.md` with the `name:` frontmatter upserted, skipping symlinked targets. |

### `src/echo-home/adapters/workflow-sync.ts` — syncs default workflow files into an agent's install dir with conflict detection

**Purpose:** Copies ECHO's default workflow files from a source dir into a per-agent target dir, detecting when a target has been user-modified, is a symlink, or the source is missing, so the caller can surface conflicts rather than silently overwrite user edits.

**Depends on:** `src/echo-home/adapters/atomic-write.ts`, `src/echo-home/adapters/role-sync.ts` (type only), `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `WorkflowSyncOpts` | interface | `src/echo-home/adapters/workflow-sync.ts:6` | Input shape: sourceDir, targetDir, and list of default workflow filenames to sync. |
| `WorkflowPerFileAction` | type | `src/echo-home/adapters/workflow-sync.ts:12` | Union of possible per-file outcomes: copied, noop, user-modified, source-missing, error. |
| `WorkflowPerFileConflict` | interface | `src/echo-home/adapters/workflow-sync.ts:19` | Conflict detail carrying source/user byte buffers and whether target is a symlink. |
| `WorkflowPerFileResult` | type | `src/echo-home/adapters/workflow-sync.ts:26` | Discriminated union tagging each workflow's sync result with its action and any conflict/error payload. |
| `WorkflowSyncResult` | interface | `src/echo-home/adapters/workflow-sync.ts:33` | Aggregate result: list of per-file results plus collected AdapterErrorShape errors. |
| `errnoCode(err)` | function | `src/echo-home/adapters/workflow-sync.ts:38` | Extracts the Node.js errno `code` string from a caught error, or 'UNKNOWN'. |
| `syncDefaultWorkflows(opts)` | function | `src/echo-home/adapters/workflow-sync.ts:46` | Ensures targetDir exists, then for each default workflow reads the source, compares against any existing target (symlink → conflict, byte-equal → noop, differing → user-modified conflict, absent → atomic copy), collecting per-file results and errors. |

### `src/echo-home/index.ts` — barrel re-export of role-loading API

**Purpose:** Re-exports the public role types/functions from `roles.ts` as the package entry surface for role loading.

**Depends on:** `src/echo-home/roles.ts`

**Symbols:**

(No new symbols; pure re-export of `CAPABILITIES`, `DEFAULT_ROLE_FILENAMES`, `RoleValidationError`, `loadRoleFromFile`, `loadRolesFromDir`, `Capability`, `Role`, `RoleLoadOptions`, `RoleSandbox` from `./roles.js`.)

### `src/echo-home/paths.ts` — ECHO_HOME path resolution, onboarding/projects state schemas, and per-project config I/O

**Purpose:** Defines the `~/.echo` (or `$ECHO_HOME`) directory layout, JSON-schema-validated onboarding/projects state files, and per-repo `.echo/project.json` config load/write with a file-lock-protected `projects.json` upsert used to track which repos ECHO is wired into.

**Depends on:** `src/guards.ts` (`isNonEmptyString`), `src/echo-home/adapters/atomic-write.ts`, `ajv`, `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EchoHomePaths` | interface | `src/echo-home/paths.ts:12` | Frozen shape of all resolved ECHO_HOME subpaths (skills, roles, workflows, adapters, state, onboarding/projects/capture-sources state files). |
| `resolveRoot(homeOverride?)` | function | `src/echo-home/paths.ts:24` | Resolves the ECHO_HOME root from an explicit override, `$ECHO_HOME` env var, or default `~/.echo`; throws on empty override. |
| `resolveEchoHomePaths(homeOverride?)` | function | `src/echo-home/paths.ts:34` | Builds and freezes the full `EchoHomePaths` object from a resolved root. |
| `ECHO_HOME_PATHS` | const (let) | `src/echo-home/paths.ts:49` | Module-level current resolved paths, initialized from `$ECHO_HOME`/default; mutated by `setEchoHomeRoot`. |
| `setEchoHomeRoot(homeOverride)` | function | `src/echo-home/paths.ts:51` | Re-resolves and reassigns `ECHO_HOME_PATHS`, also updating `process.env.ECHO_HOME`. |
| `InstallProfile` | type | `src/echo-home/paths.ts:57` | `'customer' \| 'dogfood'` install profile discriminator. |
| `OnboardingState` | interface | `src/echo-home/paths.ts:59` | Schema for `state/onboarding.json`: schema_version, timestamps, completed flag, optional profile, per-agent onboarding records. |
| `OnboardedAgentProfile` | interface | `src/echo-home/paths.ts:68` | Per-agent record: id, detected/wired/probed timestamps, capabilities, wire_error. |
| `ProjectsState` | interface | `src/echo-home/paths.ts:77` | Schema for `state/projects.json`: schema_version, last_refreshed_at, default_project, list of ProjectRecord. |
| `ProjectRecord` | interface | `src/echo-home/paths.ts:84` | Per-repo record: repo_root, last_seen, source_breakdown, and optional coord_ref/reviews_root/reviewers/spec_dir/project_config_path. |
| `ProjectConfig` | interface | `src/echo-home/paths.ts:95` | Per-repo `.echo/project.json` shape: schema_version, coord_ref, reviews_root, reviewers, spec_dir. |
| `LoadProjectConfigResult` | interface | `src/echo-home/paths.ts:103` | Wraps a loaded/defaulted ProjectConfig with its file path and whether the file existed. |
| `DEFAULT_PROJECT_CONFIG` | const | `src/echo-home/paths.ts:109` | Frozen default project config: coord_ref 'main', reviews_root 'backlog/reviews', reviewers ['codex','cursor'], spec_dir 'backlog'. |
| `onboardingStateSchema` | const | `src/echo-home/paths.ts:117` | Ajv JSON schema enforcing OnboardingState shape including per-agent required fields. |
| `projectsStateSchema` | const | `src/echo-home/paths.ts:146` | Ajv JSON schema enforcing ProjectsState shape including per-project source_breakdown numeric map. |
| `projectConfigSchema` | const | `src/echo-home/paths.ts:178` | Ajv JSON schema enforcing ProjectConfig shape, requiring non-empty reviewer names matching `^[a-z][a-z0-9-]*$`. |
| `ajv` | const | `src/echo-home/paths.ts:196` | Shared Ajv instance (`allErrors: true, strict: false`) used to compile the three validators. |
| `validateOnboardingState` | const | `src/echo-home/paths.ts:198` | Compiled Ajv validator function for OnboardingState. |
| `validateProjectsState` | const | `src/echo-home/paths.ts:201` | Compiled Ajv validator function for ProjectsState. |
| `validateProjectConfig` | const | `src/echo-home/paths.ts:204` | Compiled Ajv validator function for ProjectConfig. |
| `projectConfigPath(repoRoot)` | function | `src/echo-home/paths.ts:207` | Returns `<repoRoot>/.echo/project.json` absolute path. |
| `assertConfigRelativePath(field, value)` | function | `src/echo-home/paths.ts:211` | Throws if a config path field is empty, absolute, escapes the project root (`..`), or uses backslashes. |
| `assertCoordRef(value)` | function | `src/echo-home/paths.ts:232` | Throws if coord_ref is empty, contains whitespace, or starts with `-` (git ref safety). |
| `normalizeProjectConfig(raw, source)` | function | `src/echo-home/paths.ts:238` | Validates raw config against schema, asserts field safety, and normalizes path separators to forward slashes. |
| `loadProjectConfig(repoRoot)` | function | `src/echo-home/paths.ts:256` | Reads `.echo/project.json` if present (normalizing it) else returns a copy of `DEFAULT_PROJECT_CONFIG`. |
| `writeProjectConfig(repoRoot, config?)` | function | `src/echo-home/paths.ts:274` | Normalizes and atomically writes `.echo/project.json`, creating parent dirs. |
| `emptyProjectsState(now)` | function | `src/echo-home/paths.ts:289` | Builds a fresh empty ProjectsState stamped with the given timestamp. |
| `readProjectsState(homeOverride?)` | function | `src/echo-home/paths.ts:298` | Reads and schema-validates `state/projects.json`, or returns an empty state if the file is absent. |
| `sleepMs(ms)` | function | `src/echo-home/paths.ts:310` | Blocking sleep via `Atomics.wait` on a SharedArrayBuffer, used for lock retry backoff. |
| `acquireProjectsLock(lockDir, timeoutMs)` | function | `src/echo-home/paths.ts:314` | Spin-acquires an exclusive lock by `mkdirSync` on `lockDir` (retrying on EEXIST until timeout), returning a release closure that `rmSync`s it. |
| `UpsertProjectRegistrationOptions` | interface | `src/echo-home/paths.ts:335` | Input options for `upsertProjectRegistration`: repoRoot, config, optional homeOverride/now/lockTimeoutMs. |
| `upsertProjectRegistration(opts)` | function | `src/echo-home/paths.ts:343` | Under the projects.json lock, reads current state, inserts/updates the repo's ProjectRecord (preserving existing source_breakdown), sets default_project if unset, sorts projects by repo_root, validates, and atomically writes the file. |

### `src/echo-home/roles.ts` — TOML role-definition loader and validator

**Purpose:** Parses and strictly validates `<role>.toml` files (builder/reviewer/strategist) that declare a role's description, sandbox mode, required skills/mcp servers/capabilities, and output contract, ensuring referenced skill files actually exist and names follow kebab-case grammars.

**Depends on:** `smol-toml`, `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_ROLE_FILENAMES` | const | `src/echo-home/roles.ts:12` | Required role filenames: builder.toml, reviewer.toml, strategist.toml. |
| `CAPABILITIES` | const | `src/echo-home/roles.ts:18` | Fixed vocabulary of allowed capability strings (fs.read/write, git.read/write, network, mcp.echo.read/write). |
| `Capability` | type | `src/echo-home/roles.ts:28` | Union type derived from `CAPABILITIES`. |
| `RoleSandbox` | type | `src/echo-home/roles.ts:29` | `'read-only' \| 'workspace-write'`. |
| `Role` | interface | `src/echo-home/roles.ts:31` | Frozen parsed role shape: name, description, sandbox, skills, requires{mcpServers,capabilities}, output{format,requiredFields}, sourcePath. |
| `RoleValidationError` | class | `src/echo-home/roles.ts:47` | Error subclass carrying filePath and optional field, formatting a `<path>: <field>: <message>` string. |
| `RoleLoadOptions` | interface | `src/echo-home/roles.ts:58` | Optional skillsRoot override and assertDefaults flag for dir loads. |
| `isRecord(value)` | function | `src/echo-home/roles.ts:67` | Type guard for plain non-array objects. |
| `fail(filePath, field, message)` | function | `src/echo-home/roles.ts:71` | Throws a `RoleValidationError`; typed to return `never`. |
| `hasOwn(record, key)` | function | `src/echo-home/roles.ts:75` | `Object.prototype.hasOwnProperty` check. |
| `assertAllowedKeys(table, allowed, filePath, fieldPrefix)` | function | `src/echo-home/roles.ts:79` | Fails if `table` has any key not in `allowed`. |
| `requiredTable(parent, key, filePath, tableLabel)` | function | `src/echo-home/roles.ts:92` | Extracts and requires a nested TOML table, failing if missing/not an object. |
| `requiredString(table, key, filePath, field)` | function | `src/echo-home/roles.ts:105` | Extracts and requires a non-empty string field. |
| `requiredStringArray(table, key, filePath, field)` | function | `src/echo-home/roles.ts:118` | Extracts and requires a non-empty array of non-empty strings. |
| `validateFilename(filePath)` | function | `src/echo-home/roles.ts:139` | Validates the filename matches `^[a-z][a-z0-9-]*\.toml$` and returns the role name (filename minus extension). |
| `discoverSkillsRoot(sourcePath)` | function | `src/echo-home/roles.ts:147` | Walks up parent directories from the role file looking for a sibling `package.json` + `skills/` dir pair, returning the discovered skills root. |
| `resolveSkillsRoot(sourcePath, opts?)` | function | `src/echo-home/roles.ts:165` | Uses `opts.skillsRoot` if given, else discovers it via `discoverSkillsRoot`. |
| `isInsideRoot(path, root)` | function | `src/echo-home/roles.ts:170` | Checks a resolved path stays within `root` (no `..` escape, not absolute-relative). |
| `validateSkills(skills, skillsRoot, filePath)` | function | `src/echo-home/roles.ts:175` | Validates each skill name's grammar, that its resolved `<skill>.md` path stays inside skillsRoot, and that the file exists. |
| `validateSandbox(value, filePath)` | function | `src/echo-home/roles.ts:201` | Validates sandbox value is 'read-only' or 'workspace-write'. |
| `validateMcpServers(servers, filePath)` | function | `src/echo-home/roles.ts:206` | Validates each server name matches `^[a-z][a-z0-9_-]*$`. |
| `validateCapabilities(capabilities, filePath)` | function | `src/echo-home/roles.ts:219` | Validates each capability is in the `CAPABILITIES` vocabulary. |
| `parseToml(filePath)` | function | `src/echo-home/roles.ts:236` | Reads and parses the TOML file via `smol-toml`, requiring an object root. |
| `freezeRole(role)` | function | `src/echo-home/roles.ts:247` | Deep-freezes a Role's nested arrays/objects before returning it. |
| `loadRoleFromFile(filePath, opts?)` | function | `src/echo-home/roles.ts:258` | Full pipeline: validates filename, parses TOML, enforces allowed top-level/`[role]`/`[role.requires]`/`[role.output]` keys (name must come from filename not body), validates description/sandbox/skills/mcp_servers/capabilities/output, and returns a frozen `Role`. |
| `loadRolesFromDir(dirPath, opts?)` | function | `src/echo-home/roles.ts:323` | Lists `*.toml` files in a directory (excluding dotfiles), optionally asserts all `DEFAULT_ROLE_FILENAMES` are present, loads each via `loadRoleFromFile`, rejects duplicate (case-insensitive) role names, and returns roles sorted by name. |

### `src/echo-home/scaffold.ts` — idempotent ECHO_HOME directory/state-file bootstrapper

**Purpose:** Creates the `~/.echo` directory tree (skills/roles/workflows/adapters/state) and seeds the initial `onboarding.json`/`projects.json` state files only if absent, reporting which dirs/files it actually created.

**Depends on:** `src/echo-home/paths.ts` (`ECHO_HOME_PATHS`, `OnboardingState`, `ProjectsState`), `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EnsureEchoHomeResult` | interface | `src/echo-home/scaffold.ts:4` | Result shape: root path plus lists of newly created dirs and files. |
| `ensureDir(path, createdDirs)` | function | `src/echo-home/scaffold.ts:10` | `mkdirSync(recursive)`s a dir and records it in `createdDirs` if it didn't already exist. |
| `isErrnoException(err)` | function | `src/echo-home/scaffold.ts:16` | Type guard for Node errno-coded errors. |
| `writeAbsentJson(path, value, createdFiles)` | function | `src/echo-home/scaffold.ts:20` | Writes JSON to `path` only if absent (using `wx` flag), swallowing EEXIST; records the write. |
| `initialOnboardingState(now)` | function | `src/echo-home/scaffold.ts:30` | Builds the seed `OnboardingState` (not completed, empty agents). |
| `initialProjectsState(now)` | function | `src/echo-home/scaffold.ts:40` | Builds the seed `ProjectsState` (no default project, empty projects). |
| `ensureEchoHome()` | function | `src/echo-home/scaffold.ts:49` | Ensures all ECHO_HOME subdirectories exist and seeds onboarding/projects state files if absent, returning the created-dirs/files report. |

### `src/echo-home/wizard/adapter-cache.ts` — per-agent adapter write cache (JSON) with schema validation

**Purpose:** Persists a small cache record per agent (`<kind>.json` under `ECHO_HOME_PATHS.adapters`) recording the last-rendered ECHO section and MCP server config written to that agent's config, so the wizard can detect drift/skip redundant writes on re-runs.

**Depends on:** `src/echo-home/paths.ts` (`ECHO_HOME_PATHS`), `src/echo-home/adapters/atomic-write.ts`, `src/echo-home/wizard/detect-agents.ts` (`AgentKind` type), `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AdapterCacheRecord` | interface | `src/echo-home/wizard/adapter-cache.ts:7` | Cache shape: schema_version, agent, last_written_at, echoSection (string or null), mcpServerConfig (object or null). |
| `AdapterCacheError` | class | `src/echo-home/wizard/adapter-cache.ts:15` | Error subclass carrying filePath and optional field for cache validation failures. |
| `cachePath(kind)` | function | `src/echo-home/wizard/adapter-cache.ts:26` | Returns `<adapters dir>/<kind>.json`. |
| `fail(filePath, field, message)` | function | `src/echo-home/wizard/adapter-cache.ts:30` | Throws an `AdapterCacheError` with formatted message. |
| `isObject(value)` | function | `src/echo-home/wizard/adapter-cache.ts:34` | Type guard for plain non-array objects. |
| `validateRecord(value, filePath, expectedAgent)` | function | `src/echo-home/wizard/adapter-cache.ts:38` | Validates schema_version===1, agent matches expected, last_written_at is a string, echoSection/mcpServerConfig types, returning a normalized `AdapterCacheRecord`. |
| `readAdapterCache(kind)` | function | `src/echo-home/wizard/adapter-cache.ts:72` | Reads and validates `<kind>.json`, returning null if absent. |
| `writeAdapterCache(record)` | function | `src/echo-home/wizard/adapter-cache.ts:87` | Ensures adapters dir exists and atomically writes the cache record (marked secret-sensitive). |
| `deleteAdapterCache(kind)` | function | `src/echo-home/wizard/adapter-cache.ts:96` | Deletes the cache file for an agent, ignoring ENOENT. |

### `src/echo-home/wizard/atom-store-readonly.ts` — read-only SQLite Storage adapter for wizard-time atom queries

**Purpose:** Opens the existing production atom-store SQLite DB in strict read-only mode (`query_only` pragma) and exposes only the `query` method of the `Storage` interface, throwing on any mutation or non-read method, so the onboarding wizard can inspect capture history without risking writes to the live daemon's database.

**Depends on:** `src/storage/interface.ts` (`Storage`, `CaptureEvent`, `QueryFilter`, `EventId`, `CoordAtomIterationRecord`, `METADATA_MATCH_KEY_WHITELIST`), `better-sqlite3`, `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EventRow` | interface | `src/echo-home/wizard/atom-store-readonly.ts:12` | Raw SQLite row shape: id, source, timestamp, content, metadata (JSON string), embedding (Buffer). |
| `rowToEvent(row)` | function | `src/echo-home/wizard/atom-store-readonly.ts:21` | Converts a raw `EventRow` into a `CaptureEvent`, parsing metadata JSON and decoding the embedding Buffer into a Float32Array-derived number array. |
| `wizardScopeError()` | function | `src/echo-home/wizard/atom-store-readonly.ts:40` | Builds a standard "read-only storage adapter — wizard scope" Error. |
| `ReadOnlyAtomStore` | class | `src/echo-home/wizard/atom-store-readonly.ts:44` | Implements `Storage` with only `query` functional; all mutation/other read methods throw `wizardScopeError()`. |
| `ReadOnlyAtomStore.append()` | method | `src/echo-home/wizard/atom-store-readonly.ts:49` | Throws — appends are not permitted in wizard scope. |
| `ReadOnlyAtomStore.query(filter?)` | method | `src/echo-home/wizard/atom-store-readonly.ts:53` | Builds and executes a parameterized SELECT over `events` supporting source/source_prefix, since/until, before-cursor pagination, whitelisted metadata_match, exclude_metadata_surface, limit and order, caching prepared statements per SQL string. |
| `ReadOnlyAtomStore.count()` | method | `src/echo-home/wizard/atom-store-readonly.ts:133` | Throws — not supported in wizard scope. |
| `ReadOnlyAtomStore.getByIds()` | method | `src/echo-home/wizard/atom-store-readonly.ts:137` | Throws — not supported in wizard scope. |
| `ReadOnlyAtomStore.iterateCoordAtomsByAppendOrder()` | method | `src/echo-home/wizard/atom-store-readonly.ts:141` | Throws — not supported in wizard scope. |
| `ReadOnlyAtomStore.getCurrentCoordSequence()` | method | `src/echo-home/wizard/atom-store-readonly.ts:145` | Throws — not supported in wizard scope. |
| `ReadOnlyAtomStore.close()` | method | `src/echo-home/wizard/atom-store-readonly.ts:149` | Closes the underlying SQLite connection if still open. |
| `ReadOnlyWizardStorage` | type | `src/echo-home/wizard/atom-store-readonly.ts:154` | `Storage & { close(): void }` — storage handle with an explicit close method. |
| `openExistingAtomStoreReadOnly(dbPath)` | function | `src/echo-home/wizard/atom-store-readonly.ts:156` | Returns null if `dbPath` doesn't exist; otherwise opens it read-only with `query_only=ON` and wraps it in a `ReadOnlyAtomStore`. |

### `src/echo-home/wizard/detect-agents.ts` — probes local machine for installed/active coding-agent CLIs

**Purpose:** Detects which of codex/claude-code/cursor are present on the machine by checking known config file paths and by querying recent atom-store activity per agent's source prefix, then ranks each by confidence (high/medium/none) for the onboarding wizard's agent-selection step.

**Depends on:** `src/mcp/util/source-app.ts` (`buildSourceAppMap`, `SourceApp`), `src/daemon/lifecycle.ts` (`resolveDbPath`), `src/storage/interface.ts` (`Storage`), `src/echo-home/wizard/atom-store-readonly.ts`, `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AgentKind` | type | `src/echo-home/wizard/detect-agents.ts:12` | `'codex' \| 'claude-code' \| 'cursor'`. |
| `AgentConfidence` | type | `src/echo-home/wizard/detect-agents.ts:13` | `'high' \| 'medium' \| 'none'`. |
| `DetectedAgentSignals` | interface | `src/echo-home/wizard/detect-agents.ts:15` | Raw signals used to compute confidence: configFile presence/readability, atomActivity count/lastSeen, atomCountSaturated flag. |
| `DetectedAgent` | interface | `src/echo-home/wizard/detect-agents.ts:21` | Output per agent: kind, confidence, signals. |
| `DetectAgentsDeps` | interface | `src/echo-home/wizard/detect-agents.ts:27` | Injectable deps: homedir override, atomStore override, now override (for testing). |
| `AGENT_KINDS` | const | `src/echo-home/wizard/detect-agents.ts:33` | Ordered list of the three agent kinds. |
| `CONFIG_PATHS` | const | `src/echo-home/wizard/detect-agents.ts:35` | Maps each AgentKind to its expected config file relative path (`.codex/config.toml`, `.claude/CLAUDE.md`, `.cursor/mcp.json`). |
| `SOURCE_APP_BY_AGENT` | const | `src/echo-home/wizard/detect-agents.ts:41` | Maps each AgentKind to its `SourceApp` atom-source key. |
| `ACTIVITY_LIMIT` | const | `src/echo-home/wizard/detect-agents.ts:47` | Max atom rows (50,000) fetched per agent activity query. |
| `WINDOW_DAYS` | const | `src/echo-home/wizard/detect-agents.ts:48` | Lookback window (30 days) for activity detection. |
| `isoDaysBefore(now, days)` | function | `src/echo-home/wizard/detect-agents.ts:50` | Returns an ISO timestamp `days` before `now`. |
| `probeConfigFile(home, kind)` | function | `src/echo-home/wizard/detect-agents.ts:54` | Stats the agent's config path under `home`, returning exists/readableMode (owner-read bit) or a not-found signal. |
| `confidenceFor(signals)` | function | `src/echo-home/wizard/detect-agents.ts:64` | Computes 'high' (config+activity), 'medium' (either alone), or 'none' from signals. |
| `confidenceRank(confidence)` | function | `src/echo-home/wizard/detect-agents.ts:73` | Maps confidence to a sort rank (high=0, medium=1, none=2). |
| `maybeClose(store, shouldClose)` | function | `src/echo-home/wizard/detect-agents.ts:79` | Closes the store if it owns it and exposes a `close` method. |
| `resolveAtomStore(atomStore)` | function | `src/echo-home/wizard/detect-agents.ts:85` | Uses an injected store if provided, else opens the real read-only atom store at the resolved DB path. |
| `detectAgents(deps?)` | function | `src/echo-home/wizard/detect-agents.ts:93` | For each AgentKind, probes its config file and (if a store is available) queries recent atom activity by source_prefix within the 30-day window (capped at 50,000 rows), computes confidence, and returns all agents sorted by confidence then kind name. |

### `src/echo-home/wizard/detect-projects.ts` — infers candidate repos to wire ECHO into from recent atom activity

**Purpose:** Scans recent capture events for `metadata.repo_root`, collapses paths up to their nearest `.git` root, filters out ephemeral reviewer worktrees and sibling agent worktrees, and aggregates per-repo atom counts/source breakdowns/last-seen timestamps to rank candidate projects for the onboarding wizard's project-selection step.

**Depends on:** `src/mcp/util/source-app.ts` (`buildSourceAppMap`, `SourceApp`), `src/daemon/lifecycle.ts` (`resolveDbPath`), `src/storage/interface.ts` (`CaptureEvent`, `Storage`), `src/echo-home/wizard/atom-store-readonly.ts`, `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProjectSource` | type | `src/echo-home/wizard/detect-projects.ts:12` | `SourceApp \| 'other'`. |
| `DetectedProject` | interface | `src/echo-home/wizard/detect-projects.ts:14` | Output per project: repoRoot, atomCount, lastSeen, sourceBreakdown (partial map). |
| `DetectProjectsDeps` | interface | `src/echo-home/wizard/detect-projects.ts:21` | Injectable deps: atomStore, now, windowDays, limit. |
| `SCAN_LIMIT` | const | `src/echo-home/wizard/detect-projects.ts:28` | Max rows (50,000) scanned from the store. |
| `DEFAULT_WINDOW_DAYS` | const | `src/echo-home/wizard/detect-projects.ts:29` | Default lookback window (7 days). |
| `DEFAULT_RETURN_LIMIT` | const | `src/echo-home/wizard/detect-projects.ts:30` | Default max number of projects returned (25). |
| `EPHEMERAL_REVIEWER_WORKTREE` | const (regex) | `src/echo-home/wizard/detect-projects.ts:31` | Matches ephemeral review-queue worktree dir names like `echo-<slug>-<uuid>`. |
| `TMP_RESOLVED` / `TMP_REAL` | const | `src/echo-home/wizard/detect-projects.ts:32-33` | Resolved and realpath'd OS tmpdir, used to detect ephemeral worktrees under tmp. |
| `isoDaysBefore(now, days)` | function | `src/echo-home/wizard/detect-projects.ts:35` | Returns an ISO timestamp `days` before `now`. |
| `maybeClose(store, shouldClose)` | function | `src/echo-home/wizard/detect-projects.ts:39` | Closes the store if owned and closeable. |
| `resolveAtomStore(atomStore)` | function | `src/echo-home/wizard/detect-projects.ts:45` | Uses an injected store or opens the real read-only atom store. |
| `repoRootOf(event)` | function | `src/echo-home/wizard/detect-projects.ts:53` | Extracts and resolves `metadata.repo_root` from a capture event, or null. |
| `isEphemeralReviewerWorktree(repoRoot)` | function | `src/echo-home/wizard/detect-projects.ts:59` | True if repoRoot is under the OS tmpdir and its basename matches the ephemeral worktree regex. |
| `hasGitDirectory(repoRoot)` | function | `src/echo-home/wizard/detect-projects.ts:65` | Checks whether `<repoRoot>/.git` exists as a directory. |
| `collapseToGitRoot(repoRoot)` | function | `src/echo-home/wizard/detect-projects.ts:73` | Walks up to 10 parent directories to find the nearest ancestor containing `.git`, defaulting to the original path if none found. |
| `isSiblingWorktree(repoRoot)` | function | `src/echo-home/wizard/detect-projects.ts:84` | Detects ECHO's `--<slug>` worktree naming convention and checks whether the sibling primary-repo directory exists, to exclude worktrees from project detection. |
| `classifySource(source, sourceMap)` | function | `src/echo-home/wizard/detect-projects.ts:96` | Classifies an atom's `source` string against the SourceApp prefix map, or 'other'. |
| `detectProjects(deps?)` | function | `src/echo-home/wizard/detect-projects.ts:103` | Queries recent atoms (default 7-day window, up to 50,000 rows), buckets by collapsed git root (excluding ephemeral/sibling worktrees), accumulates per-repo atomCount/lastSeen/sourceBreakdown, and returns projects sorted by atomCount desc then lastSeen desc then repoRoot, truncated to `limit`. |

### `src/echo-home/wizard/index.ts` — barrel re-export of wizard submodules

**Purpose:** Aggregates and re-exports the public API of the wizard package (agent/project detection, adapter cache, probing, wizard orchestration, and wiring) as a single import surface.

**Depends on:** `src/echo-home/wizard/detect-agents.ts`, `src/echo-home/wizard/detect-projects.ts`, `src/echo-home/wizard/adapter-cache.ts`, `src/echo-home/wizard/probe.ts`, `src/echo-home/wizard/run-wizard.ts`, `src/echo-home/wizard/wire.ts`

**Symbols:**

(No new symbols; pure re-export of `AGENT_KINDS`, `detectAgents`, `AgentConfidence`, `AgentKind`, `DetectedAgent`, `DetectedAgentSignals`, `DetectAgentsDeps`, `detectProjects`, `DetectedProject`, `DetectProjectsDeps`, `ProjectSource`, `readAdapterCache`, `writeAdapterCache`, `deleteAdapterCache`, `AdapterCacheError`, `AdapterCacheRecord`, `probeAgents`, `ProbeDeps`, `ProbeOutcome`, `SpawnResult`, `createWizard`, `CreateWizardOpts`, `Wizard`, `WizardSummary`, `wire`, `WireOpts`, `WireResult`.)

### `src/echo-home/wizard/probe.ts` — live-probes each agent CLI to confirm ECHO MCP wiring actually works

**Purpose:** Spawns each configured agent CLI (codex/claude-code; cursor is manual-only) with a fixed prompt instructing it to call `mcp__echo__echo_ping` and return the JSON verbatim, then inspects stdout/stderr/exit-code/timeout to classify whether the MCP wiring is confirmed working or failed for a specific reason (cli-unavailable, timeout, auth-required, mcp-not-configured, unexpected-output).

**Depends on:** `src/util/subprocess.ts` (`resolveCommand`), `src/echo-home/wizard/detect-agents.ts` (`AgentKind` type), `node:child_process`, `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProbeOutcome` | type | `src/echo-home/wizard/probe.ts:6` | Discriminated union: `{agent, probed:true, latencyMs}` or `{agent, probed:false, reason, detail?}` with reason enum. |
| `SpawnResult` | interface | `src/echo-home/wizard/probe.ts:21` | Subprocess result shape: exitCode, stdout, stderr, timedOut. |
| `ProbeDeps` | interface | `src/echo-home/wizard/probe.ts:28` | Injectable spawn function and timeoutMs override. |
| `PROMPT` | const | `src/echo-home/wizard/probe.ts:33` | Fixed instruction text told to the agent CLI to invoke `mcp__echo__echo_ping` and return raw JSON. |
| `realSpawn(cmd, args, opts?)` | function | `src/echo-home/wizard/probe.ts:36` | Resolves the platform-appropriate command via `resolveCommand`, spawns it with piped stdio, enforces a timeout (killing with SIGTERM), and accumulates stdout/stderr until close, resolving a `SpawnResult`. |
| `detail(text)` | function | `src/echo-home/wizard/probe.ts:76` | Trims text and truncates to 200 chars, or undefined if empty. |
| `isEchoPingPayload(stdout)` | function | `src/echo-home/wizard/probe.ts:81` | Scans each non-empty stdout line for one starting with `{` that parses as `{pong:true, ts:string}`, tolerating log preamble/markdown fences. |
| `authRequired(stderr)` | function | `src/echo-home/wizard/probe.ts:102` | Regex-matches stderr for auth/login/not-authenticated phrases. |
| `mcpNotConfigured(combined)` | function | `src/echo-home/wizard/probe.ts:106` | Detects phrases indicating the MCP tool/server isn't registered/available in combined stdout+stderr. |
| `probeOne(agent, spawn, timeoutMs)` | function | `src/echo-home/wizard/probe.ts:118` | For cursor, short-circuits to manual-only; otherwise builds the codex/claude CLI invocation with `PROMPT`, spawns it, and classifies the outcome (cli-unavailable/auth-required/mcp-not-configured/timeout/unexpected-output/success-with-latency) based on exit code, stderr, and payload parsing. |
| `probeAgents(agents, deps?)` | function | `src/echo-home/wizard/probe.ts:171` | Sequentially probes each requested agent via `probeOne`, returning the list of outcomes. |

### `src/echo-home/wizard/render-echo-section.ts` — renders the ECHO markdown section injected into agent config files

**Purpose:** Produces the exact markdown block (matching the live `~/.claude/CLAUDE.md` ECHO section format) that gets written into codex/claude-code config files during wiring, embedding the MCP server URL, default project, and a version/rendered-at HTML comment for drift detection.

**Depends on:** `src/echo-home/wizard/detect-agents.ts` (`AgentKind` type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EchoSectionContext` | interface | `src/echo-home/wizard/render-echo-section.ts:3` | Input: agent kind, mcpServerUrl, echoVersion, defaultProjectRepoRoot (nullable), renderedAt. |
| `renderEchoSection(ctx)` | function | `src/echo-home/wizard/render-echo-section.ts:11` | Throws if agent is 'cursor' (unsupported); otherwise renders the `# ECHO` markdown block with server URL, default project (or 'none chosen'), tool-list hint, and a trailing `<!-- echo-version: ... rendered-at: ... -->` marker comment. |

### `src/echo-home/wizard/run-wizard.ts` — stateful orchestrator exposing the wizard's step-by-step API

**Purpose:** Wraps `detectAgents`, `detectProjects`, `wire`, and `probe` behind a single stateful `Wizard` object that the CLI/onboarding flow drives step by step, caching each step's result for a final `summary()` and exposing `markCompleted()` to flip the onboarding-state completed flag.

**Depends on:** `src/echo-home/wizard/detect-agents.ts`, `src/echo-home/wizard/detect-projects.ts`, `src/echo-home/wizard/probe.ts`, `src/echo-home/wizard/wire.ts`, `src/echo-home/paths.ts` (`OnboardingState` type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CreateWizardOpts` | interface | `src/echo-home/wizard/run-wizard.ts:19` | Constructor options: mcpServerUrl, echoVersion, and per-step dependency overrides plus a `now` clock override. |
| `WizardSummary` | interface | `src/echo-home/wizard/run-wizard.ts:29` | Snapshot of all step results (detected, projects, wired, probed) plus the current onboarding state snapshot. |
| `Wizard` | interface | `src/echo-home/wizard/run-wizard.ts:37` | Public stateful API: detectAgents, detectProjects, wire, probe, summary, markCompleted. |
| `createWizard(opts)` | function | `src/echo-home/wizard/run-wizard.ts:51` | Constructs a `Wizard` closure holding mutable detected/projects/wired/probed state; `detectAgents`/`detectProjects` call the corresponding pure functions with injected deps and `now()`; `wire` merges opts with mcpServerUrl/echoVersion/now and delegates to `wireAgents`; `probe` calls `probeAgents` then persists probe timestamps via `updateProbedAgents`; `summary` returns the cached state plus a fresh onboarding snapshot; `markCompleted` calls `markOnboardingCompleted`. |

### `src/echo-home/wizard/wire.ts` — writes ECHO config into each selected agent and updates onboarding state

**Purpose:** Given a set of selected agents and wiring options, renders each agent's ECHO markdown section (where applicable), builds `AdapterSyncProfile`s, delegates to `syncAll` to perform the actual file writes/merges, then updates the per-agent adapter cache and the onboarding state (`wired_at`/`wire_error`) based on per-agent success/failure, including conflict-message formatting for config/marker/symlink conflicts.

**Depends on:** `src/echo-home/adapter-sync.ts` (`syncAll`, `AdapterSyncProfile`, `AgentResult`, `SyncConflict`, `SyncResult`), `src/echo-home/adapters/claude-code-mcp.ts` (`ClaudeCodeMcpRegisterDeps` type), `src/echo-home/adapters/atomic-write.ts`, `src/echo-home/paths.ts` (`ECHO_HOME_PATHS`, `validateOnboardingState`, `InstallProfile`, `OnboardingState`), `src/echo-home/wizard/adapter-cache.ts`, `src/echo-home/wizard/detect-agents.ts` (`AgentKind` type), `src/echo-home/wizard/render-echo-section.ts`, `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `WireOpts` | interface | `src/echo-home/wizard/wire.ts:22` | Input: selectedAgents, defaultProjectRepoRoot, mcpServerUrl, echoVersion, optional profile/repoRoot/force, injectable syncAll/claudeCodeMcpRegistration/cache/now. |
| `WireResult` | interface | `src/echo-home/wizard/wire.ts:39` | Output: syncResult, per-agent cacheUpdates (written/unchanged/failed), onboardingStateUpdated flag. |
| `MARKER_AGENTS` | const | `src/echo-home/wizard/wire.ts:49` | Set of agent kinds that get a rendered ECHO markdown section (codex, claude-code — not cursor). |
| `readState()` | function | `src/echo-home/wizard/wire.ts:51` | Reads and schema-validates the onboarding state JSON file, throwing on invalid shape. |
| `writeState(state)` | function | `src/echo-home/wizard/wire.ts:61` | Ensures the state dir exists and atomically writes the onboarding state JSON. |
| `conflictMessage(conflict)` | function | `src/echo-home/wizard/wire.ts:70` | Formats a human-readable message for a config/marker/target-symlink/malformed-marker sync conflict. |
| `agentResult(syncResult, kind)` | function | `src/echo-home/wizard/wire.ts:77` | Finds the per-agent `AgentResult` in a `SyncResult` by agent kind. |
| `isSuccessfulAgent(result)` | function | `src/echo-home/wizard/wire.ts:81` | True if the agent result exists and `ok === true`. |
| `buildProfiles(opts, nowIso, cache)` | function | `src/echo-home/wizard/wire.ts:85` | For each selected agent, reads its prior cache entry, renders its ECHO section (marker agents only) and MCP server config, and assembles an `AdapterSyncProfile` list plus a map of rendered sections. |
| `emptyFailedSyncResult(message)` | function | `src/echo-home/wizard/wire.ts:124` | Builds a fully-failed `SyncResult` shell (used when `syncAll` throws) carrying the error message. |
| `topLevelSentinel(syncResult)` | function | `src/echo-home/wizard/wire.ts:133` | True if the sync result carries a top-level sentinel field (syncLock/repoRoot/directorySymlink), signaling a global (non-per-agent) failure. |
| `updateOnboardingState(selectedAgents, syncResult, nowIso)` | function | `src/echo-home/wizard/wire.ts:141` | For each selected agent, creates or updates its `OnboardedAgentProfile` in onboarding state: sets `wired_at`/clears `wire_error` on success, or records the first error/conflict message on failure; persists via `writeState`. |
| `updateProbeTimestamps(outcomes, nowIso)` | function | `src/echo-home/wizard/wire.ts:181` | For each probed-true outcome, creates or updates the agent's profile and sets `probed_at`; persists via `writeState`. |
| `markOnboardingCompleted(now)` | function | `src/echo-home/wizard/wire.ts:206` | Sets `completed: true` and updates `last_updated_at` on the onboarding state, then persists it. |
| `readOnboardingStateSnapshot()` | function | `src/echo-home/wizard/wire.ts:213` | Returns the current onboarding state, or null if read/parse fails. |
| `updateProbedAgents(outcomes, now)` | function | `src/echo-home/wizard/wire.ts:221` | Thin wrapper calling `updateProbeTimestamps` with an ISO-stringified `now`. |
| `wire(opts)` | function | `src/echo-home/wizard/wire.ts:228` | Top-level wiring flow: builds per-agent sync profiles, calls `syncAll` (catching and converting thrown errors into a failed `SyncResult`), short-circuits on a top-level sentinel, else on success writes each successful agent's adapter cache entry and updates onboarding state, returning the aggregate `WireResult`. |

# `src/capture/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 13 files.

### `src/capture/extractors/_shared.ts` — shared JSONL watcher/tail utilities for extractors

**Purpose:** Provides the common chokidar-based watch/poll wiring, JSONL tail-reading, boot scan, and freshness probing used by both the Claude Code and Codex extractors so they don't each roll their own file-watching logic.

**Depends on:** `../../logging/index.js`, `../../storage/interface.js` (types), `node:fs/promises`, `node:path`, `chokidar`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SOURCE_MARKERS` | const | `src/capture/extractors/_shared.ts:10` | Path-fragment markers (`/.codex/sessions/`, `/.claude/projects/`, `/Cursor/`) used to identify which agent surface produced a `CaptureEvent`, shared across causal/render-trace/serve-trace/stream-watch. |
| `Lane` | type | `src/capture/extractors/_shared.ts:16` | Union type `'cc' \| 'codex' \| 'cursor' \| 'git' \| 'other'` classifying an event's originating surface. |
| `laneOf(event)` | function | `src/capture/extractors/_shared.ts:18` | Classifies a `CaptureEvent` into a `Lane` by checking `event.source` against `git:` prefix and `SOURCE_MARKERS`. |
| `dedupStrings(values)` | function | `src/capture/extractors/_shared.ts:26` | Returns `values` with duplicates removed, preserving first-seen order via a `Set`. |
| `JSONL_WATCH_OPTS` | const | `src/capture/extractors/_shared.ts:49` | Shared chokidar config (`ignoreInitial: true`, polling every 1000ms) for both JSONL extractors; polling compensates for macOS FSEvents coalescing rapid in-place appends. |
| `FreshnessProbe` | interface | `src/capture/extractors/_shared.ts:57` | Shape `{ maxGapBytes, maxGapPath, filesChecked }` reporting the largest unread-byte gap across a watched offset map. |
| `ExtractorHandle` | interface | `src/capture/extractors/_shared.ts:63` | Public handle shape `{ stop, probeFreshness }` returned by both extractors' `start*Extractor` functions. |
| `probeFreshness(offsetMap)` | function | `src/capture/extractors/_shared.ts:69` | Stats each path in `offsetMap`, computes `size - offset` gap per file, and returns the maximum gap plus the path exhibiting it; persistent non-zero gap signals the watcher is dropping events. |
| `bootScanJsonl(prefix, schedule, handle, log)` | function | `src/capture/extractors/_shared.ts:96` | Recursively walks `prefix` for `.jsonl` files at boot and schedules one `handle` call per file so chokidar's `ignoreInitial` doesn't silently skip pre-existing files. |
| `readJsonlTail(jsonlPath, lastByteOffset, log)` | function | `src/capture/extractors/_shared.ts:120` | Reads bytes appended to `jsonlPath` since `lastByteOffset`, returns only complete newline-terminated lines plus `firstLineOffset`/`mtimeMs`; returns `null` on stat/open failure. |
| `wireJsonlExtractor(opts)` | function | `src/capture/extractors/_shared.ts:165` | Sets up a chokidar watcher over `opts.prefix` plus a serialized (single-flight) processing queue and boot scan; wires `add`/`change`/`error` events to `opts.handle`, and returns an `ExtractorHandle` with `stop`/`probeFreshness`. |

### `src/capture/extractors/_turn_meta.ts` — shared per-turn metadata types and truncation helpers

**Purpose:** Defines the common `ToolCall`/`GitState` metadata shapes emitted into `CaptureEvent.metadata` by both the CC and Codex extractors, plus shared truncation limits/helpers so downstream consumers (mcp-search-memories, render-trace, reasoning/causal) can treat turns from either source uniformly.

**Depends on:** none (pure types/functions, no internal imports)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ToolCall` | interface | `src/capture/extractors/_turn_meta.ts:7` | Per-tool-invocation metadata shape: `name`, truncated `args`/`output` with truncation flags, `is_error`, and `call_id` for cross-event joins. |
| `GitState` | interface | `src/capture/extractors/_turn_meta.ts:25` | Point-in-time git snapshot shape: `head_sha`, `branch`, `origin_url`, `dirty_count`, `captured_at`, and `fresh` (true iff sampled within 30s of the turn). |
| `ARGS_LIMIT` | const | `src/capture/extractors/_turn_meta.ts:42` | Truncation limit of 2,000 chars for tool-call args. |
| `OUTPUT_LIMIT` | const | `src/capture/extractors/_turn_meta.ts:43` | Truncation limit of 4,000 chars for tool-call output. |
| `THINKING_LIMIT` | const | `src/capture/extractors/_turn_meta.ts:44` | Truncation limit of 8,000 chars for assistant thinking/reasoning text. |
| `truncate(s, limit)` | function | `src/capture/extractors/_turn_meta.ts:46` | Slices `s` to `limit` chars, appending a `[…truncated; N chars dropped]` marker; returns `{ value, truncated }`. |
| `truncateArgs(s)` | function | `src/capture/extractors/_turn_meta.ts:55` | Applies `truncate` with `ARGS_LIMIT`. |
| `truncateOutput(s)` | function | `src/capture/extractors/_turn_meta.ts:59` | Applies `truncate` with `OUTPUT_LIMIT`. |
| `truncateThinking(s)` | function | `src/capture/extractors/_turn_meta.ts:63` | Applies `truncate` with `THINKING_LIMIT`. |
| `MAX_TOOL_CALLS_PER_TURN` | const | `src/capture/extractors/_turn_meta.ts:67` | Cap of 50 tool calls retained per turn before truncation. |
| `FILE_INPUT_KEYS` | const | `src/capture/extractors/_turn_meta.ts:72` | Tuple `['file_path', 'path', 'notebook_path']` of tool-input keys treated as file-path values, driving `files_referenced` extraction and cross-source file-touch matching in `src/reasoning/causal.ts`. |
| `FILE_INPUT_REGEX` | const | `src/capture/extractors/_turn_meta.ts:76` | Regex built from `FILE_INPUT_KEYS` that extracts file-path-style values out of a stringified args blob. |
| `buildToolCall(opts)` | function | `src/capture/extractors/_turn_meta.ts:83` | Constructs a `ToolCall` from `{ name, call_id?, argsRaw?, outputRaw?, is_error? }`, applying `truncateArgs`/`truncateOutput` consistently so both extractors share truncation behavior. |

### `src/capture/extractors/claude-code.ts` — Claude Code JSONL transcript extractor

**Purpose:** Watches `~/.claude/projects/` for Claude Code session JSONL files, parses raw lines into user/assistant turn clusters (with tool calls, thinking, git branch, files referenced), and feeds completed turns through the capture pipeline as `CaptureEvent` candidates.

**Depends on:** `../../guards.js`, `../../logging/index.js`, `../../storage/interface.js`, `../git-state.js`, `../pipeline.js`, `../workspace-root.js`, `./_shared.js`, `./_turn_meta.js`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ClaudeCodeTurn` | interface | `src/capture/extractors/claude-code.ts:29` | Fully-assembled turn shape: project, session_id, turn_index, user/assistant text, timestamps, tool calls, thinking, git branch/state, permission mode, CLI version, model. |
| `DroppedUserLine` | interface | `src/capture/extractors/claude-code.ts:66` | A text-bearing user line discarded because a later user line arrived before any assistant reply; carries byte_offset dedup key, preview, and `inject`/`prompt` classification. |
| `ExtractClaudeCodeResult` | interface | `src/capture/extractors/claude-code.ts:79` | Return shape of `extractClaudeCodeTurns`: `{ turns, newOffset, droppedUsers }`. |
| `INJECT_TAG_PREFIXES` | const | `src/capture/extractors/claude-code.ts:85` | List of system-injected tag prefixes (`<system-reminder>`, `<command-name>`, etc.) used to classify dropped user lines as noise vs. real prompts. |
| `classifyDroppedUser(text)` | function | `src/capture/extractors/claude-code.ts:97` | Classifies a dropped user line's text as `'inject'` (matches an `INJECT_TAG_PREFIXES` entry) or `'prompt'` (real, possibly-lost user text). |
| `ParsedToolUse` | interface | `src/capture/extractors/claude-code.ts:105` | Parsed `tool_use` block: `{ id, name, input }`. |
| `ParsedToolResult` | interface | `src/capture/extractors/claude-code.ts:111` | Parsed `tool_result` block: `{ tool_use_id, content, is_error }`. |
| `ExtractedContent` | interface | `src/capture/extractors/claude-code.ts:117` | Aggregated content of one JSONL line's message blocks: text, hasTool flag, files, toolUses, toolResults, thinking. |
| `ParsedLine` | interface | `src/capture/extractors/claude-code.ts:126` | Fully parsed JSONL line: role, text, hasTool, isEndTurn, timestamp, cwd, gitBranch, permissionMode, version, model, files, toolUses, toolResults, thinking. |
| `stringifyToolResultContent(content)` | function | `src/capture/extractors/claude-code.ts:149` | Converts a tool_result's `content` (string or block array) into a joined text string, extracting only `type: 'text'` blocks from arrays. |
| `extractContent(content)` | function | `src/capture/extractors/claude-code.ts:163` | Parses a message's `content` (string or array of blocks) into `ExtractedContent`, separating text, thinking, tool_use, and tool_result blocks and pulling file paths from `FILE_INPUT_KEYS` on tool inputs. |
| `parseLine(line)` | function | `src/capture/extractors/claude-code.ts:225` | Parses one raw JSONL line into a `ParsedLine`, extracting role, content, timestamp, cwd, gitBranch, permissionMode, version, model, and end-turn signal (`stop_reason === 'end_turn'`); returns `null` on JSON parse failure or unrecognized shape. |
| `deriveSessionId(jsonlPath)` | function | `src/capture/extractors/claude-code.ts:269` | Derives the session id from the JSONL filename by stripping the `.jsonl` extension. |
| `deriveProject(jsonlPath)` | function | `src/capture/extractors/claude-code.ts:274` | Derives the project name as the parent directory's basename. |
| `extractClaudeCodeTurns(jsonlPath, lastByteOffset)` | function | `src/capture/extractors/claude-code.ts:278` | Core parser: reads the JSONL tail since `lastByteOffset`, clusters lines into user→assistant turns (closing a cluster on the next user line or `end_turn`), accumulates tool calls/files/thinking/git branch into each cluster, and returns completed `turns` plus `newOffset` (only advanced past confirmed/emitted turns) and `droppedUsers`. |
| `matchToolCalls(uses, results)` | function | `src/capture/extractors/claude-code.ts:463` | Joins `ParsedToolUse` entries to their `ParsedToolResult` by `tool_use_id`, builds `ToolCall[]` via `buildToolCall`, capping at `MAX_TOOL_CALLS_PER_TURN` and reporting `total`/`truncated`. |
| `backfillOffsetMap(storage)` | function | `src/capture/extractors/claude-code.ts:493` | Reconstructs the per-file byte-offset/turn-index watermark map from previously-stored `fs:`-sourced events on daemon boot, so re-scans resume rather than re-emit. |
| `ClaudeCodeExtractorOptions` | interface | `src/capture/extractors/claude-code.ts:514` | Extractor start options: optional `projectsPrefix` override. |
| `ClaudeCodeExtractorHandle` | type | `src/capture/extractors/claude-code.ts:518` | Alias of `ExtractorHandle` for the CC extractor. |
| `startClaudeCodeExtractor(storage, options)` | function | `src/capture/extractors/claude-code.ts:520` | Entry point: backfills the offset map, defines `handleJsonlChange` (parses new turns, logs+dedupes dropped-user warnings via a per-file watermark, probes git state, resolves canonical root, builds `CaptureEvent` candidates and calls `processCandidate`, checkpoints offset per turn), and wires it up via `wireJsonlExtractor` over `~/.claude/projects/`. |

### `src/capture/extractors/codex.ts` — Codex CLI JSONL transcript extractor

**Purpose:** Watches `~/.codex/sessions/` for Codex CLI rollout JSONL files, parses `response_item`/`session_meta`/`turn_context`/`event_msg` lines into user/assistant turn clusters with tool calls, reasoning, sandbox/session metadata, and git info, then feeds completed turns through the capture pipeline.

**Depends on:** `../../guards.js`, `../../logging/index.js`, `../../storage/interface.js`, `../git-state.js`, `../pipeline.js`, `../workspace-root.js`, `./_shared.js`, `./_turn_meta.js`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CodexGitMeta` | interface | `src/capture/extractors/codex.ts:30` | Git metadata as recorded by Codex session_meta: `sha`, `branch`, `origin_url`. |
| `CodexSessionMeta` | interface | `src/capture/extractors/codex.ts:36` | Aggregated Codex session/turn configuration: cli_version, model, model_provider, reasoning_effort, personality, approval_policy, sandbox policy fields, permission profile fields. |
| `CodexTurn` | interface | `src/capture/extractors/codex.ts:55` | Fully-assembled turn shape: session_id, turn_index, user/assistant text, cwd, timestamps, tool calls/totals, files_referenced, thinking, git/codex metadata, git_state. |
| `ExtractCodexResult` | interface | `src/capture/extractors/codex.ts:75` | Return shape of `extractCodexTurns`: `{ turns, newOffset, cwd?, git?, codex? }` carrying forward session-level state for the next incremental read. |
| `ParsedLine` | interface | `src/capture/extractors/codex.ts:83` | Discriminated-by-`kind` parsed line covering message/tool_call/tool_output/reasoning/session_meta/turn_context/task_complete/other, with a wide set of optional fields for each kind's payload. |
| `extractMessageText(content)` | function | `src/capture/extractors/codex.ts:125` | Extracts joined text from a `message` payload's `content` array, keeping only `input_text`/`output_text` blocks. |
| `parseLine(line)` | function | `src/capture/extractors/codex.ts:139` | Parses one raw rollout JSONL line by its `type` (`session_meta`, `turn_context`, `event_msg`/`task_complete`, `response_item` with `reasoning`/`function_call`/`function_call_output`/`message` subtypes) into a `ParsedLine`; detects tool errors via non-zero `exit_code` metadata or a `Process exited with code` regex. |
| `deriveSessionId(jsonlPath)` | function | `src/capture/extractors/codex.ts:317` | Derives session id from filename `rollout-<ISO>-<uuid>.jsonl`, extracting the trailing UUID via regex, else falling back to the filename minus extension. |
| `PendingToolCall` | interface | `src/capture/extractors/codex.ts:327` | In-progress tool call accumulator: name, args, call_id, output, is_error. |
| `PendingCluster` | interface | `src/capture/extractors/codex.ts:335` | In-progress turn cluster: userText, assistantTexts, hadTool, timestamp, cwd, git, codex meta, toolCalls, toolCallTotal, files, thinking. |
| `PATCH_FILE_RE` | const | `src/capture/extractors/codex.ts:350` | Regex matching apply_patch headers `*** Add/Update/Delete File: <path>` to recover touched file paths from patch tool args. |
| `PATCH_MOVE_RE` | const | `src/capture/extractors/codex.ts:351` | Regex matching apply_patch `*** Move to: <path>` headers. |
| `collectPatchFileRefs(s)` | function | `src/capture/extractors/codex.ts:353` | Runs `PATCH_FILE_RE` and `PATCH_MOVE_RE` against a string and collects all matched file paths. |
| `collectStructuredFileRefs(value, out)` | function | `src/capture/extractors/codex.ts:366` | Recursively walks a parsed JSON value, pushing string values under `FILE_INPUT_KEYS` keys into `out`, and recursing into arrays/objects/patch-header strings. |
| `extractFileRefsFromToolArgs(argsRaw)` | function | `src/capture/extractors/codex.ts:388` | Combines patch-header regex matches and (best-effort) structured JSON-key matches from a tool call's raw args string into a deduped file-ref list. |
| `sameStringArray(a, b)` | function | `src/capture/extractors/codex.ts:401` | Compares a possibly-undefined string array `a` to array `b` for equality by length and per-index value. |
| `mergeCodexMeta(base, patch)` | function | `src/capture/extractors/codex.ts:405` | Merges a partial `CodexSessionMeta` patch into a base, skipping empty/unchanged/duplicate-array values, returning `base` unchanged (by reference) if nothing changed or `undefined` if the merged result is empty. |
| `gitStateFromCodexGit(git, timestamp)` | function | `src/capture/extractors/codex.ts:429` | Converts a `CodexGitMeta` into a `GitState` with `fresh: false` (session-recorded, not live-probed), returning `undefined` if neither sha nor branch is present. |
| `ExtractCodexInput` | interface | `src/capture/extractors/codex.ts:441` | Optional carried-forward session state passed into `extractCodexTurns`: `lastKnownCwd`, `lastKnownGit`, `lastKnownCodex`. |
| `extractCodexTurns(jsonlPath, lastByteOffset, input)` | function | `src/capture/extractors/codex.ts:447` | Core parser: reads the JSONL tail, threads forward `cwd`/`git`/`codex` session state from `input.lastKnown*` and in-file `session_meta`/`turn_context` lines, clusters `message` lines into user→assistant turns (closing on next user line or `task_complete`), attaches tool_call/tool_output/reasoning payloads to the open cluster, and returns completed turns plus carried-forward `cwd`/`git`/`codex` for the next incremental call. |
| `OffsetEntry` | interface | `src/capture/extractors/codex.ts:663` | Per-file watermark shape stored in the extractor's offset map: `offset`, `turn_index`, plus carried-forward `cwd`/`git`/`codex`. |
| `readGitMetaFromMd(md)` | function | `src/capture/extractors/codex.ts:671` | Reconstructs a `CodexGitMeta` from a stored `CaptureEvent.metadata['git']` object during offset-map backfill. |
| `readCodexMetaFromMd(md)` | function | `src/capture/extractors/codex.ts:682` | Reconstructs a `CodexSessionMeta` from a stored `CaptureEvent.metadata['codex']` object during offset-map backfill, reading string/boolean/array fields by known key lists. |
| `backfillOffsetMap(storage)` | function | `src/capture/extractors/codex.ts:720` | Reconstructs the per-file offset/turn-index/cwd/git/codex watermark map from previously-stored codex-sourced `fs:` events on daemon boot, carrying forward sparse metadata across turns of the same file. |
| `CodexExtractorOptions` | interface | `src/capture/extractors/codex.ts:760` | Extractor start options: optional `sessionsPrefix` override. |
| `CodexExtractorHandle` | type | `src/capture/extractors/codex.ts:764` | Alias of `ExtractorHandle` for the Codex extractor. |
| `startCodexExtractor(storage, options)` | function | `src/capture/extractors/codex.ts:766` | Entry point: backfills the offset map, defines `handleJsonlChange` (extracts new turns carrying forward cwd/git/codex meta, probes live git state falling back to session-recorded git meta, resolves canonical root, builds `CaptureEvent` candidates and calls `processCandidate`, checkpoints offset+cwd+git+codex per turn), and wires it up via `wireJsonlExtractor` over `~/.codex/sessions/`. |

### `src/capture/extractors/cursor.ts` — Cursor chat-history extractor (bubble parser + turn assembler + surface daemon)

**Purpose:** Reads Cursor's `state.vscdb` SQLite global storage (bubbleId/composerData rows in `cursorDiskKV`) and per-workspace `state.vscdb` databases, reconstructs user→assistant conversation turns (including multi-bubble assistant clusters, tool calls, thinking, and streaming continuations), resolves a `repo_root` for each turn via a two-stage strategy, and starts a chokidar + periodic-repoll daemon that emits each turn as a capture candidate through the pipeline.

**Depends on:** `../pipeline.js` (processCandidate), `./_shared.js` (dedupStrings), `../../logging/index.js`, `../../mcp/cursor-workspace-resolver.js` (resolveRepoRootForWorkspaceId), `../../storage/interface.js` (Storage), external: `better-sqlite3`, `chokidar`, `node:fs`, `node:fs/promises`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CURSOR_REPOLL_INTERVAL_MS` | const | `src/capture/extractors/cursor.ts:32` | 15s default periodic re-poll interval closing chokidar's WAL-append miss gap. |
| `BubbleTextSource` | type | `src/capture/extractors/cursor.ts:37` | Union of text-derivation sources (`text`, `toolFormerData`, `fileDiff`, `codeBlocks`, `thinkingContent`) recorded per bubble. |
| `ReferencedFile` | interface | `src/capture/extractors/cursor.ts:44` | Path + optional language for a file referenced in code blocks. |
| `CursorToolCall` | interface | `src/capture/extractors/cursor.ts:49` | Name/args/output/is_error shape for a derived tool invocation. |
| `CursorTurnContext` | interface | `src/capture/extractors/cursor.ts:60` | Aggregated attached/referenced/deleted files for a turn's cluster. |
| `CursorTurn` | interface | `src/capture/extractors/cursor.ts:72` | Full reconstructed turn: composer/bubble ids, messages, context, tool calls, thinking, continuation flags. |
| `ComposerInfo` | interface | `src/capture/extractors/cursor.ts:124` | Parsed composer row: id, createdAt, bubble ordering map. |
| `BubbleContext` | interface | `src/capture/extractors/cursor.ts:130` | Per-bubble attached/referenced/deleted file lists. |
| `ParsedBubble` | interface | `src/capture/extractors/cursor.ts:136` | Parsed single bubble row: role, text, text_source, createdAt, context, optional toolFormerData. |
| `CursorDiskKVRow` | interface | `src/capture/extractors/cursor.ts:157` | Raw `key`/`value` row shape from `cursorDiskKV`. |
| `findGitAncestor(filePath)` | function | `src/capture/extractors/cursor.ts:178` | Walks upward from a file path looking for a `.git` dir/file ancestor; returns repo root or null. |
| `resolveRepoRootFromFiles(files)` | function | `src/capture/extractors/cursor.ts:207` | Resolves a single repo_root only if every file's `.git` ancestor agrees; else null. |
| `resolveCursorRepoRootForTurn(...)` | function | `src/capture/extractors/cursor.ts:240` | Two-stage (workspace-binding then file-walk) repo_root resolution with positive-only caching and dedup'd failure warn. |
| `parseBubbleKey(key)` | function | `src/capture/extractors/cursor.ts:284` | Parses `bubbleId:<composer_id>:<bubble_id>` key format. |
| `parseComposerKey(key)` | function | `src/capture/extractors/cursor.ts:295` | Parses `composerData:<id>` key format. |
| `parseComposerRow(row)` | function | `src/capture/extractors/cursor.ts:301` | Parses a composerData row's JSON into createdAt + bubbleOrder map. |
| `asString(v)` | function | `src/capture/extractors/cursor.ts:329` | Returns v if non-empty string, else undefined. |
| `extractAttachedFiles(v)` | function | `src/capture/extractors/cursor.ts:333` | Extracts file paths from `attachedFileCodeChunksUris`. |
| `extractReferencedFiles(v)` | function | `src/capture/extractors/cursor.ts:345` | Extracts `{path, language}` from `codeBlocks[].uri`. |
| `extractDeletedFiles(v)` | function | `src/capture/extractors/cursor.ts:364` | Extracts file paths from `deletedFiles[].uri`. |
| `tryExtractToolFormerText(v)` | function | `src/capture/extractors/cursor.ts:385` | Fallback parser deriving text from a `toolFormerData` frame (text/result/rawArgs/params). |
| `tryExtractFileDiffText(v)` | function | `src/capture/extractors/cursor.ts:414` | Fallback parser deriving text from `attachedHumanChanges.fileDiff`. |
| `tryExtractCodeBlocksText(v)` | function | `src/capture/extractors/cursor.ts:444` | Fallback parser deriving fenced-code text from `codeBlocks[]` bodies (content/code). |
| `tryExtractThinkingText(v)` | function | `src/capture/extractors/cursor.ts:464` | Fallback parser deriving text from `thinkingContent`/`thinking` fields. |
| `hasNonEmpty(value)` | function | `src/capture/extractors/cursor.ts:489` | True if value is a non-empty string/array/object; used to classify parser-gap vs empty-bubble. |
| `hasNonEmptyCodeBlocks(value)` | function | `src/capture/extractors/cursor.ts:501` | True if `codeBlocks` is a non-empty array regardless of body content. |
| `hasNonEmptyRichText(value)` | function | `src/capture/extractors/cursor.ts:508` | Parses Lexical richText JSON and determines whether it holds real authored content vs idle empty paragraph. |
| `ParseBubbleOptions` | interface | `src/capture/extractors/cursor.ts:533` | Test-only `disableFallbacks` flag. |
| `parseBubbleRow(row, composers, options)` | function | `src/capture/extractors/cursor.ts:540` | Parses one bubble row end-to-end: text derivation chain, role, ordering, context extraction; logs warn/debug on gaps. |
| `toolFormerToToolCall(tfd)` | function | `src/capture/extractors/cursor.ts:684` | Converts a raw toolFormerData object into a `CursorToolCall` (name/args/output/is_error). |
| `dedupReferencedFiles(values)` | function | `src/capture/extractors/cursor.ts:742` | Dedupes ReferencedFile[] by path, promoting entries with language info. |
| `buildTurnContext(user, assistantCluster)` | function | `src/capture/extractors/cursor.ts:756` | Aggregates attached/referenced/deleted files across a user+assistant cluster into `CursorTurnContext`. |
| `flattenContextFiles(ctx)` | function | `src/capture/extractors/cursor.ts:782` | Flattens attached/referenced/deleted file lists into one deduped path array. |
| `safeMtimeMs(path)` | function | `src/capture/extractors/cursor.ts:797` | Returns a file's mtimeMs or `Date.now()` on stat failure. |
| `maxGlobalDbFamilyMtime(globalDbPath)` | function | `src/capture/extractors/cursor.ts:813` | Returns the max mtime across `state.vscdb`/-wal/-shm to catch WAL-only commits. |
| `ExtractCursorTurnsOptions` | interface | `src/capture/extractors/cursor.ts:827` | Test-only `disableFallbacks` option for `extractCursorTurns`. |
| `extractCursorTurns(globalDbPath, lastSeenBubbleIdPerComposer, options)` | function | `src/capture/extractors/cursor.ts:833` | Reads the global DB, parses all bubbles/composers, groups into per-composer turns (including continuation turns past a checkpoint), sorted by assistant_created_at. |
| `backfillLastSeenMap(storage, globalDbPath)` | function | `src/capture/extractors/cursor.ts:1075` | Rebuilds the composer→last-seen-bubble checkpoint map from previously stored events. |
| `workspaceHashFromPath(dbPath, prefix)` | function | `src/capture/extractors/cursor.ts:1094` | Extracts the workspace-hash path segment from a workspaceStorage db path. |
| `refreshComposerWorkspaceMap(workspaceDbPath, workspacePrefix, map)` | function | `src/capture/extractors/cursor.ts:1102` | Reads a workspace's `ItemTable` composer registry (legacy + migrated shapes) and binds composer_id → workspace_id. |
| `CursorExtractorOptions` | interface | `src/capture/extractors/cursor.ts:1178` | Constructor options: db paths, repoll interval, scanOnStart, test hooks/injection seams. |
| `CursorExtractorTestHooks` | interface | `src/capture/extractors/cursor.ts:1210` | Test-only handle methods: triggerRepoll, get/setLastSeenScanMtime, refreshWorkspaceMap. |
| `CursorExtractorHandle` | interface | `src/capture/extractors/cursor.ts:1228` | Public handle: `stop()` plus optional `__testHooks`. |
| `startCursorExtractor(storage, options)` | function | `src/capture/extractors/cursor.ts:1235` | Boots the Cursor extractor daemon: backfills checkpoints, wires chokidar watchers + repoll timer, emits turns as candidates via `processCandidate`, updates checkpoints on acceptance. |

### `src/capture/gate.ts` — Capture allowlist gate

**Purpose:** Validates and classifies a raw candidate event's `source` string (`app:`/`domain:`/`fs:`/`api:`/`git:` prefix) and accepts/rejects it against the corresponding allowlist predicate from `sources.ts`; the single sandbox chokepoint enforcing the capture-gate pattern.

**Depends on:** `../guards.js` (isNonEmptyString), `../logging/index.js`, `./sources.js` (isAllowedApi/App/Domain/Path/Repo).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CandidateEvent` | interface | `src/capture/gate.ts:11` | Shape of a raw candidate: source, timestamp, content, optional metadata. |
| `RejectionReason` | type | `src/capture/gate.ts:18` | Union of gate rejection reasons (unknown_app/domain/path/api/repo, malformed_event). |
| `GateResult` | type | `src/capture/gate.ts:26` | Discriminated accepted/rejected result with reason. |
| `SOURCE_KIND_TO_REJECTION` | const | `src/capture/gate.ts:34` | Maps each SourceKind to its rejection reason. |
| `SOURCE_KIND_TO_PREDICATE` | const | `src/capture/gate.ts:45` | Maps each SourceKind to its allowlist-check predicate function. |
| `isPlainObject(v)` | function | `src/capture/gate.ts:53` | Type guard: non-null object, not array. |
| `parseSource(source)` | function | `src/capture/gate.ts:57` | Splits `kind:id` source string and validates kind is one of the 5 known kinds. |
| `gate(event)` | function | `src/capture/gate.ts:74` | Validates event shape (source/timestamp/content/metadata), parses source, checks against the matching allowlist predicate, logs and returns accept/reject. |

### `src/capture/git-state.ts` — Live git-state probe (Layer 2 cheap world state)

**Purpose:** Runs cheap git subprocess probes (HEAD sha, branch, dirty count, origin URL) in a target cwd for freshly-timestamped turns, with per-cwd TTL caching and LRU eviction; also provides a fast HEAD-file-based branch reader usable even for stale turns.

**Depends on:** `./extractors/_turn_meta.js` (GitState type), `./workspace-root.js` (gitToplevel, GIT_PROBE_TIMEOUT_MS), external: `node:child_process`, `node:fs/promises`, `node:path`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FRESHNESS_WINDOW_MS` | const | `src/capture/git-state.ts:19` | 30s window defining whether a turn timestamp is "fresh" enough to probe live git state. |
| `CACHE_TTL_MS` | const | `src/capture/git-state.ts:21` | 5s reuse window for cached per-cwd git-state samples. |
| `CACHE_MAX_ENTRIES` | const | `src/capture/git-state.ts:25` | Max entries (256) in the git-state cache before oldest-eviction. |
| `lruSet(map, key, value)` | function | `src/capture/git-state.ts:27` | Inserts into a Map, evicting the oldest entry when at capacity. |
| `CacheEntry` | interface | `src/capture/git-state.ts:35` | Cached git state plus expiresAt. |
| `gitOne(cwd, args)` | function | `src/capture/git-state.ts:41` | Runs a single git subprocess call with timeout, returns trimmed stdout or null on failure. |
| `scrubOriginUrlCredentials(raw)` | function | `src/capture/git-state.ts:54` | Strips embedded userinfo/credentials (`user:pass@`) out of a git remote URL, leaving the rest intact. |
| `probeGitState(cwd, turnTimestampIso)` | function | `src/capture/git-state.ts:68` | For fresh turns, resolves repo root, runs HEAD/branch/status/origin probes in parallel (with negative + positive caching), returns a `GitState` snapshot; returns undefined for stale turns or non-repos. |
| `BRANCH_CACHE_TTL_MS` | const | `src/capture/git-state.ts:132` | 5s TTL for the lightweight branch-only cache. |
| `BranchCacheEntry` | interface | `src/capture/git-state.ts:133` | Cached branch value (nullable) + expiresAt. |
| `readBranch(cwd)` | function | `src/capture/git-state.ts:139` | Reads `.git/HEAD` directly (no subprocess) to extract the current branch name, cached briefly; safe for stale/boot-scanned turns. |
| `_resetGitStateCache()` | function | `src/capture/git-state.ts:159` | Test-only: clears both in-memory caches. |

### `src/capture/pipeline.ts` — Capture pipeline chokepoint

**Purpose:** The single entrypoint all capture surfaces call to gate, canonicalize, and persist a raw candidate event; normalizes mixed-timezone ISO timestamps to `Z` form and rejects unparseable ones before appending to storage.

**Depends on:** `../logging/index.js`, `../storage/interface.js` (CaptureEvent, EventId, Storage), `./gate.js` (gate, RejectionReason).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PipelineRejectionReason` | type | `src/capture/pipeline.ts:10` | Union of gate rejection reasons plus pipeline-added `invalid_timestamp`. |
| `PipelineResult` | type | `src/capture/pipeline.ts:12` | Discriminated accepted (with EventId) / rejected (with reason) result. |
| `TZ_MARKER_RE` | const | `src/capture/pipeline.ts:23` | Regex detecting whether a timestamp string already carries a `Z` or `±HH:MM` timezone marker. |
| `canonicalizeTimestamp(ts)` | function | `src/capture/pipeline.ts:25` | Appends `Z` to timezone-less timestamps (N1 policy: assume UTC) then normalizes via `Date().toISOString()`. |
| `processCandidate(event, storage)` | function | `src/capture/pipeline.ts:30` | Runs `gate()`, validates/canonicalizes the timestamp (rejecting unparseable instants as `invalid_timestamp`), and appends the event to storage; returns accept/reject result. |

### `src/capture/sources.ts` — Capture source allowlists + config loading

**Purpose:** Defines the static allowlist tables (apps, domains, fs paths, apis, derived sources, git repos) that back the capture gate, plus loading/merging of a user-managed `~/.echo/state/capture-sources.json` config for additional git repos, and path/repo normalization helpers.

**Depends on:** `../guards.js` (isNonEmptyString), `../echo-home/paths.js` (ECHO_HOME_PATHS), `../util/json.js` (parseJson), external: `node:fs`, `node:os`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_GIT_REPOS` | const | `src/capture/sources.ts:7` | Built-in default git repo list (`~/Desktop/Project_echo/`). |
| `CAPTURED_SOURCES` | const | `src/capture/sources.ts:9` | Master allowlist table: apps, domains, fs_paths, apis, derived, git_repos. |
| `CaptureSourcesConfig` | interface | `src/capture/sources.ts:31` | Schema for `~/.echo/state/capture-sources.json` (schema_version, updated_at, git_repos). |
| `Source` | type | `src/capture/sources.ts:37` | Discriminated union of source kinds (app/domain/fs/api/git) with their identifying field. |
| `isErrnoException(err)` | function | `src/capture/sources.ts:46` | Type guard for Node errno exceptions. |
| `isPlainObject(value)` | function | `src/capture/sources.ts:50` | Type guard: non-null object, not array. |
| `invalidCaptureConfig(filePath, message)` | function | `src/capture/sources.ts:54` | Throws a formatted "invalid capture-sources config" error. |
| `expandTilde(p)` | function | `src/capture/sources.ts:58` | Expands a leading `~` or `~/` to the user's home directory. |
| `_isAllowedAppIn(bundleId, apps)` | function | `src/capture/sources.ts:64` | Checks bundleId is a non-empty string present as a key in the apps table. |
| `_isAllowedDomainIn(host, domains)` | function | `src/capture/sources.ts:72` | Checks host is a non-empty string present as a key in the domains table. |
| `_isAllowedPathIn(path, fsPaths)` | function | `src/capture/sources.ts:80` | Checks path is contained under (or equal to) any entry in fsPaths. |
| `_isAllowedApiIn(name, apis)` | function | `src/capture/sources.ts:85` | Checks name is a non-empty string included in the apis array. |
| `_isAllowedDerivedIn(name, derived)` | function | `src/capture/sources.ts:90` | Checks name is a non-empty string included in the derived array. |
| `stripTrailingSlash(p)` | function | `src/capture/sources.ts:95` | Removes trailing slashes (keeping at least length 1). |
| `isWindowsPathLike(p)` | function | `src/capture/sources.ts:101` | Detects a Windows drive-letter or UNC-style path. |
| `normalizePathForCompare(p)` | function | `src/capture/sources.ts:105` | Expands tilde, normalizes slashes, strips trailing slash, lowercases on Windows-like paths. |
| `pathContainsOrEquals(path, prefix)` | function | `src/capture/sources.ts:112` | True if normalized path equals or is nested under normalized prefix. |
| `normalizeRepoPath(p)` | function | `src/capture/sources.ts:121` | Public wrapper around `normalizePathForCompare` for repo path comparison. |
| `mergeGitRepos(defaults, configured)` | function | `src/capture/sources.ts:125` | Merges default + user-configured repo lists, deduping by normalized path, preserving first-seen order. |
| `readCaptureSourcesConfig(filePath)` | function | `src/capture/sources.ts:140` | Reads and strictly validates `capture-sources.json` (schema_version must be 1, only known keys, non-empty git_repos strings); returns null if file absent. |
| `loadGitReposFromCaptureConfig(filePath)` | function | `src/capture/sources.ts:187` | Loads the config file and merges its git_repos with `DEFAULT_GIT_REPOS`. |
| `applyGitReposFromCaptureConfig(filePath)` | function | `src/capture/sources.ts:194` | Loads merged repos and mutates `CAPTURED_SOURCES.git_repos` in place (splice), returning the new list. |
| `_isAllowedRepoIn(repoPath, repos)` | function | `src/capture/sources.ts:203` | Checks repoPath's normalized form matches any entry in repos (normalized). |
| `isAllowedApp(bundleId)` | function | `src/capture/sources.ts:209` | Gate predicate: bundleId allowlisted against `CAPTURED_SOURCES.apps`. |
| `isAllowedDomain(host)` | function | `src/capture/sources.ts:213` | Gate predicate: host allowlisted against `CAPTURED_SOURCES.domains`. |
| `isAllowedPath(path)` | function | `src/capture/sources.ts:217` | Gate predicate: path allowlisted against `CAPTURED_SOURCES.fs_paths`. |
| `isAllowedApi(name)` | function | `src/capture/sources.ts:221` | Gate predicate: api name allowlisted against `CAPTURED_SOURCES.apis`. |
| `isAllowedDerived(name)` | function | `src/capture/sources.ts:225` | Gate predicate: derived source name allowlisted against `CAPTURED_SOURCES.derived`. |
| `isAllowedRepo(repoPath)` | function | `src/capture/sources.ts:229` | Gate predicate: repo path allowlisted against `CAPTURED_SOURCES.git_repos`. |

### `src/capture/surfaces/fs-watcher.ts` — Filesystem change-event capture surface

**Purpose:** Watches a configured set of filesystem path prefixes (Cursor workspaceStorage, Claude projects) via chokidar and emits add/change/unlink events as capture candidates through the pipeline, classifying each path's file kind and ignoring Cursor's SQLite triplet (owned by the Cursor extractor) and other noise files.

**Depends on:** `../sources.js` (expandTilde), `../pipeline.js` (processCandidate), `../../logging/index.js`, `../../storage/interface.js` (Storage), external: `chokidar`, `node:fs`, `node:os`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FsFileKind` | type | `src/capture/surfaces/fs-watcher.ts:15` | Union: `'cursor-workspace' \| 'claude-project'`. |
| `classifyKind(absPath)` | function | `src/capture/surfaces/fs-watcher.ts:17` | Classifies an absolute path as cursor-workspace or claude-project by prefix match, else undefined. |
| `FsWatcherHandle` | interface | `src/capture/surfaces/fs-watcher.ts:23` | Public handle exposing `stop()`. |
| `EventType` | type | `src/capture/surfaces/fs-watcher.ts:27` | Union: `'add' \| 'change' \| 'unlink'`. |
| `FsEventContent` | interface | `src/capture/surfaces/fs-watcher.ts:29` | Candidate content shape: event_type, path, optional mtime/size. |
| `FsEventMetadata` | interface | `src/capture/surfaces/fs-watcher.ts:36` | Candidate metadata shape: surface='fs', optional file_kind. |
| `statAsync(absPath)` | function | `src/capture/surfaces/fs-watcher.ts:41` | Promise-wrapped `fs.stat` returning null on error instead of throwing. |
| `ignored(filepath)` | function | `src/capture/surfaces/fs-watcher.ts:47` | Chokidar ignore predicate: skips Cursor's state.vscdb family, -journal, .tmp, .DS_Store files. |
| `emitCandidate(event_type, absPath, stats, storage)` | function | `src/capture/surfaces/fs-watcher.ts:56` | Builds an fs-surface candidate (with stat-derived mtime/size for non-unlink events) and runs it through `processCandidate`. |
| `startFsWatcher(paths, storage)` | function | `src/capture/surfaces/fs-watcher.ts:91` | Expands tilde paths, starts a chokidar watcher with the ignore predicate, wires add/change/unlink/error handlers (each wrapped to prevent unhandled rejections), returns a stop handle. |

### `src/capture/surfaces/git-watcher.ts` — Git commit-history capture surface

**Purpose:** Polls (and optionally fs-watches `.git/HEAD`/`refs/heads`) a configured set of git repos for new commits, enumerates and formats each new commit (diff, stats, changed files, origin URL, canonical root) into a capture candidate, and emits them through the pipeline with per-repo checkpoint/backfill and origin-URL caching.

**Depends on:** `../git-state.js` (scrubOriginUrlCredentials), `../pipeline.js` (processCandidate), `../sources.js` (normalizeRepoPath), `../workspace-root.js` (canonicalizePath, GIT_PROBE_TIMEOUT_MS, gitToplevel), `../../guards.js` (isNonEmptyString), `../../logging/index.js`, `../../storage/interface.js` (Storage), external: `chokidar`, `node:child_process`, `node:fs/promises`, `node:path`, `node:util`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DIFF_TRUNCATE_BYTES` | const | `src/capture/surfaces/git-watcher.ts:17` | 100KB cap on emitted diff text, with a truncation notice appended. |
| `DEFAULT_POLL_MS` | const | `src/capture/surfaces/git-watcher.ts:18` | Default 30s poll interval for repos. |
| `DEFAULT_BACKFILL` | const | `src/capture/surfaces/git-watcher.ts:19` | Default 50-commit backfill limit on first discovery. |
| `FORMAT` | const | `src/capture/surfaces/git-watcher.ts:20` | `git log` custom format string using `\x1f`/`\x1e` field/record separators for sha/parents/date/author/subject/body. |
| `ORIGIN_CACHE_TTL_MS` | const | `src/capture/surfaces/git-watcher.ts:21` | 5s TTL for cached origin URLs. |
| `ORIGIN_CACHE_MAX_ENTRIES` | const | `src/capture/surfaces/git-watcher.ts:22` | Max 256 entries in the origin-URL cache. |
| `getBackfillCount()` | function | `src/capture/surfaces/git-watcher.ts:24` | Reads `ECHO_GIT_BACKFILL_COMMITS` env override, else returns `DEFAULT_BACKFILL`. |
| `CommitInfo` | interface | `src/capture/surfaces/git-watcher.ts:33` | Parsed commit record: sha, parent_sha, author, author_iso, subject, body. |
| `git(args, cwd)` | function | `src/capture/surfaces/git-watcher.ts:42` | Runs a git subprocess in cwd, returns stdout or null (logging a warn) on failure. |
| `OriginCacheEntry` | interface | `src/capture/surfaces/git-watcher.ts:59` | Cached origin URL + expiresAt + config mtime for invalidation. |
| `originCache` | const | `src/capture/surfaces/git-watcher.ts:65` | Module-level Map caching per-repo origin URLs. |
| `lruSet(map, key, value, maxEntries)` | function | `src/capture/surfaces/git-watcher.ts:67` | Generic Map insert with oldest-eviction at capacity. |
| `repoConfigMtime(repo)` | function | `src/capture/surfaces/git-watcher.ts:75` | Returns the mtime of `.git/config`, or null if unreadable. |
| `getOriginUrl(repo)` | function | `src/capture/surfaces/git-watcher.ts:84` | Runs `git remote get-url origin` with a timeout, returns trimmed stdout or null. |
| `resolveOriginUrl(repo)` | function | `src/capture/surfaces/git-watcher.ts:96` | Returns the repo's origin URL (scrubbed of credentials), using a config-mtime-validated cache. |
| `resolveGitCanonicalRoot(repo)` | function | `src/capture/surfaces/git-watcher.ts:119` | Resolves and canonicalizes the repo's git toplevel path. |
| `getHead(repo)` | function | `src/capture/surfaces/git-watcher.ts:125` | Returns `git rev-parse HEAD` trimmed, or null. |
| `parseCommitRecords(out)` | function | `src/capture/surfaces/git-watcher.ts:130` | Parses `FORMAT`-delimited `git log` output into `CommitInfo[]`. |
| `enumerateNewCommits(repo, newHead, lastSeen, backfillLimit)` | function | `src/capture/surfaces/git-watcher.ts:169` | Runs `git log --reverse` either as a `lastSeen..newHead` range or a backfill-limited scan from newHead, parses into commits. |
| `CommitStats` | interface | `src/capture/surfaces/git-watcher.ts:187` | files_changed/additions/deletions counts. |
| `getCommitStats(repo, sha)` | function | `src/capture/surfaces/git-watcher.ts:193` | Parses `git show --shortstat` output into a `CommitStats` via regex. |
| `getChangedFiles(repo, sha, parent)` | function | `src/capture/surfaces/git-watcher.ts:209` | Returns absolute paths of files changed in a commit (diff vs parent, or show for root commits). |
| `getDiff(repo, sha, parent)` | function | `src/capture/surfaces/git-watcher.ts:228` | Returns the commit's diff text (vs parent or full show), truncated at `DIFF_TRUNCATE_BYTES`. |
| `shortSha(sha)` | function | `src/capture/surfaces/git-watcher.ts:243` | Returns the first 7 characters of a sha. |
| `buildAndEmit(repo, commit, storage)` | function | `src/capture/surfaces/git-watcher.ts:247` | Gathers stats/diff/changed-files/origin/canonical-root in parallel, builds a `git:<repo>` candidate, and runs it through `processCandidate`. |
| `_resetGitWatcherOriginCache()` | function | `src/capture/surfaces/git-watcher.ts:289` | Test-only: clears the origin-URL cache. |
| `discoverLastSeen(repo, storage)` | function | `src/capture/surfaces/git-watcher.ts:293` | Walks `git log` from HEAD backwards to find the first sha already present in storage, avoiding duplicate re-emission on restart. |
| `GitWatcherHandle` | interface | `src/capture/surfaces/git-watcher.ts:317` | Public handle exposing `stop()`. |
| `GitWatcherOptions` | interface | `src/capture/surfaces/git-watcher.ts:321` | Constructor options: pollIntervalMs, enableFsWatch. |
| `RepoState` | interface | `src/capture/surfaces/git-watcher.ts:326` | Per-repo mutable state: repo path, lastSeen sha, busy flag. |
| `startGitWatcher(repoPaths, storage, options)` | function | `src/capture/surfaces/git-watcher.ts:332` | Boots per-repo state, optional chokidar watchers on `.git/HEAD`/refs, a poll timer, and an initial backfill refresh; each repo's `refreshRepo` discovers lastSeen, diffs against new HEAD, enumerates+emits new commits serially, and returns a stop handle awaiting in-flight refreshes. |

### `src/capture/surfaces/granola-poller.ts` — Granola meeting-notes API poller (checkpointed sync)

**Purpose:** Polls the Granola public API for meeting notes (summary + transcript), converts them into capture events, and feeds them through the shared capture pipeline; tracks progress via an atomically-written JSON checkpoint so restarts resume from the high-water mark without re-ingesting notes.

**Depends on:** `src/guards.js` (isNonEmptyString), `src/echo-home/paths.js` (ECHO_HOME_PATHS), `src/echo-home/adapters/atomic-write.js`, `src/logging/index.js`, `src/storage/interface.js` (CaptureEvent, Storage types), `src/util/json.js` (parseJson), `src/capture/pipeline.js` (processCandidate); external: node:fs, node:path, global `fetch`/`AbortController`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GRANOLA_SOURCE` | const | `src/capture/surfaces/granola-poller.ts:11` | Source tag `'api:granola'` stamped on capture events. |
| `GRANOLA_API_BASE_URL` | const | `src/capture/surfaces/granola-poller.ts:12` | Default Granola public API base URL. |
| `GRANOLA_CHECKPOINT_SCHEMA_VERSION` | const | `src/capture/surfaces/granola-poller.ts:13` | Schema version literal (1) embedded in checkpoint files for validation. |
| `DEFAULT_GRANOLA_POLL_INTERVAL_MS` | const | `src/capture/surfaces/granola-poller.ts:14` | Default poll interval (60s) for the background poller loop. |
| `DEFAULT_GRANOLA_REQUEST_TIMEOUT_MS` | const | `src/capture/surfaces/granola-poller.ts:15` | Default per-HTTP-request timeout (15s). |
| `DEFAULT_GRANOLA_PAGE_SIZE` | const | `src/capture/surfaces/granola-poller.ts:16` | Default page size (30), matching Granola API's hard cap. |
| `GRANOLA_API_KEY_RE` | const (regex) | `src/capture/surfaces/granola-poller.ts:17` | Validates API keys have the `grn_` prefix format. |
| `GranolaListNote` | interface | `src/capture/surfaces/granola-poller.ts:21` | Shape of a note entry returned by the list-notes endpoint. |
| `GranolaTranscriptItem` | interface | `src/capture/surfaces/granola-poller.ts:30` | Shape of one transcript turn (text, timing, speaker). |
| `GranolaNoteDetail` | interface | `src/capture/surfaces/granola-poller.ts:39` | Full note detail including summary, transcript, attendees, calendar event. |
| `GranolaListParams` | interface | `src/capture/surfaces/granola-poller.ts:49` | Query params for listing notes (updated_after, cursor, page_size). |
| `GranolaListResponse` | interface | `src/capture/surfaces/granola-poller.ts:55` | Paginated list-notes response shape. |
| `GranolaApiClient` | interface | `src/capture/surfaces/granola-poller.ts:61` | Client contract: `listNotes`/`getNote`, implemented by `HttpGranolaApiClient` or test doubles. |
| `GranolaCheckpoint` | interface | `src/capture/surfaces/granola-poller.ts:66` | Persisted sync state: schema version, high-water mark, ingested note ids, last synced timestamp. |
| `GranolaPollOptions` | interface | `src/capture/surfaces/granola-poller.ts:73` | Options for a single poll pass (checkpoint path, clock, page size, retry delay). |
| `GranolaPollResult` | type | `src/capture/surfaces/granola-poller.ts:80` | Discriminated union: ok (counts) / skipped (in_flight or disabled) / error (reason + message). |
| `GranolaErrorReason` | type | `src/capture/surfaces/granola-poller.ts:85` | Enumerates failure classes: auth, rate limit, timeout, pagination, checkpoint, api, pipeline. |
| `GranolaPollerHandle` | interface | `src/capture/surfaces/granola-poller.ts:94` | Handle returned by `startGranolaPoller`: enabled flag, `poll()`, `stop()`. |
| `GranolaPollerOptions` | interface | `src/capture/surfaces/granola-poller.ts:100` | Options for starting the background poller (client injection, api key/env/config path, interval, runOnStart). |
| `ApiKeyResolution` | type | `src/capture/surfaces/granola-poller.ts:111` | Discriminated union describing whether/why an API key resolved, and its source. |
| `GranolaApiError` | class | `src/capture/surfaces/granola-poller.ts:119` | Error subtype carrying a `reason`, optional HTTP `status`, and `retryAfterMs`. |
| `GranolaCheckpointError` | class | `src/capture/surfaces/granola-poller.ts:131` | Error subtype for checkpoint read/parse/schema failures. |
| `granolaCheckpointPath()` | function | `src/capture/surfaces/granola-poller.ts:138` | Returns the default checkpoint file path under ECHO_HOME state dir. |
| `granolaConfigPath()` | function | `src/capture/surfaces/granola-poller.ts:142` | Returns the default config file path (`granola.json`) holding the API key. |
| `isErrnoException(err)` | function | `src/capture/surfaces/granola-poller.ts:146` | Type guard for Node `ErrnoException` (checks `code` property). |
| `isPlainObject(value)` | function | `src/capture/surfaces/granola-poller.ts:150` | Type guard for non-null, non-array objects. |
| `isValidGranolaApiKey(value)` | function | `src/capture/surfaces/granola-poller.ts:154` | Validates a value is a string matching `GRANOLA_API_KEY_RE`. |
| `disabledKey(reason)` | function | `src/capture/surfaces/granola-poller.ts:158` | Logs a disabled-poller reason and returns a `skipped: disabled` result. |
| `resolveGranolaApiKey(env, configPath, optionApiKey)` | function | `src/capture/surfaces/granola-poller.ts:163` | Resolves API key precedence: explicit option → `GRANOLA_API_KEY` env → `granola.json` config file; returns enabled/disabled resolution with source. |
| `HttpGranolaApiClient` | class | `src/capture/surfaces/granola-poller.ts:213` | Concrete `GranolaApiClient` using `fetch`, bearer auth, and abort-based timeouts. |
| `HttpGranolaApiClient.listNotes(params)` | method | `src/capture/surfaces/granola-poller.ts:223` | Builds `/notes` query with updated_after/cursor/page_size and parses the paginated response. |
| `HttpGranolaApiClient.getNote(noteId)` | method | `src/capture/surfaces/granola-poller.ts:237` | Fetches `/notes/{id}?include=transcript` and parses full note detail. |
| `HttpGranolaApiClient.url(path)` | method | `src/capture/surfaces/granola-poller.ts:243` | Builds an absolute URL against the configured or default base URL. |
| `HttpGranolaApiClient.fetchJson(url)` | method | `src/capture/surfaces/granola-poller.ts:247` | Performs the timed, aborted fetch call; maps HTTP 401/403→auth_failed, 429→rate_limited (with retry-after), other non-OK→api_failed, abort→timeout. |
| `parseRetryAfterMs(value)` | function | `src/capture/surfaces/granola-poller.ts:298` | Parses a `Retry-After` header (seconds or HTTP-date) into milliseconds. |
| `parseListResponse(value)` | function | `src/capture/surfaces/granola-poller.ts:307` | Validates and normalizes a raw list-notes JSON payload into `GranolaListResponse`, throwing `pagination_failed` on malformed shape. |
| `parseListNote(value)` | function | `src/capture/surfaces/granola-poller.ts:330` | Validates and normalizes one raw note entry, requiring a string `id`. |
| `parseNoteDetail(value)` | function | `src/capture/surfaces/granola-poller.ts:345` | Extends `parseListNote` with summary/transcript/attendees/calendar/folder/web_url fields. |
| `copyStringFields(from, to, fields)` | function | `src/capture/surfaces/granola-poller.ts:368` | Copies specified string-or-null fields from one object to another. |
| `emptyCheckpoint()` | function | `src/capture/surfaces/granola-poller.ts:383` | Returns a fresh zeroed `GranolaCheckpoint`. |
| `loadGranolaCheckpoint(filePath)` | function | `src/capture/surfaces/granola-poller.ts:392` | Reads and validates the checkpoint JSON file, returning empty checkpoint on ENOENT and throwing `GranolaCheckpointError` on schema/parse issues; dedupes+sorts ingested note ids. |
| `writeGranolaCheckpoint(checkpoint, filePath)` | function | `src/capture/surfaces/granola-poller.ts:430` | Ensures the state dir exists and atomically writes the checkpoint JSON. |
| `maxIso(a, b)` | function | `src/capture/surfaces/granola-poller.ts:441` | Returns the later of two ISO timestamps (tolerating undefined/invalid `b`). |
| `speakerName(speaker)` | function | `src/capture/surfaces/granola-poller.ts:447` | Resolves a display name for a transcript speaker from string, name, or email fields, defaulting to `'Speaker'`. |
| `renderGranolaTranscript(transcript)` | function | `src/capture/surfaces/granola-poller.ts:458` | Renders transcript turns into `[start-end] Speaker: text` lines, skipping empty text. |
| `addIfDefined(meta, key, value)` | function | `src/capture/surfaces/granola-poller.ts:474` | Sets a metadata key only if the value is not undefined/null. |
| `mergedDetail(listNote, detail)` | function | `src/capture/surfaces/granola-poller.ts:478` | Merges a list-note stub with fetched note detail, preferring detail fields with list-note fallbacks. |
| `granolaNoteToCaptureEvents(note, observedAt)` | function | `src/capture/surfaces/granola-poller.ts:490` | Converts a merged Granola note into a `[summary, transcript]` pair of capture events, each with a `dedupe_key` (`granola:<id>:summary`/`:transcript`) and shared metadata (owner, attendees, calendar_event, folder_membership, web_url). |
| `sleep(ms)` | function | `src/capture/surfaces/granola-poller.ts:535` | Promise-based delay helper, no-op for ms<=0. |
| `withRateLimitRetry(label, op, retryDelayMs)` | function | `src/capture/surfaces/granola-poller.ts:540` | Runs `op`; on a `rate_limited` `GranolaApiError`, sleeps (using retry-after or default delay) and retries once, logging repeated rate-limit failures. |
| `errorReason(err)` | function | `src/capture/surfaces/granola-poller.ts:563` | Maps a caught error to a `GranolaErrorReason`, defaulting to `pipeline_failed`. |
| `logPollError(err, stage)` | function | `src/capture/surfaces/granola-poller.ts:569` | Logs a poll failure at the appropriate log key based on error reason and pipeline stage. |
| `pollGranolaOnce(storage, client, options)` | function | `src/capture/surfaces/granola-poller.ts:579` | Runs one full poll: loads checkpoint, paginates `listNotes` (capped at 1000 pages) since the high-water mark, fetches detail + converts to capture events + runs `processCandidate` for each new note, writing the checkpoint after every note (partial) and once more at the end; returns ok/error result with counts. |
| `startGranolaPoller(storage, options)` | function | `src/capture/surfaces/granola-poller.ts:695` | Resolves the API key (or accepts an injected client), and if enabled starts a self-unref'd `setInterval` loop calling `pollGranolaOnce`, guarding against overlapping in-flight polls; returns a handle with `poll`/`stop`. Disabled state returns a no-op handle. |

### `src/capture/workspace-root.ts` — Project/workspace root resolution and path canonicalization

**Purpose:** Determines the canonical project root for a given filesystem path — preferring `git rev-parse --show-toplevel`, falling back to walking up for known project anchor files (package.json, go.mod, etc.) while respecting a HOME ceiling and ambient-root exclusions — and canonicalizes paths (resolving symlinks/case-insensitivity) for stable identity keys used elsewhere in capture.

**Depends on:** none (only Node builtins: node:child_process, node:fs/promises, node:path, node:util)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GIT_PROBE_TIMEOUT_MS` | const | `src/capture/workspace-root.ts:8` | Timeout (1500ms) applied to the `git rev-parse` subprocess probe. |
| `PROJECT_ANCHORS` | const | `src/capture/workspace-root.ts:10` | Ordered list of filenames (`.git`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`) used to detect a project root when git is unavailable. |
| `CanonicalizeOptions` | interface | `src/capture/workspace-root.ts:19` | Test-only override for filesystem case-sensitivity detection. |
| `gitToplevel(path)` | function | `src/capture/workspace-root.ts:23` | Runs `git -C <path> rev-parse --show-toplevel` with a timeout; returns the trimmed toplevel path or null on any failure/empty output. |
| `resolveCanonicalRoot(path)` | function | `src/capture/workspace-root.ts:36` | Top-level entry: tries git toplevel first, then anchor-file walk-up, then falls back to the canonicalized input path itself. |
| `canonicalizePath(path)` | function | `src/capture/workspace-root.ts:50` | Public wrapper that canonicalizes a path with default (auto-detected) case-sensitivity options. |
| `_canonicalizePathForTest(path, options)` | function | `src/capture/workspace-root.ts:54` | Test-only entry point allowing explicit case-insensitivity override. |
| `canonicalizePathInternal(path, options)` | function | `src/capture/workspace-root.ts:61` | Resolves the absolute path, finds the longest existing real path prefix, rejoins any missing trailing segments, and lowercases the result if the filesystem is case-insensitive. |
| `longestExistingPrefix(absolutePath)` | function | `src/capture/workspace-root.ts:75` | Walks up from the absolute path until `realpath` succeeds, returning the resolved existing prefix plus the list of missing trailing path segments. |
| `isCaseInsensitiveFilesystem(existingPath)` | function | `src/capture/workspace-root.ts:94` | Detects case-insensitive filesystems by comparing realpaths of the path and a single-character-case-flipped variant. |
| `firstCaseVariant(path)` | function | `src/capture/workspace-root.ts:105` | Returns a copy of `path` with the first case-able character's case flipped, or null if none exists. |
| `findAnchorRoot(startPath)` | function | `src/capture/workspace-root.ts:117` | Walks up from `startPath` looking for a directory containing a `PROJECT_ANCHORS` file, skipping ambient roots, and stopping at the HOME ceiling (returns null there) or filesystem root. |
| `hasProjectAnchor(dir)` | function | `src/capture/workspace-root.ts:134` | Checks whether any of `PROJECT_ANCHORS` exists (via `stat`) in the given directory. |
| `resolvedHome()` | function | `src/capture/workspace-root.ts:146` | Resolves `process.env.HOME` to its realpath, or null if unset/unresolvable. |
| `isAmbientRoot(path, home)` | function | `src/capture/workspace-root.ts:156` | Identifies paths that should never be treated as a project root: filesystem root, `/tmp`, `/private/tmp`, or the HOME directory itself. |
| `samePath(a, b)` | function | `src/capture/workspace-root.ts:167` | Compares two paths after normalization for equality. |
| `pathContainsOrEquals(path, root)` | function | `src/capture/workspace-root.ts:171` | Checks whether `path` equals or is nested under `root` after normalization. |

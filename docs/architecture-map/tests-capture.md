# `tests/capture/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 12 files.

### `tests/capture/canonical-root-capture.test.ts` — canonical_root stamping cross-extractor test

**Purpose:** Exercises three capture surfaces (Claude Code extractor, Codex extractor, git watcher) to verify each stamps `metadata.canonical_root` (a symlink/realpath-resolved repo root) alongside `metadata.repo_root`, so downstream consumers can dedupe repos reached via different symlink paths.

**Depends on:** `src/capture/extractors/claude-code.js`, `src/capture/extractors/codex.js`, `src/capture/sources.js`, `src/capture/surfaces/git-watcher.js`, `src/capture/workspace-root.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/jsonl.js`, `node:child_process`, `node:fs`, `node:os`, `node:path`, `node:util`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ClaudeLine` | interface | `tests/capture/canonical-root-capture.test.ts:24` | Shape of a Claude Code JSONL transcript line used to build test fixtures. |
| `CodexLine` | interface | `tests/capture/canonical-root-capture.test.ts:33` | Shape of a Codex rollout JSONL line used to build test fixtures. |
| `describe: "canonical_root capture stamping"` | describe block | `tests/capture/canonical-root-capture.test.ts:39` | Covers: Claude Code extractor stamps `canonical_root` from turn cwd; Codex extractor stamps `canonical_root` from cwd/repo_root; git watcher stamps canonicalized git toplevel alongside `repo_root` (via a symlinked repo path in the allowlist). |
| `tempDir(prefix)` | function | `tests/capture/canonical-root-capture.test.ts:66` | Creates a realpath-resolved temp directory and registers it for cleanup. |
| `makeRepo(prefix)` | function | `tests/capture/canonical-root-capture.test.ts:72` | Initializes a throwaway git repo (branch `main`, test user, gpgsign off) in a temp dir. |
| `commitFile(repo, file, contents, message)` | function | `tests/capture/canonical-root-capture.test.ts:81` | Writes a file into the repo and creates a git commit containing it. |
| `pushAllowedRepo(repo)` | function | `tests/capture/canonical-root-capture.test.ts:92` | Pushes a repo path onto `CAPTURED_SOURCES.git_repos` for the duration of the test and registers removal on cleanup. |
| `claudeUser(repo, text, uuid)` | function | `tests/capture/canonical-root-capture.test.ts:101` | Builds a Claude Code JSONL user-turn line with the given cwd/text/uuid. |
| `claudeAssistant(repo, text, uuid)` | function | `tests/capture/canonical-root-capture.test.ts:112` | Builds a Claude Code JSONL assistant-turn line with text content. |
| `codexSessionMeta(repo)` | function | `tests/capture/canonical-root-capture.test.ts:123` | Builds a Codex `session_meta` JSONL line stamped with a fixed session id and the given cwd. |
| `codexMessage(role, text)` | function | `tests/capture/canonical-root-capture.test.ts:134` | Builds a Codex `response_item` message line (input_text for user, output_text for assistant). |

### `tests/capture/extractors/claude-code.test.ts` — Claude Code JSONL extractor unit + lifecycle tests

**Purpose:** Tests both the pure parser `extractClaudeCodeTurns` (cluster-pairing of user/assistant JSONL lines into turns, tool_use/tool_result/thinking metadata, offset resumability, malformed-line tolerance, tool-call overflow capping) and the stateful `startClaudeCodeExtractor` watcher lifecycle (file-watch pipeline, subagent JSONL discovery, offset-map backfill/resume, git branch/version metadata threading, mid-batch storage-failure recovery, and clean shutdown).

**Depends on:** `src/capture/sources.js`, `src/capture/extractors/claude-code.js`, `src/storage/interface.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/jsonl.js`, `tests/fixtures/stdout.js`, `node:fs`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `MidBatchFailingStorage` | class | `tests/capture/extractors/claude-code.test.ts:18` | `MemoryStorage` subclass whose `append` throws once for the first event whose content contains a given marker, to simulate a mid-batch storage failure inside the extractor's change handler. |
| `MidBatchFailingStorage.append(event)` | method | `tests/capture/extractors/claude-code.test.ts:25` | Throws a synthetic error the first time it sees the marked content, otherwise delegates to `MemoryStorage.append`. |
| `JsonlLine` | interface | `tests/capture/extractors/claude-code.test.ts:34` | Shape of a Claude Code JSONL transcript line used across the fixture builders. |
| `userText(sessionId, uuid, text, ts)` | function | `tests/capture/extractors/claude-code.test.ts:43` | Builds a user-turn JSONL line with plain string message content. |
| `assistantText(sessionId, uuid, text, ts)` | function | `tests/capture/extractors/claude-code.test.ts:54` | Builds an assistant-turn JSONL line with a single text content block. |
| `assistantToolUse(sessionId, uuid)` | function | `tests/capture/extractors/claude-code.test.ts:70` | Builds an assistant JSONL line containing a `tool_use` content block (Bash tool). |
| `userToolResult(sessionId, uuid)` | function | `tests/capture/extractors/claude-code.test.ts:84` | Builds a user JSONL line containing a `tool_result` content block replying to a tool_use. |
| `describe: "extractClaudeCodeTurns (pure)"` | describe block | `tests/capture/extractors/claude-code.test.ts:98` | Covers static-fixture parsing, multi-assistant-line clustering, offset-0 and resumed reads, partial (no-trailing-newline) line handling, dropped-user classification (inject/prompt), incomplete-turn/orphan-assistant handling, malformed-JSON-line skipping, byte_offset correctness, tool_use+tool_result interleaving, missing-file and past-EOF offset behavior, tool_calls/thinking Tier-3 metadata extraction, per-line gitBranch/permissionMode/version/model surfacing (and omission when absent), and tool-call-overflow accounting (cap at 50, `tool_call_total`, `tool_calls_truncated`). |
| `describe: "startClaudeCodeExtractor (lifecycle + integration)"` | describe block | `tests/capture/extractors/claude-code.test.ts:524` | Covers end-to-end CandidateEvent emission on file growth; `repo_root` population from JSONL cwd; `files_referenced` extraction (and omission) from tool_use inputs; chronological multi-append ordering without duplicates; offset-map backfill/resume from prior storage; boot-time discovery of pre-existing (including subagent) JSONL files; mid-session subagent subdirectory discovery via recursive watch; stale vs fresh `git_state` stamping from JSONL gitBranch; threading of gitBranch/permissionMode/cli_version/model into metadata; per-turn offset checkpointing so a mid-batch storage throw doesn't re-append prior turns; and clean `stop()` semantics. |

### `tests/capture/extractors/codex.test.ts` — Codex JSONL extractor unit + lifecycle tests

**Purpose:** Tests both the pure parser `extractCodexTurns` (session_meta/turn_context field extraction, cluster-pairing, git/codex metadata carry-forward across incremental passes, tool_calls/files_referenced/thinking Tier-3 metadata, tool-call overflow capping, per-turn turn_context drift) and the stateful `startCodexExtractor` watcher lifecycle (pipeline emission, rapid-append polling fallback, metadata landing through storage, offset/cwd/git/codex restoration on daemon restart, mid-batch failure recovery, clean shutdown, and the `CAPTURED_SOURCES` allowlist declaration for `~/.codex/sessions/`).

**Depends on:** `src/capture/sources.js`, `src/capture/extractors/codex.js`, `src/storage/interface.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/jsonl.js`, `tests/fixtures/stdout.js`, `node:fs`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `MidBatchFailingStorage` | class | `tests/capture/extractors/codex.test.ts:18` | `MemoryStorage` subclass whose `append` throws once for the first event whose content contains a given marker, simulating a mid-batch storage failure. |
| `MidBatchFailingStorage.append(event)` | method | `tests/capture/extractors/codex.test.ts:25` | Throws a synthetic error the first time it sees the marked content, otherwise delegates to `MemoryStorage.append`. |
| `CodexLine` | interface | `tests/capture/extractors/codex.test.ts:36` | Shape of a Codex rollout JSONL line (`timestamp`, `type`, `payload`) used by all fixture builders. |
| `sessionMeta(opts)` | function | `tests/capture/extractors/codex.test.ts:42` | Builds a `session_meta` JSONL line with configurable id/cwd/source/cli_version/model_provider/git fields. |
| `turnContext(opts)` | function | `tests/capture/extractors/codex.test.ts:66` | Builds a `turn_context` JSONL line with configurable model/effort/personality/approval_policy/sandbox_policy/permission_profile/file_system_sandbox_policy fields. |
| `userMsg(text, ts)` | function | `tests/capture/extractors/codex.test.ts:133` | Builds a `response_item` message line with role `user` and `input_text` content. |
| `assistantMsg(text, ts)` | function | `tests/capture/extractors/codex.test.ts:145` | Builds a `response_item` message line with role `assistant` and `output_text` content. |
| `developerMsg(text)` | function | `tests/capture/extractors/codex.test.ts:157` | Builds a `response_item` message line with role `developer` (treated as system noise by the parser). |
| `functionCall(name, argsStr, call_id)` | function | `tests/capture/extractors/codex.test.ts:169` | Builds a `function_call` response_item line with a name, JSON args string, and call id. |
| `functionCallOutput(call_id, output)` | function | `tests/capture/extractors/codex.test.ts:177` | Builds a `function_call_output` response_item line matching a call id to its output text. |
| `reasoning(text)` | function | `tests/capture/extractors/codex.test.ts:185` | Builds a `reasoning` response_item line with an optional summary_text block. |
| `eventMsg(payload, ts)` | function | `tests/capture/extractors/codex.test.ts:196` | Builds a generic `event_msg` line (default payload is a token_count event). |
| `taskComplete(ts)` | function | `tests/capture/extractors/codex.test.ts:203` | Builds an `event_msg` line of type `task_complete` carrying `turn_id` and `last_agent_message`. |
| `describe: "extractCodexTurns (pure)"` | describe block | `tests/capture/extractors/codex.test.ts:216` | Covers empty-file and session_meta-only no-op cases; pending-cluster (no second user) offset stability; cluster emission on second user arrival; multi-line assistant clustering; `had_tool_use` detection via function_call; reasoning/event_msg lines ignored for pairing; developer-role messages ignored; two-cluster session emitting two turns; malformed-JSON-line skipping; cwd/git/codex carry-forward across incremental passes via `lastKnownCwd`/`lastKnownGit`/`lastKnownCodex` (plus regression guards when omitted); byte-offset progression across passes; missing-file handling; session_id extraction from rollout filename UUID; Tier-1 git/source/cli_version/model_provider/turn_context field extraction and merging into one `codex` object; omission of git/codex when absent; tool_calls extraction with name/args/output/call_id and `is_error` flag from output text; `files_referenced` extraction from structured function-call args and `apply_patch` patch bodies; thinking-block extraction from reasoning lines; tool_calls/thinking omission when absent; tool-call overflow capping at 50 with `tool_call_total`/`tool_calls_truncated`; and per-turn `turn_context` drift (later turn_context updates `codex` for the next turn only). |
| `describe: "startCodexExtractor (lifecycle + integration)"` | describe block | `tests/capture/extractors/codex.test.ts:738` | Covers boot-time discovery of pre-existing/frozen JSONL files; CandidateEvent emission through the pipeline on cluster close; rapid back-to-back appends caught by the polling fallback within one interval; `metadata.git`/`metadata.codex`/`metadata.git_state` landing through the pipeline; tool-overflow and `files_referenced` metadata landing through the pipeline; git/codex restoration from prior storage events on daemon restart; `cwd`→`repo_root` mirroring; cwd persistence across multiple daemon ticks and restoration via `backfillOffsetMap` on restart; end-to-end ordered non-duplicate turns across appends; offset-map backfill idempotent resume; per-turn offset checkpointing so a mid-batch storage throw doesn't re-append prior turns; and clean `stop()` semantics. |
| `describe: "CAPTURED_SOURCES allowlist update for codex sessions"` | describe block | `tests/capture/extractors/codex.test.ts:1153` | Asserts `CAPTURED_SOURCES.fs_paths` declares `~/.codex/sessions/` as an allowed capture path. |

### `tests/capture/extractors/cursor.test.ts` — unit/integration tests for the Cursor SQLite extractor

**Purpose:** Exercises `src/capture/extractors/cursor.js` — the pure bubble-pairing/parsing logic (`extractCursorTurns`), the fallback text-extraction parsers, the chokidar-driven `startCursorExtractor` lifecycle (quarantined), the periodic re-poll mechanism (item 034 AC1), and `repo_root` resolution (item 037). Covers checkpoint/lastSeenMap advancement, multi-bubble assistant clusters, continuation atoms (item 036), malformed/NULL row handling, and the allowlist registration for Cursor's globalStorage path.

**Depends on:** `src/capture/sources.js`, `src/capture/extractors/cursor.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/cursor-globalstorage.js`, `tests/fixtures/stdout.js`; external: `better-sqlite3`, `vitest`, `node:fs`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tmpDir()` | function | `tests/capture/extractors/cursor.test.ts:30` | Creates a fresh temp directory under the OS tmpdir prefixed `echo-cursor-`. |
| `waitFor(predicate, timeoutMs)` | function | `tests/capture/extractors/cursor.test.ts:34` | Polls an async/sync predicate every 25ms until true or throws on timeout. |
| `eightPairFixture()` | function | `tests/capture/extractors/cursor.test.ts:1343` | Builds an 8-turn-pair fixture mixing text-only, tool-call-only, fileDiff, codeBlocks, and thinkingContent assistant bubbles to prove both AC1 (re-poll) and AC2 (fallback chain) are independently load-bearing. |
| `startWithInjections(opts)` | function | `tests/capture/extractors/cursor.test.ts:1526` | Starts `startCursorExtractor` with test-hook overrides for Stage 1 (workspace-registry) and Stage 2 (file-walk) repo_root resolvers, resets the mtime checkpoint to 0. |
| `describe: "extractCursorTurns (pure)"` | test suite | `tests/capture/extractors/cursor.test.ts:46` | Verifies pure turn-pairing: empty-checkpoint full extraction, multi-composer independence, per-composer checkpoint resume, multi-assistant-bubble clustering, context (attached/referenced/deleted files) extraction, orphan-assistant warnings, continuation-atom emission/checkpoint semantics (AC3 tests 1-5), malformed JSON/unknown-type/NULL row handling, missing composer-header dedup-warn-once. |
| `describe.skip: "startCursorExtractor (lifecycle + integration)"` | test suite | `tests/capture/extractors/cursor.test.ts:543` | QUARANTINED (chokidar/FSEvents flake, item 023): end-to-end CandidateEvent emission on globalStorage/WAL change, coalescing, workspace_id inference, session_id aliasing, files_referenced flattening, chronological ordering, lastSeenMap backfill from prior storage, and `stop()` teardown. |
| `describe: "CAPTURED_SOURCES allowlist update for globalStorage"` | test suite | `tests/capture/extractors/cursor.test.ts:870` | Confirms the Cursor globalStorage fs_path is registered and accepted by `_isAllowedPathIn`. |
| `describe: "parseBubbleRow fallback chain (AC2 — item 034)"` | test suite | `tests/capture/extractors/cursor.test.ts:887` | Validates the text-fallback precedence chain (text > toolFormerData > fileDiff > codeBlocks > thinkingContent), per-bubble `bubble_text_sources` recording/omission, path-only codeBlocks negative case, and that each `tryExtract*` parser returns null (never throws) on shape mismatch. |
| `describe: "startCursorExtractor periodic re-poll (AC1 — item 034)"` | test suite | `tests/capture/extractors/cursor.test.ts:1110` | Uses the `__testHooks` seam (`setLastSeenScanMtime`, `triggerRepoll`) to test the family-max-mtime guard: first-tick capture after checkpoint reset, no-op short-circuit on unchanged mtime, capture on mtime advance, and WAL-only mtime advance detection (main DB mtime frozen) via `maxGlobalDbFamilyMtime`. |
| `describe: "startCursorExtractor 034 revert-mechanism (AC3 — item 034)"` | test suite | `tests/capture/extractors/cursor.test.ts:1330` | Control run captures all 8 pairs; disabling re-poll (no second trigger) or disabling tool-call fallbacks (`__disableToolCallFallbacks`) each independently causes ≥3 missing pairs, proving both fixes are load-bearing. |
| `describe: "CURSOR_REPOLL_INTERVAL_MS configuration (AC1 — item 034)"` | test suite | `tests/capture/extractors/cursor.test.ts:1486` | Asserts the re-poll interval constant is 15000ms with no env override. |
| `describe: "startCursorExtractor repo_root resolution (item 037 / AC1)"` | test suite | `tests/capture/extractors/cursor.test.ts:1498` | Tests the two-stage repo_root resolver: Stage 1 (workspace-registry lookup via `refreshWorkspaceMap`) wins over Stage 2 (file-walk from referenced files), Stage 2 caches per-composer, ambiguous multi-repo files omit repo_root, both-fail is silent, cache invalidation when a late-arriving binding overrides the Stage-2 cache, warn-dedup for repeated resolution failures, and coexistence of `workspace_id` + `repo_root` writes. |

### `tests/capture/gate.test.ts` — unit tests for the capture-gate allowlist validator

**Purpose:** Exercises `src/capture/gate.js`'s `gate()` function — the single chokepoint that validates and allowlist-checks every `CandidateEvent` before it can enter storage. Covers rejection reasons (unknown_app/domain/path/api, malformed_event), acceptance against a fixture-extended allowlist, determinism, and the never-throws/one-log-line-per-call purity contract.

**Depends on:** `src/capture/gate.js`, `src/capture/sources.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/stdout.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `validEvent(overrides)` | function | `tests/capture/gate.test.ts:10` | Builds a well-formed `CandidateEvent` fixture (fs source, timestamp, content) with override support. |
| `parseLine(line)` | function | `tests/capture/gate.test.ts:19` | Parses a captured stdout JSONL log line into a record, stripping the trailing newline. |
| `describe: "gate"` | test suite | `tests/capture/gate.test.ts:23` | Top-level suite wiring stdout capture and allowlist reset around all gate() behavior checks below. |
| `describe: "reject — well-formed but not in allowlist (current empty state)"` | test suite | `tests/capture/gate.test.ts:33` | Verifies each source kind (app/domain/fs/api) rejects with its specific `unknown_*` reason plus a matching warn log entry when the allowlist is empty. |
| `describe: "reject — malformed event"` | test suite | `tests/capture/gate.test.ts:68` | Table-driven check (null/undefined/number/string/array/empty object, missing/wrong-type fields, malformed source-kind prefixes) all return `malformed_event` with a warn log. |
| `describe: "accept — fixture-extended allowlist"` | test suite | `tests/capture/gate.test.ts:136` | Verifies app/domain/fs/api sources are accepted with `allowlisted` reason and an info log once the corresponding fixture entry is added to `CAPTURED_SOURCES`. |
| `describe: "determinism"` | test suite | `tests/capture/gate.test.ts:174` | Confirms 100 identical calls produce identical rejection results and 100 log lines. |
| `describe: "purity / total function"` | test suite | `tests/capture/gate.test.ts:188` | Confirms `gate()` never throws on adversarial inputs (Symbol, function, Map, Set, null-prototype object) and always emits exactly one well-formed JSON log line per call. |

### `tests/capture/granola-poller.test.ts` — unit tests for the Granola meeting-notes API poller

**Purpose:** Exercises `src/capture/surfaces/granola-poller.js` — pagination, checkpointing, dedupe, retry/error handling, single-flight polling, and config/API-key resolution for the Granola integration. Uses a hand-rolled `MockGranolaClient` implementing `GranolaApiClient` to script `listNotes`/`getNote` responses (including errors and delayed promises).

**Depends on:** `src/capture/surfaces/granola-poller.js`, `src/storage/memory.js`, `tests/fixtures/stdout.js`; external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `MockGranolaClient` | class | `tests/capture/granola-poller.test.ts:25` | Test double implementing `GranolaApiClient`; records `listCalls`/`detailCalls` and replays a scripted queue of responses/errors/deferred functions. |
| `MockGranolaClient.listNotes(params)` | method | `tests/capture/granola-poller.test.ts:34` | Pops the next scripted list-step, throwing if it's an Error or none queued, else returning/awaiting it. |
| `MockGranolaClient.getNote(noteId)` | method | `tests/capture/granola-poller.test.ts:43` | Looks up the scripted detail-step for `noteId`, throwing if missing or an Error. |
| `tempCheckpoint()` | function | `tests/capture/granola-poller.test.ts:53` | Creates a temp dir + checkpoint file path for isolated checkpoint I/O per test. |
| `detail(id, updatedAt)` | function | `tests/capture/granola-poller.test.ts:58` | Builds a full `GranolaNoteDetail` fixture (summary, transcript, attendees, web_url) for a given note id. |
| `listResponse(ids, opts)` | function | `tests/capture/granola-poller.test.ts:79` | Builds a `GranolaListResponse` page from note ids with configurable `hasMore`/`cursor`/`updatedBase` timestamps. |
| `describe: "Granola poller"` | test suite | `tests/capture/granola-poller.test.ts:96` | Covers: pagination writing exactly 2 atoms/note (summary + transcript) with `dedupe_key`s; `updated_after` sent from checkpoint high-water-mark and already-ingested edited notes skipped; mid-batch failure recovery without duplicating ingested-note atoms; single 429 retry vs. repeated-429 error with `rate_limited_repeated` log; pagination/timeout/checkpoint-write failure surfacing; single-flight `poll()` in-flight skip; config-path tilde-free resolution + env/config API-key precedence + disabled-state behavior; checkpoint JSON persistence shape and sorted `ingested_note_ids`. |

### `tests/capture/origin-url-capture.test.ts` — integration tests for git origin-URL scrubbing and capture

**Purpose:** Exercises `src/capture/git-state.js` (`probeGitState`) and `src/capture/surfaces/git-watcher.js` (`startGitWatcher`) for capturing and credential-scrubbing a repo's `origin_url`, including per-repo isolation and retry-after-origin-added behavior. Builds real temp git repos via `execFile('git', …)`.

**Depends on:** `src/capture/git-state.js`, `src/capture/sources.js`, `src/capture/surfaces/git-watcher.js`, `src/storage/memory.js`, `tests/fixtures/stdout.js`; external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `node:util`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `makeRepo()` | function | `tests/capture/origin-url-capture.test.ts:19` | Initializes a real temp git repo (`git init -b main`) with test user/email and gpgsign disabled, returning its realpath. |
| `commitFile(dir, file, contents, message)` | function | `tests/capture/origin-url-capture.test.ts:31` | Writes a file, `git add`+`git commit`s it, and returns the resulting HEAD SHA. |
| `setOrigin(repo, url)` | function | `tests/capture/origin-url-capture.test.ts:46` | Removes any existing `origin` remote (ignoring failure) and adds a new one at `url`. |
| `waitForCount(storage, target, timeoutMs)` | function | `tests/capture/origin-url-capture.test.ts:51` | Polls `storage.count()` every 50ms until it reaches `target` or throws after `timeoutMs`. |
| `pushAllowedRepo(repo)` | function | `tests/capture/origin-url-capture.test.ts:64` | Pushes `repo` onto `CAPTURED_SOURCES.git_repos` for the test and returns a cleanup closure that removes it. |
| `describe: "origin URL capture"` | test suite | `tests/capture/origin-url-capture.test.ts:73` | Verifies `probeGitState` captures and strips credentials from `origin_url` (case-insensitive host) and returns `head_sha` as a 40-hex-char SHA; leaves `origin_url` undefined (no log) for a remote-less repo; `git watcher` stamps each of two concurrently-watched repos with its own scrubbed origin_url; and a watcher retries an initially-absent origin, capturing it once added on a later commit. |

### `tests/capture/pipeline.test.ts` — unit tests for the capture pipeline chokepoint

**Purpose:** Exercises `src/capture/pipeline.js`'s `processCandidate` (gate + timestamp-canonicalization + storage-append orchestration) and the pure `canonicalizeTimestamp` helper. Covers accept/reject paths, metadata passthrough, caller-supplied-id stripping, dependency-injected storage isolation, and timestamp canonicalization/rejection (item 022 Bug A/B).

**Depends on:** `src/capture/pipeline.js`, `src/capture/sources.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/stdout.js`; external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `validEvent(overrides)` | function | `tests/capture/pipeline.test.ts:10` | Builds a well-formed candidate-event object literal (fs source/timestamp/content) with override support. |
| `describe: "processCandidate"` | test suite | `tests/capture/pipeline.test.ts:19` | Parent suite wiring a fresh `MemoryStorage` and stdout capture per test. |
| `describe: "accept path"` | test suite | `tests/capture/pipeline.test.ts:32` | Verifies accepted events are appended to storage with a fresh id, metadata preserved verbatim, and any caller-supplied `id` field dropped in favor of storage's own assignment. |
| `describe: "reject path — well-formed but not allowlisted"` | test suite | `tests/capture/pipeline.test.ts:92` | Confirms storage is untouched and the gate's rejection reason (`unknown_app`/`unknown_domain`/`unknown_path`/`unknown_api`) is passed through verbatim. |
| `describe: "reject path — malformed event"` | test suite | `tests/capture/pipeline.test.ts:118` | Table-driven check that malformed inputs (null, empty object, missing source, unknown kind prefix) return `malformed_event` without touching storage. |
| `describe: "storage is dependency-injected"` | test suite | `tests/capture/pipeline.test.ts:138` | Confirms two distinct `MemoryStorage` instances passed to `processCandidate` do not share state. |
| `describe: "timestamp canonicalization at the chokepoint (item 022 Bug A)"` | test suite | `tests/capture/pipeline.test.ts:152` | Verifies Z-suffixed timestamps pass through unchanged, `+`/`-` UTC-offset timestamps convert to canonical Z form preserving millisecond precision, and naive (TZ-less) timestamps are treated as UTC. |
| `describe: "reject path — unparseable timestamp (Bug B)"` | test suite | `tests/capture/pipeline.test.ts:204` | Confirms an unparseable timestamp (e.g. `"n/a"`) that passes the gate's non-empty-string check is rejected post-gate with `invalid_timestamp` (not thrown) and logged with the reason and source. |
| `describe: "canonicalizeTimestamp (pure helper)"` | test suite | `tests/capture/pipeline.test.ts:238` | Direct unit checks of the pure timestamp-canonicalization function across Z-form, +/- offsets, millisecond precision, and naive input. |

### `tests/capture/sources.test.ts` — unit tests for the capture-source allowlist registry

**Purpose:** Exercises `src/capture/sources.js` — the `CAPTURED_SOURCES` allowlist singleton and its `isAllowed*`/`_isAllowed*In` predicate pairs (app, domain, path, api), plus `loadGitReposFromCaptureConfig`'s merge-with-default-and-persisted-config behavior.

**Depends on:** `src/capture/sources.js`; external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `malformed` | const | `tests/capture/sources.test.ts:19` | Shared array of non-string/malformed sentinel values (`null`, `undefined`, `42`, `''`, `{}`, `[]`, booleans) reused across every predicate's malformed-input check. |
| `describe: "CAPTURED_SOURCES"` | test suite | `tests/capture/sources.test.ts:21` | Verifies apps/domains start empty and apis default to `['granola']`; declares the four fixed fs_paths prefixes (Cursor workspace/global, Claude Code, Codex); `loadGitReposFromCaptureConfig` falls back to `DEFAULT_GIT_REPOS` when the config file is missing and merges persisted (deduped/trailing-slash-normalized) `git_repos` with the built-in default when present. |
| `describe: "isAllowedApp (against empty allowlist)"` | test suite | `tests/capture/sources.test.ts:75` | Confirms `isAllowedApp` returns false for plausible bundle ids against an empty allowlist, and `_isAllowedAppIn` returns false for every malformed input. |
| `describe: "isAllowedDomain (against empty allowlist)"` | test suite | `tests/capture/sources.test.ts:88` | Same pattern as above for domain hosts. |
| `describe: "isAllowedPath (against empty allowlist)"` | test suite | `tests/capture/sources.test.ts:101` | Same pattern as above for filesystem paths. |
| `describe: "isAllowedApi (Granola-only allowlist)"` | test suite | `tests/capture/sources.test.ts:114` | Confirms `isAllowedApi('granola')` is true and other plausible api names are false against the real default allowlist; malformed inputs rejected. |
| `describe: "predicate logic with fixture allowlist"` | test suite | `tests/capture/sources.test.ts:128` | Exercises exact-match semantics for app/domain/api and prefix-match + tilde-expansion semantics for fs paths (including bare `~` matching), against hand-built fixture allowlists rather than the real singleton. |
| `describe: "Source type derivation (type-only assertion via fixture)"` | test suite | `tests/capture/sources.test.ts:192` | Compile-time/runtime sanity check that an `as const` fixture yields literal-key types usable in a discriminated `FixtureSource` union. |

### `tests/capture/surfaces/fs-watcher.test.ts` — unit/integration tests for the generic filesystem watcher surface

**Purpose:** Exercises `src/capture/surfaces/fs-watcher.js` — `startFsWatcher`'s chokidar-driven add/change/unlink event capture (quarantined lifecycle block), the emit-path error-containment fix for Bug C (storage-append rejection must not leak as an unhandled promise rejection), and the pure `classifyKind` path-classifier plus the tilde-expansion allowlist contract it shares with `sources.js`.

**Depends on:** `src/capture/sources.js`, `src/capture/surfaces/fs-watcher.js`, `src/storage/interface.js`, `src/storage/memory.js`, `tests/fixtures/allowlist.js`, `tests/fixtures/jsonl.js`, `tests/fixtures/stdout.js`; external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `waitForCount(storage, target, timeoutMs)` | function | `tests/capture/surfaces/fs-watcher.test.ts:17` | Polls `storage.count()` every 25ms until it reaches `target` or throws after `timeoutMs`. |
| `parseContent(evt)` | function | `tests/capture/surfaces/fs-watcher.test.ts:38` | Parses a `CaptureEvent`'s JSON `content` field into an `FsContent` shape (`event_type`/`path`/`mtime`/`size`). |
| `RejectingStorage` | class | `tests/capture/surfaces/fs-watcher.test.ts:182` | `MemoryStorage` subclass whose `append()` always throws, used to force the storage-append failure path in the Bug C containment test. |
| `RejectingStorage.append()` | method | `tests/capture/surfaces/fs-watcher.test.ts:183` | Always throws a synthetic error to simulate a failing storage backend. |
| `describe.skip: "startFsWatcher"` | test suite | `tests/capture/surfaces/fs-watcher.test.ts:50` | QUARANTINED (chokidar/FSEvents flake, item 024): add/change/WAL-ignore/unlink event capture, pre-existing-file ignoreInitial suppression, and `stop()` teardown. |
| `describe: "startFsWatcher emit-path error containment (Bug C)"` | test suite | `tests/capture/surfaces/fs-watcher.test.ts:181` | Verifies that when the injected storage's `append()` rejects, the watcher logs `handler_error` instead of producing an unhandled promise rejection (listens on `process.on('unhandledRejection')` to prove absence). |
| `describe: "classifyKind"` | test suite | `tests/capture/surfaces/fs-watcher.test.ts:237` | Verifies `classifyKind` returns `'cursor-workspace'` for Cursor workspaceStorage paths, `'claude-project'` for `~/.claude/projects/` paths, and `undefined` for unrelated paths. |
| `describe: "_isAllowedPathIn tilde expansion (FS allowlist contract)"` | test suite | `tests/capture/surfaces/fs-watcher.test.ts:253` | Confirms tilde-prefixed allowlist entries match expanded-home concrete paths for both Cursor workspace and Claude Code project prefixes, rejects sibling non-matching paths, and confirms production `CAPTURED_SOURCES.fs_paths` includes both prefixes. |

### `tests/capture/surfaces/git-watcher.test.ts` — unit tests for the git capture watcher

**Purpose:** Exercises `src/capture/surfaces/git-watcher.ts` end-to-end against real temp git repos: backfill-on-first-boot, resumption from last_seen_sha, fs-watch vs polling detection, large-diff truncation, backfill-window env var, and the git-source allowlist gate (`src/capture/gate.ts`, `src/capture/sources.ts`).

**Depends on:** src/capture/gate.js, src/capture/sources.js, src/capture/surfaces/git-watcher.js, src/storage/interface.js, src/storage/memory.js, tests/fixtures/jsonl.js, tests/fixtures/stdout.js; external: node:child_process, node:fs, node:os, node:path, node:util, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RejectingStorage` | class | `tests/capture/surfaces/git-watcher.test.ts:20` | `MemoryStorage` subclass whose `append()` always throws, used to exercise the watcher's error containment (Bug C). |
| `RejectingStorage.append()` | method | `tests/capture/surfaces/git-watcher.test.ts:21` | Overrides append to always reject with a synthetic storage failure. |
| `makeRepo()` | function | `tests/capture/surfaces/git-watcher.test.ts:28` | Creates a temp dir, resolves symlinks, and `git init`s a real repo with test user/email/gpgsign config. |
| `commitFile(dir, file, contents, message)` | function | `tests/capture/surfaces/git-watcher.test.ts:40` | Writes a file, stages and commits it in the given repo, and returns the resulting commit SHA. |
| `waitForCount(storage, target, timeoutMs)` | function | `tests/capture/surfaces/git-watcher.test.ts:53` | Polls `storage.count()` every 50ms until it reaches `target` or throws on timeout. |
| `pushAllowedRepo(repo)` | function | `tests/capture/surfaces/git-watcher.test.ts:68` | Pushes a repo path onto `CAPTURED_SOURCES.git_repos` and returns a cleanup closure that removes it. |
| `describe: "startGitWatcher"` | describe block | `tests/capture/surfaces/git-watcher.test.ts:77` | Covers first-boot backfill, repo_root/files_referenced metadata, resumption via last_seen_sha, polling fallback, 100KB diff truncation, unknown/allowlisted repo gating, unhandled-rejection containment on storage failure (Bug C), ECHO_GIT_BACKFILL_COMMITS window, and fs-watch-only detection. |
| `describe: "CAPTURED_SOURCES.git_repos"` | describe block | `tests/capture/surfaces/git-watcher.test.ts:371` | Verifies the documented initial allowlist entry `~/Desktop/Project_echo/` is present. |
| `describe: "isAllowedRepo"` | describe block | `tests/capture/surfaces/git-watcher.test.ts:377` | Verifies malformed-input rejection, trailing-slash tolerance, and exact-path (non-prefix) matching semantics. |

### `tests/capture/workspace-root.test.ts` — unit tests for workspace-root canonicalization/anchor resolution

**Purpose:** Exercises `src/capture/workspace-root.ts`'s `gitToplevel`, `resolveCanonicalRoot`, and `canonicalizePath`/`_canonicalizePathForTest` against real temp dirs and git repos, covering project-anchor walk-up (`.git`, package.json, go.mod, Cargo.toml, pyproject.toml, pnpm-workspace.yaml), HOME/ambient-root exclusion, symlink canonicalization, non-existent-path handling, and case-folding via the injected test seam.

**Depends on:** src/capture/workspace-root.js; external: node:child_process, node:fs, node:os, node:path, node:util, vitest.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PROJECT_ANCHORS` | const | `tests/capture/workspace-root.test.ts:16` | Tuple of anchor filenames/dirs (`.git`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`) used to parametrize the anchor-walk-up test. |
| `tempDir(prefix)` | function | `tests/capture/workspace-root.test.ts:40` | Creates and realpath-resolves a temp directory under the given prefix, registering it for cleanup. |
| `makeRepo()` | function | `tests/capture/workspace-root.test.ts:46` | Creates a temp dir and `git init`s it as a real repo. |
| `writeAnchor(root, anchor)` | function | `tests/capture/workspace-root.test.ts:52` | Writes the given project-anchor marker (creates `.git` dir or writes an empty-JSON/TOML file) into `root`. |
| `describe: "workspace root resolution"` | describe block | `tests/capture/workspace-root.test.ts:25` | Covers `gitToplevel` success/failure, git-toplevel precedence over anchor files, walk-up for every anchor type, no-anchor fallback, HOME and ambient-root (`/`, `/tmp`, `/private/tmp`) exclusion from being treated as discovered roots, symlinked-root canonicalization, non-existent-path canonicalization via longest-existing-prefix realpath, graceful degradation when the reported path is deleted, and case-folding only through the injected test seam. |

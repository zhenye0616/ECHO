# `src/normalize/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 11 files.

### `src/normalize/adapters/_shared.ts` — shared adapter helpers

**Purpose:** Common parsing/building utilities reused by every per-source adapter: turn-pair parsing, hashing, provenance construction, safe metadata accessors, and open-loop-hint extraction.

**Depends on:** `node:crypto`, `src/storage/interface.ts` (CaptureEvent), `src/normalize/artifacts.ts` (repoArtifact), `src/normalize/errors.ts` (NormalizationError), `src/normalize/types.ts` (ArtifactRef, NormalizedContextEvent, ProvenanceRef)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `TURN_PAIR_RE` | regex | `src/normalize/adapters/_shared.ts:7` | Matches a `USER: ...\n\nASSISTANT: ...` envelope, capturing user and assistant text. |
| `parseTurnPair(content)` | function | `src/normalize/adapters/_shared.ts:9` | Parses the USER/ASSISTANT envelope, throwing a plain Error if the content doesn't match. |
| `tryParseTurnPair(content)` | function | `src/normalize/adapters/_shared.ts:17` | Same as `parseTurnPair` but returns null instead of throwing when the envelope doesn't match. |
| `sha256Hex(input)` | function | `src/normalize/adapters/_shared.ts:23` | Computes the hex SHA-256 digest of a UTF-8 string. |
| `buildProvenance(event, extractorVersion)` | function | `src/normalize/adapters/_shared.ts:27` | Builds a `ProvenanceRef` from a capture event's id, content hash, and extractor version string. |
| `fail(event, message)` | function | `src/normalize/adapters/_shared.ts:38` | Throws a `NormalizationError` carrying the offending event and message; return type `never`. |
| `getString(meta, key)` | function | `src/normalize/adapters/_shared.ts:42` | Reads `meta[key]` and returns it only if it is a string, else undefined. |
| `getNumber(meta, key)` | function | `src/normalize/adapters/_shared.ts:51` | Reads `meta[key]` and returns it only if it is a number, else undefined. |
| `getBoolean(meta, key)` | function | `src/normalize/adapters/_shared.ts:60` | Reads `meta[key]` and returns it only if it is a boolean, else undefined. |
| `getStringArray(meta, key)` | function | `src/normalize/adapters/_shared.ts:69` | Reads `meta[key]`, filters to an array of strings only (skipping non-string entries), else undefined if not an array. |
| `getRecord(meta, key)` | function | `src/normalize/adapters/_shared.ts:83` | Reads `meta[key]` and returns it only if it is a non-null, non-array object, else undefined. |
| `buildAssistant(model, provider)` | function | `src/normalize/adapters/_shared.ts:95` | Constructs an assistant `ActorRef` with the given provider and optional model field. |
| `buildConversation(session_id, turn_index, provider)` | function | `src/normalize/adapters/_shared.ts:104` | Constructs a `ConversationRef` with provider/session_id and optional turn_index. |
| `buildRepoArtifact(repo_root, origin_url)` | function | `src/normalize/adapters/_shared.ts:118` | Returns null if repo_root is undefined, otherwise calls `repoArtifact` and returns `{artifact, id}`; centralizes the repo_root-undefined early-return so adapters don't reimplement it. |
| `extractOpenLoopHints(input, output)` | function | `src/normalize/adapters/_shared.ts:127` | Scans user/assistant text for trailing "?", TODO/FIXME markers, and follow-up phrases, returning a list of hint tags (`ends_with_question`, `contains_todo`, `unresolved_assistant_q`, `explicit_followup`). |

### `src/normalize/adapters/claude-code.ts` — Claude Code JSONL adapter

**Purpose:** Converts a raw `CaptureEvent` sourced from Claude Code's `.claude/projects/*.jsonl` transcripts into a `NormalizedContextEvent`, extracting session/turn metadata, workspace/repo scoping, referenced files, and ambient CLI context.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/artifacts.ts` (conversationArtifact, fileArtifact, normalizeRemoteUrl, workspaceArtifact), `src/normalize/types.ts` (Adapter, ArtifactRef, ContextRef, NormalizedContextEvent), `src/normalize/adapters/_shared.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CLAUDE_CODE_VERSION` | const | `src/normalize/adapters/claude-code.ts:24` | Extractor version string `'claude-code@1'` used in provenance. |
| `CLAUDE_CODE_SOURCE_RE` | regex | `src/normalize/adapters/claude-code.ts:26` | Matches `fs:.../.claude/projects/....jsonl` capture source strings. |
| `matchesClaudeCode(source)` | function | `src/normalize/adapters/claude-code.ts:28` | Tests a capture source string against `CLAUDE_CODE_SOURCE_RE`. |
| `adaptClaudeCode` | function (Adapter) | `src/normalize/adapters/claude-code.ts:32` | Parses a turn-pair event, requires `session_id`, resolves workspace vs repo scoping (preferring `canonical_root` workspace over repo_root/origin_url), builds file artifacts for referenced files, assembles ambient context (tool use, branch, cli_version, permission_mode, git_alias), and returns the full `NormalizedContextEvent`; returns null if content isn't a turn-pair (coarse fs-watcher event sharing the same path). |

### `src/normalize/adapters/codex.ts` — Codex CLI JSONL adapter

**Purpose:** Converts a raw `CaptureEvent` sourced from Codex's `.codex/sessions/*.jsonl` transcripts into a `NormalizedContextEvent`, mirroring the claude-code adapter's shape but pulling model/provider and reasoning/sandbox/approval settings from a nested `codex` metadata block and git info from a nested `git` block.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/artifacts.ts` (conversationArtifact, fileArtifact, normalizeRemoteUrl, workspaceArtifact), `src/normalize/types.ts` (Adapter, ArtifactRef, ContextRef, NormalizedContextEvent), `src/normalize/adapters/_shared.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CODEX_VERSION` | const | `src/normalize/adapters/codex.ts:24` | Extractor version string `'codex@1'` used in provenance. |
| `CODEX_SOURCE_RE` | regex | `src/normalize/adapters/codex.ts:26` | Matches `fs:.../.codex/sessions/....jsonl` capture source strings. |
| `matchesCodex(source)` | function | `src/normalize/adapters/codex.ts:28` | Tests a capture source string against `CODEX_SOURCE_RE`. |
| `adaptCodex` | function (Adapter) | `src/normalize/adapters/codex.ts:32` | Parses a turn-pair event, requires `session_id`, resolves repo_root from `repo_root` or `cwd`, resolves workspace vs repo scoping, builds file artifacts, assembles ambient context from nested `codex` (cli_version, codex_source, reasoning_effort, approval_policy, sandbox_policy_type) and `git` (branch) blocks plus git_alias, derives assistant model/provider (defaulting to `openai`), and returns the `NormalizedContextEvent`; returns null if content isn't a turn-pair. |

### `src/normalize/adapters/cursor.ts` — Cursor composer adapter

**Purpose:** Converts a raw `CaptureEvent` sourced from Cursor's `state.vscdb` composer captures into a `NormalizedContextEvent`, tracking attached/referenced/deleted files as visible/artifact context rather than repo-scoped file artifacts.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/artifacts.ts` (conversationArtifact, fileArtifact), `src/normalize/types.ts` (Adapter, ArtifactRef, ContextRef, NormalizedContextEvent), `src/normalize/adapters/_shared.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CURSOR_VERSION` | const | `src/normalize/adapters/cursor.ts:24` | Extractor version string `'cursor@1'` used in provenance. |
| `CURSOR_SOURCE_RE` | regex | `src/normalize/adapters/cursor.ts:26` | Matches `fs:.../Cursor/User/globalStorage/state.vscdb` capture source strings. |
| `matchesCursor(source)` | function | `src/normalize/adapters/cursor.ts:28` | Tests a capture source string against `CURSOR_SOURCE_RE`. |
| `adaptCursor` | function (Adapter) | `src/normalize/adapters/cursor.ts:32` | Parses a turn-pair event, requires `composer_id` (falling back to `session_id`), reads a nested `context` metadata block for `attached_files` (added to `context.visible`), `referenced_files` (objects with `path`, added as file artifacts), and `deleted_files` (added as file artifacts), sets ambient `workspace_id`, and returns the `NormalizedContextEvent` with provider `cursor`; returns null if content isn't a turn-pair. |

### `src/normalize/adapters/git.ts` — git commit adapter

**Purpose:** Converts a raw `CaptureEvent` sourced from git commit capture (`git:` source prefix) into a `NormalizedContextEvent` representing a commit action with diff content, repo/branch/commit/file artifacts, and a state delta.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/artifacts.ts` (branchArtifact, commitArtifact, fileArtifact, normalizeRemoteUrl, repoArtifact, workspaceArtifact), `src/normalize/types.ts` (Adapter, ArtifactRef, ContextRef, NormalizedContextEvent), `src/normalize/adapters/_shared.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GIT_VERSION` | const | `src/normalize/adapters/git.ts:13` | Extractor version string `'git@1'` used in provenance. |
| `GIT_SOURCE_RE` | regex | `src/normalize/adapters/git.ts:15` | Matches any capture source starting with `git:`. |
| `matchesGit(source)` | function | `src/normalize/adapters/git.ts:17` | Tests a capture source string against `GIT_SOURCE_RE`. |
| `COMMIT_RE` | regex | `src/normalize/adapters/git.ts:21` | Parses raw commit content of the form `COMMIT <sha>: <subject>\n\n<body>--- DIFF ---\n<diff>` into subject/body/diff groups. |
| `adaptGit` | function (Adapter) | `src/normalize/adapters/git.ts:23` | Requires `sha` and a resolvable `repo_root` (from metadata or parsed from the `git:` source), resolves workspace vs repo artifact scoping, builds commit/branch/file artifacts, parses commit message and diff via `parseCommitContent`, builds ambient context (parent_sha, files_changed, additions, deletions, git_alias), computes a human summary string, and returns a `NormalizedContextEvent` with `action.kind: 'commit'` and a `state.delta` describing the commit; throws via `fail` (never returns null) if sha or repo_root are missing. |
| `extractRepoFromSource(source)` | function | `src/normalize/adapters/git.ts:106` | Strips the `git:` prefix from a capture source to recover the repo root path, or undefined if the source doesn't start with `git:`. |
| `parseCommitContent(content)` | function | `src/normalize/adapters/git.ts:111` | Runs `COMMIT_RE` against raw commit content and returns `{subject, body, diff}` with trailing newlines trimmed from body, or null if it doesn't match. |

### `src/normalize/adapters/granola.ts` — Granola meeting-note adapter

**Purpose:** Converts a raw `CaptureEvent` sourced from the Granola API (`api:granola`) into a `NormalizedContextEvent` representing a meeting note or transcript artifact, with attendee actors and created/updated timestamps as ambient context.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/types.ts` (Adapter, ActorRef, ArtifactRef, ContextRef, NormalizedContextEvent), `src/normalize/adapters/_shared.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GRANOLA_VERSION` | const | `src/normalize/adapters/granola.ts:11` | Extractor version string `'granola@1'` used in provenance. |
| `GRANOLA_SOURCE_RE` | regex | `src/normalize/adapters/granola.ts:12` | Matches capture source exactly equal to `api:granola`. |
| `matchesGranola(source)` | function | `src/normalize/adapters/granola.ts:14` | Tests a capture source string against `GRANOLA_SOURCE_RE`. |
| `adaptGranola` | function (Adapter) | `src/normalize/adapters/granola.ts:18` | Requires `note_id`, builds a `meeting_note` artifact (id `granola:<note_id>`, label from title, optional web_url locator), derives actors from attendees, sets `action.kind: 'meeting_note'` with verb `transcribed` or `summarized` depending on `granola_atom_type`, sets ambient created_at/updated_at, and returns the `NormalizedContextEvent`; throws via `fail` if note_id is missing. |
| `actorsFromAttendees(meta)` | function | `src/normalize/adapters/granola.ts:67` | Reads `meta.attendees` (array of strings or `{name}` objects) and maps each to a `participant`-role `ActorRef`; returns empty array if attendees is not an array. |

### `src/normalize/artifacts.ts` — artifact-id construction utilities

**Purpose:** Pure functions that construct canonical `ArtifactRef` objects (repo, workspace, file, branch, commit, conversation) and normalize git remote URLs into stable identifiers, used by all source adapters to build consistent artifact IDs.

**Depends on:** `node:path`, `src/normalize/types.ts` (ArtifactRef)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GIT_SSH_RE` | regex | `src/normalize/artifacts.ts:4` | Matches `git@host:path(.git)` SCP-style SSH remote URLs, capturing host and path. |
| `SCHEME_RE` | regex | `src/normalize/artifacts.ts:5` | Matches a URL scheme prefix like `https://` or `ssh://`. |
| `normalizeRemoteUrl(remote)` | function | `src/normalize/artifacts.ts:7` | Normalizes a git remote URL to a canonical lowercase-host `scheme://host/path` form (converting SSH shorthand, stripping `.git` suffix and trailing slashes, lowercasing scheme+host) so the same repo yields the same id regardless of remote URL style. |
| `repoArtifact(remoteUrl, localRoot)` | function | `src/normalize/artifacts.ts:34` | Builds a `repo`-type `ArtifactRef`: if a remote URL is present, ids it by the normalized remote URL with provider derived from host (github/gitlab/bitbucket/git); otherwise ids it `local:<localRoot>` with provider `local`. |
| `workspaceArtifact(canonicalRoot)` | function | `src/normalize/artifacts.ts:54` | Builds a `workspace`-type `ArtifactRef` ided by the canonical root path directly, used when a workspace root is known independent of git remote. |
| `deriveRemoteProvider(normalizedUrl)` | function | `src/normalize/artifacts.ts:64` | Maps a normalized remote URL's host to a provider name (`github`, `gitlab`, `bitbucket`, else `git`). |
| `hostOf(url)` | function | `src/normalize/artifacts.ts:73` | Extracts and lowercases the host portion of a scheme://host/... URL, or null if unparseable. |
| `deriveRepoLabel(normalizedUrl)` | function | `src/normalize/artifacts.ts:78` | Extracts the last path segment of a normalized remote URL as a human label. |
| `deriveLocalRepoLabel(localRoot)` | function | `src/normalize/artifacts.ts:83` | Extracts the last path segment of a local root path as a human label. |
| `fileArtifact(repoId, absPath, repoRoot)` | function | `src/normalize/artifacts.ts:88` | Builds a `file`-type `ArtifactRef`: if the file is inside `repoRoot`, ids it `<repoId>::<relativePath>`; otherwise falls back to an absolute-path id `abs:<normalizedAbsPath>`. |
| `relativeInsideRoot(absPath, root)` | function | `src/normalize/artifacts.ts:115` | Computes the relative path of `absPath` under `root`, returning null if the path escapes the root (starts with `..` or is still absolute after relativizing). |
| `basename(p)` | function | `src/normalize/artifacts.ts:123` | Returns the path's basename, falling back to the full path if basename is empty. |
| `branchArtifact(repoId, branch)` | function | `src/normalize/artifacts.ts:128` | Builds a `branch`-type `ArtifactRef` ided `<repoId>::<branch>`. |
| `commitArtifact(repoId, sha)` | function | `src/normalize/artifacts.ts:137` | Builds a `commit`-type `ArtifactRef` ided `<repoId>::<sha>` with a 7-char abbreviated label. |
| `conversationArtifact(provider, sessionId)` | function | `src/normalize/artifacts.ts:147` | Builds a `conversation`-type `ArtifactRef` ided `<provider>:<sessionId>`. |

### `src/normalize/dispatch.ts` — adapter registry and source-based dispatch

**Purpose:** Maintains the static ordered list of registered per-source adapters and looks up the matching adapter for a given capture-event source string.

**Depends on:** `src/normalize/adapters/claude-code.ts`, `src/normalize/adapters/codex.ts`, `src/normalize/adapters/cursor.ts`, `src/normalize/adapters/git.ts`, `src/normalize/adapters/granola.ts`, `src/normalize/types.ts` (AdapterRegistration)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REGISTRY` | const | `src/normalize/dispatch.ts:8` | Ordered array of `AdapterRegistration` entries (claude-code, codex, cursor, git, granola), each pairing a name/version/matcher/adapter. |
| `getRegistry()` | function | `src/normalize/dispatch.ts:41` | Returns the full registry array (readonly) for introspection. |
| `findAdapter(source)` | function | `src/normalize/dispatch.ts:45` | Iterates the registry in order and returns the first `AdapterRegistration` whose `matches(source)` predicate is true, or null if none match. |

### `src/normalize/errors.ts` — normalization error type

**Purpose:** Defines the typed error thrown by adapters when a capture event cannot be normalized, carrying the offending event for downstream diagnostics.

**Depends on:** `src/storage/interface.ts` (CaptureEvent)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `NormalizationError` | class | `src/normalize/errors.ts:3` | Error subclass with `name = 'NormalizationError'` and a `cause` field holding the source `CaptureEvent` that failed to normalize. |
| `NormalizationError.constructor(message, event)` | method | `src/normalize/errors.ts:6` | Sets the error message, name, and stores `event` as `cause`. |

### `src/normalize/index.ts` — normalize module public entry point

**Purpose:** Re-exports the normalize module's public types and functions and provides the top-level `normalizeEvent`/`normalizeEvents` entry points that route a `CaptureEvent` through the dispatch registry to produce `NormalizedContextEvent`s.

**Depends on:** `src/storage/interface.ts` (CaptureEvent), `src/normalize/dispatch.ts` (findAdapter), `src/normalize/types.ts`, `src/normalize/errors.ts`, `src/normalize/artifacts.ts`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `normalizeEvent(event)` | function | `src/normalize/index.ts:32` | Finds the adapter matching `event.source` via `findAdapter` and invokes it, returning null if no adapter matches (or if the adapter itself returns null for a non-matching envelope). |
| `normalizeEvents(events)` | function | `src/normalize/index.ts:38` | Maps `normalizeEvent` over an array of capture events, filtering out nulls, returning only successfully normalized events. |

### `src/normalize/types.ts` — normalized context event schema

**Purpose:** Defines the canonical `NormalizedContextEvent` shape and its constituent sub-types (time, source, actor, action, artifact, context, state, conversation, provenance) that every adapter must produce, plus the `Adapter`/`AdapterRegistration` function-type contracts used by the dispatch registry.

**Depends on:** `src/storage/interface.ts` (CaptureEvent, EventId)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `NormalizedContextEvent` | interface | `src/normalize/types.ts:3` | The canonical normalized event schema: schema_version, id, time, source, actors, action, artifacts, plus optional context/state/conversation/open_loop_hints/warnings and required provenance. |
| `TimeRef` | interface | `src/normalize/types.ts:19` | Timing info: `occurred_at` (required), optional `observed_at` and `duration_ms`. |
| `SourceRef` | interface | `src/normalize/types.ts:25` | Origin info: app, optional surface/account, and `raw_pointer` back to the raw capture source. |
| `ActorRef` | interface | `src/normalize/types.ts:32` | Participant in the event: role, optional name/model/provider. |
| `ActionRef` | interface | `src/normalize/types.ts:39` | The action performed: kind, optional verb/input/output/status. |
| `ArtifactRef` | interface | `src/normalize/types.ts:47` | Reference to an artifact touched by the event: type, provider, id, optional label/locator. |
| `ContextRef` | interface | `src/normalize/types.ts:55` | Ambient/visible context at event time: optional visible file list, selected item, and ambient key-value map. |
| `SnapshotRef` | interface | `src/normalize/types.ts:61` | A point-in-time artifact snapshot: artifact_id, optional hash/summary. |
| `DeltaRef` | interface | `src/normalize/types.ts:67` | A change to an artifact: artifact_id, kind, optional detail. |
| `ObservedState` | type | `src/normalize/types.ts:73` | Discriminated union: either `{snapshot}` or `{delta}`, mutually exclusive via `never` fields. |
| `ConversationRef` | interface | `src/normalize/types.ts:77` | Conversation-thread linkage: provider, session_id, optional turn_index and parent_event_id. |
| `ProvenanceRef` | interface | `src/normalize/types.ts:84` | Traceability back to raw capture: source_event_id, raw_payload_hash, extractor_version, optional redacted_fields/parse_warnings. |
| `Adapter` | type | `src/normalize/types.ts:92` | Function type `(event: CaptureEvent) => NormalizedContextEvent | null` implemented by every per-source adapter. |
| `AdapterRegistration` | interface | `src/normalize/types.ts:94` | Registry entry pairing a name/version with a `matches` source-predicate and an `adapter` function. |

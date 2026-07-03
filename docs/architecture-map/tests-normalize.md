# `tests/normalize/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 14 files.

### `tests/normalize/adapters/claude-code.test.ts` — claude-code adapter test

**Purpose:** Exercises `src/normalize/index.js`'s claude-code adapter against `claudeCodeFixture`, asserting schema version, id passthrough, time/source/actor/action mapping, artifact identity, conversation metadata, ambient context flow-through, open-loop hint detection, byte_offset exclusion, and provenance hashing.

**Depends on:** src/normalize/index.js (normalizeEvent), tests/normalize/fixtures/claude-code.ts (claudeCodeFixture)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "claude-code adapter"` | test suite | `tests/normalize/adapters/claude-code.test.ts:5` | Verifies schema_version=1, id/time mapping from event.timestamp, source.app/surface/raw_pointer, actors (user+assistant with anthropic provider/model), action.kind=message with USER:/ASSISTANT: split, artifact ids (conversation/repo/files), conversation object, context.ambient fields (had_tool_use, branch, cli_version, permission_mode), open_loop_hints, exclusion of byte_offset from serialized output, and provenance (source_event_id, raw_payload_hash sha256, extractor_version=claude-code@1). |

### `tests/normalize/adapters/codex.test.ts` — codex adapter test

**Purpose:** Exercises the codex adapter in `src/normalize/index.js` against `codexFixture`, verifying provider/model mapping, conversation and repo artifact identity (with remote URL normalization), file artifacts, action input/output splitting across blank lines, and ambient codex turn config.

**Depends on:** src/normalize/index.js (normalizeEvent), tests/normalize/fixtures/codex.ts (codexFixture)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "codex adapter"` | test suite | `tests/normalize/adapters/codex.test.ts:5` | Verifies source.app=codex/surface=jsonl, assistant actor provider=openai/model=gpt-5.5, conversation artifact id `codex:<session_id>`, repo artifact id normalized from origin_url with provider=github, files_referenced joined under repo_id, action input/output split around blank lines, context.ambient (had_tool_use, branch, sandbox_policy_type, approval_policy), and provenance.extractor_version=codex@1. |

### `tests/normalize/adapters/cursor.test.ts` — cursor adapter test

**Purpose:** Exercises the cursor adapter in `src/normalize/index.js` against `cursorFixture` and `cursorFixtureNoContext`, verifying provider mapping, conversation/file artifact identity, context.visible from attached_files, workspace_id flow, and behavior when no context/files/workspace_id are present.

**Depends on:** src/normalize/index.js (normalizeEvent), tests/normalize/fixtures/cursor.ts (cursorFixture, cursorFixtureNoContext)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "cursor adapter"` | test suite | `tests/normalize/adapters/cursor.test.ts:5` | Verifies source.app=cursor/surface=composer, actors (user + assistant provider=cursor), conversation artifact id `cursor:<composer_id>`, context.visible from attached_files, file artifacts from referenced_files+deleted_files, context.ambient.workspace_id, provenance.extractor_version=cursor@1, action input/output split, that context is entirely omitted (and file artifacts empty) when no attached/referenced/deleted files or workspace_id are present, and open_loop_hints detection of a trailing question mark. |

### `tests/normalize/adapters/git.test.ts` — git adapter test

**Purpose:** Exercises the git adapter in `src/normalize/index.js` against `gitFixture`, verifying commit action mapping, artifact identity for repo/commit/branch/files, state.delta shortstat detail, ambient commit counters, absence of conversation, and provenance.

**Depends on:** src/normalize/index.js (normalizeEvent), tests/normalize/fixtures/git.ts (gitFixture)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "git adapter"` | test suite | `tests/normalize/adapters/git.test.ts:5` | Verifies source.app=git/surface=commit, actors carry commit author name, action.kind=commit with subject+body as input and diff as output, artifacts include repo+commit+branch+every touched file with `local:<root>::<id>` ids, state.delta references the commit artifact and carries shortstat text (files changed, +/- counts), context.ambient carries parent_sha/files_changed/additions/deletions, absence of `conversation` field, and provenance.extractor_version=git@1. |

### `tests/normalize/adapters/granola.test.ts` — granola adapter test

**Purpose:** Defines an inline `granolaSummaryFixture` CaptureEvent and exercises the granola adapter in `src/normalize/index.js`, verifying source/surface derivation from atom type, participant actors from attendees, meeting_note action mapping, meeting-note artifact identity, and ambient created/updated timestamps.

**Depends on:** src/normalize/index.js (normalizeEvent), src/storage/interface.js (CaptureEvent type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `granolaSummaryFixture` | const (fixture) | `tests/normalize/adapters/granola.test.ts:5` | Inline CaptureEvent with source `api:granola`, granola_atom_type=summary, dedupe_key, title, attendees, and web_url metadata used as the sole input to the granola adapter tests. |
| `describe: "granola adapter"` | test suite | `tests/normalize/adapters/granola.test.ts:22` | Verifies source.app=granola with surface following atom type and raw_pointer=api:granola, actors mapped from attendees to role=participant, action.kind=meeting_note/verb=summarized with output=atom content, artifacts array is exactly one meeting_note artifact with id `granola:<note_id>` and locator=web_url, context.ambient carries created_at/updated_at, and provenance.extractor_version=granola@1. |

### `tests/normalize/artifacts.test.ts` — artifact-identity helper tests

**Purpose:** Unit-tests the artifact-identity construction helpers exported from `src/normalize/index.js` (re-exported from an artifacts module) — remote URL normalization and repo/file/branch/commit/conversation artifact id derivation, including cross-clone joining and V1 rename limitations.

**Depends on:** src/normalize/index.js (branchArtifact, commitArtifact, conversationArtifact, fileArtifact, normalizeRemoteUrl, repoArtifact)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "artifact identity"` | test suite | `tests/normalize/artifacts.test.ts:11` | Top-level grouping for all artifact-identity sub-suites below. |
| `describe: "normalizeRemoteUrl"` | test suite | `tests/normalize/artifacts.test.ts:12` | Verifies `normalizeRemoteUrl` lowercases hosts, strips `.git`, converts `git@host:owner/repo` SSH form to `https://host/owner/repo`, and strips trailing slashes, while preserving path case. |
| `describe: "repoArtifact"` | test suite | `tests/normalize/artifacts.test.ts:32` | Verifies `repoArtifact` uses the normalized remote URL as id (provider=github) when a remote is given, falls back to `local:<root>` (provider=local) with no remote, and produces identical ids for two clones of the same remote at different local paths. |
| `describe: "fileArtifact"` | test suite | `tests/normalize/artifacts.test.ts:53` | Verifies `fileArtifact` produces `<repo_id>::<rel_path>` (provider=local_fs) for files inside a repo, falls back to `abs:<path>` for files outside any repo or outside the supplied repoRoot, joins cross-clone file refs at the same relative path to the same id, and confirms renames produce different artifact ids (documented V1 no-lineage limitation). |
| `describe: "branchArtifact / commitArtifact / conversationArtifact"` | test suite | `tests/normalize/artifacts.test.ts:108` | Verifies `branchArtifact` produces `<repo_id>::<branch>`, `commitArtifact` produces `<repo_id>::<sha>`, and `conversationArtifact` produces `<provider>:<session_id>`. |

### `tests/normalize/dispatch.test.ts` — normalize dispatch/registry tests

**Purpose:** Tests the adapter registry and dispatch logic in `src/normalize/index.js` — registration order, source-pattern matching, null-return on unmatched/malformed events, first-match-wins semantics, adapter envelope validation, required-metadata error throwing, and batch normalization with null-filtering.

**Depends on:** src/normalize/index.js (findAdapter, getRegistry, normalizeEvent, normalizeEvents, NormalizationError), src/storage/interface.js (CaptureEvent), tests/normalize/fixtures/claude-code.ts, tests/normalize/fixtures/codex.ts, tests/normalize/fixtures/cursor.ts, tests/normalize/fixtures/git.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "normalize dispatch"` | test suite | `tests/normalize/dispatch.test.ts:15` | Verifies `getRegistry()` returns adapters in documented order (claude-code, codex, cursor, git, granola); `findAdapter` matches each fixture's source to the correct adapter name; `findAdapter`/`normalizeEvent` return null for an unmatched fs-watcher event; first-match-wins is confirmed via registration index rather than any-match; `normalizeEvent` returns null when a source-matched event's content lacks the adapter's expected envelope (e.g. fs-watcher stat JSON or plain text on a claude-code-shaped path); `normalizeEvent` throws `NormalizationError` when required metadata (e.g. session_id) is missing; and `normalizeEvents` silently drops null-normalizing events while preserving order of the rest. |

### `tests/normalize/fixtures/claude-code.ts` — claude-code fixture data

**Purpose:** Exports a single synthetic `CaptureEvent` (`claudeCodeFixture`) modeling a claude-code JSONL capture (USER/ASSISTANT envelope, tool_calls, git_state, permission_mode, cli_version) reused across the claude-code adapter, dispatch, round-trip, and repo-identity-convergence tests.

**Depends on:** src/storage/interface.js (CaptureEvent type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `claudeCodeFixture` | const (fixture) | `tests/normalize/fixtures/claude-code.ts:3` | CaptureEvent with source path under `.claude/projects/`, USER:/ASSISTANT: content, and metadata including session_id, turn_index, byte_offset, had_tool_use, repo_root, files_referenced (in-repo + /tmp scratch), tool_calls, permission_mode, cli_version, model=claude-opus-4-7, and git_state (head_sha, branch, dirty_count, fresh). |

### `tests/normalize/fixtures/codex.ts` — codex fixture data

**Purpose:** Exports a single synthetic `CaptureEvent` (`codexFixture`) modeling a codex JSONL capture (USER/ASSISTANT envelope spanning blank lines, codex turn config, git remote metadata) reused across the codex adapter, dispatch, round-trip, and repo-identity-convergence tests.

**Depends on:** src/storage/interface.js (CaptureEvent type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `codexFixture` | const (fixture) | `tests/normalize/fixtures/codex.ts:3` | CaptureEvent with source path under `.codex/sessions/`, multi-paragraph ASSISTANT content, and metadata including session_id, cwd/repo_root, git (sha/branch/origin_url), codex (source, cli_version, model_provider=openai, model=gpt-5.5, reasoning_effort, personality, approval_policy, sandbox_policy_type), files_referenced, and git_state. |

### `tests/normalize/fixtures/cursor.ts` — cursor fixture data

**Purpose:** Exports two synthetic `CaptureEvent`s (`cursorFixture`, `cursorFixtureNoContext`) modeling Cursor composer captures with and without attached/referenced/deleted file context, reused across the cursor adapter and round-trip tests.

**Depends on:** src/storage/interface.js (CaptureEvent type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `cursorFixture` | const (fixture) | `tests/normalize/fixtures/cursor.ts:3` | CaptureEvent with source pointing at Cursor's `state.vscdb`, composer_id/session_id/bubble ids, turn_index, workspace_id, and context (attached_files, referenced_files with language, deleted_files). |
| `cursorFixtureNoContext` | const (fixture) | `tests/normalize/fixtures/cursor.ts:36` | CaptureEvent variant with only composer_id/bubble ids/mtime metadata and no `context`/workspace_id, used to test omission behavior. |

### `tests/normalize/fixtures/git.ts` — git fixture data

**Purpose:** Exports a single synthetic `CaptureEvent` (`gitFixture`) modeling a git-commit capture (`COMMIT <sha>: <subject>` + body + `--- DIFF ---` diff text) reused across the git adapter and round-trip tests.

**Depends on:** src/storage/interface.js (CaptureEvent type)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `gitFixture` | const (fixture) | `tests/normalize/fixtures/git.ts:3` | CaptureEvent with source `git:<repo_root>`, commit-message + diff content, and metadata including sha, author, files_changed/additions/deletions, repo_root, parent_sha, files_referenced, and branch. |

### `tests/normalize/repo-identity-convergence.test.ts` — cross-adapter repo identity convergence tests

**Purpose:** Builds synthetic claude-code, codex, and git events sharing a repo root/remote and verifies that `normalizeEvent` (`src/normalize/index.js`) resolves them to one canonical repo artifact id, joins their file artifacts, and that `buildGraph`/`connectedComponents` (`src/trace/cluster.js`) collapse them into a single cluster — across remote-backed, path-style-independent, and remote-less (local fallback) scenarios.

**Depends on:** src/normalize/index.js (normalizeEvent), src/normalize/types.js (NormalizedContextEvent), src/storage/interface.js (CaptureEvent), src/trace/cluster.js (buildGraph, connectedComponents)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `normalize(event)` | function | `tests/normalize/repo-identity-convergence.test.ts:11` | Calls `normalizeEvent` and throws if it returns null, narrowing the result to `NormalizedContextEvent` for test convenience. |
| `repoId(event)` | function | `tests/normalize/repo-identity-convergence.test.ts:17` | Extracts the `id` of the event's `repo`-type artifact, throwing if none exists. |
| `eventIds(event)` | function | `tests/normalize/repo-identity-convergence.test.ts:23` | Maps an event's `artifacts` array to their `id` fields. |
| `claudeCodeEvent(root, originUrl)` | function | `tests/normalize/repo-identity-convergence.test.ts:27` | Builds a synthetic claude-code CaptureEvent with the given repo_root and optional git_state.origin_url, referencing `src/reader.ts`. |
| `codexEvent(root)` | function | `tests/normalize/repo-identity-convergence.test.ts:52` | Builds a synthetic codex CaptureEvent with cwd/repo_root=root, a fixed remote origin_url, and files_referenced pointing at `src/reader.ts`. |
| `gitEvent(root, originUrl)` | function | `tests/normalize/repo-identity-convergence.test.ts:74` | Builds a synthetic git commit CaptureEvent for repo_root=root with optional origin_url metadata and a diff touching `src/reader.ts`. |
| `describe: "repo identity convergence"` | test suite | `tests/normalize/repo-identity-convergence.test.ts:94` | Verifies claude_code/codex/git events sharing a remote normalize to one canonical `https://github.com/example/demo-repo` repo id and one file artifact id, and cluster into a single connected component; verifies remote-backed repo identity is independent of local checkout path style (POSIX vs Windows) while locators differ; verifies remote-less repos fall back to `local:<root>` identity for both claude and git events. |

### `tests/normalize/roundtrip.test.ts` — JSON round-trip test

**Purpose:** Confirms that normalized atoms produced by `normalizeEvent` (`src/normalize/index.js`) for each of the claude-code, codex, cursor, and git fixtures survive a `JSON.parse(JSON.stringify(...))` cycle unchanged, guarding against non-serializable fields (e.g. Dates, undefined-vs-omitted keys) leaking into atoms.

**Depends on:** src/normalize/index.js (normalizeEvent), tests/normalize/fixtures/claude-code.ts, tests/normalize/fixtures/codex.ts, tests/normalize/fixtures/cursor.ts, tests/normalize/fixtures/git.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "JSON round-trip"` | test suite | `tests/normalize/roundtrip.test.ts:8` | Parametrized (`it.each`) over the four adapter fixtures; normalizes each, JSON round-trips the result, and asserts deep equality with the original normalized atom. |

### `tests/normalize/workspace-identity.test.ts` — workspace-identity normalization tests

**Purpose:** Tests the `workspaceArtifact` helper (`src/normalize/artifacts.js`) and how claude-code/codex/git events sharing a workspace root (with or without a git remote, at root or subdir) converge on one workspace artifact key and one cluster via `buildGraph`/`connectedComponents` (`src/trace/cluster.js`), including file-id keying and the `git_alias` ambient field for remote-backed workspaces.

**Depends on:** src/normalize/artifacts.js (fileArtifact, workspaceArtifact), src/normalize/index.js (normalizeEvent), src/normalize/types.js (NormalizedContextEvent), src/storage/interface.js (CaptureEvent), src/trace/cluster.js (artifactKey, buildGraph, connectedComponents)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `normalize(event)` | function | `tests/normalize/workspace-identity.test.ts:16` | Calls `normalizeEvent` and throws if it returns null, narrowing to `NormalizedContextEvent`. |
| `workspaceKey(event)` | function | `tests/normalize/workspace-identity.test.ts:22` | Finds the event's `workspace`-type artifact and returns its `artifactKey(...)` cluster-join key, throwing if absent. |
| `artifactIds(event)` | function | `tests/normalize/workspace-identity.test.ts:28` | Maps an event's `artifacts` array to their `id` fields. |
| `expectOneCluster(events)` | function | `tests/normalize/workspace-identity.test.ts:32` | Runs `buildGraph`/`connectedComponents` over the given events and asserts they collapse into exactly one cluster containing all event ids. |
| `claudeCodeEvent(opts)` | function | `tests/normalize/workspace-identity.test.ts:38` | Builds a synthetic claude-code CaptureEvent with configurable repoRoot, canonicalRoot, optional git_state.origin_url, and files_referenced (default `src/reader.ts`). |
| `codexEvent(opts)` | function | `tests/normalize/workspace-identity.test.ts:69` | Builds a synthetic codex CaptureEvent with configurable cwd/canonicalRoot, optional git.origin_url, and files_referenced. |
| `gitEvent(opts)` | function | `tests/normalize/workspace-identity.test.ts:96` | Builds a synthetic git commit CaptureEvent with configurable repoRoot/canonicalRoot, optional origin_url, and files_referenced, carrying a fixed SHA and diff touching `src/reader.ts`. |
| `describe: "workspace identity normalization"` | test suite | `tests/normalize/workspace-identity.test.ts:123` | Verifies `workspaceArtifact(ROOT)` produces the exact `local:workspace:<root>` join-key tuple; that pre-/post-git-init events, two tools in the same non-git folder, and a subdir-launched tool joined with a root-level commit all join on the same workspace key into one cluster; that remote-backed claude/codex/git events still join on workspace key while carrying `context.ambient.git_alias` for the remote and omitting a separate `repo` artifact; that files key on `workspace:<root>::<rel_path>` and fall back to `abs:<path>` for paths outside root (including `..`-escaping paths); and that `fileArtifact(null, path)` remains backward-compatible for parked Cursor calls returning `abs:<path>`. |

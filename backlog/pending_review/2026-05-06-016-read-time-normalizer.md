---
id: 2026-05-06-016-read-time-normalizer
title: Read-time normalizer — CaptureEvent → NormalizedContextEvent (cursor + claude-code + codex + git adapters)
status: ready
priority: HIGH
estimate: 2d
created: 2026-05-06
spec_refs:
  - wiki/architecture/storage.md
  - wiki/architecture/capture-pipeline.md
  - wiki/architecture/system-architecture.md
  - wiki/capture/cursor-extractor.md
  - wiki/capture/claude-code-extractor.md
  - wiki/capture/codex-extractor.md
  - wiki/capture/git-capture.md
  - wiki/capture/fs-watcher.md
  - wiki/capture/per-app/cursor-collected-data.md
  - wiki/capture/per-app/claude-code-collected-data.md
  - wiki/capture/per-app/codex-collected-data.md
  - raw/internal/decisions/2026-05-06-normalized-context-event-design.md
blocked_by: []
acceptance:
  - "New module `src/normalize/` with types, dispatch, artifact-identity utilities, and four adapters (claude-code, codex, cursor, git)."
  - "Public API: `normalizeEvent(event: CaptureEvent): NormalizedContextEvent | null` and `normalizeEvents(events: CaptureEvent[]): NormalizedContextEvent[]` exported from `src/normalize/index.ts`."
  - "`null` return ONLY means \"no adapter matched the event's source\" (callers may drop silently). Malformed payloads with a matching adapter throw `NormalizationError` (carries the original `CaptureEvent` for debugging)."
  - "Adapter dispatch: registry of `[{ matches: (source: string) => boolean, adapter: Adapter }]`, evaluated in registration order, first match wins. No-match → `null`. Multiple-match is impossible by construction (first-match terminates)."
  - "Adapter contract: `(event: CaptureEvent) => NormalizedContextEvent`. Adapters are pure: same input → same output, no I/O, no clock reads. `time.observed_at` if added is sourced from `event.timestamp`, never `Date.now()`."
  - "Schema versioning: every emitted event carries `schema_version: 1`. The shape is treated as a frozen contract for V1; breaking changes bump the version."
  - "Storage is NOT modified. The `CaptureEvent` contract in `src/storage/interface.ts` is read-only input to the normalizer."
  - "MCP server is NOT modified by this item. Wiring the normalizer into MCP responses is a separate follow-up item (item 017)."
  - "All four adapters produce `NormalizedContextEvent` objects that pass the schema validator and round-trip through JSON.stringify/parse without loss."
  - "Tests: per-adapter golden tests using realistic `CaptureEvent` fixtures captured from real Claude Code / Codex / Cursor / git sessions (anonymized); dispatch tests (no-match returns null, malformed throws); artifact-identity tests (each canonical-id rule with edge cases); JSON round-trip test."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
files_to_modify:
  - src/normalize/index.ts
  - src/normalize/types.ts
  - src/normalize/dispatch.ts
  - src/normalize/artifacts.ts
  - src/normalize/errors.ts
  - src/normalize/adapters/_shared.ts
  - src/normalize/adapters/claude-code.ts
  - src/normalize/adapters/codex.ts
  - src/normalize/adapters/cursor.ts
  - src/normalize/adapters/git.ts
  - tests/normalize/dispatch.test.ts
  - tests/normalize/artifacts.test.ts
  - tests/normalize/adapters/claude-code.test.ts
  - tests/normalize/adapters/codex.test.ts
  - tests/normalize/adapters/cursor.test.ts
  - tests/normalize/adapters/git.test.ts
  - tests/normalize/fixtures/

claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-07T05:59:52Z"
branch: "agent/read-time-normalizer"
worktree: "/Users/zhenye/Desktop/Project_echo--read-time-normalizer"
head_sha: "a95e60c967818a91223967255a5325d891fbf6ce"
pr_url: ""
agent_notes: |
  Implemented src/normalize/ module: types, dispatch (first-match-wins
  registry over claude-code → codex → cursor → git), artifact-identity
  helpers, four pure adapters, and tests. Storage and MCP untouched per
  spec. 63 normalize tests pass; lint + typecheck clean. Adapters are
  pure — purity grep on src/normalize/adapters/ produces zero hits for
  Date.now / fs / require / 'fs' imports. Anonymized fixtures sourced
  by sampling real events from ~/Library/Application Support/ECHO/echo.db
  then replacing usernames + paths outside the repo root with synthetic
  stand-ins; structural shape preserved exactly. Three deviations from
  the bare minimum spec, each documented in the run log: (1) cursor
  deleted_files map to artifacts (spec was silent — 5-line revert if
  undesired); (2) CC and codex add file artifacts when
  metadata.files_referenced is populated (load-bearing for the
  killer-demo cross-tool join; additive to the required conversation
  artifact); (3) repoArtifact derives provider from the URL host
  (github / gitlab / bitbucket / git / local). None affect the public
  contract. Pre-existing cursor + lifecycle integration suites on main
  flake under load — full re-run at HEAD on main (without this item)
  shows the same failures and worse, so they're not caused by this work.
review_notes: ""
---

# Read-time normalizer — `CaptureEvent` → `NormalizedContextEvent`

## What

A read-time adapter layer that converts ECHO's storage-shape `CaptureEvent` objects into a richer, generalizable `NormalizedContextEvent` shape that downstream consumers (MCP server, future trace viewer, future Resume Packet assembler) can rely on. **Storage stays raw** — no migration, no new column, no new table. The normalizer is a pure function applied at read time.

### The atom shape

```ts
interface NormalizedContextEvent {
  schema_version: 1;

  id: EventId;                // = CaptureEvent.id (1:1)
  time: TimeRef;              // when it happened / when ECHO observed it
  source: SourceRef;          // where it came from
  actors: ActorRef[];         // who/what acted; ≥1
  action: ActionRef;          // what happened (open vocab — see below)
  artifacts: ArtifactRef[];   // observable join keys (open vocab)
  context?: ContextRef;       // what surrounded the action
  state?: ObservedState;      // either snapshot OR delta, never both
  conversation?: ConversationRef;
  open_loop_hints?: string[]; // observable signals only — see below
  provenance: ProvenanceRef;  // never-lose-the-source audit trail
  warnings?: string[];        // non-fatal parse anomalies
}

interface TimeRef {
  occurred_at: string;        // ISO 8601 UTC (when the user/system action happened)
  observed_at?: string;       // ISO 8601 UTC (when ECHO captured it; only set when meaningfully different from occurred_at)
  duration_ms?: number;       // span events only (rare in V1)
}

interface SourceRef {
  app: string;                // e.g., 'claude_code', 'cursor', 'git'
  surface?: string;           // e.g., 'jsonl', 'composer', 'commit'
  account?: string;           // workspace/tenant if known
  raw_pointer: string;        // CaptureEvent.source verbatim — the audit pointer
}

interface ActorRef {
  role: string;               // OPEN VOCABULARY — recommended values: 'user' | 'assistant' | 'tool' | 'system'; V2+ may add 'coworker' | 'customer' | 'automation'
  name?: string;              // human-readable label if any
  model?: string;             // for assistants ('claude-sonnet-4-5', 'gpt-4o', etc.)
  provider?: string;          // 'anthropic' | 'openai' | 'cursor' | 'local' | ...
}

interface ActionRef {
  kind: string;               // OPEN VOCABULARY — recommended verbs: 'message', 'edit', 'read', 'commit', 'run_tool', 'search', 'navigate', ... (see "Open vocabularies" below)
  verb?: string;              // optional human-readable variant ('asked', 'answered', 'committed')
  input?: string;             // observed input — user message, command, query (inline copy, not a pointer)
  output?: string;            // observed output — assistant reply, command stdout, diff text (inline copy, not a pointer)
  status?: string;            // outcome if known — 'completed' | 'failed' | 'pending' | ...; V1 adapters typically omit
}

interface ArtifactRef {
  type: string;               // OPEN VOCABULARY — 'file' | 'repo' | 'branch' | 'commit' | 'url' | 'doc' | 'thread' | 'channel' | 'person' | 'conversation' | ... (extensible)
  provider: string;           // OPEN VOCABULARY — 'local_fs' | 'github' | 'cursor' | 'claude_code' | 'gmail' | 'salesforce' | ... (namespacing prevents ID collisions across providers)
  id: string;                 // canonical identity per the artifact-identity policy below
  label?: string;             // human-readable display label ('main.ts in echo repo')
  locator?: string;           // mechanical handle for navigation when distinct from `id` (e.g., absolute path when `id` is repo-relative; full URL when `id` is a normalized form)
}

interface ContextRef {
  visible?: string[];         // what was on-screen / open (e.g., file paths, page URLs)
  selected?: string;          // selection text if available
  ambient?: Record<string, string>; // free-form, adapter-defined (e.g., cursor_position, branch_name)
}

type ObservedState =
  | { snapshot: SnapshotRef; delta?: never }
  | { delta: DeltaRef; snapshot?: never };

interface SnapshotRef {
  artifact_id: string;        // which artifact this is a snapshot of
  hash?: string;              // content hash if computable
  summary?: string;           // one-line human description
}

interface DeltaRef {
  artifact_id: string;        // which artifact changed
  kind: string;               // 'edit' | 'rename' | 'create' | 'delete' | 'state_transition' | ...
  detail?: string;            // diff text, transition description, etc.
}

interface ConversationRef {
  provider: string;           // 'claude_code' | 'cursor' | 'claude_web' | 'chatgpt' | ...
  session_id: string;         // namespace-local session identity
  turn_index?: number;
  parent_event_id?: EventId;  // chases inside ECHO's ledger only; must terminate
}

interface ProvenanceRef {
  source_event_id: EventId;       // = CaptureEvent.id (always set; lets consumers fetch raw)
  raw_payload_hash: string;       // hash of the raw CaptureEvent.content; lets us detect drift
  extractor_version: string;      // which adapter version produced this normalized atom
  redacted_fields?: string[];     // dotted paths into the normalized atom that were redacted
  parse_warnings?: string[];      // non-fatal anomalies the adapter saw
}
```

### Adapter dispatch

```ts
type Adapter = (event: CaptureEvent) => NormalizedContextEvent;

interface AdapterRegistration {
  matches: (source: string) => boolean;
  adapter: Adapter;
  name: string;            // for warn-logs
  version: string;         // copied into provenance.extractor_version
}

// Registered in src/normalize/dispatch.ts in this order (first-match-wins).
// Patterns are derived from shipped extractor source strings:
//   - claude-code: emits `fs:${jsonlPath}` where jsonlPath ~ ~/.claude/projects/<slug>/<session>.jsonl
//   - codex:       emits `fs:${jsonlPath}` where jsonlPath ~ ~/.codex/sessions/<Y>/<M>/<D>/rollout-<iso>-<uuid>.jsonl
//   - cursor:      emits `fs:${globalDbPath}` where globalDbPath ~ .../Cursor/User/globalStorage/state.vscdb
//   - git-watcher: emits `git:${repoPath}`
//   - fs-watcher:  emits `fs:${absPath}` for arbitrary watched files (not normalized in V1 — returns null)
//
// Dispatch order:
//   1. claude-code: matches /^fs:.*\/\.claude\/projects\/.*\.jsonl$/
//   2. codex:       matches /^fs:.*\/\.codex\/sessions\/.*\.jsonl$/
//   3. cursor:      matches /^fs:.*\/Cursor\/User\/globalStorage\/state\.vscdb$/
//   4. git:         matches /^git:/
//   5. fallthrough: no adapter — return null (covers generic fs-watcher events)
//
// The agent MUST verify these regexes by reading the four extractor source files
// (src/capture/extractors/{claude-code,codex,cursor}.ts and src/capture/surfaces/git-watcher.ts)
// and adjusting if the shipped strings differ from this spec.
```

### Artifact identity policy (the join-key contract)

| type | provider | canonical `id` rule | fallback |
|---|---|---|---|
| `file` | `local_fs` | `<repo_id>::<repo_relative_path>` if inside a git repo; else `abs:<absolute_path>` | absolute path |
| `repo` | `github` (or local) | `git_remote_normalized_url` (lowercased; `.git` suffix stripped; `git@host:owner/repo` normalized to `https://host/owner/repo`) | `local:<absolute_root_path>` if no remote |
| `branch` | (provider) | `<repo_id>::<branch_name>` | — |
| `commit` | (provider) | `<repo_id>::<sha>` | — |
| `url` | `web` | normalized URL (lowercased host, no fragment, no query if `?utm_*` only) | raw URL |
| `conversation` | (provider) | `<provider>:<session_id>` | — |
| `thread` | (provider) | `<provider>:<thread_id>` | — |
| `channel` | (provider) | `<provider>:<channel_id>` | — |
| `person` | (provider) | `<provider>:<account_id>` if known; else `email:<lowercased_email>` | name string |
| `doc` | (provider) | `<provider>:<workspace>:<doc_id>` | — |

**Documented edge cases (V1 accepts these limitations):**

- Repo with **no remote**: `provider='local'`, `id='local:<root_path>'`. If the user moves the worktree, joins across the move break. Acceptable for V1.
- Same repo cloned in **two locations**: both clones produce the same `repo_id` (the remote URL). File `id`s join correctly across clones because they use repo-relative paths.
- Files **outside any repo** (`~/Downloads`, `/tmp`): `id='abs:<absolute_path>'`. Renames/moves produce a new identity. V1 does not chase these.
- File **renamed within a repo** (`git mv x.ts y.ts`): treated as different artifacts. Lineage chasing is V2 (would require git rename detection at trace-build time).

Helpers in `src/normalize/artifacts.ts`:

```ts
fileArtifact(repoId: string | null, absPath: string, repoRoot?: string): ArtifactRef;
repoArtifact(remoteUrl: string | null, localRoot: string): ArtifactRef;
branchArtifact(repoId: string, branch: string): ArtifactRef;
commitArtifact(repoId: string, sha: string): ArtifactRef;
conversationArtifact(provider: string, sessionId: string): ArtifactRef;
normalizeRemoteUrl(remote: string): string;
```

### Open vocabularies — recommended starter vocab for V1

`action.kind` (open string; document recommended values, do not enforce):

```
message | edit | read | search | run_tool | navigate | commit | comment | approve | reject | schedule | summarize | decide | delegate | follow_up
```

`artifact.type` (open string; document recommended values):

```
file | repo | branch | commit | url | doc | thread | channel | person | conversation | crm_record | email_thread | issue | pr | task | meeting
```

V2+ adapters add new values. V1 enforces nothing — closed enums would block generalization to non-dev workflows.

### `open_loop_hints` — observable signals only

The atom does **not** declare whether a loop is open (that's the trace layer's job). Adapters emit observable hints that the trace layer later resolves:

```
ends_with_question      // last user message ends with '?'
contains_todo           // 'TODO' or 'FIXME' present in input/output
unresolved_assistant_q  // assistant turn ends with a clarifying question
explicit_followup       // contains 'follow up', 'will do later', 'come back to'
```

V1 implementation: cheap regex hints only. The trace layer (V1.5+) decides whether the hint became an actual open loop.

### Per-adapter notes

**claude-code adapter:**
- Source pattern: `^fs:.*\/\.claude\/projects\/.*\.jsonl$`
- Produces ONE atom per `(user, assistant)` turn pair (matches today's extractor output 1:1).
- `actors`: `[{role: 'user'}, {role: 'assistant', model: <from message>, provider: 'anthropic'}]`.
- `action.kind = 'message'`. `input` = user text, `output` = assistant text (inline copy from `content`).
- `conversation`: `{provider: 'claude_code', session_id: <from metadata>, turn_index: <from metadata>}`.
- `artifacts`: `[conversationArtifact('claude_code', session_id)]` minimum.
- `metadata.had_tool_use` (when true) maps to `context.ambient.had_tool_use = 'true'` — a structural fact about the turn, not an open-loop signal.
- `open_loop_hints` are derived from text-pattern analysis of `input`/`output` only (the four hint regexes listed above).
- V1 does NOT split tool calls into separate atoms (documented limitation; the trace layer reconstructs from `context.ambient.had_tool_use` if needed).
- `time.occurred_at` = event.timestamp.

**codex adapter:**
- Source pattern: `^fs:.*\/\.codex\/sessions\/.*\.jsonl$`
- Produces ONE atom per `(user → assistant cluster)` pair (matches today's extractor output 1:1; same `USER: ... ASSISTANT: ...` content envelope as claude-code).
- `actors`: `[{role: 'user'}, {role: 'assistant', model: <from message if present>, provider: 'openai'}]`.
- `action.kind = 'message'`. `input` = user text, `output` = assistant text (parsed from `content` envelope).
- `conversation`: `{provider: 'codex', session_id: <from metadata>, turn_index: <from metadata>}`.
- `artifacts`: `[conversationArtifact('codex', session_id)]` minimum.
- `time.occurred_at` = event.timestamp.
- The codex extractor tails JSONL the same way claude-code does — adapters share most logic. Factor common turn-pair parsing into a small helper if it cleans up; keep it in `src/normalize/adapters/_shared.ts` (additive to `files_to_modify`).

**cursor adapter:**
- Source pattern: `^fs:.*\/Cursor\/User\/globalStorage\/state\.vscdb$`
- Produces ONE atom per cluster (matches today's extractor output 1:1).
- Mirrors claude-code shape but with `provider: 'cursor'`. Assistant `model` if known from cursor metadata, else omit.
- `metadata.context` (attached/referenced/deleted files from item 010) maps into both `artifacts[]` (the referenced files) and `context.visible[]` (the attached files).
- File artifacts use the artifact-identity policy: if the workspace is a git repo, `<repo_id>::<repo_relative_path>`; else `abs:<absolute_path>`.

**git adapter:**
- Source pattern: `^git:`
- Produces ONE atom per commit.
- `actors`: `[{role: 'user', name: <commit author>}]`. (Author email if available.)
- `action.kind = 'commit'`, `input = <commit message>`, `output = <diff text>`.
- `artifacts`: `[repoArtifact, commitArtifact, branchArtifact?]` plus one `fileArtifact` per file touched.
- `state.delta`: `{artifact_id: <commit_id>, kind: 'commit', detail: <short stat summary>}`.
- `conversation`: undefined (commits aren't conversational).
- No `open_loop_hints` from V1 git adapter.

### Defaults marked open-to-redline

Every default below was settled during the design conversation. They're `(default — open to redline)` until the founder reviews this spec; if the founder redlines a default, the spec is amended before the agent claims.

- `(default)` Inline-copy raw text into `action.input` / `action.output`, not pointer-back. Rationale: MCP responses must be self-contained for AI clients.
- `(default)` Closed enum for `action.kind` and `artifact.type` is **rejected**. Open vocabularies with documented recommended values are used instead. Rationale: substrate must generalize to non-dev workflows.
- `(default)` `null` from `normalizeEvent` means "no adapter matched." Malformed-payload-with-matching-adapter throws `NormalizationError`. Rationale: separates routing failures from data failures.
- `(default)` `parent_event_id` chases inside ECHO's ledger only (not external IDs). Rationale: the ledger is the audit substrate.
- `(default)` Tool calls inside a Claude Code turn are not split into separate atoms in V1; the parent turn carries `open_loop_hints` and the trace layer reconstructs. Rationale: avoid changing the shipped extractor.
- `(default)` `time.observed_at` is set only when meaningfully different from `occurred_at` (e.g., backfill scenarios). Rationale: avoids noise on the common path.
- `(default)` Schema versioning: per-event `schema_version: 1`. Bump on any breaking change. Migration registry not needed in V1 (no v0 events to migrate).

## Why

The substrate today exposes `CaptureEvent { id, source, timestamp, content: string, metadata }` — a string-typed envelope where each extractor invents its own `content` shape. That was the right V1 storage primitive (append-only, source-prefix-typed, no premature ontology). But the consumer side now needs a richer, joinable contract:

- The MCP `search_memories` tool returns raw `content` strings; AI clients re-parse them ad-hoc.
- The future trace viewer / resume-packet assembler needs to *cluster events around work objects* (a deal, a matter, a research question, or — in V1 — a repo / file / PR). That clustering needs canonical artifact identity, which today's `metadata` does not enforce.
- The substrate must generalize beyond V1's dev-tools cohort. V2+ cohorts (sales, legal, medical, PM) have the same shape of work but different work objects. Locking the substrate around dev primitives now would force a redesign later.

The chosen architecture — **read-time normalizer, raw stays raw** — gets the joinable contract without betting the storage layer on an unproven schema:

```
CaptureEvent (storage, raw, append-only)
        │
        ▼
normalizeEvent  (read-time, pure, dispatched per source)
        │
        ▼
NormalizedContextEvent  (consumer contract)
        │
        ▼
[MCP retrieval] [trace viewer V1.5+] [resume packet V2]
```

If the schema turns out wrong, we delete `src/normalize/` and start over without touching storage or the capture pipeline. This is the cheapest path to a contract that's structurally allowed to be wrong.

The design walks through alternatives (storage replacement / dual-column / vocabulary-only) and the artifact-identity edge cases in `raw/internal/decisions/2026-05-06-normalized-context-event-design.md`.

## Acceptance Criteria

- [ ] `src/normalize/types.ts` exports the full type set: `NormalizedContextEvent`, `TimeRef`, `SourceRef`, `ActorRef`, `ActionRef`, `ArtifactRef`, `ContextRef`, `ObservedState`, `SnapshotRef`, `DeltaRef`, `ConversationRef`, `ProvenanceRef`, plus the `Adapter` and `AdapterRegistration` types. `ActorRef.role` and `ActionRef.kind` and `ArtifactRef.type` are open `string` (not enums).
- [ ] `src/normalize/index.ts` exports `normalizeEvent(event: CaptureEvent): NormalizedContextEvent | null` and `normalizeEvents(events: CaptureEvent[]): NormalizedContextEvent[]`. The plural form drops nulls silently.
- [ ] `src/normalize/dispatch.ts` registers all four adapters in the order specified in the "Adapter dispatch" section. First-match-wins. Exposes `getRegistry()` for tests.
- [ ] `src/normalize/errors.ts` defines `NormalizationError extends Error` with `cause: CaptureEvent` attached.
- [ ] `src/normalize/artifacts.ts` exports the helper functions per the Artifact identity policy section. Each helper applies the canonical-id rules including the documented edge cases.
- [ ] `src/normalize/adapters/claude-code.ts` produces atoms per the per-adapter notes. Faithfully maps today's `metadata.session_id` → `conversation.session_id`, `metadata.turn_index` → `conversation.turn_index`, `metadata.had_tool_use` → `context.ambient.had_tool_use`. `metadata.byte_offset` is not carried into the normalized atom (it's a per-adapter resume-state detail; consumers needing it can fetch the raw `CaptureEvent` via `provenance.source_event_id`).
- [ ] `src/normalize/adapters/codex.ts` produces atoms per the per-adapter notes. Same `USER:/ASSISTANT:` envelope parsing as claude-code; shared parsing logic factored into `src/normalize/adapters/_shared.ts` if cleaner.
- [ ] `src/normalize/adapters/cursor.ts` produces atoms per the per-adapter notes. The agent first reads `wiki/capture/cursor-extractor.md` to confirm the source pattern and metadata fields shipped today.
- [ ] `src/normalize/adapters/git.ts` produces atoms per the per-adapter notes. Includes one `fileArtifact` per file touched in the commit.
- [ ] All four adapters set `provenance.source_event_id = event.id`, `provenance.raw_payload_hash = hash(event.content)` (sha256, hex), `provenance.extractor_version = '<adapter-name>@1'`.
- [ ] **Tests** in `tests/normalize/`:
  - `dispatch.test.ts`: no-match returns null (e.g., a generic `fs:/tmp/foo.txt` event from fs-watcher) + warn-log; matched-but-malformed throws `NormalizationError` with the original event attached; first-match wins for overlapping patterns (synthetic).
  - `artifacts.test.ts`: each canonical-id rule with both happy path and the documented edge cases (no-remote repo, two-clone same repo merging, file-outside-repo fallback, file-renamed-within-repo producing different IDs).
  - `adapters/claude-code.test.ts`: golden test using a fixture from a real (anonymized) Claude Code JSONL turn-pair `CaptureEvent`. Asserts every top-level field of the produced atom.
  - `adapters/codex.test.ts`: golden test using a fixture from a real codex turn-pair `CaptureEvent`. Asserts `provider: 'openai'` for assistant actor; conversation artifact uses `provider: 'codex'`.
  - `adapters/cursor.test.ts`: golden test using a fixture from a real cursor `CaptureEvent`. Asserts every top-level field, especially the `metadata.context` → `artifacts[]` + `context.visible[]` mapping.
  - `adapters/git.test.ts`: golden test using a fixture from a real git-capture `CaptureEvent` (commit with multi-file diff). Asserts repo+commit+branch+file artifacts all produced with correct canonical IDs.
  - `roundtrip.test.ts`: `JSON.parse(JSON.stringify(atom))` deep-equals the atom for at least one fixture per adapter.
- [ ] **Fixtures** under `tests/normalize/fixtures/`: at least one anonymized `CaptureEvent` per source (claude-code, codex, cursor, git), captured from real running data (the agent uses `Storage.query` against the running daemon to pull real samples, then redacts identifying content). Anonymization rule: replace usernames, file paths outside the repo root, and commit messages with synthetic stand-ins; preserve the structural shape exactly.
- [ ] Adapters are pure: no `Date.now()`, no filesystem access, no network. The agent runs `grep -RE "Date.now|fs\.|require\('fs'\)|import.*from 'fs'" src/normalize/adapters/` and confirms zero hits.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` all clean.
- [ ] Run log appended to `raw/internal/agent-runs/2026-05-06-016-read-time-normalizer.md`.

## Out of Scope (Don't Drift)

- **Modifying storage.** `src/storage/*` is read-only input. No new column, no new table, no migration. If something tempts you here, STOP and escalate.
- **Modifying the MCP server.** Wiring the normalizer into `search_memories` (or any other MCP tool) is the **next** item (item 017, to be specced after this lands). This item ships the normalizer as a library; integration is separate.
- **Modifying any extractor or the capture pipeline.** Adapters are read-time consumers of `CaptureEvent`s already in storage. Changing how events are *captured* is a different conversation.
- **WorkTrace builder.** The trace layer that clusters atoms into work objects is V1.5+. This item defines `NormalizedContextEvent` as the input contract for that future layer; it does not implement it.
- **Resume Packet assembly.** V2 product surface. Out of scope.
- **Open-loop *resolution*.** Adapters emit observable hints only. Whether a hint became an actual open loop is decided by the trace layer.
- **Cross-tool entity resolution.** "Did this Slack message refer to the ACME deal or the ACME case?" is V2 NLP work. V1 atoms carry concrete artifact IDs only.
- **File-rename lineage.** Documented as a known V1 limitation. Don't add git-rename detection.
- **Embedding generation.** Storage's `embedding` column stays untouched.
- **Adding new dependencies.** Use `node:crypto` for hashing. Anything else requires escalation.
- **Changing the open vocabulary into closed enums.** Resist this temptation; it would force a redesign for V2 cohorts.
- **Schema migration registry.** No v0 atoms exist. Empty migration story is fine for V1.

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next tasks are:

1. **Promote to wiki.** Create:
   - `wiki/architecture/normalization.md` — the read-time normalizer as a layer; dispatch model; pure-adapter contract; `null`-vs-`throw` semantics.
   - `wiki/architecture/normalized-context-event.md` — the schema (versioned). Includes the open-vocabulary rationale and the recommended starter vocab tables.
   - `wiki/architecture/artifact-identity.md` — the canonical-id policy with edge cases. This is the highest-leverage page; future adapters will read it before defining new artifact types.
2. **Update existing wiki pages:**
   - `wiki/architecture/system-architecture.md` — add the normalizer layer between storage and consumers in the architecture diagram/text.
   - `wiki/capture/cursor-extractor.md`, `wiki/capture/claude-code-extractor.md`, `wiki/capture/git-capture.md` — cross-reference the corresponding normalizer adapter.
3. **Spec follow-up item 017:** "Wire normalizer into MCP `search_memories` response shape." Decisions to settle in that spec: do we return raw `CaptureEvent` and `NormalizedContextEvent` side-by-side, or replace `content` with the normalized atom? Default proposal: side-by-side under `match.normalized`, with a `format: 'raw' | 'normalized' | 'both'` request parameter (default `both`).
4. **Document the V1.5 WorkTrace plan** as a `wiki/architecture/work-trace.md` page with `status: planned`. The atom shape locked here is its input contract; the page should make that explicit so the V1.5 builder doesn't drift.
5. **Update `.manifest.json`** with the new pages and topics.
6. **Regenerate `wiki/index.md`** via `tools/wiki_index.py`.
7. **If any of this item's "open-to-redline" defaults were redlined during review,** capture the redline rationale in `raw/internal/decisions/2026-05-06-normalized-context-event-design.md` (append a "Redlines applied during review" section).

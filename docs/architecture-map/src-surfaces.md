# `src/surfaces/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 12 files.

### `src/surfaces/ceo-slack-responder/brain.ts` — re-export shim

**Purpose:** One-line module that re-exports the entire `src/brain/brain.js` module under the `ceo-slack-responder` namespace, so consumers in this directory can import `IntakeFields` and other brain types via a relative surfaces path.

**Depends on:** `src/brain/brain.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (re-export only) | module | `src/surfaces/ceo-slack-responder/brain.ts:1` | `export * from '../../brain/brain.js'` — no local symbols defined. |

### `src/surfaces/ceo-slack-responder/decision-store.ts` — append-only team-decision storage on the shared Storage interface

**Purpose:** Defines the confirmed "team decision" atom shape and a store that appends confirmed decisions as derived capture events (source `derived:team-decisions`), with dedupe-by-draft-id, subject normalization, and query/search over the latest decision per normalized subject.

**Depends on:** `src/capture/sources.js` (`isAllowedDerived`), `src/storage/interface.js` (`CaptureEvent`, `EventId`, `Storage`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `TEAM_DECISION_SOURCE_NAME` | const | `src/surfaces/ceo-slack-responder/decision-store.ts:4` | String literal `'team-decisions'`, the allowlisted derived-source name. |
| `TEAM_DECISION_SOURCE` | const | `src/surfaces/ceo-slack-responder/decision-store.ts:5` | Full capture source string `derived:team-decisions`. |
| `DecisionSourceApp` | type | `src/surfaces/ceo-slack-responder/decision-store.ts:7` | Union `'claude-code' \| 'codex'` identifying which AI client originated a decision. |
| `ConfirmedDecisionInput` | interface | `src/surfaces/ceo-slack-responder/decision-store.ts:9` | Input shape for appending a confirmed decision (subject, decision, rationale, author, confirmer, timestamps, source app, draft id). |
| `TeamDecisionAtom` | interface | `src/surfaces/ceo-slack-responder/decision-store.ts:20` | Persisted/derived decision record shape including normalized_subject and dedupe_key. |
| `TeamDecisionStore` | interface | `src/surfaces/ceo-slack-responder/decision-store.ts:34` | Contract: `appendConfirmedDecision`, `findByDraftId`, `queryLatestDecisions`. |
| `TeamDecisionQuery` | interface | `src/surfaces/ceo-slack-responder/decision-store.ts:40` | Optional filter fields: subject, free-text query, limit. |
| `createTeamDecisionStore(storage)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:46` | Factory wiring the three store methods to module-level functions bound to a `Storage` instance. |
| `normalizeDecisionSubject(subject)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:54` | Trims, lowercases, and collapses whitespace in a decision subject for dedupe/lookup keys. |
| `decisionDedupeKey(subject)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:58` | Builds the `team-decision:<normalized subject>` dedupe key. |
| `appendConfirmedDecision(storage, input)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:62` | Validates input, checks allowlist, dedupes by draft_id via `findDecisionByDraftId`, then appends a new capture event with decision metadata and returns the resulting atom. |
| `findDecisionByDraftId(storage, draftId)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:112` | Loads all team-decision atoms and returns the one matching the trimmed draft id, or null. |
| `queryLatestTeamDecisions(storage, filter)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:122` | Loads atoms, filters via `matchesQuery`, keeps only the most-recent atom per dedupe_key, sorts descending by recency, and slices to `filter.limit`. |
| `loadTeamDecisionAtoms(storage)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:139` | Queries storage for all `derived:team-decisions` events (ascending) and maps them through `eventToTeamDecisionAtom`, dropping malformed ones. |
| `assertTeamDecisionSourceAllowed()` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:146` | Throws if the `team-decisions` derived source name is not on the capture-gate allowlist. |
| `validateConfirmedDecisionInput(input)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:152` | Throws if any required string field (draft_id, subject, decision, author, confirmed_by, confirmed_at) is missing/blank, or subject normalizes to empty. |
| `eventToTeamDecisionAtom(event)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:170` | Reconstructs a `TeamDecisionAtom` from a raw `CaptureEvent`'s metadata, returning null if the event isn't a team-decision or is missing required fields / has an invalid source_app. |
| `stringMetadata(md, key)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:209` | Reads a metadata field as a non-blank string, else null. |
| `matchesQuery(atom, filter)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:214` | Matches an atom against an optional exact-subject filter or a token-overlap free-text query across subject/decision/rationale. |
| `normalizeSearchText(value)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:227` | Lowercases, strips non-alphanumerics to spaces, and collapses whitespace for search matching. |
| `tokens(normalizedQuery)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:235` | Splits a normalized query into tokens of length ≥3, excluding a small English stop-word set. |
| `compareDecisionRecency(a, b)` | function | `src/surfaces/ceo-slack-responder/decision-store.ts:258` | Orders two atoms by `confirmed_at` timestamp, tie-breaking by atom_id string comparison. |

### `src/surfaces/ceo-slack-responder/draft-store.ts` — file-backed decision-draft lifecycle store

**Purpose:** Implements a JSON-file-persisted draft store for proposed team decisions (pending → confirmed/dismissed), used by the propose-decision MCP tool and Slack confirm flow; guards concurrent access with per-draft in-process locks and atomic tmp-file-rename writes.

**Depends on:** `node:crypto` (`randomUUID`), `node:fs/promises`, `node:path`, `./decision-store.js` (`ConfirmedDecisionInput`, `DecisionSourceApp`, `TeamDecisionAtom`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DecisionDraftStatus` | type | `src/surfaces/ceo-slack-responder/draft-store.ts:10` | Union `'pending' \| 'confirmed' \| 'dismissed'`. |
| `DecisionDraft` | interface | `src/surfaces/ceo-slack-responder/draft-store.ts:12` | Full draft record: identifiers, content, status, timestamps, and confirm/dismiss attribution fields. |
| `DecisionDraftInput` | interface | `src/surfaces/ceo-slack-responder/draft-store.ts:30` | Input for creating a new draft (subject, decision, rationale, author, source_app). |
| `DecisionDraftStore` | interface | `src/surfaces/ceo-slack-responder/draft-store.ts:38` | Contract: createDraft, getDraft, editDraft, dismissDraft, confirmDraft. |
| `DraftFile` | interface | `src/surfaces/ceo-slack-responder/draft-store.ts:55` | On-disk JSON shape: `{ schema_version: 1, drafts: Record<string, DecisionDraft> }`. |
| `FileDecisionDraftStore` | class | `src/surfaces/ceo-slack-responder/draft-store.ts:60` | JSON-file implementation of `DecisionDraftStore` keyed by a configurable file path. |
| `FileDecisionDraftStore.createDraft(input)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:65` | Validates input, generates a UUID draft_id, sets status `pending`, and persists it. |
| `FileDecisionDraftStore.getDraft(draftId)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:87` | Reads the file and returns the draft by id or null. |
| `FileDecisionDraftStore.editDraft(draftId, patch)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:92` | Under a per-draft lock, requires the draft to be pending, applies subject/decision/rationale patch, bumps updated_at. |
| `FileDecisionDraftStore.dismissDraft(draftId, dismissedBy, dismissedAt?)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:120` | Under lock, marks a non-terminal draft dismissed with attribution and timestamp (no-op if already confirmed/dismissed). |
| `FileDecisionDraftStore.confirmDraft(draftId, confirmedBy, append, confirmedAt?)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:143` | Under lock, if not already confirmed, requires pending, calls the injected `append` callback to create the `TeamDecisionAtom`, then re-reads the file and marks the draft confirmed with the resulting atom id (idempotent re-entry returns existing confirmed draft). |
| `FileDecisionDraftStore.withDraftLock(draftId, fn)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:183` | Serializes concurrent operations on the same draft id via a chained-promise mutex map. |
| `FileDecisionDraftStore.readFile()` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:203` | Reads and JSON-parses the draft file, returning an empty store on ENOENT and validating `schema_version`/`drafts` shape. |
| `FileDecisionDraftStore.writeFile(file)` | method | `src/surfaces/ceo-slack-responder/draft-store.ts:224` | Ensures the parent dir exists, writes to a pid/timestamp-suffixed tmp file, then atomically renames over the target path. |
| `isErrnoException(err)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:232` | Type guard for `NodeJS.ErrnoException` (checks for a `code` property). |
| `validateDraftInput(input)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:236` | Throws unless subject/decision/author are non-blank and source_app is `claude-code`/`codex`. |
| `validateDraftPatch(patch)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:245` | Throws unless patched subject/decision are non-blank. |
| `requiredString(value, field)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:253` | Trims a string, throwing if it is blank. |
| `requireDraft(file, draftId)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:258` | Looks up a draft by id in the file, throwing if not found. |
| `ensurePending(draft)` | function | `src/surfaces/ceo-slack-responder/draft-store.ts:264` | Throws if the draft's status is not `pending`. |

### `src/surfaces/ceo-slack-responder/identity.ts` — cofounder Slack-identity resolution

**Purpose:** Parses the `ECHO_TEAM_COFUNDER_IDENTITIES` JSON env var into typed identities and resolves a Slack user id to a cofounder's canonical id / display label, used to attribute decision confirmations and intake requesters to human-readable names.

**Depends on:** none (pure functions over JSON input)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CofounderIdentity` | interface | `src/surfaces/ceo-slack-responder/identity.ts:1` | Shape `{ id, slack_user_id, display_name? }`. |
| `parseCofounderIdentities(raw)` | function | `src/surfaces/ceo-slack-responder/identity.ts:7` | Parses a JSON string into an array of `CofounderIdentity`, returning `[]` for undefined/blank input and throwing if the parsed value isn't an array. |
| `resolveCofounderBySlackUser(identities, slackUserId)` | function | `src/surfaces/ceo-slack-responder/identity.ts:14` | Finds the identity whose `slack_user_id` matches the trimmed input, or null. |
| `confirmAttributionForSlackUser(identities, slackUserId)` | function | `src/surfaces/ceo-slack-responder/identity.ts:23` | Returns the resolved cofounder's `id`, falling back to the raw Slack user id if unresolved. |
| `requesterAttributionForSlackUser(identities, slackUserId)` | function | `src/surfaces/ceo-slack-responder/identity.ts:30` | Returns the resolved cofounder's `display_name` (or `id`) for human-readable requester labeling, falling back to the trimmed Slack user id. |
| `parseIdentity(value)` | function | `src/surfaces/ceo-slack-responder/identity.ts:39` | Validates an unknown JSON value is a plain object and extracts required `id`/`slack_user_id` and optional `display_name` fields. |
| `stringField(record, key)` | function | `src/surfaces/ceo-slack-responder/identity.ts:54` | Reads and trims a required non-blank string field, throwing otherwise. |
| `optionalStringField(record, key)` | function | `src/surfaces/ceo-slack-responder/identity.ts:62` | Reads and trims an optional string field, throwing only if present but blank/non-string. |

### `src/surfaces/ceo-slack-responder/index.ts` — CEO Slack responder process entrypoint

**Purpose:** CLI/module entrypoint for the CEO Slack responder surface: re-exports the responder config loader/runner and brain functions, and when invoked directly as the main module, loads config and runs the Slack responder loop, exiting non-zero on error.

**Depends on:** `node:url` (`fileURLToPath`), `./responder.js` (`loadResponderConfig`, `runSlackResponder`), `./brain.js` (`runBrain`, `preflightBrain`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (module-run guard) | function | `src/surfaces/ceo-slack-responder/index.ts:8` | If this file is the process entry point, calls `runSlackResponder(loadResponderConfig())` and writes any error message to stderr with exit code 1. |

### `src/surfaces/ceo-slack-responder/intake-agent.ts` — pluggable Slack-intake issue-drafting agent

**Purpose:** Provides deterministic and Claude-Agent-SDK-backed renderers that turn a completed Slack intake (`IntakeFields` + context) into a Linear issue title/body draft; the deterministic path uses `issue-render.ts` templates while the Claude path runs a constrained sub-agent with read-only MCP contract tools and structured JSON output.

**Depends on:** `@anthropic-ai/claude-agent-sdk` (`createSdkMcpServer`, `query`, `tool`), `zod`, `./brain.js` (`IntakeFields`), `./issue-render.js` (`renderIssueTitle`, `renderParentDeliverableIssue`, `IssueRenderInput`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `IntakeAgentProvider` | type | `src/surfaces/ceo-slack-responder/intake-agent.ts:11` | Union `'deterministic' \| 'claude' \| 'codex'`. |
| `IntakeIssueDraft` | interface | `src/surfaces/ceo-slack-responder/intake-agent.ts:13` | Rendered `{ title, body }` output shape. |
| `IntakeIssueRendererOptions` | interface | `src/surfaces/ceo-slack-responder/intake-agent.ts:18` | Renderer config: provider, optional model, maxTurns. |
| `IntakeIssueRenderContext` | interface | `src/surfaces/ceo-slack-responder/intake-agent.ts:24` | Extends `IssueRenderInput` with `knownProjectNames` for the agent prompt. |
| `DEFAULT_INTAKE_AGENT_MAX_TURNS` | const | `src/surfaces/ceo-slack-responder/intake-agent.ts:28` | Default max agent turns (4). |
| `CLAUDE_INTAKE_SERVER_NAME` | const | `src/surfaces/ceo-slack-responder/intake-agent.ts:29` | MCP server name `'echo_intake'` registered for the Claude sub-agent. |
| `ISSUE_DRAFT_SCHEMA` | const | `src/surfaces/ceo-slack-responder/intake-agent.ts:30` | JSON schema requiring `title`/`body` non-empty strings, used as the agent's structured output schema. |
| `IssueDraftOutput` | const | `src/surfaces/ceo-slack-responder/intake-agent.ts:40` | Zod schema mirroring `ISSUE_DRAFT_SCHEMA` for runtime validation of the agent's structured output. |
| `parseIntakeAgentProvider(raw)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:45` | Parses `ECHO_INTAKE_AGENT_PROVIDER` env value into an `IntakeAgentProvider`, defaulting to `'deterministic'` and throwing on unrecognized values. |
| `parseIntakeAgentMaxTurns(raw)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:56` | Parses `ECHO_INTAKE_AGENT_MAX_TURNS` into a positive integer, defaulting to `DEFAULT_INTAKE_AGENT_MAX_TURNS`. |
| `createIntakeIssueRenderer(options)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:65` | Returns the deterministic renderer, or a Claude-backed renderer (requiring `ANTHROPIC_API_KEY`); throws for the reserved `codex` provider. |
| `renderDeterministicIssueDraft(input)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:81` | Builds title/body via `renderIssueTitle`/`renderParentDeliverableIssue` with no LLM call. |
| `renderClaudeIssueDraft(input, options)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:90` | Spins up an in-process read-only MCP server exposing `get_issue_creation_contract` and `list_linear_projects`, runs a Claude Agent SDK `query()` with a $0.50 budget cap and JSON-schema-constrained output, and validates the result with `IssueDraftOutput`. |
| `buildClaudeIssuePrompt(input)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:172` | Builds the natural-language prompt instructing the sub-agent to draft (not create) a Linear issue, listing drafting requirements and embedding the intake payload as JSON. |
| `issueCreationContract()` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:208` | Returns the contract object (minimum fields, required body sections, notes) served by the `get_issue_creation_contract` MCP tool. |
| `parseJsonObject(raw)` | function | `src/surfaces/ceo-slack-responder/intake-agent.ts:243` | Best-effort JSON.parse of a fallback result string, returning undefined on blank input or parse failure. |

### `src/surfaces/ceo-slack-responder/intake-draft-store.ts` — file-backed Slack/Granola intake-to-Linear draft store with exactly-once create

**Purpose:** Persists in-progress Slack intake conversations (and Granola meeting-sourced seeds, item 109) as JSON-file drafts keyed by Slack thread, tracking field accumulation, idempotent Linear-issue creation via `runCreateOnce`, and failure/reconcile states; guards concurrency with per-key and whole-file locks plus atomic writes.

**Depends on:** `node:crypto` (`createHash`, `randomUUID`), `node:fs/promises`, `node:path`, `./brain.js` (`intakeReadyFields`, `IntakeFieldKey`, `IntakeFields`), `./intake-seed.js` (`MeetingProvenance`), `./linear-client.js` (`LinearIssueCreated`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `IntakeDraftStatus` | type | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:8` | Union `'pending' \| 'creating' \| 'created' \| 'needs-reconcile' \| 'dismissed'`. |
| `IntakeThreadKeyParts` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:15` | `{ teamId, channelId, rootTs }` identifying a Slack thread. |
| `IntakeRequester` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:21` | `{ slack_user_id, label }`. |
| `IntakeFailureEvidence` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:26` | Records a failed create attempt: timestamp, phase (`linear_create`/`creating_replay`), message. |
| `IntakeDraft` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:32` | Full draft record: thread key, requester, accumulated fields, optional meeting provenance/candidate key, status, idempotency token, seen Slack event ids, created issue, failure, confirm/dismiss attribution, timestamps. |
| `RecordIntakeMessageInput` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:59` | Input for recording a new Slack message into a thread's draft. |
| `RecordIntakeSeedInput` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:68` | Input for recording a Granola meeting-sourced seed, including `candidateKey` and optional `meetingProvenance`. |
| `IntakeSeedOutcome` | type | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:79` | Union `'created' \| 'duplicate_event' \| 'duplicate_candidate'`. |
| `RecordIntakeSeedResult` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:81` | `{ draft, outcome }` returned by `recordSeed`. |
| `IntakeCreateContext` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:86` | Context passed to the injected create callback: draft, required fields, resolved projectId. |
| `IntakeCreateResult` | type | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:92` | Discriminated union of outcomes: created / already_created / needs_reconcile / dismissed / not_ready. |
| `IntakeDraftStore` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:99` | Contract: getDraft, recordMessage, recordSeed (exactly-once per candidate key, doc'd in JSDoc at lines 104-111), runCreateOnce, dismissDraft. |
| `IntakeDraftFile` | interface | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:122` | On-disk shape `{ schema_version: 1, drafts: Record<string, IntakeDraft> }`. |
| `FileIntakeDraftStore` | class | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:127` | JSON-file implementation of `IntakeDraftStore`. |
| `FileIntakeDraftStore.getDraft(key)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:133` | Reads the file and returns the draft by key or null. |
| `FileIntakeDraftStore.recordMessage(input)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:138` | Under draft+file lock, dedupes by Slack event id, merges new fields into any existing draft (creating one if absent), and persists. |
| `FileIntakeDraftStore.recordSeed(input)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:175` | Under draft+file lock, dedupes first by `candidate_key` across all drafts (exactly-once per meeting candidate), then by thread-key event id, else creates/merges a draft carrying `candidate_key` and `meeting_provenance`. |
| `FileIntakeDraftStore.runCreateOnce(key, confirmedBy, create, confirmedAt?)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:233` | Under draft+file lock, transitions a pending+ready draft to `creating`, invokes the injected `create` callback outside the lock, then records `created` or `needs-reconcile` on failure; returns `already_created`/`dismissed`/`needs_reconcile`/`not_ready` for other states, and treats a prior in-flight `creating` status as ambiguous (marks needs-reconcile without retrying). |
| `FileIntakeDraftStore.dismissDraft(key, dismissedBy, dismissedAt?)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:335` | Under lock, marks a non-terminal draft dismissed (no-op if already created/dismissed). |
| `FileIntakeDraftStore.withDraftLock(key, fn)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:359` | Per-draft-key chained-promise mutex. |
| `FileIntakeDraftStore.withFileLock(fn)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:379` | Whole-file chained-promise mutex serializing read-modify-write cycles across all keys. |
| `FileIntakeDraftStore.readFile()` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:399` | Reads/parses the draft file, returning an empty store on ENOENT and validating shape. |
| `FileIntakeDraftStore.writeFile(file)` | method | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:420` | Ensures parent dir exists, writes to a pid/timestamp/uuid-suffixed tmp file, atomically renames over target. |
| `intakeThreadKey(key)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:428` | Joins `teamId:channelId:rootTs` into the draft's storage key. |
| `intakeIdempotencyToken(key)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:436` | Derives a `linear-intake:<sha256-prefix>` idempotency token from the thread key. |
| `createDraft(input)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:440` | Builds a fresh `pending` `IntakeDraft` with empty fields, a UUID-suffixed idempotency token, and no seen events. |
| `compactFields(fields)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:464` | Trims all string field values and drops blank ones. |
| `withFailure(draft, failure)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:474` | Returns a copy of the draft transitioned to `needs-reconcile` with the given failure evidence attached. |
| `requireDraft(file, key)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:483` | Looks up a draft by key, throwing if absent. |
| `requiredString(value, field)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:489` | Trims a required string, throwing if undefined/blank. |
| `isErrnoException(err)` | function | `src/surfaces/ceo-slack-responder/intake-draft-store.ts:494` | Type guard for `NodeJS.ErrnoException`. |

### `src/surfaces/ceo-slack-responder/intake-seed.ts` — re-export shim

**Purpose:** One-line module re-exporting `src/brain/intake-seed.js` (which defines `MeetingProvenance` and related Granola-seed types) under the surfaces namespace for local imports.

**Depends on:** `src/brain/intake-seed.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| (re-export only) | module | `src/surfaces/ceo-slack-responder/intake-seed.ts:1` | `export * from '../../brain/intake-seed.js'` — no local symbols defined. |

### `src/surfaces/ceo-slack-responder/issue-render.ts` — deterministic Linear issue title/body templating

**Purpose:** Pure string-templating functions that render a completed Slack intake's fields into a Linear issue title (sentence/word-truncated) and a structured Markdown parent-deliverable issue body (with Request/Why/Scope/Done-when/Delivery/Receipts sections and optional Granola meeting provenance), plus a short confirmation receipt message posted back to Slack after creation.

**Depends on:** `./brain.js` (`IntakeFields`), `./intake-seed.js` (`MeetingProvenance`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `IssueRenderInput` | interface | `src/surfaces/ceo-slack-responder/issue-render.ts:4` | Rendering context: required intake fields, requester, Slack thread URL, project name/id, optional status note and meeting provenance. |
| `CreatedIssueReceiptInput` | interface | `src/surfaces/ceo-slack-responder/issue-render.ts:14` | Input for the post-create Slack receipt: issue URL, project name, fields. |
| `MAX_TITLE_LENGTH` | const | `src/surfaces/ceo-slack-responder/issue-render.ts:20` | 255 — Linear's title length ceiling. |
| `TITLE_TRUNCATE_TARGET` | const | `src/surfaces/ceo-slack-responder/issue-render.ts:21` | 200 — preferred truncation length before the hard cap. |
| `FALLBACK_TITLE` | const | `src/surfaces/ceo-slack-responder/issue-render.ts:22` | `'Untitled intake request'` used when the request field is empty. |
| `renderIssueTitle(fields)` | function | `src/surfaces/ceo-slack-responder/issue-render.ts:24` | Normalizes whitespace in `fields.request`; if within limits returns as-is, else prefers cutting at the first full sentence within `TITLE_TRUNCATE_TARGET`, else hard-cuts at the last word boundary and appends an ellipsis. |
| `renderParentDeliverableIssue(input)` | function | `src/surfaces/ceo-slack-responder/issue-render.ts:42` | Builds the full Markdown issue body: Request/Why/Client outcome/Scope/Out-of-scope/Current state/Done-when/Delivery/Dependencies/Receipts sections, embedding requester, Slack thread URL, project name/id, and (via `renderMeetingProvenanceLines`) any Granola meeting citation. |
| `renderMeetingProvenanceLines(provenance)` | function | `src/surfaces/ceo-slack-responder/issue-render.ts:112` | Renders optional `Meeting:`/`Granola:`/`Meeting quote:` lines from a `MeetingProvenance`, omitting lines for absent optional fields. |
| `formatCreatedIssueReceipt(input)` | function | `src/surfaces/ceo-slack-responder/issue-render.ts:128` | Builds the short Slack confirmation message listing the created issue URL/project and the fields that were included. |

### `src/surfaces/ceo-slack-responder/linear-client.ts` — Linear GraphQL API client + config loader

**Purpose:** Wraps the Linear GraphQL `issueCreate` mutation behind a small `LinearClient` interface with timeout/abort handling, plus env-driven config loading (API key, team/state/assignee/project ids, per-client-project Linear project map) and helpers to resolve a client-project name to a Linear project id.

**Depends on:** global `fetch`/`Response`/`AbortController` (no internal imports)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `LinearConfig` | interface | `src/surfaces/ceo-slack-responder/linear-client.ts:1` | apiKey, teamId, inboxStateId, defaultAssigneeId, defaultProjectId, projectMap. |
| `LinearIssueCreateInput` | interface | `src/surfaces/ceo-slack-responder/linear-client.ts:10` | Fields required to create a Linear issue: title, body, teamId, projectId, stateId, assigneeId. |
| `LinearIssueCreated` | interface | `src/surfaces/ceo-slack-responder/linear-client.ts:19` | `{ id, url }` of a created issue. |
| `LinearClient` | interface | `src/surfaces/ceo-slack-responder/linear-client.ts:24` | Single-method contract `createIssue(input)`. |
| `FetchLike` | type | `src/surfaces/ceo-slack-responder/linear-client.ts:28` | Injectable fetch function signature for testability. |
| `LinearGraphqlResponse` | interface | `src/surfaces/ceo-slack-responder/linear-client.ts:30` | Expected shape of the Linear GraphQL response for `issueCreate`. |
| `LINEAR_API_URL` | const | `src/surfaces/ceo-slack-responder/linear-client.ts:43` | `'https://api.linear.app/graphql'`. |
| `DEFAULT_TIMEOUT_MS` | const | `src/surfaces/ceo-slack-responder/linear-client.ts:44` | 10000 — default request timeout. |
| `LinearGraphqlClient` | class | `src/surfaces/ceo-slack-responder/linear-client.ts:46` | Concrete `LinearClient` implementation issuing the `EchoCreateIssue` GraphQL mutation over HTTP. |
| `LinearGraphqlClient.createIssue(input)` | method | `src/surfaces/ceo-slack-responder/linear-client.ts:55` | Validates input, POSTs the mutation with an abort-controller timeout, checks HTTP status / GraphQL errors / success flag, and returns `{ id, url }`, converting abort errors into a timeout message. |
| `createLinearClient(config, fetchImpl?, timeoutMs?)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:118` | Factory constructing a `LinearGraphqlClient` from just the API key. |
| `loadLinearConfig(env)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:126` | Reads and validates all required `LINEAR_*` env vars, parsing `LINEAR_PROJECT_MAP` via `parseProjectMap`. |
| `shouldLoadLinearConfig(env)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:143` | Returns true if `ECHO_LINEAR_INTAKE_ENABLED` is set truthy or any of the required Linear env vars is non-blank. |
| `resolveLinearProjectId(clientProject, config)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:158` | Normalizes the client project name; maps `internal`/`echo`/`no client` to the default project id, otherwise looks it up in `config.projectMap`, returning null if unmapped. |
| `knownLinearProjectNames(config)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:170` | Returns the sorted list of configured project-map keys. |
| `normalizeProjectName(name)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:174` | Trims, lowercases, and collapses whitespace in a project name. |
| `parseProjectMap(raw)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:178` | Parses `LINEAR_PROJECT_MAP` JSON into a normalized-name→project-id record, validating it's a non-empty object of string ids. |
| `requiredEnv(env, key)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:201` | Reads a required non-blank env var, throwing via `requireNonEmpty` otherwise. |
| `validateCreateInput(input)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:206` | Ensures all six `LinearIssueCreateInput` fields are non-blank. |
| `requireNonEmpty(value, field)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:215` | Trims a value, throwing `${field} is required` if undefined/blank. |
| `formatLinearErrors(errors)` | function | `src/surfaces/ceo-slack-responder/linear-client.ts:222` | Joins GraphQL error messages with `; ` for a single error string. |

### `src/surfaces/ceo-slack-responder/propose-decision-tool.ts` — `propose_decision` MCP tool registration and handler

**Purpose:** Registers an MCP tool (`propose_decision`) that lets an AI client (Claude Code / Codex) draft a team decision and post it as a Slack confirm card; the decision is only durably shared once a human confirms the posted draft, gating on `ECHO_SLACK_BOT_TOKEN` / `ECHO_TEAM_DECISION_CONFIRM_TARGET` / a resolvable author.

**Depends on:** `@modelcontextprotocol/sdk/server/mcp.js` (`McpServer`), `node:os` (`homedir`), `node:path` (`join`), `zod`, `./draft-store.js` (`FileDecisionDraftStore`, `DecisionDraft`, `DecisionDraftStore`), `./responder.js` (`postDecisionDraftCard`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ProposeDecisionInput` | interface | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:12` | Tool input: subject, decision, optional rationale, source_app. |
| `ProposeDecisionResult` | interface | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:19` | Tool success output: schema_version, tool name, status `draft_posted`, draft_id, confirm_target. |
| `ProposeDecisionDependencies` | interface | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:27` | Injected deps: draftStore, slackBotToken, confirmTarget, author, postDraftCard override. |
| `proposeDecisionOutputSchema` | const | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:35` | Zod shape mirroring `ProposeDecisionResult` for MCP `outputSchema`. |
| `registerProposeDecision(server)` | function | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:43` | Registers the `propose_decision` MCP tool with input/output schemas and a handler that calls `proposeDecision` using env-loaded dependencies, returning an MCP error content block on failure. |
| `proposeDecision(input, deps)` | function | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:74` | Validates the Slack bot token, confirm target (channel/user id pattern), and resolved author are present; creates a draft via `deps.draftStore.createDraft`, posts the draft card to Slack, and returns the `ProposeDecisionResult` or an error string. |
| `loadProposeDecisionDependencies(env)` | function | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:116` | Builds `ProposeDecisionDependencies` from env: a `FileDecisionDraftStore` at `ECHO_TEAM_DECISION_DRAFT_STORE` (default `~/.echo/state/team-decision-drafts.json`), Slack token, confirm target, and resolved author. |
| `resolveDecisionAuthor(env)` | function | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:130` | Resolves the decision author by falling through `ECHO_TEAM_DECISION_AUTHOR` → `ECHO_MACHINE_ID` → `ECHO_AGENT_ID` → `USER` → `'local-machine'`. |
| `isValidConfirmTarget(target)` | function | `src/surfaces/ceo-slack-responder/propose-decision-tool.ts:140` | Regex-validates a Slack channel (`C`) or user (`D`/`U`) id shape. |

### `src/surfaces/ceo-slack-responder/responder.ts` — Slack Socket Mode responder for the CEO-loop bot

**Purpose:** Implements the Slack Socket Mode event loop for the CEO/team Slack bot: parses envelopes into questions/decision-actions/intake-actions/intake-seeds, dispatches to the brain (Q&A), the team-decision confirm flow, and the Linear intake flow (parse → follow-up → confirm card → create issue), and logs usage/failure records for observability.

**Depends on:** `src/logging/index.js`, `src/storage/sqlite.js`, `./brain.js`, `./decision-store.js`, `./draft-store.js`, `./identity.js`, `./intake-draft-store.js`, `./intake-seed.js`, `./intake-agent.js`, `./issue-render.js`, `./linear-client.js`; external: `node:fs/promises`, `node:os`, `node:path`, global `fetch`/`WebSocket`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_ECHO_MCP_URL` | const | `src/surfaces/ceo-slack-responder/responder.ts:65` | `'http://127.0.0.1:38478/mcp'` — fallback ECHO MCP URL when no env override is set. |
| `DEFAULT_EVENT_LOG_PATH` | const | `src/surfaces/ceo-slack-responder/responder.ts:66` | `'raw/internal/ceo-loop-events.md'` — default relative path for the usage/failure event log. |
| `DEFAULT_BRAIN_TIMEOUT_MS` | const | `src/surfaces/ceo-slack-responder/responder.ts:67` | 180000 — default brain-run timeout in milliseconds. |
| `SOCKET_DRAIN_TIMEOUT_MS` | const | `src/surfaces/ceo-slack-responder/responder.ts:68` | 30000 — max time to drain in-flight message handlers before forcing exit on disconnect. |
| `SOCKET_EXIT_DELAY_MS` | const | `src/surfaces/ceo-slack-responder/responder.ts:69` | 25 — delay before `process.exit(1)` after in-flight work drains post-disconnect. |
| `ACK_MESSAGE` | const | `src/surfaces/ceo-slack-responder/responder.ts:70` | `'Looking...'` — immediate acknowledgment text posted on receiving a question. |
| `DEFAULT_LINEAR_INTAKE_DRAFT_STORE` | const | `src/surfaces/ceo-slack-responder/responder.ts:72` | Default file path `~/.echo/state/linear-intake-drafts.json` for the Linear-intake draft store. |
| `ResponderConfig` | interface | `src/surfaces/ceo-slack-responder/responder.ts:79` | Full runtime config: Slack tokens, ECHO MCP URL, context repo path, allowed channels, brain choice/timeout, intake-only flag, intake-agent settings, team-decision store paths, Linear config, and seed-carve-out bot/channel ids. |
| `SlackQuestion` | interface | `src/surfaces/ceo-slack-responder/responder.ts:108` | Normalized inbound Slack message treated as a question (envelope/event ids, channel, user, text, ts/threadTs). |
| `SlackMessageEvent` | interface | `src/surfaces/ceo-slack-responder/responder.ts:119` | Raw Slack `message`/`app_mention` event shape read off the envelope payload. |
| `SlackEnvelope` | interface | `src/surfaces/ceo-slack-responder/responder.ts:132` | Raw Socket Mode envelope shape covering `events_api` and `interactive` payload variants. |
| `SlackApiResponse` | interface | `src/surfaces/ceo-slack-responder/responder.ts:148` | Minimal shape of a Slack Web API JSON response (`ok`/`error`/`url`). |
| `SocketLike` | interface | `src/surfaces/ceo-slack-responder/responder.ts:154` | Minimal WebSocket surface (addEventListener/send) the responder depends on, for testability. |
| `SocketConstructor` | type | `src/surfaces/ceo-slack-responder/responder.ts:162` | Constructor type for a `SocketLike`, used to type `globalThis.WebSocket`. |
| `BrainRunner` | type | `src/surfaces/ceo-slack-responder/responder.ts:163` | Function type matching `runBrain`'s signature, injectable for tests. |
| `SlackPoster` | type | `src/surfaces/ceo-slack-responder/responder.ts:164` | Function type matching `postSlackMessage`, injectable for tests. |
| `IntakeConfirmPoster` | type | `src/surfaces/ceo-slack-responder/responder.ts:165` | Function type matching `postIntakeConfirmCard`, injectable for tests. |
| `UsageAppender` | type | `src/surfaces/ceo-slack-responder/responder.ts:166` | Function type matching `appendUsageRecord`, injectable for tests. |
| `IntakeFailureAppender` | type | `src/surfaces/ceo-slack-responder/responder.ts:167` | Function type matching `appendIntakeFailureRecord`, injectable for tests. |
| `IntakeSlackPostFailureAppender` | type | `src/surfaces/ceo-slack-responder/responder.ts:168` | Function type matching `appendIntakeSlackPostFailureRecord`, injectable for tests. |
| `IntakeSeedDismissalAppender` | type | `src/surfaces/ceo-slack-responder/responder.ts:169` | Function type matching `appendIntakeSeedDismissalRecord`, injectable for tests. |
| `IntakeIssueRenderer` | type | `src/surfaces/ceo-slack-responder/responder.ts:170` | Function type for rendering an intake draft into an `IntakeIssueDraft`. |
| `IntakeSlackPostFailureRecord` | interface | `src/surfaces/ceo-slack-responder/responder.ts:172` | Record shape logged when a Slack post in the intake flow fails (phase, draftKey, channel, message, threadTs, issueUrl). |
| `ResponderDependencies` | interface | `src/surfaces/ceo-slack-responder/responder.ts:181` | Injectable dependency bag (brain runner, Slack posters, record appenders, stores, Linear client) used to make the responder testable without live I/O. |
| `DecisionAction` | interface | `src/surfaces/ceo-slack-responder/responder.ts:196` | Parsed team-decision button interaction (confirm/dismiss/edit) with draftId/channel/user/ts. |
| `IntakeAction` | interface | `src/surfaces/ceo-slack-responder/responder.ts:205` | Parsed Linear-intake button interaction (confirm/dismiss) with draftKey/channel/user/ts. |
| `IntakeSeed` | interface | `src/surfaces/ceo-slack-responder/responder.ts:214` | Parsed bot-authored Granola-seed message (candidateKey, ownerSlackId, fields, meetingProvenance). |
| `intakeKeyPartsForQuestion(question)` | function | `src/surfaces/ceo-slack-responder/responder.ts:226` | Derives the intake thread key parts (teamId/channelId/rootTs) from a SlackQuestion, defaulting missing ids. |
| `requiredEnv(env, primary, fallback?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:234` | Reads an env var (with optional fallback name), trims it, and throws if unset/blank. |
| `parseChannelList(raw)` | function | `src/surfaces/ceo-slack-responder/responder.ts:244` | Splits a comma-separated env string into a trimmed, non-empty list of channel ids. |
| `parsePositiveInt(raw, fallback)` | function | `src/surfaces/ceo-slack-responder/responder.ts:252` | Parses a positive integer from an env string, falling back to a default, throwing on invalid input. |
| `parseBooleanFlag(raw)` | function | `src/surfaces/ceo-slack-responder/responder.ts:261` | Interprets `1/true/yes/on` (case-insensitive) as true; anything else as false. |
| `loadResponderConfig(env)` | function | `src/surfaces/ceo-slack-responder/responder.ts:267` | Builds a full `ResponderConfig` from process env: validates the context repo path is absolute, loads optional Linear config, enforces that intake-only mode requires an explicit channel allowlist, and assembles all optional intake/decision/seed settings. |
| `createResponderRuntimeDependencies(config)` | function | `src/surfaces/ceo-slack-responder/responder.ts:319` | Wires concrete runtime dependencies (SQLite team-decision store, file-backed decision/intake draft stores, Linear client, intake issue renderer) from a loaded config. |
| `extractQuestion(envelope, allowedChannelIds)` | function | `src/surfaces/ceo-slack-responder/responder.ts:343` | Validates an `events_api` envelope is a plain (non-bot, non-subtype) message/app_mention in an allowed channel or DM, normalizes its text, and returns a `SlackQuestion` or null. |
| `normalizeSlackQuestionText(text)` | function | `src/surfaces/ceo-slack-responder/responder.ts:378` | Strips `<@USERID>` mentions, collapses whitespace per line, drops blank lines, and trims. |
| `answerQuestion(question, config, brainRunner?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:388` | Invokes the configured brain runner with the question text, brain name, context repo path, timeout, and MCP URL env override. |
| `respondToQuestion(question, config, deps?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:401` | Top-level question handler: acks with "Looking...", routes to Linear-intake handling if applicable, short-circuits with an intake-only help message, otherwise runs the brain (or team-decision-only answerer), logs the usage record, and posts the answer or a formatted failure. |
| `respondToLinearIntakeIfNeeded(question, config, deps, postMessage?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:482` | Detects likely Linear-intake messages (or continuations of an existing draft thread), runs the intake brain to parse fields, merges with any existing draft, resolves the project id, records the message in the intake draft store, and drives the next reply; returns whether it handled the message. |
| `driveIntakeDraftReply(draft, config, deps, postMessage, channel, threadTs)` | function | `src/surfaces/ceo-slack-responder/responder.ts:561` | Shared reply driver for both the human-typed and Granola-seed intake paths: posts follow-up questions if fields/project are missing, or posts the confirm card once all required fields are ready. |
| `nextIntakeFollowupFields(fields, linearConfig, knownProjectNames)` | function | `src/surfaces/ceo-slack-responder/responder.ts:611` | Computes missing intake fields, prioritizing re-asking `clientProject` first if a project name was given but didn't resolve to a known project id. |
| `extractDecisionAction(envelope)` | function | `src/surfaces/ceo-slack-responder/responder.ts:623` | Parses an `interactive` envelope's first action into a `DecisionAction` (confirm/dismiss/edit) by matching known `echo_decision_*` action ids. |
| `extractIntakeAction(envelope)` | function | `src/surfaces/ceo-slack-responder/responder.ts:661` | Parses an `interactive` envelope's first action into an `IntakeAction` (confirm/dismiss) by matching known `echo_intake_*` action ids. |
| `extractIntakeSeed(envelope, config)` | function | `src/surfaces/ceo-slack-responder/responder.ts:707` | Item-109 seed carve-out: accepts a bot-authored message as an intake seed only if it matches the configured seed bot id and channel, has a parseable seed marker, and yields an owner Slack id; otherwise returns null (human/other-bot/malformed messages fall through). |
| `firstSlackMention(text)` | function | `src/surfaces/ceo-slack-responder/responder.ts:740` | Regex-extracts the first `<@USERID>` mention from text, if any. |
| `respondToDecisionAction(action, config, deps)` | function | `src/surfaces/ceo-slack-responder/responder.ts:745` | Handles a team-decision button click: confirms (appending to the team decision store) or dismisses a draft via the decision draft store, or replies with edit instructions; replies with a "not configured" message if stores are missing. |
| `respondToIntakeSeed(seed, config, deps, ackEnvelope?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:800` | Write-before-ack handler for Granola-seeded intake candidates: records the seed durably (dedup by candidate key/event id) before acking the Slack envelope, then drives the next reply only if the record was newly created. |
| `respondToIntakeAction(action, config, deps)` | function | `src/surfaces/ceo-slack-responder/responder.ts:848` | Handles intake confirm/dismiss button clicks: verifies the requester matches, on dismiss logs a Granola-seed-dismissal record when applicable, on confirm runs `runCreateOnce` to render the issue draft and create it in Linear exactly once, and posts the resulting receipt/failure message per outcome (created/already_created/needs_reconcile/dismissed/not_ready). |
| `renderIssueDraftWithFallback(renderer, input)` | function | `src/surfaces/ceo-slack-responder/responder.ts:990` | Runs the configured (agent) issue renderer and falls back to the deterministic renderer with a truncated failure note if the agent renderer throws. |
| `formatIntakeFollowup(questions)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1009` | Formats a numbered list of missing-field follow-up questions, or a generic "missing context" message if none. |
| `slackThreadUrl(channel, rootTs)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1022` | Builds a Slack archive permalink URL from a channel id and thread root timestamp. |
| `formatUsageRecord(question, brain, result, answeredAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1026` | Formats a single pipe-delimited usage log line capturing channel/thread/user/brain/outcome/duration/reason/question text. |
| `appendUsageRecord(path, question, brain, result, answeredAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1051` | Appends a formatted usage record line to the event log file, creating parent directories as needed. |
| `formatIntakeFailureRecord(draft, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1062` | Formats a log line for an intake draft that needs manual reconciliation (key/status/phase/message). |
| `appendIntakeFailureRecord(path, draft, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1073` | Appends a formatted intake-failure record line to the event log file. |
| `formatIntakeSlackPostFailureRecord(failure, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1082` | Formats a log line for a failed Slack post during the intake flow (phase/channel/thread/issueUrl/message). |
| `appendIntakeSlackPostFailureRecord(path, failure, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1101` | Appends a formatted intake-Slack-post-failure record line to the event log file. |
| `formatIntakeSeedDismissalRecord(draft, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1110` | Formats a log line for a dismissed Granola-seeded intake draft (key/candidate_key/dismissed_by), used as a noise-tuning signal. |
| `appendIntakeSeedDismissalRecord(path, draft, recordedAt?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1123` | Appends a formatted intake-seed-dismissal record line to the event log file. |
| `postIntakeSlackMessageOrRecordFailure(config, deps, postMessage, input)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1132` | Posts a plain Slack message and, on failure, records an `IntakeSlackPostFailureRecord` to the event log before rethrowing. |
| `postIntakeConfirmCardOrRecordFailure(config, deps, postConfirmCard, input)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1158` | Posts the intake confirm card and, on failure, records an `IntakeSlackPostFailureRecord` to the event log before rethrowing. |
| `escapeRecordValue(text)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1191` | Collapses whitespace and escapes double quotes for safe inclusion in a pipe-delimited log line. |
| `openSocketModeUrl(appToken)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1195` | Calls Slack's `apps.connections.open` API to obtain a Socket Mode WebSocket URL. |
| `postSlackMessage(botToken, channel, text, threadTs?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1210` | Posts a plain text message to Slack via `chat.postMessage`, optionally threaded. |
| `postDecisionDraftCard(botToken, channel, draft)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1234` | Posts a Slack Block Kit card proposing a shared team decision with Confirm/Edit/Dismiss buttons. |
| `postIntakeConfirmCard(botToken, channel, draft, fields, threadTs?)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1292` | Posts a Slack Block Kit card summarizing the proposed Linear issue (project/request/why/done-when) with Confirm/Dismiss buttons. |
| `runSlackResponder(config)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1351` | Entry point: preflights the brain (unless intake-only), opens the Socket Mode connection, wires message/close/error listeners tracking in-flight work, and triggers graceful shutdown on disconnect. |
| `handleSocketMessage(event, socket, config, deps)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1404` | Decodes a raw WebSocket message into a Slack envelope and dispatches in priority order: intake seed (write-before-ack) → decision action → intake action → question, acking immediately for all non-seed paths. |
| `exitAfterSocketDisconnect(inFlight)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1482` | Drains in-flight message handlers up to a timeout then schedules `process.exit(1)` shortly after. |
| `drainInFlightWork(inFlight, timeoutMs)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1492` | Waits for all in-flight promises to settle or a deadline to pass, whichever comes first. |
| `errorPayload(err)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1515` | Converts an unknown error into a structured log payload (name/message/stack or stringified). |
| `socketEventPayload(event)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1526` | Extracts code/reason/message/type fields from a raw WebSocket close/error event for logging. |
| `envelopeLogPayload(envelope)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1537` | Extracts a compact structured logging payload (ids, channel, user, thread/ts) from a Slack envelope. |
| `ignoredQuestionReason(envelope, allowedChannelIds)` | function | `src/surfaces/ceo-slack-responder/responder.ts:1553` | Determines the specific reason a Slack event was ignored as a question (not events_api, missing fields, bot/subtyped, channel not allowlisted, unmentioned channel, empty text) for debug logging. |

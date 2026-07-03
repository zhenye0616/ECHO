# `tests/surfaces/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 14 files.

### `tests/surfaces/ceo-slack-brain-regressions.test.ts` — pinned regression cases for intake field-extraction parsing

**Purpose:** Regression suite for `extractIntakeFields`/`runIntakeBrain` numbered-reply parsing and `renderIssueTitle` title-length bounding in `src/surfaces/ceo-slack-responder/brain.js` and `issue-render.js`; pins previously-buggy edge cases (mid-sentence "N." tokens, prose ordinals, labeled answers inside numbered replies, request inference around meta "file a Linear ticket" asks) so they don't regress.

**Depends on:** `src/surfaces/ceo-slack-responder/brain.js`, `src/surfaces/ceo-slack-responder/issue-render.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "numbered follow-up reply parsing"` | describe block | `tests/surfaces/ceo-slack-brain-regressions.test.ts:9` | Verifies `extractIntakeFields` correctly disambiguates numbered-list markers ("1.", "2)") from prose digits/dates and routes labeled vs. positional answers to the right expected field. |
| `describe: "request inference"` | describe block | `tests/surfaces/ceo-slack-brain-regressions.test.ts:80` | Verifies `runIntakeBrain` recovers the real request sentence when it shares a colon with a meta "file a ticket" ask, skips meta-ask sentences, and still infers a request amid multiple date-like tokens. |
| `describe: "issue rendering bounds"` | describe block | `tests/surfaces/ceo-slack-brain-regressions.test.ts:104` | Verifies `renderIssueTitle` truncates a long generated title to stay within Linear's 255-char API limit while remaining non-empty. |
| `describe: "pinned behavior for untested branches"` | describe block | `tests/surfaces/ceo-slack-brain-regressions.test.ts:122` | Covers remaining branches: preferring a contentful sentence over a known-project-only line, inferring no request from an urgency-only message, assigning a plain unnumbered reply to a single expected field, and stripping matching field labels while keeping unknown labels. |

### `tests/surfaces/ceo-slack-brain.test.ts` — brain invocation, sandboxing, and intake NLU test suite

**Purpose:** Exercises `src/surfaces/ceo-slack-responder/brain.js`'s subprocess-based "brain" abstraction (spawning `codex`/`claude` CLIs with scoped read-only sandboxes, capturing JSON or plain stdout, timeout/kill-group handling) and the `runIntakeBrain`/`extractIntakeFields` deterministic NLU used to fill Linear-intake fields from Slack free text.

**Depends on:** `src/surfaces/ceo-slack-responder/brain.js`, `node:fs/promises`, `node:os`, `node:path`, `node:child_process` (indirectly via brain.js), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "ceo-slack-responder brain"` | describe block | `tests/surfaces/ceo-slack-brain.test.ts:24` | Covers `resolveBrainInvocation` argv/cwd/capture-mode resolution for codex and claude brains, `parseCodexJsonFinalMessage` JSONL parsing, `runBrain` end-to-end execution (success, non-zero exit, empty capture, timeout with descendant-process kill), `preflightBrain` version probing, `buildBrainPrompt` scoped prompt construction, and multiple `runIntakeBrain` field-inference/follow-up-mapping scenarios. |
| `tempDir()` | function | `tests/surfaces/ceo-slack-brain.test.ts:309` | Creates and registers (for cleanup) a temp directory under the OS tmpdir for stub scripts. |
| `writeStub(dir, name, lines)` | function | `tests/surfaces/ceo-slack-brain.test.ts:315` | Writes a small Node.js stub script (joined lines) to disk, used to fake codex/claude executables in tests. |
| `registryWith(brain, scriptPath, capture)` | function | `tests/surfaces/ceo-slack-brain.test.ts:321` | Builds a `BrainRegistry` override that substitutes the real `codex`/`claude` executable with the current Node binary running a stub script, for the given capture mode. |
| `pidIsAlive(pid)` | function | `tests/surfaces/ceo-slack-brain.test.ts:337` | Checks liveness of a process id via `process.kill(pid, 0)`, used to assert descendant processes were reaped after a timeout kill. |
| `wait(ms)` | function | `tests/surfaces/ceo-slack-brain.test.ts:346` | Returns a promise that resolves after `ms` milliseconds. |

### `tests/surfaces/ceo-slack-responder.test.ts` — Slack CEO-responder config loading, question extraction, and answer/post flow suite

**Purpose:** Tests `src/surfaces/ceo-slack-responder/responder.js`'s env-based config loader (`loadResponderConfig`), Slack event parsing (`extractQuestion`, `normalizeSlackQuestionText`), the `answerQuestion`/`respondToQuestion` orchestration (posting an ack, invoking the brain, posting the synthesized/failure answer), and the `formatUsageRecord` usage-log line formatter.

**Depends on:** `src/surfaces/ceo-slack-responder/responder.js`, `src/surfaces/ceo-slack-responder/brain.js` (type only), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "ceo-slack-responder"` | describe block | `tests/surfaces/ceo-slack-responder.test.ts:15` | Covers `loadResponderConfig` env parsing/validation (Slack/ECHO/brain/intake-agent settings, channel allowlist requirement in intake-only mode, absolute-path and brain/provider validation), `extractQuestion` DM/channel/bot-echo handling, `normalizeSlackQuestionText`, `answerQuestion` brain invocation wiring, `respondToQuestion` ack-then-answer and failure-post behavior, and `formatUsageRecord` field/length formatting. |
| `config()` | function | `tests/surfaces/ceo-slack-responder.test.ts:330` | Builds a baseline `ResponderConfig` fixture (codex brain, no channel allowlist) shared across tests. |
| `question()` | function | `tests/surfaces/ceo-slack-responder.test.ts:344` | Builds a baseline `SlackQuestion` fixture ("why did we build the observability layer?"). |
| `deferred()` | function | `tests/surfaces/ceo-slack-responder.test.ts:354` | Returns a manually-resolvable `{promise, resolve}` pair used to control brain-resolution timing in the ack-then-answer test. |

### `tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts` — team-decision confirm idempotency/crash-replay suite

**Purpose:** Tests that `respondToDecisionAction`'s confirm path (in `responder.js`, backed by `FileDecisionDraftStore` and `createTeamDecisionStore`) is exactly-once under concurrent Slack double-clicks and safely replayable after a crash between decision-append and draft-persistence.

**Depends on:** `src/surfaces/ceo-slack-responder/decision-store.js`, `src/surfaces/ceo-slack-responder/draft-store.js`, `src/surfaces/ceo-slack-responder/responder.js`, `src/storage/memory.js`, `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "decision confirm idempotency"` | describe block | `tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts:24` | Verifies concurrent duplicate confirm actions on the same draft append exactly one shared-decision atom and both Slack posts report success; verifies a simulated crash after `appendConfirmedDecision` but before draft persistence still leaves exactly one atom and a later replay returns the same `decision_atom_id` without duplicating. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts:103` | Builds a `ResponderConfig` fixture with one cofounder identity (`blake`/`UBL`). |
| `confirmAction(draftId)` | function | `tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts:118` | Builds a `DecisionAction` of kind `confirm` for the given draft id, channel `CDECIDE`, user `UBL`. |
| `tempDraftPath()` | function | `tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts:128` | Creates a temp dir (registered for cleanup) and returns its path plus a `drafts.json` file path for `FileDecisionDraftStore`. |

### `tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts` — cross-team decision-answer scoping suite

**Purpose:** Verifies the derived `team-decisions` namespace is allowlisted separately from raw capture sources, and that `answerFromTeamDecisions` / `respondToQuestion` (when a `teamDecisionStore` is configured) answer only from confirmed shared decisions — never leaking raw session/transcript content across the cross-team Slack boundary.

**Depends on:** `src/capture/sources.js`, `src/surfaces/ceo-slack-responder/brain.js`, `src/surfaces/ceo-slack-responder/decision-store.js`, `src/surfaces/ceo-slack-responder/responder.js`, `src/storage/memory.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "cross-team decision scope"` | describe block | `tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts:16` | Verifies `TEAM_DECISION_SOURCE` equals `derived:team-decisions` and `isAllowedDerived('team-decisions')` is true; verifies `answerFromTeamDecisions` surfaces confirmed decision + rationale text but never raw stored content; verifies it refuses raw drill-down requests with a boundary message; verifies `respondToQuestion` routes to the decision layer (never invoking the raw reasoning brain) when a team decision matches. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts:100` | Builds a `ResponderConfig` fixture with empty `cofounderIdentities`. |
| `question(text)` | function | `tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts:115` | Builds a `SlackQuestion` fixture for the given question text. |

### `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts` — team-decision-store latest-wins query suite

**Purpose:** Verifies `createTeamDecisionStore` (in `decision-store.js`) appends an immutable new atom per re-confirmation of the same subject (never mutating the prior atom) and that `queryLatestDecisions` returns only the most recent decision per `dedupe_key`.

**Depends on:** `src/surfaces/ceo-slack-responder/decision-store.js`, `src/storage/memory.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "team decision store latest-wins"` | describe block | `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts:10` | Re-confirms the "auth storage" subject twice with different casing/whitespace, asserts both appends produce distinct immutable atoms sharing the same `decisionDedupeKey('auth storage')` metadata value, and asserts `queryLatestDecisions({subject})` returns only the second (latest) decision. |

### `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts` — Linear intake-confirm idempotency and failure-path suite

**Purpose:** Tests `respondToIntakeAction`'s confirm path (`responder.js`, backed by `FileIntakeDraftStore`) for exactly-once Linear issue creation under concurrent confirms, correct `needs-reconcile` handling on replayed "creating" state and Linear/Slack-post failures, deterministic-renderer fallback when the headless agent renderer fails, and correct isolation between drafts sharing an `action_id`/across concurrent Slack threads.

**Depends on:** `src/surfaces/ceo-slack-responder/intake-draft-store.js`, `src/surfaces/ceo-slack-responder/linear-client.js` (type only), `src/surfaces/ceo-slack-responder/responder.js`, `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "Slack Linear intake confirm idempotency"` | describe block | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:24` | Covers: concurrent duplicate confirms create exactly one Linear issue; a draft stuck in `creating` on replay becomes `needs-reconcile` with `phase: 'creating_replay'` without retrying; `linearClient.createIssue` timeouts become `needs-reconcile`/`phase: 'linear_create'`; a failing `intakeIssueRenderer` falls back to deterministic rendering with a "Status note" in the body while still marking `created`; Slack-post failures after a successful Linear create are recorded via `appendIntakeSlackPostFailureRecord` with `phase: 'created_receipt_post'` while the draft stays `created`; replayed confirms on a dismissed draft are a no-op; two confirm cards sharing an `action_id` on different thread keys both create independently; 20 concurrently-recorded distinct-thread drafts are all preserved. |
| `readyDraft()` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:200` | Creates a temp `FileIntakeDraftStore` and records one complete-fields message so the draft is ready to confirm. |
| `deps(store, calls)` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:219` | Builds a `respondToIntakeAction` dependency bag whose `linearClient.createIssue` pushes to `calls` and returns an incrementing fake Linear issue id/url. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:236` | Builds a `ResponderConfig` fixture with one cofounder (`taylor`/`UREQ`) and a full `linearConfig` including a `claudia` project mapping. |
| `draftKey()` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:259` | Returns the `intakeThreadKey` for team `T1`, channel `CENG`, root ts `100.1`. |
| `confirmAction(draftKey)` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:263` | Builds an `IntakeAction` of kind `confirm` for the given draft key. |
| `readyFields(request)` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:273` | Builds a complete `IntakeFields` object (clientProject `claudia`, given request text, plus why/clientOutcome/evidence/doneWhen/urgency/clientFacing) for a ready-to-confirm draft. |
| `forceStatus(filePath, key, status)` | function | `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts:286` | Directly rewrites the on-disk drafts JSON file to force a draft's `status` field, simulating a crash mid-transition (e.g. stuck in `creating`). |

### `tests/surfaces/ceo-slack-responder/intake-followup.test.ts` — Linear intake follow-up question/thread-accumulation suite

**Purpose:** Tests `respondToQuestion`'s intake follow-up flow — asking at most two plain-language missing-context questions, accumulating fields across a Slack thread (top-level plus threaded replies) under one `intakeThreadKey`, mapping numbered/labeled thread replies to previously-asked fields without overwriting the original request, isolating drafts across channels sharing a root timestamp, and prompting a "Choose one:" list when an unmapped project name is given.

**Depends on:** `src/surfaces/ceo-slack-responder/intake-draft-store.js`, `src/surfaces/ceo-slack-responder/responder.js`, `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "Slack Linear intake follow-ups"` | describe block | `tests/surfaces/ceo-slack-responder/intake-followup.test.ts:22` | Covers: asking at most two follow-up questions and creating nothing while fields are missing; accumulating fields across a threaded reply under one draft key; mapping numbered thread replies to asked fields without overwriting the request; persisting `asked_fields` and parsing inline numbered replies against them; not colliding across channels with identical root timestamps; prompting "Choose one: claudia" when the project name is unmapped. |
| `tempStore()` | function | `tests/surfaces/ceo-slack-responder/intake-followup.test.ts:236` | Creates a temp-dir-backed `FileIntakeDraftStore` for a test. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/intake-followup.test.ts:242` | Builds a `ResponderConfig` fixture with empty cofounder identities and a full `linearConfig` (claudia project mapping). |
| `question(text, eventId, overrides)` | function | `tests/surfaces/ceo-slack-responder/intake-followup.test.ts:265` | Builds a `SlackQuestion` fixture for team `T1`/channel `CENG`/user `UREQ` with the given text, event id, and optional field overrides (e.g. `ts`, `threadTs`, `channel`). |

### `tests/surfaces/ceo-slack-responder/intake-gate.test.ts` — end-to-end intake gate (request → confirm card → Linear issue) suite

**Purpose:** Tests the full plain-English-request-to-confirmed-Linear-issue flow: `respondToQuestion` posting a confirm card for a complete request, `respondToIntakeAction`'s confirm creating the Linear Inbox issue with correct team/project/state/assignee/title/body (including Slack thread link and requester), the headless-agent `intakeIssueRenderer` override path, preservation of complete labeled fields through the production Slack `extractQuestion` envelope path, and that Slack is intentionally excluded from the capture-source allowlist.

**Depends on:** `src/capture/sources.js`, `src/surfaces/ceo-slack-responder/intake-draft-store.js`, `src/surfaces/ceo-slack-responder/linear-client.js` (type only), `src/surfaces/ceo-slack-responder/responder.js`, `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "Slack Linear intake gate"` | describe block | `tests/surfaces/ceo-slack-responder/intake-gate.test.ts:27` | Covers: a complete request posts only a confirm card (no premature Linear create) and confirming creates the issue with correct team/project/state/assignee/title/body/requester/thread-link, then posts a "Created ... status Inbox" receipt containing "- done-when"; the configured `intakeIssueRenderer` is invoked post-confirmation with the correct project name/id/known-project-names/thread-url and its rendered title/body are used for the Linear create; a complete labeled request routed through the real `extractQuestion` Slack envelope path preserves fields and posts a confirm card; `CAPTURED_SOURCES` excludes `slack` from `apis` and `slack.com` from `domains`. |
| `tempStore()` | function | `tests/surfaces/ceo-slack-responder/intake-gate.test.ts:193` | Creates a temp-dir-backed `FileIntakeDraftStore`. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/intake-gate.test.ts:199` | Builds a `ResponderConfig` fixture with cofounder `taylor`/`UREQ` and full `linearConfig`. |
| `completeQuestion()` | function | `tests/surfaces/ceo-slack-responder/intake-gate.test.ts:222` | Builds a `SlackQuestion` whose text is a fully-labeled intake request (Client/project, Request, Why, Client outcome, Evidence/example, Done when, Urgency, Client-facing). |
| `confirmAction(draftKey)` | function | `tests/surfaces/ceo-slack-responder/intake-gate.test.ts:243` | Builds an `IntakeAction` of kind `confirm` for the given draft key, channel `CENG`, user `UREQ`. |

### `tests/surfaces/ceo-slack-responder/intake-seed.test.ts` — meeting-seeded intake marker/draft/dismissal suite

**Purpose:** Tests the meeting-note-seeded intake path in `intake-seed.js` (`renderSeedMarker`/`parseSeedMarker`/`renderSeedMessage` round-tripping candidate key, owner, fields, and `MeetingProvenance`) and `responder.js`'s `extractIntakeSeed`/`respondToIntakeSeed` AC3 gate (self-bot + configured intake channel only), including exactly-once draft creation per candidate key, write-before-ack durability ordering, and seed-dismissal provenance recording.

**Depends on:** `src/surfaces/ceo-slack-responder/intake-draft-store.js`, `src/surfaces/ceo-slack-responder/intake-seed.js`, `src/surfaces/ceo-slack-responder/responder.js`, `src/surfaces/ceo-slack-responder/brain.js` (type only), `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tempStore()` | function | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:35` | Creates a temp-dir-backed `FileIntakeDraftStore`. |
| `completeFields()` | function | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:52` | Returns a fully-populated `IntakeFields` object for the "Claudia" amendment-alerts scenario. |
| `config(overrides)` | function | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:65` | Builds a `ResponderConfig` fixture with `seedAcceptBotId: 'BSELF'`, `seedAcceptChannelId: 'C-INTAKE'`, one cofounder (`owner`/`UOWNER`), and full `linearConfig`, with override support. |
| `seedEnvelope(opts)` | function | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:91` | Builds a Slack `events_api` envelope for a `message` event carrying the given text/bot_id/channel/ts/eventId, used as input to `extractIntakeSeed`. |
| `seedText(fields)` | function | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:115` | Renders the seed-marker-bearing Slack message text via `renderSeedMessage` for the given fields (default `completeFields()`), fixed `PROVENANCE`, owner, and candidate key. |
| `describe: "seed marker"` | describe block | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:124` | Verifies `renderSeedMarker`/`parseSeedMarker` round-trip candidate key, owner, fields, and provenance, and that absent/unsupported-version/malformed markers parse to null. |
| `describe: "extractIntakeSeed (AC3 gate)"` | describe block | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:148` | Verifies `extractIntakeSeed` accepts a self-bot marker message in the configured intake channel and extracts candidate key/owner/fields/provenance; ignores human-authored messages, non-self bots, markers outside the intake channel, unsupported/malformed markers, and everything when the seed carve-out is unconfigured. |
| `describe: "respondToIntakeSeed"` | describe block | `tests/surfaces/ceo-slack-responder/intake-seed.test.ts:187` | Verifies a complete seed creates a draft (with `candidate_key`, `meeting_provenance`, requester, and recorded `slack_event_ids`) and posts a confirm card; an incomplete seed instead posts one follow-up-questions message; a duplicate candidate key on a different thread/event is a no-op producing no second draft; the draft is durably written before the Slack event is acked (`order` = `['write', 'ack']`); dismissing a seeded draft records the dismissal with its originating `candidate_key`. |

### `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts` — meeting-provenance-in-issue-body suite

**Purpose:** Tests `renderParentDeliverableIssue` (`issue-render.js`) rendering an optional meeting-provenance block (meeting title/date, Granola link, quote) alongside the Slack thread link, and verifies that provenance flows end-to-end from a seeded intake message through confirm into the created Linear issue's body.

**Depends on:** `src/surfaces/ceo-slack-responder/intake-draft-store.js`, `src/surfaces/ceo-slack-responder/issue-render.js`, `src/surfaces/ceo-slack-responder/intake-seed.js`, `src/surfaces/ceo-slack-responder/linear-client.js` (type only), `src/surfaces/ceo-slack-responder/responder.js`, `src/surfaces/ceo-slack-responder/brain.js` (type only), `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `completeFields()` | function | `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts:35` | Returns a fully-populated `Required<IntakeFields>` object for the "Claudia" scenario. |
| `describe: "renderParentDeliverableIssue meeting provenance"` | describe block | `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts:48` | Verifies the rendered issue body includes the Slack thread link plus "Meeting: <title> (<date>)", "Granola: <url>", and "Meeting quote: <quote>" when `meetingProvenance` is passed, and omits the meeting/Granola lines entirely for non-seeded issues. |
| `describe: "seed → confirm → create carries provenance into the Linear issue body"` | describe block | `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts:77` | Drives a full seed → `respondToIntakeSeed` → `respondToIntakeAction` confirm flow and asserts the resulting `LinearIssueCreateInput.body` contains the meeting title/date, Granola link, meeting quote, and Slack thread link. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts:144` | Builds a `ResponderConfig` fixture with `seedAcceptBotId`/`seedAcceptChannelId` set to `C-INTAKE`, cofounder `owner`/`UOWNER`, and full `linearConfig`. |

### `tests/surfaces/ceo-slack-responder/linear-client.test.ts` — Linear GraphQL client and config-loader suite

**Purpose:** Tests `LinearGraphqlClient.createIssue` request-shaping (mapping issue fields to the `issueCreate` GraphQL mutation payload), `loadLinearConfig` env validation (required keys, JSON-parseable project map), `resolveLinearProjectId` name resolution, pre-network validation of unresolved create input, and a bounded per-request timeout with no retry on failure.

**Depends on:** `src/surfaces/ceo-slack-responder/linear-client.js`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "Linear create client"` | describe block | `tests/surfaces/ceo-slack-responder/linear-client.test.ts:9` | Verifies `LinearGraphqlClient.createIssue` sends a GraphQL request with the expected `variables.input` shape and returns `{id, url}` from a successful response; verifies `loadLinearConfig` throws on missing `LINEAR_API_KEY` and on malformed `LINEAR_PROJECT_MAP` JSON, and that `resolveLinearProjectId` resolves known/case-insensitive/default project names and returns null for unknown ones; verifies `createIssue` rejects with "projectId is required" before making any network call when `projectId` is empty; verifies a 1ms-timeout client aborts the fetch and rejects with a "timed out" error after exactly one call (no retry). |

### `tests/surfaces/ceo-slack-responder/propose-confirm.test.ts` — MCP `propose_decision` tool integration suite

**Purpose:** Integration test that boots a real MCP server (`startMcpServer`) and verifies the `propose_decision` MCP tool is registered, and that `proposeDecision` (`propose-decision-tool.js`) validates a confirm target, creates a durable pending draft via `FileDecisionDraftStore` and posts a draft card, without appending any shared decision to `createTeamDecisionStore` until an explicit confirm.

**Depends on:** `src/mcp/server.js`, `src/surfaces/ceo-slack-responder/decision-store.js`, `src/surfaces/ceo-slack-responder/draft-store.js`, `src/surfaces/ceo-slack-responder/propose-decision-tool.js`, `src/storage/memory.js`, `tests/fixtures/stdout.js`, `@modelcontextprotocol/sdk/client/index.js`, `@modelcontextprotocol/sdk/client/streamableHttp.js`, `node:fs`, `node:fs/promises`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "propose-confirm decision flow"` | describe block | `tests/surfaces/ceo-slack-responder/propose-confirm.test.ts:32` | Verifies `propose_decision` appears in the live MCP server's `listTools()` result; verifies `proposeDecision` returns an operator-visible error and creates no draft file when `ECHO_TEAM_DECISION_CONFIRM_TARGET`/`confirmTarget` is missing; verifies a valid call creates a durable pending draft, posts exactly one draft card with the matching `draft_id`, and leaves `queryLatestDecisions()` empty pre-confirm. |
| `input()` | function | `tests/surfaces/ceo-slack-responder/propose-confirm.test.ts:88` | Builds a `propose_decision` input fixture (subject "Auth storage", decision, rationale, `source_app: 'codex'`). |
| `tempDraftPath()` | function | `tests/surfaces/ceo-slack-responder/propose-confirm.test.ts:97` | Creates a temp dir (registered for cleanup) and returns a `drafts.json` file path. |
| `withClient(url, fn)` | function | `tests/surfaces/ceo-slack-responder/propose-confirm.test.ts:103` | Connects an MCP `Client` over `StreamableHTTPClientTransport` to `url`, runs `fn` against it, and always closes the client afterward. |

### `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts` — Slack Socket Mode connection lifecycle and graceful-shutdown suite

**Purpose:** Tests `runSlackResponder`'s Socket Mode WebSocket lifecycle in `responder.js` — using a `FakeSocket` and stubbed `fetch` (including `apps.connections.open`) to verify the process exits with code 1 after the socket closes while idle, and that in-flight Slack work (posts) is drained before exiting when the socket closes mid-request.

**Depends on:** `src/surfaces/ceo-slack-responder/responder.js`, `vitest` (incl. `vi`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FakeSocket` | class | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:10` | In-memory stand-in for the global `WebSocket` used by Socket Mode; records constructed instances, captures `send()` frames, and supports `addEventListener`/`emit` for driving `open`/`message`/`close` events in tests. |
| `FakeSocket.constructor(url)` | method | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:16` | Stores the connection URL and registers the instance in the static `instances` list. |
| `FakeSocket.addEventListener(type, listener)` | method | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:21` | Registers a listener for the given event type. |
| `FakeSocket.send(data)` | method | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:27` | Records the sent frame string in `sent`. |
| `FakeSocket.emit(type, event)` | method | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:31` | Synchronously invokes all listeners registered for `type` with `event`. |
| `stubSlackFetch()` | function | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:43` | Stubs the global `fetch` so `apps.connections.open` returns a fake WSS URL immediately, and all other Slack API POSTs (e.g. `chat.postMessage`) resolve immediately if `releasePosts()` has been called or otherwise queue as pending promises; returns `{releasePosts, pendingPostCount}` to control/observe drain timing. |
| `config()` | function | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:72` | Builds a `ResponderConfig` fixture with `allowedChannelIds: ['CENG']` and `intakeOnly: true`. |
| `questionEnvelope()` | function | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:88` | Builds a JSON-stringified Slack Socket Mode `events_api`/`app_mention` envelope text for channel `CENG`. |
| `wait(ms)` | function | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:106` | Returns a promise resolving after `ms` milliseconds. |
| `describe: "Slack socket lifecycle"` | describe block | `tests/surfaces/ceo-slack-responder/socket-lifecycle.test.ts:112` | Verifies `runSlackResponder` calls `process.exit(1)` (and sets `process.exitCode = 1`) after the Socket Mode connection closes while idle; verifies that when a question is in-flight (a Slack post is pending), the process does not exit on socket close until pending posts are released/drained, then exits with code 1. |

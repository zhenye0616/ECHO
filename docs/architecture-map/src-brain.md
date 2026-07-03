# `src/brain/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `src/brain/brain.ts` — CEO Slack responder's reasoning-brain runner + intake parser

**Purpose:** Runs the "brain" (codex or claude CLI) as a scoped subprocess to answer CEO-loop questions from ECHO context, and separately implements deterministic (non-LLM) parsing of Slack intake replies into structured `IntakeFields` for the Linear-intake flow. Also formats confirmed-team-decision-only answers as a fallback when raw brain invocation isn't used.

**Depends on:** `node:child_process` (spawn); no other internal modules.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `TeamDecisionAtom` | interface | `src/brain/brain.ts:7` | Shape of a confirmed cross-tool team decision atom (subject, decision, rationale, confirmer, dedupe key). |
| `TeamDecisionQuery` | interface | `src/brain/brain.ts:21` | Filter shape (subject/query/limit) for querying latest team decisions. |
| `TeamDecisionStore` | interface | `src/brain/brain.ts:27` | Contract for a store that can return latest matching decision atoms. |
| `IntakeFieldKey` | type | `src/brain/brain.ts:31` | Union of the 8 intake field keys (clientProject, request, why, clientOutcome, evidence, doneWhen, urgency, clientFacing). |
| `IntakeFields` | interface | `src/brain/brain.ts:41` | Partial record of the 8 intake fields as free-text strings. |
| `IntakeBrainOptions` | interface | `src/brain/brain.ts:52` | Options controlling intake extraction: known project names, expected numbered-list field order, whether to infer request text. |
| `IntakeBrainResult` | interface | `src/brain/brain.ts:58` | Result of running intake extraction: fields, missing keys, generated follow-up questions, ready flag. |
| `BrainResult` | interface | `src/brain/brain.ts:65` | Outcome of a brain subprocess run: ok flag, outcome enum, duration, answer/reason. |
| `BrainBinding` | interface | `src/brain/brain.ts:73` | Describes how to invoke one brain (executable, version-probe args, argv builder, stdout capture mode). |
| `BrainRunOptions` | interface | `src/brain/brain.ts:80` | Options for `runBrain`: brain name, scoped repo path, timeout, env, kill grace, optional registry override. |
| `BrainRegistry` | type | `src/brain/brain.ts:89` | Readonly map from `BrainName` to its `BrainBinding`. |
| `Invocation` | interface | `src/brain/brain.ts:91` | Resolved argv/cwd/env/prompt/capture for one brain run. |
| `BRAIN_REGISTRY` | const | `src/brain/brain.ts:115` | Concrete registry: `codex` runs `codex exec -C <dir> --sandbox read-only --json -` capturing stdout-json; `claude` runs `claude --dangerously-skip-permissions -p` capturing stdout-text. |
| `parseBrainName(raw)` | function | `src/brain/brain.ts:139` | Validates/normalizes `ECHO_CEO_BRAIN` env value to `'codex'` (default) or `'claude'`; throws on any other value. |
| `buildBrainPrompt(question, scopeRepoPath)` | function | `src/brain/brain.ts:146` | Builds the system+question prompt instructing the brain to answer only from scoped ECHO context, always pass the exact repo_path, and cite concrete facts. |
| `runIntakeBrain(text, options)` | function | `src/brain/brain.ts:165` | Top-level intake entry point: extracts fields, computes missing fields, builds follow-up questions, and a ready flag. |
| `extractIntakeFields(text, options)` | function | `src/brain/brain.ts:176` | Merges labeled-field parse, numbered-list parse, known-project match, and inferred request/urgency/client-facing into one `IntakeFields`. |
| `missingIntakeFields(fields, options)` | function | `src/brain/brain.ts:196` | Computes which of the 8 required fields are still empty, plus re-flags `clientProject` as missing if it doesn't match any known project and isn't an internal name. |
| `intakeReadyFields(fields)` | function | `src/brain/brain.ts:218` | Returns a fully-populated, trimmed `Required<IntakeFields>` or null if any field is missing. |
| `intakeFollowupFieldsToAsk(missing)` | function | `src/brain/brain.ts:234` | Caps follow-up questions to at most the first 2 missing fields per turn. |
| `buildIntakeFollowupQuestions(missing, options)` | function | `src/brain/brain.ts:238` | Maps the capped missing fields to human-readable follow-up question strings. |
| `isLikelyLinearIntake(text, knownProjectNames)` | function | `src/brain/brain.ts:245` | Heuristic classifier: true if text matches a known project or contains intake trigger phrases ("file this", "create an issue", "done when", etc.). |
| `resolveBrainInvocation(question, options)` | function | `src/brain/brain.ts:265` | Builds the concrete `Invocation` (argv/cwd/env/prompt/capture) for a brain run from the registry binding. |
| `preflightBrain(brain, env, registry)` | function | `src/brain/brain.ts:277` | Runs the brain's version-probe command with a 5s timeout to verify the binary is present/working before real use; throws on timeout or nonzero exit. |
| `runBrain(question, options)` | function | `src/brain/brain.ts:301` | Spawns the selected brain with the built prompt on stdin, enforces the run timeout, and parses stdout (JSON-final-message for codex, plain trim for claude) into a `BrainResult`. |
| `parseCodexJsonFinalMessage(stdout)` | function | `src/brain/brain.ts:361` | Parses codex's JSON-lines stdout, extracting the last non-empty assistant message text; throws if none found. |
| `formatBrainFailure(result)` | function | `src/brain/brain.ts:383` | Formats a bounded human-readable failure string from a non-ok `BrainResult`. |
| `answerFromTeamDecisions(question, decisionStore)` | function | `src/brain/brain.ts:388` | Non-subprocess answer path: refuses raw-context questions with a fixed disclaimer, otherwise queries the decision store and formats the top matches. |
| `asksForRawContext(question)` | function | `src/brain/brain.ts:412` | Detects whether a question is asking for raw/diff/session/transcript/log/terminal/file/source data (which must be refused). |
| `parseLabeledIntakeFields(text)` | function | `src/brain/brain.ts:426` | Parses `Label: value` lines into `IntakeFields` via `intakeFieldFromLabel`. |
| `IntakeListMarker` | interface | `src/brain/brain.ts:439` | Shape of a detected numbered-list marker (ordinal, index, content start offset). |
| `MONTH_BEFORE_MARKER_PATTERN` | const | `src/brain/brain.ts:445` | Regex matching a trailing month name/abbreviation, used to reject false-positive numbered markers that are actually dates. |
| `findIntakeListMarkers(text)` | function | `src/brain/brain.ts:448` | Scans text for `N.`/`N)` list markers at line-start (or inline if the text opens with `1.`/`1)`), excluding date-like matches. |
| `parseNumberedIntakeFields(text, expectedFields)` | function | `src/brain/brain.ts:468` | Maps numbered-list items 1..N to the caller's expected field order, falling back to treating the whole text as field 1 when there's exactly one expected field and no markers matched. |
| `assignIntakeValue(fields, field, value)` | function | `src/brain/brain.ts:491` | Assigns a parsed list-item value to its expected field, unless the value itself starts with a different recognized `Label:` prefix (re-routes it). |
| `splitLeadingFieldLabel(value)` | function | `src/brain/brain.ts:500` | Detects and splits a leading `Label: value` prefix inside a list-item string. |
| `intakeFieldFromLabel(label)` | function | `src/brain/brain.ts:508` | Normalizes a free-text label (case/punctuation-insensitive) to one of the 8 `IntakeFieldKey`s via fixed phrase lists, or null. |
| `findKnownProject(text, knownProjectNames)` | function | `src/brain/brain.ts:534` | Whitespace-padded substring match of any known project name (normalized) inside the text. |
| `inferRequest(text, knownProjectNames)` | function | `src/brain/brain.ts:542` | Falls back to inferring the "request" field from the first sentence/line of free text when no explicit list/label found, filtering out mentions, meta "file this issue" phrasing, and low-information candidates. |
| `stripMetaLinearIssuePrefix(candidate)` | function | `src/brain/brain.ts:564` | Strips a leading "can you file an issue:" style meta-request prefix, keeping the remainder as the real request. |
| `isMetaLinearIssueRequest(candidate)` | function | `src/brain/brain.ts:572` | True if a candidate sentence is itself a meta request to create a Linear issue/ticket rather than the substantive ask. |
| `isLowInformationRequest(candidate, knownProjectNames)` | function | `src/brain/brain.ts:581` | True if a candidate is a bare yes/no/urgency word or exactly a known project name (not a real request). |
| `inferUrgency(text)` | function | `src/brain/brain.ts:589` | Regex-classifies free text into urgent/high/medium/low urgency, or undefined. |
| `inferClientFacing(text)` | function | `src/brain/brain.ts:598` | Regex-classifies free text as client-facing yes/no, or undefined. |
| `compactFields(fields)` | function | `src/brain/brain.ts:607` | Drops undefined/blank entries and trims all field values. |
| `isInternalProjectName(name)` | function | `src/brain/brain.ts:616` | True if the normalized name is "internal", "echo", or "no client". |
| `normalizeProjectName(name)` | function | `src/brain/brain.ts:620` | Lowercases, trims, and collapses whitespace in a project name for comparison. |
| `questionForMissingField(field, options)` | function | `src/brain/brain.ts:624` | Returns the fixed human-readable follow-up question text for one missing field (project question lists known choices when available). |
| `formatTeamDecisionAnswer(decisions)` | function | `src/brain/brain.ts:649` | Formats a list of team decision atoms into a Slack-ready multi-line answer, or a "no confirmed decision" message if empty. |
| `assistantText(value)` | function | `src/brain/brain.ts:664` | Recursively searches a parsed codex JSON event for an assistant-role message and extracts its text content. |
| `textFromContent(value)` | function | `src/brain/brain.ts:681` | Normalizes a JSON `content` field (string or array of strings/text blocks) into a single joined trimmed string. |
| `stringValue(value)` | function | `src/brain/brain.ts:697` | Type-guard cast returning the value if it's a string, else null. |
| `isRecord(value)` | function | `src/brain/brain.ts:701` | Type-guard for non-null object values. |
| `ProcessRunOptions` | interface | `src/brain/brain.ts:705` | Input shape for `runProcess`: argv, cwd, env, stdin, timeoutMs, killGraceMs. |
| `ProcessRunResult` | interface | `src/brain/brain.ts:714` | Output shape for `runProcess`: stdout, stderr, exitCode, timedOut flag. |
| `runProcess(options)` | function | `src/brain/brain.ts:721` | Spawns a detached child process, feeds stdin, collects stdout/stderr, and on timeout sends SIGTERM then SIGKILL to the process group before resolving with a bounded result. |
| `killProcessGroup(child, signal)` | function | `src/brain/brain.ts:791` | Sends a signal to the child's process group (negative pid), falling back to killing just the child process if that fails. |
| `boundedReason(reason)` | function | `src/brain/brain.ts:804` | Collapses whitespace and truncates an error/failure reason string to 200 chars, defaulting to "unknown error". |

### `src/brain/intake-seed.ts` — Meeting-intake seed marker codec + Slack seed message renderer

**Purpose:** Encodes/decodes the machine-readable "seed marker" embedded in a bot-authored Slack message that marks it as a Granola-meeting-derived intake candidate (so a later teammate reply in-thread can be recognized as confirming/dismissing that specific candidate), and renders the human-readable seed message shown in Slack. Sits alongside `brain.ts`'s `IntakeFields` in the CEO-loop meeting-intake bridge (item 109/org-alignment v0).

**Depends on:** `src/brain/brain.ts` (`IntakeFields` type); Node `Buffer` (base64url).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `MeetingProvenance` | interface | `src/brain/intake-seed.ts:9` | Capture-origin metadata for a meeting-sourced candidate: note id, meeting title/date, web URL, quote — kept separate from teammate-supplied `IntakeFields`. |
| `SeedMessageInput` | interface | `src/brain/intake-seed.ts:17` | Input to `renderSeedMessage`: intake fields, provenance, owner Slack id, candidate key. |
| `SeedMarker` | interface | `src/brain/intake-seed.ts:24` | Parsed marker shape: version, candidate key, optional owner id/fields/provenance. |
| `SeedMarkerInput` | interface | `src/brain/intake-seed.ts:32` | Input to `renderSeedMarker`: candidate key plus optional owner/fields/provenance to embed. |
| `SEED_MARKER_VERSION` | const | `src/brain/intake-seed.ts:46` | Current marker version (1) written by `renderSeedMarker`. |
| `SUPPORTED_SEED_MARKER_VERSIONS` | const | `src/brain/intake-seed.ts:47` | Set of marker versions `parseSeedMarker` will accept (currently `{1}`); unsupported versions are ignored, never guessed. |
| `SEED_MARKER_RE` | const | `src/brain/intake-seed.ts:52` | Regex matching `[echo-intake-seed v<N> <base64url-payload>]` in message text. |
| `SeedMarkerPayload` | interface | `src/brain/intake-seed.ts:54` | Compact wire shape of the embedded payload: `k` (candidate key), `o` (owner), `f` (fields), `p` (provenance). |
| `base64UrlEncode(value)` | function | `src/brain/intake-seed.ts:61` | Encodes a UTF-8 string to base64url. |
| `base64UrlDecode(value)` | function | `src/brain/intake-seed.ts:65` | Decodes base64url to UTF-8, returning null unless the decoded value round-trips back to the identical input (rejects malformed/non-base64url content Buffer would otherwise tolerate). |
| `renderSeedMarker(input)` | function | `src/brain/intake-seed.ts:76` | Serializes candidate key + optional owner/fields/provenance into the bracketed, base64url-payload marker string at `SEED_MARKER_VERSION`. |
| `parseSeedMarker(text)` | function | `src/brain/intake-seed.ts:96` | Strict parse of a marker from message text: returns null for no marker, unsupported version, undecodable payload, non-object payload, or missing/blank candidate key; otherwise returns the reconstructed `SeedMarker`. |
| `parseMarkerFields(value)` | function | `src/brain/intake-seed.ts:124` | Extracts only the known, non-blank string `IntakeFields` keys from an untrusted decoded payload object. |
| `parseMarkerProvenance(value)` | function | `src/brain/intake-seed.ts:144` | Validates and extracts `MeetingProvenance` from an untrusted decoded payload object, requiring `noteId`/`meetingTitle`/`quote` as strings. |
| `SEED_FIELD_LABELS` | const | `src/brain/intake-seed.ts:159` | Ordered list of `[IntakeFieldKey, display label]` pairs used to render fields in the human-readable seed message. |
| `renderSeedMessage(input)` | function | `src/brain/intake-seed.ts:176` | Builds the full Slack seed message: header + owner mention, labeled best-effort fields, meeting title/date/Granola link/quote, then the machine-parseable marker as the last line (only the marker makes a message an acceptable seed; follow-ups/confirm cards omit it so they can't be re-accepted). |

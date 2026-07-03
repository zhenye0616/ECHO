# `src/enrich/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 4 files.

### `src/enrich/dispatch.ts` — enrichment worker fan-out entrypoint

**Purpose:** Single startup entrypoint that boots the enrichment workers (currently just the Granola signal extraction worker) and returns one combined handle for lifecycle management.

**Depends on:** `../storage/interface.js`, `./granola-signals.js`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EnrichmentDispatchHandle` | interface | `src/enrich/dispatch.ts:8` | Combined handle exposing the granola signal worker handle plus an aggregate `stop()`. |
| `EnrichmentDispatchOptions` | interface | `src/enrich/dispatch.ts:13` | Options bag forwarding `granolaSignals` config to `startGranolaSignalWorker`. |
| `startEnrichmentDispatch(storage, options)` | function | `src/enrich/dispatch.ts:17` | Starts the Granola signal worker against `storage` and wraps its handle in a combined dispatch handle whose `stop()` delegates to the worker's stop. |

### `src/enrich/granola-intake-candidates.ts` — Granola→Slack intake seed bridge

**Purpose:** Periodically scans extracted Granola signals (action/decision) for notes with an external attendee, classifies them into Linear-intake-shaped candidates via an LLM ("brain") call, and posts seed messages to a Slack channel through a durable, at-least-once seed store so client-facing needs surface into the intake pipeline.

**Depends on:** `../echo-home/paths.js`, `../logging/index.js`, `../brain/brain.js` (`parseBrainName`, `runBrain`, `BrainName`, `IntakeFields`), `../brain/intake-seed.js` (`renderSeedMessage`, `MeetingProvenance`), `../storage/interface.js` (`CaptureEvent`, `Storage`), `../util/json.js` (`parseJson`), `./granola-signals.js` (`GRANOLA_RAW_SOURCE`, `GRANOLA_SIGNAL_SOURCE`), `./granola-intake-seed-store.js` (`FileGranolaIntakeSeedStore`, `GranolaIntakeSeedStore`); external: Node `node:path`, `fetch` (Slack Web API)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS` | const | `src/enrich/granola-intake-candidates.ts:22` | Default 7-day lookback window for querying signal events. |
| `DEFAULT_GRANOLA_INTAKE_PER_NOTE_CAP` | const | `src/enrich/granola-intake-candidates.ts:23` | Default cap (3) of intake candidates posted per note. |
| `DEFAULT_GRANOLA_INTAKE_MAX_RETRIES` | const | `src/enrich/granola-intake-candidates.ts:24` | Default max retry count (5) before a seed post is marked terminally failed. |
| `DEFAULT_GRANOLA_INTAKE_WORKER_INTERVAL_MS` | const | `src/enrich/granola-intake-candidates.ts:25` | Default polling interval (600,000ms) for the bridge worker loop. |
| `DEFAULT_GRANOLA_INTAKE_DEBOUNCE_MS` | const | `src/enrich/granola-intake-candidates.ts:26` | Default debounce (5,000ms) applied to `trigger()` calls. |
| `DEFAULT_GRANOLA_INTAKE_BRAIN_TIMEOUT_MS` | const | `src/enrich/granola-intake-candidates.ts:27` | Default timeout (180,000ms) for the classifier brain subprocess call. |
| `INTAKE_SIGNAL_TYPES` | const | `src/enrich/granola-intake-candidates.ts:31` | Set restricting which signal types (`action`, `decision`) are eligible for intake. |
| `EMAIL_RE` | const | `src/enrich/granola-intake-candidates.ts:32` | Regex used to scrape email addresses out of arbitrary attendee metadata. |
| `GranolaIntakeConfig` | interface | `src/enrich/granola-intake-candidates.ts:34` | Resolved bridge configuration: enabled flag, lookback, domains, owner map, Slack channel/token, caps. |
| `GranolaIntakeConfigError` | class | `src/enrich/granola-intake-candidates.ts:46` | Error thrown when the bridge is enabled but required env vars (bot token/channel) are missing; carries the `missing` field list. |
| `GranolaIntakeSignalForClassification` | interface | `src/enrich/granola-intake-candidates.ts:56` | Shape of one signal passed to the classifier. |
| `GranolaIntakeClassificationInput` | interface | `src/enrich/granola-intake-candidates.ts:65` | Per-note payload (title, date, url, signals) sent to the classifier. |
| `ClassifiedIntakeCandidate` | interface | `src/enrich/granola-intake-candidates.ts:73` | Classifier output: ref back to a signal, mapped `IntakeFields`, optional quote. |
| `GranolaIntakeClassifier` | type | `src/enrich/granola-intake-candidates.ts:79` | Function type `(input) => Promise<ClassifiedIntakeCandidate[]>`. |
| `SeedPostResult` | interface | `src/enrich/granola-intake-candidates.ts:83` | Result of posting a seed message: Slack `ts`. |
| `SeedPoster` | type | `src/enrich/granola-intake-candidates.ts:87` | Function type `(channel, text) => Promise<SeedPostResult>`. |
| `GranolaIntakeBridgeDeps` | interface | `src/enrich/granola-intake-candidates.ts:89` | Injectable deps for a bridge run: `classify`, `postSeed`, optional `now`. |
| `GranolaIntakeBridgeResult` | type | `src/enrich/granola-intake-candidates.ts:95` | Discriminated result union: `ok` (counts), `skipped` (reason), `error` (reason+message). |
| `GranolaIntakeBridgeHandle` | interface | `src/enrich/granola-intake-candidates.ts:107` | Public handle: `enabled`, optional `configError`, `run()`, `stop()`. |
| `GranolaIntakeBridgeOptions` | interface | `src/enrich/granola-intake-candidates.ts:114` | Constructor options: config, seed store/path, classify/postSeed overrides, timing, `runSignalsFirst` coupling hook. |
| `BrainClassifierConfig` | interface | `src/enrich/granola-intake-candidates.ts:131` | Resolved brain-invocation config (brain name, context repo path, timeout, env). |
| `RawNoteInfo` | interface | `src/enrich/granola-intake-candidates.ts:138` | Aggregated per-note metadata built from raw Granola capture events (title, date, url, attendee emails). |
| `parseBooleanFlag(raw)` | function | `src/enrich/granola-intake-candidates.ts:145` | Parses env-var truthy strings (`1`/`true`/`yes`/`on`) into boolean. |
| `parsePositiveInt(raw, fallback)` | function | `src/enrich/granola-intake-candidates.ts:151` | Parses a positive integer env var, falling back on invalid/blank input. |
| `parseDomainList(raw)` | function | `src/enrich/granola-intake-candidates.ts:157` | Splits a comma-separated env var into normalized (lowercased, `@`-stripped) domain list. |
| `parseOwnerMap(raw)` | function | `src/enrich/granola-intake-candidates.ts:165` | Parses a JSON object env var into an email→Slack-user-id map, throwing on malformed entries. |
| `loadGranolaIntakeConfig(env)` | function | `src/enrich/granola-intake-candidates.ts:189` | Reads all `ECHO_GRANOLA_INTAKE_*`/Slack env vars into a `GranolaIntakeConfig`; fail-closed throws `GranolaIntakeConfigError` if enabled but bot token/channel missing. |
| `stringMetadata(event, key)` | function | `src/enrich/granola-intake-candidates.ts:231` | Reads a non-empty string metadata field off a `CaptureEvent`, else null. |
| `collectAttendeeEmails(attendees)` | function | `src/enrich/granola-intake-candidates.ts:236` | Recursively walks an arbitrary attendee metadata value (depth-limited to 6) collecting all regex-matched email addresses. |
| `hasExternalAttendee(emails, internalDomains)` | function | `src/enrich/granola-intake-candidates.ts:260` | Returns true if any attendee email's domain is not in the internal-domains set. |
| `buildRawNoteInfo(events)` | function | `src/enrich/granola-intake-candidates.ts:270` | Groups raw Granola capture events by `note_id` into a `RawNoteInfo` map (title, date, url, merged attendee emails). |
| `SignalForNote` | interface | `src/enrich/granola-intake-candidates.ts:293` | Normalized signal record keyed to a note (note_id, dedupe_key, type, text, subject, quote, confidence). |
| `extractSignal(event)` | function | `src/enrich/granola-intake-candidates.ts:303` | Validates and extracts a `SignalForNote` from a signal `CaptureEvent`'s metadata, preferring transcript quote spans; returns null if metadata is malformed or type not in `INTAKE_SIGNAL_TYPES`. |
| `resolveOwner(attendeeEmails, config)` | function | `src/enrich/granola-intake-candidates.ts:340` | Looks up the first attendee email present in `config.ownerMap`, falling back to `config.defaultOwner`. |
| `runGranolaIntakeBridgeOnce(storage, seedStore, config, deps)` | function | `src/enrich/granola-intake-candidates.ts:351` | Core bridge pass: queries signal+raw events within lookback, groups signals by note, filters to notes with external attendees and resolvable owners, classifies each note's signals, claims/posts each candidate through the seed store with retry/failure bookkeeping, and returns aggregate counts. |
| `resolveBrainClassifierConfig(env)` | function | `src/enrich/granola-intake-candidates.ts:483` | Resolves brain name, absolute context repo path, and timeout for the default classifier from env vars (with `ECHO_CEO_*` fallbacks). |
| `buildClassificationPrompt(input)` | function | `src/enrich/granola-intake-candidates.ts:503` | Builds the LLM prompt instructing triage of signals into Linear intake fields, requiring strict JSON output referencing only provided signal refs. |
| `parseClassifierAnswer(answer)` | function | `src/enrich/granola-intake-candidates.ts:516` | Parses the classifier's JSON answer (array or `{candidates:[...]}`) into `ClassifiedIntakeCandidate[]`, throwing on invalid shape. |
| `parseClassifiedCandidate(value)` | function | `src/enrich/granola-intake-candidates.ts:529` | Validates/normalizes one raw classifier candidate object into a `ClassifiedIntakeCandidate`, keeping only known `IntakeFields` keys. |
| `defaultClassifierFromBrain(config)` | function | `src/enrich/granola-intake-candidates.ts:565` | Returns a `GranolaIntakeClassifier` that runs the classification prompt through `runBrain` and parses the answer. |
| `SlackPostResponse` | interface | `src/enrich/granola-intake-candidates.ts:580` | Shape of the Slack `chat.postMessage` JSON response. |
| `postGranolaIntakeSeed(botToken, channel, text)` | function | `src/enrich/granola-intake-candidates.ts:586` | Posts a message to Slack's `chat.postMessage` API with bearer auth; throws on non-ok response. |
| `startGranolaIntakeBridge(storage, options)` | function | `src/enrich/granola-intake-candidates.ts:606` | Wires up the full bridge: loads config (fail-closed on config error), resolves classifier (brain-backed by default), constructs seed store, and starts a debounced interval loop (`trigger`/`run`) calling `runGranolaIntakeBridgeOnce`; returns start/stop handle. |
| `granolaIntakeSeedStorePath()` | function | `src/enrich/granola-intake-candidates.ts:728` | Returns the default on-disk path (`<state>/granola-intake-seeds.json`) for the seed store. |
| `defaultSeedStorePath()` | function | `src/enrich/granola-intake-candidates.ts:732` | Alias delegating to `granolaIntakeSeedStorePath()`. |

### `src/enrich/granola-intake-seed-store.ts` — durable at-least-once Slack seed state machine

**Purpose:** Implements a crash-safe, file-backed state machine (`pending → posting → posted/failed`) tracking each Granola-derived intake candidate's Slack seed-post lifecycle, guaranteeing at-least-once delivery via atomic file writes and an in-process serialization lock.

**Depends on:** Node `node:fs/promises`, `node:path`, `node:crypto`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GranolaIntakeSeedStatus` | type | `src/enrich/granola-intake-seed-store.ts:19` | Union of the four lifecycle states: `pending`, `posting`, `posted`, `failed`. |
| `GranolaIntakeSeedRecord` | interface | `src/enrich/granola-intake-seed-store.ts:21` | Persisted record per candidate: key, note/channel ids, status, retry count, optional slack ts/last error, timestamps. |
| `ClaimSeedInput` | interface | `src/enrich/granola-intake-seed-store.ts:33` | Input to `claim()`: candidateKey, noteId, channelId. |
| `GranolaIntakeSeedStore` | interface | `src/enrich/granola-intake-seed-store.ts:39` | Store contract: `get`, `list`, `claim` (single-flight create), `markPosting`, `markPosted`, `markFailure`. |
| `GranolaIntakeSeedFile` | interface | `src/enrich/granola-intake-seed-store.ts:63` | On-disk file shape: `schema_version: 1` plus `seeds` keyed by candidate key. |
| `FileGranolaIntakeSeedStore.get(candidateKey)` | method | `src/enrich/granola-intake-seed-store.ts:76` | Reads the file and returns the record for a candidate key or null. |
| `FileGranolaIntakeSeedStore.list()` | method | `src/enrich/granola-intake-seed-store.ts:81` | Returns all seed records in the file. |
| `FileGranolaIntakeSeedStore.claim(input)` | method | `src/enrich/granola-intake-seed-store.ts:86` | Under the file lock, creates a new `pending` record for the candidate key if none exists, else returns the existing record unchanged; validates required string fields. |
| `FileGranolaIntakeSeedStore.markPosting(candidateKey)` | method | `src/enrich/granola-intake-seed-store.ts:111` | Transitions a record to `posting` status. |
| `FileGranolaIntakeSeedStore.markPosted(candidateKey, slackTs)` | method | `src/enrich/granola-intake-seed-store.ts:119` | Transitions a record to terminal `posted` status with the Slack `ts`. |
| `FileGranolaIntakeSeedStore.markFailure(candidateKey, error, maxRetries)` | method | `src/enrich/granola-intake-seed-store.ts:129` | Increments retry_count; sets status to terminal `failed` once `retry_count >= maxRetries`, else back to `pending`; truncates error message to 500 chars. |
| `FileGranolaIntakeSeedStore.mutate(candidateKey, transform)` | method | `src/enrich/granola-intake-seed-store.ts:147` | Private: reads file under lock, applies a transform to an existing record, writes back; throws if record not found. |
| `FileGranolaIntakeSeedStore.withFileLock(fn)` | method | `src/enrich/granola-intake-seed-store.ts:162` | Private: serializes all file mutations through a chained promise mutex so concurrent claims/updates don't race. |
| `FileGranolaIntakeSeedStore.readFile()` | method | `src/enrich/granola-intake-seed-store.ts:182` | Private: reads and JSON-parses the seed file, returning an empty schema on ENOENT; throws on schema mismatch. |
| `FileGranolaIntakeSeedStore.writeFile(file)` | method | `src/enrich/granola-intake-seed-store.ts:199` | Private: writes the seed file atomically via temp-file + rename, creating the parent directory if needed. |
| `requiredString(value, field)` | function | `src/enrich/granola-intake-seed-store.ts:207` | Validates a value is a non-blank string, trims it, else throws naming the field. |
| `isErrnoException(err)` | function | `src/enrich/granola-intake-seed-store.ts:212` | Type guard for Node `ErrnoException` (checks for a `code` property). |

### `src/enrich/granola-signals.ts` — Granola meeting signal extraction worker

**Purpose:** Background worker that pairs raw Granola summary+transcript capture events per note, extracts decision/rationale/action signals via an LLM ("brain") call once each note has settled, and durably records results as new capture atoms plus a run manifest, using a checkpoint file to make extraction idempotent and crash-safe with backoff retries.

**Depends on:** `../capture/sources.js` (`isAllowedDerived`), `../echo-home/paths.js`, `../echo-home/adapters/atomic-write.js`, `../guards.js` (`isNonEmptyString`), `../logging/index.js`, `../brain/brain.js` (`parseBrainName`, `preflightBrain`, `runBrain`, `BrainName`), `../storage/interface.js` (`CaptureEvent`, `EventId`, `Storage`), `../util/json.js` (`parseJson`); external: Node `node:crypto`, `node:fs`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GRANOLA_RAW_SOURCE` | const | `src/enrich/granola-signals.ts:18` | Storage source id (`api:granola`) for raw ingested Granola capture events. |
| `GRANOLA_SIGNAL_SOURCE` | const | `src/enrich/granola-signals.ts:19` | Storage source id (`derived:granola-signals`) for extracted signal atoms. |
| `GRANOLA_SIGNAL_INDEX_SOURCE` | const | `src/enrich/granola-signals.ts:20` | Storage source id (`derived:granola-signals-index`) for per-run manifest atoms. |
| `GRANOLA_SIGNAL_EXTRACTOR_VERSION` | const | `src/enrich/granola-signals.ts:21` | Default extractor version tag (`granola-signals@1`) recorded on checkpoints/manifests. |
| `GRANOLA_SIGNAL_CHECKPOINT_SCHEMA_VERSION` | const | `src/enrich/granola-signals.ts:22` | Schema version (1) for the checkpoint file format. |
| `DEFAULT_GRANOLA_SIGNAL_WORKER_INTERVAL_MS` | const | `src/enrich/granola-signals.ts:23` | Default worker tick interval (300,000ms). |
| `DEFAULT_GRANOLA_SIGNAL_SETTLE_MS` | const | `src/enrich/granola-signals.ts:24` | Default settle time (600,000ms) a note must age past `updated_at` before extraction. |
| `DEFAULT_GRANOLA_SIGNAL_LOW_CONFIDENCE` | const | `src/enrich/granola-signals.ts:25` | Default confidence threshold (0.5) below which signals are flagged `low_confidence`. |
| `DEFAULT_GRANOLA_SIGNAL_MAX_RETRIES` | const | `src/enrich/granola-signals.ts:26` | Default extraction retry count (2) before failing a note for the tick. |
| `DEFAULT_GRANOLA_SIGNAL_MAX_NOTES_PER_TICK` | const | `src/enrich/granola-signals.ts:27` | Default cap (5) of notes processed per worker tick. |
| `DEFAULT_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS` | const | `src/enrich/granola-signals.ts:28` | Default timeout (180,000ms) for the brain extraction subprocess call. |
| `GranolaSignalType` | type | `src/enrich/granola-signals.ts:32` | Union: `decision`, `rationale`, `action`. |
| `GranolaDecisionStatus` | type | `src/enrich/granola-signals.ts:33` | Union: `proposed`, `decided`, `unresolved`. |
| `GranolaTranscriptSpan` | interface | `src/enrich/granola-signals.ts:35` | Source-span shape for a transcript-derived signal: kind, start/end time, quote. |
| `GranolaSignalSourceSpan` | type | `src/enrich/granola-signals.ts:42` | Union of `{kind:'summary'}` or `GranolaTranscriptSpan`. |
| `GranolaExtractedSignal` | interface | `src/enrich/granola-signals.ts:44` | Raw extractor output shape: type, text, canonical subject, source span, confidence, optional owner/rationale_for/decision_status. |
| `GranolaTranscriptItemForExtraction` | interface | `src/enrich/granola-signals.ts:55` | One parsed transcript line: start/end time, speaker, text. |
| `GranolaSignalExtractionInput` | interface | `src/enrich/granola-signals.ts:62` | Full per-note payload passed to the extractor function. |
| `GranolaSignalExtractionContext` | interface | `src/enrich/granola-signals.ts:73` | Context passed alongside input: `extractor_version`. |
| `GranolaSignalExtractor` | type | `src/enrich/granola-signals.ts:77` | Function type `(input, context) => Promise<GranolaExtractedSignal[]>`. |
| `GranolaSignalCheckpointEntry` | interface | `src/enrich/granola-signals.ts:82` | Per-note checkpoint record: input fingerprint, extractor version, attempt/success/failure timestamps and reason. |
| `GranolaSignalCheckpoint` | interface | `src/enrich/granola-signals.ts:91` | Whole checkpoint file shape: schema version + notes map. |
| `GranolaSignalRunManifest` | interface | `src/enrich/granola-signals.ts:96` | Per-extraction-run manifest: note id, extractor version, run id, completion time, supersedes pointer, written signal atom ids. |
| `GranolaSignalWorkerOptions` | interface | `src/enrich/granola-signals.ts:105` | Worker constructor options: checkpoint path, extractor version/fn override, timing knobs, thresholds, env. |
| `GranolaSignalWorkerResult` | type | `src/enrich/granola-signals.ts:120` | Discriminated result union: `ok` (counts), `skipped` (reason), `error` (reason+message). |
| `GranolaSignalWorkerHandle` | interface | `src/enrich/granola-signals.ts:131` | Public handle: `enabled`, `run()`, `stop()`. |
| `RawGranolaNote` | interface | `src/enrich/granola-signals.ts:137` | Paired summary+transcript info for one note, ready for extraction. |
| `PreparedSignal` | interface | `src/enrich/granola-signals.ts:148` | A validated extracted signal ready to append: content, metadata, optional rationale link target. |
| `BrainExtractorConfig` | interface | `src/enrich/granola-signals.ts:154` | Resolved brain-invocation config for the default extractor (brain, context repo path, timeout, env). |
| `GranolaSignalCheckpointError` | class | `src/enrich/granola-signals.ts:161` | Error type for checkpoint read/parse/schema failures. |
| `granolaSignalCheckpointPath()` | function | `src/enrich/granola-signals.ts:168` | Returns default checkpoint file path (`<state>/granola-signals-checkpoint.json`). |
| `isErrnoException(err)` | function | `src/enrich/granola-signals.ts:172` | Type guard for Node `ErrnoException`. |
| `isPlainObject(value)` | function | `src/enrich/granola-signals.ts:176` | Type guard: non-null, non-array object. |
| `emptyCheckpoint()` | function | `src/enrich/granola-signals.ts:180` | Returns a fresh empty checkpoint structure. |
| `loadGranolaSignalCheckpoint(filePath)` | function | `src/enrich/granola-signals.ts:184` | Reads and strictly validates the checkpoint JSON file, returning empty checkpoint on ENOENT, throwing `GranolaSignalCheckpointError` on any schema violation. |
| `writeGranolaSignalCheckpoint(checkpoint, filePath)` | function | `src/enrich/granola-signals.ts:236` | Creates parent dir and atomically writes the checkpoint JSON to disk. |
| `copyOptionalString(from, to, key)` | function | `src/enrich/granola-signals.ts:244` | Copies an optional string field between checkpoint entry objects if present and typed correctly. |
| `stringMetadata(event, key)` | function | `src/enrich/granola-signals.ts:253` | Reads a non-empty string metadata field off a `CaptureEvent`, else null. |
| `buildRawGranolaNotes(events)` | function | `src/enrich/granola-signals.ts:258` | Groups raw capture events by note id into paired summary/transcript entries, keeping only notes with both present and valid dedupe keys; parses transcript text into structured items; sorts by `updated_at`. |
| `parseRenderedTranscript(content)` | function | `src/enrich/granola-signals.ts:300` | Parses rendered transcript text lines into `{start_time, end_time, speaker, text}` items, handling `[time-time] Speaker: text` and plain `Speaker: text` formats. |
| `parseTranscriptTime(value)` | function | `src/enrich/granola-signals.ts:326` | Converts a transcript timestamp string to a number if numeric, else leaves as string. |
| `inputFingerprint(note)` | function | `src/enrich/granola-signals.ts:331` | Computes a stable hash of note id + updated_at + summary/transcript dedupe keys, used to detect input changes. |
| `isSettled(note, nowIso, settleMs)` | function | `src/enrich/granola-signals.ts:337` | Returns true if `now - note.updated_at >= settleMs` (or dates unparsable, treated as settled). |
| `shouldExtractNote(note, checkpoint, currentRuns, extractorVersion)` | function | `src/enrich/granola-signals.ts:344` | Decides whether a note needs (re-)extraction: skips if last attempt at same fingerprint/version failed terminally; extracts if no current run or fingerprint/version changed. |
| `stableHash(value)` | function | `src/enrich/granola-signals.ts:364` | Returns first 16 hex chars of a SHA-256 hash of the input string. |
| `normalizeSubject(value)` | function | `src/enrich/granola-signals.ts:368` | Lowercases, trims, and collapses whitespace in a canonical-subject string. |
| `validateSignal(signal)` | function | `src/enrich/granola-signals.ts:372` | Validates an extracted signal's type, text, canonical_subject, confidence range (0-1), and source_span shape; throws on any violation. |
| `prepareSignals(note, signals, opts)` | function | `src/enrich/granola-signals.ts:396` | Validates each extracted signal, builds a stable per-note dedupe key and metadata object, links `rationale` signals to their referenced `decision` signal's dedupe key, and returns `PreparedSignal[]` ready for storage. |
| `parseManifest(event)` | function | `src/enrich/granola-signals.ts:453` | Parses a signal-index `CaptureEvent`'s metadata into a `GranolaSignalRunManifest`, returning null on any missing/malformed field. |
| `resolveCurrentGranolaSignalRuns(manifestEvents)` | function | `src/enrich/granola-signals.ts:482` | Groups manifest events by note, excludes superseded runs, and picks the latest (by completed_at then run id) manifest per note as the current run. |
| `updateCheckpointSuccess(checkpoint, note, extractorVersion, at)` | function | `src/enrich/granola-signals.ts:510` | Writes a success checkpoint entry for a note (fingerprint, version, attempted/success timestamps). |
| `updateCheckpointFailure(checkpoint, note, extractorVersion, at, reason)` | function | `src/enrich/granola-signals.ts:524` | Writes a failure checkpoint entry for a note, truncating the reason to 200 chars. |
| `sleep(ms)` | function | `src/enrich/granola-signals.ts:540` | Awaits a timeout of `ms` milliseconds (no-op if `ms <= 0`). |
| `extractWithRetries(extractFn, note, extractorVersion, maxRetries, retryDelayMs)` | function | `src/enrich/granola-signals.ts:545` | Calls `extractFn` for a note with exponential-backoff retries up to `maxRetries`, rethrowing the last error if all attempts fail. |
| `runGranolaSignalWorkerOnce(storage, extractFn, options)` | function | `src/enrich/granola-signals.ts:576` | One worker tick: checks source allowlisting, loads checkpoint, queries manifest+raw events, pairs notes, selects settled/needs-extraction notes (capped per tick), extracts each with retries, writes signal atoms + a run manifest atom, updates the checkpoint after each note, and returns aggregate counts or an error result. |
| `parsePositiveInt(raw, fallback)` | function | `src/enrich/granola-signals.ts:717` | Parses a positive integer env var, falling back on invalid/blank input. |
| `resolveBrainExtractorConfig(env)` | function | `src/enrich/granola-signals.ts:723` | Resolves brain name, absolute context repo path, and timeout for the default extractor from env vars (with `ECHO_CEO_*` fallbacks). |
| `defaultExtractorFromBrain(config)` | function | `src/enrich/granola-signals.ts:743` | Returns a `GranolaSignalExtractor` that runs the extraction prompt through `runBrain` and parses the answer. |
| `buildExtractionPrompt(input)` | function | `src/enrich/granola-signals.ts:758` | Builds the LLM prompt instructing extraction of decision/rationale/action signals as strict JSON from the note content. |
| `parseExtractorAnswer(answer)` | function | `src/enrich/granola-signals.ts:769` | Parses the extractor's JSON answer (array or `{signals:[...]}`) into `GranolaExtractedSignal[]`, throwing on invalid shape. |
| `parseExtractedSignal(value)` | function | `src/enrich/granola-signals.ts:780` | Coerces/validates one raw extractor signal object into a `GranolaExtractedSignal`, defaulting unknown source_span to `{kind:'summary'}` and validating via `validateSignal`. |
| `startGranolaSignalWorker(storage, options)` | function | `src/enrich/granola-signals.ts:814` | Resolves the extractor (brain-backed by default, preflighted), starts an interval loop calling `runGranolaSignalWorkerOnce`, optionally runs immediately on start, and returns a start/stop handle; returns a disabled handle if brain preflight fails. |

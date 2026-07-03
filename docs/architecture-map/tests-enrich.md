# `tests/enrich/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 3 files.

### `tests/enrich/granola-intake-candidates.test.ts` — tests for the Granola intake candidate bridge (signals → Slack seed candidates)

**Purpose:** Exercises `src/enrich/granola-intake-candidates.ts` — config loading/fail-closed validation, attendee-email extraction, external-attendee filtering, action/decision classification and per-note capping, seed-store dedupe/idempotency, lookback windowing, and failed-post error recording.

**Depends on:** `src/enrich/granola-intake-candidates.js` (collectAttendeeEmails, loadGranolaIntakeConfig, runGranolaIntakeBridgeOnce, GranolaIntakeConfigError, types), `src/enrich/granola-intake-seed-store.js` (FileGranolaIntakeSeedStore), `src/storage/memory.js` (MemoryStorage), `node:fs/promises`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tempSeedStore()` | function | `tests/enrich/granola-intake-candidates.test.ts:24` | Creates a temp directory and returns a `FileGranolaIntakeSeedStore` backed by a `seeds.json` file in it, registering the dir for cleanup. |
| `baseConfig(overrides)` | function | `tests/enrich/granola-intake-candidates.test.ts:30` | Builds a default `GranolaIntakeConfig` fixture (enabled, 30-day lookback, one internal domain, owner map, per-note cap 3, max retries 5) with overrides merged in. |
| `seedRawNote(store, opts)` | function | `tests/enrich/granola-intake-candidates.test.ts:45` | Appends a synthetic `api:granola` summary atom with note_id/title/web_url/attendees/updated_at metadata to a `MemoryStorage`. |
| `seedSignal(store, opts)` | function | `tests/enrich/granola-intake-candidates.test.ts:70` | Appends a synthetic `derived:granola-signals` atom (action/decision/rationale) with dedupe_key, canonical_subject, source_span and confidence metadata. |
| `describe: "collectAttendeeEmails"` | describe | `tests/enrich/granola-intake-candidates.test.ts:99` | Verifies emails are extracted and lowercased from a mixed array of `{email}` objects and plain email strings. |
| `describe: "loadGranolaIntakeConfig"` | describe | `tests/enrich/granola-intake-candidates.test.ts:107` | Verifies the config is disabled by default, throws `GranolaIntakeConfigError` when enabled without token/channel, and correctly parses a fully-specified enabled config from env vars (domains list, owner map JSON, per-note cap). |
| `describe: "runGranolaIntakeBridgeOnce"` | describe | `tests/enrich/granola-intake-candidates.test.ts:140` | Covers the end-to-end bridge run: only action/decision signals (not rationale) reach the classifier for external-attendee notes and get posted with provenance (owner mention, note title/url, quote, seed-id footer) while the store stays append-only; internal-only meetings yield zero candidates; per-note posting is capped; a re-run skips already-posted candidates (idempotency); notes outside the lookback window are excluded; and a failing `postSeed` call is recorded as a `failed` seed-store record with `last_error` populated. |

### `tests/enrich/granola-intake-seed-store.test.ts` — tests for the durable file-backed Granola intake seed-claim store

**Purpose:** Exercises `src/enrich/granola-intake-seed-store.ts`'s `FileGranolaIntakeSeedStore` — claim/create semantics, the pending→posting→posted state machine, retry/failure-cap behavior, crash recovery from a fresh instance reading the same file, concurrent-claim convergence, and the on-disk JSON schema.

**Depends on:** `src/enrich/granola-intake-seed-store.js` (FileGranolaIntakeSeedStore, GranolaIntakeSeedRecord type), `node:fs/promises`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tempStore()` | function | `tests/enrich/granola-intake-seed-store.test.ts:17` | Creates a temp directory and returns `{ path, store }` for a fresh `FileGranolaIntakeSeedStore` at `seeds.json` in it. |
| `describe: "FileGranolaIntakeSeedStore"` | describe | `tests/enrich/granola-intake-seed-store.test.ts:26` | Covers: claiming a pending record and getting the same one back on re-claim (`created` flag); driving a record through `pending → posting → posted` with a persisted `slack_ts`; retrying below the cap increments `retry_count`/`last_error` and returns to `pending`, while hitting the cap terminates the record as `failed`; a crashed `posting` record is recoverable as retryable (not `posted`/`failed`) from a brand-new store instance reading the same file; two concurrent `claim()` calls for the same candidate converge to exactly one durable record; and the persisted file is valid JSON with `schema_version: 1` and a `seeds` map keyed by `candidate_key`. |

### `tests/enrich/granola-signals.test.ts` — tests for the Granola signal-extraction enrichment worker

**Purpose:** Exercises `src/enrich/granola-signals.ts` — extraction of decision/rationale/action signal atoms plus success manifests from raw Granola summary+transcript atoms, append-only re-derivation with latest-wins manifest resolution, settle-window gating, single-flight worker concurrency, manifest-append-failure/checkpoint-non-advancement recovery, extraction-failure retry/backoff and checkpoint suppression, config-validation fail-disabled behavior, and the on-disk checkpoint schema.

**Depends on:** `src/enrich/granola-signals.js` (GRANOLA_SIGNAL_INDEX_SOURCE, GRANOLA_SIGNAL_SOURCE, loadGranolaSignalCheckpoint, resolveCurrentGranolaSignalRuns, runGranolaSignalWorkerOnce, startGranolaSignalWorker, types), `src/storage/memory.js` (MemoryStorage), `src/storage/interface.js` (CaptureEvent, EventId types), `tests/fixtures/stdout.js` (captureStdout), `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tempCheckpoint()` | function | `tests/enrich/granola-signals.test.ts:20` | Creates a temp directory and returns `{ dir, path }` for a `granola-signals-checkpoint.json` checkpoint file. |
| `seedRawMeeting(store, opts)` | function | `tests/enrich/granola-signals.test.ts:25` | Appends a synthetic `api:granola` summary atom and a matching transcript atom (with timestamped `[start-end] Speaker:` lines) sharing a `note_id`/`title`/`updated_at`, for use as extraction input. |
| `fixtureSignals()` | function | `tests/enrich/granola-signals.test.ts:67` | Returns a fixed array of three `GranolaExtractedSignal` fixtures — one decision (transcript span, `decision_status: 'decided'`), one rationale (low confidence 0.4, `rationale_for`), one action (summary span, `owner: 'Dana'`). |
| `ManifestFailOnceStorage` | class | `tests/enrich/granola-signals.test.ts:276` | `MemoryStorage` subclass whose `append()` throws once (only) when appending a `GRANOLA_SIGNAL_INDEX_SOURCE` manifest event, to simulate a manifest-write failure after signal atoms were already appended. |
| `ManifestFailOnceStorage.append(event)` | method | `tests/enrich/granola-signals.test.ts:278` | Throws `'manifest append failed'` on the first manifest-source append attempt, then delegates to `super.append` thereafter. |
| `describe: "Granola signal enrichment worker"` | describe | `tests/enrich/granola-signals.test.ts:106` | Covers: extracting decision/rationale/action signal atoms with correct metadata (note_id, meeting_title, canonical_subject, parent_dedupe_key, decision_status, source_span, low_confidence flag, rationale_for pointing at the decision's dedupe_key) plus a success manifest recording `signal_atom_ids` and the checkpoint's `last_success_at`; append-only re-derivation across two runs producing two manifests where `resolveCurrentGranolaSignalRuns` resolves the latest-wins current run per note with a `supersedes` pointer to the prior run; skipping unsettled notes (updated_at within the settle window) with zero extraction calls and no manifest; single-flight worker concurrency where a second concurrent `run()` call returns `{status:'skipped', reason:'in_flight'}` while the first is in flight; a manifest-append failure leaving signal atoms written but the checkpoint file absent (`status:'error', reason:'append_failed'`) with a subsequent run recovering and completing the manifest; extraction failure returning `status:'error', reason:'extraction_failed'` after retries, recording `last_failure_reason` in the checkpoint, and suppressing a further extraction attempt on immediate re-run when input hasn't changed; visible fail-disabled behavior (stdout contains 'disabled') when provider config validation fails; and the on-disk checkpoint JSON matching `schema_version: 1` with a `notes` map keyed by note id containing `extractor_version` and `last_success_at`. |

# `src/coord/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 8 files.

### `src/coord/deadlines.ts` — coord deadline tracker (single-actor serial mutation lane)

**Purpose:** Implements the 057a AC3 deadline tracker: a single-actor serial mutation lane that maintains open-record maps for round-tier (`correlation_id`) and scheduler-tier (`tick_run_id`) coord events, performs full-ledger replay reconstruction at daemon boot, ticks a heartbeat to fire missed-deadline atoms, and periodically reconciles against new ledger atoms.

**Depends on:** `src/capture/pipeline.js` (canonicalizeTimestamp), `src/coord/roles.js` (CoordRolesConfig, CoordRoleConfig), `src/coord/types.js` (COORD_SESSION_ID, COORD_SURFACE, lookupCoordEventType, CoordTier), `src/coord/validate.js` (ValidatedCoordEmitInput), `src/storage/interface.js` (CoordAtomIterationRecord, EventId, Storage), `src/logging/index.js` (createLogger), `node:crypto`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `OpenRecord` | interface | `src/coord/deadlines.ts:45` | Shape of one open deadline record: tier, key (correlation_id or tick_run_id), subject_role, event_type, expected_by, expects. |
| `makeOpenMapKey(key, subject_role, event_type, expected_by)` | function | `src/coord/deadlines.ts:57` | Builds the composite map key string for the open-records maps. |
| `idempotencyKey(r)` | function | `src/coord/deadlines.ts:70` | Computes a sha256 idempotency key from (key, subject_role, event_type, "deadline_missed"), deliberately excluding expected_by. |
| `lookupExpects(role, event_type)` | function | `src/coord/deadlines.ts:79` | Looks up the configured `expects` closer event_type for a role+event_type pair, or null if none configured. |
| `lookupRoleConfig(config, subject_role)` | function | `src/coord/deadlines.ts:88` | Finds a role's config entry by name in the loaded CoordRolesConfig roster. |
| `MutationLane` | class | `src/coord/deadlines.ts:99` | Serializes async mutation tasks onto one promise chain so no two mutating operations interleave. |
| `MutationLane.enqueue(task)` | method | `src/coord/deadlines.ts:102` | Chains `task` onto the lane's tail, swallowing prior errors so the chain stays alive; returns the task's own result promise. |
| `DeadlineTrackerOptions` | interface | `src/coord/deadlines.ts:114` | Constructor options: injectable clock, heartbeat interval, reconciliation interval, replay page size. |
| `DeadlineSnapshot` | interface | `src/coord/deadlines.ts:129` | Read-only snapshot shape returned by `currentSnapshot()`: round/scheduler open records, idempotency cache size, last replay watermark. |
| `DeadlineTrackerHandle` | interface | `src/coord/deadlines.ts:140` | Handle returned by `start()` exposing `stop()` to clear background timers. |
| `DeadlineTracker` | class | `src/coord/deadlines.ts:159` | Single-owner deadline tracker: owns open-record maps, idempotency cache, and the mutation lane; lifecycle is reconstruct → start → stop. |
| `DeadlineTracker.constructor(storage, config, opts)` | method | `src/coord/deadlines.ts:172` | Initializes clock, heartbeat interval (default 1000ms), reconciliation interval (default 10min), replay page size (default 5000). |
| `DeadlineTracker.reconstruct()` | method | `src/coord/deadlines.ts:193` | Hard startup gate: paginates the full coord-atom ledger up to a watermark, replays transitions, then fires any record already past its expected_by. |
| `DeadlineTracker.ingest(event)` | method | `src/coord/deadlines.ts:238` | Enqueues a validated coord event onto the lane and applies its close-then-open transition; called after a successful storage.append. |
| `DeadlineTracker.tick()` | method | `src/coord/deadlines.ts:247` | One heartbeat tick: snapshots open records past their expected_by and fires missed-deadline atoms for each. |
| `DeadlineTracker.reconcile()` | method | `src/coord/deadlines.ts:268` | Re-reads coord atoms appended since the last replay watermark, replays their transitions, and advances the watermark; idempotent. |
| `DeadlineTracker.currentSnapshot()` | method | `src/coord/deadlines.ts:292` | Returns a structural copy of tracker state (for the coord_status read tool) taken on the lane to avoid mid-mutation reads. |
| `DeadlineTracker.start()` | method | `src/coord/deadlines.ts:305` | Starts the unref'd heartbeat and reconciliation `setInterval` timers (production only) and returns a stop handle. |
| `DeadlineTracker.applyTransition(event)` | method | `src/coord/deadlines.ts:342` | Applies the close-then-open transition for one event: closes matching open records whose `expects` equals the event_type, then opens a new record if this event_type itself has a configured `expects`. |
| `DeadlineTracker.resolveExpectedBy(event, role)` | method | `src/coord/deadlines.ts:398` | Resolves the effective expected_by ISO timestamp, clamping a caller-supplied value to the role's max_deadline_sec ceiling or applying default_deadline_sec. |
| `DeadlineTracker.applyReplayAtom(atom)` | method | `src/coord/deadlines.ts:426` | Replays one durable coord ledger atom during reconstruction/reconciliation: primes the idempotency cache for deadline_missed atoms, or reconstructs a ValidatedCoordEmitInput and calls applyTransition for regular events. |
| `DeadlineTracker.fireMissedDeadlineImpl(r)` | method | `src/coord/deadlines.ts:499` | The only code path that appends `coord:deadline_missed` atoms: checks idempotency cache, appends the atom via storage.append if not already fired, updates the cache, and removes the open record. |

### `src/coord/identity.ts` — X-Echo-Role header to role identity resolver

**Purpose:** Validates the `X-Echo-Role` HTTP header against the loaded `coord-roles.json` roster and produces a typed emitter identity for `coord_emit`; native MCP clients without the header are rejected in V1.

**Depends on:** `src/coord/roles.js` (CoordRolesConfig)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `EmitterIdentity` | interface | `src/coord/identity.ts:19` | Typed identity carrying the resolved `role` string. |
| `CoordIdentityError` | class | `src/coord/identity.ts:23` | Error type thrown for missing/empty/unknown X-Echo-Role header values. |
| `resolveEmitterIdentity(xEchoRoleHeader, config)` | function | `src/coord/identity.ts:44` | Resolves the X-Echo-Role header into an EmitterIdentity, throwing CoordIdentityError if null, empty, or not a roster member. |
| `isKnownRole(role, config)` | function | `src/coord/identity.ts:75` | Checks whether a caller-supplied role string names a role defined in coord-roles.json. |

### `src/coord/internal-emitter.ts` — daemon-side coord atom emitter for internal attribution

**Purpose:** Provides the single auditable path for the daemon itself (not the coord_emit MCP tool) to append coord atoms it is directly authoring, notably `reviewer_invoked`, synchronously feeding the deadline tracker before any spawned child process can emit its own events.

**Depends on:** `src/coord/deadlines.js` (DeadlineTracker), `src/coord/types.js` (COORD_SESSION_ID, COORD_SOURCE_PREFIX, COORD_SURFACE), `src/coord/validate.js` (ValidatedCoordEmitInput), `src/capture/pipeline.js` (canonicalizeTimestamp), `src/storage/interface.js` (EventId, Storage)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DAEMON_EMITTER_ROLE` | const | `src/coord/internal-emitter.ts:36` | Marker string `"daemon"` written to `metadata.coord.emitter_role` on daemon-authored atoms. |
| `InternalReviewerInvokedArgs` | interface | `src/coord/internal-emitter.ts:38` | Argument shape for `emitReviewerInvoked`: subject_role, correlation_id, request_path, optional emitted_at override. |
| `emitReviewerInvoked(storage, deadlines, args)` | function | `src/coord/internal-emitter.ts:56` | Appends a `coord:reviewer_invoked` atom with daemon attribution via storage.append, then synchronously feeds the validated shape into the deadline tracker's `ingest` (swallowing tracker-ingest failures) so the pre-spawn deadline opens before the child process is spawned. |

### `src/coord/paths.ts` — repo-root and reviewer-wrapper path resolver

**Purpose:** Resolves the canonical repo root (honoring `ECHO_REPO_ROOT` override) and validates/resolves both coord request paths (`<reviews_root>/<item>/r<N>/request.md`) and reviewer wrapper script paths (`tools/review-queue/run-<role>-reviewer.sh`) through realpath-based containment checks, protecting `coord_invoke` against path traversal and symlink escapes.

**Depends on:** `src/coord/roles.js` (loadCoordRoles, CoordRolesConfig), `src/echo-home/paths.js` (loadProjectConfig), `node:url`, `node:path`, `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ROLE_SHAPE_RE` | const | `src/coord/paths.ts:44` | Regex `^[a-z][a-z0-9-]*$` — canonical reviewer-slug shape gate applied before any FS access. |
| `computeRepoRoot()` | function | `src/coord/paths.ts:46` | Computes the repo root from `ECHO_REPO_ROOT` env override or from `import.meta.url` climbing two levels up from `src/coord/`. |
| `REPO_ROOT` | const | `src/coord/paths.ts:59` | Module-load-time computed canonical repo-root path. |
| `CoordPathError` | class | `src/coord/paths.ts:61` | Error type for all path validation/resolution failures in this module. |
| `ResolveReviewerWrapperPathOptions` | interface | `src/coord/paths.ts:68` | Options for `resolveReviewerWrapperPath`: injectable `coordRoles` for tests. |
| `ResolveCoordRequestPathOptions` | interface | `src/coord/paths.ts:73` | Options for `resolveCoordRequestPath`: overridable `repoRoot` and `reviewsRoot`. |
| `isWithin(parent, child)` | function | `src/coord/paths.ts:80` | Returns true if `child` path is equal to or lexically nested inside `parent` via `path.relative`. |
| `canonicalizeExisting(abs, label, requestPath)` | function | `src/coord/paths.ts:96` | Realpaths the deepest existing ancestor of `abs` and lexically re-appends the not-yet-created tail, so containment checks work even when the leaf path doesn't exist yet on disk. |
| `decodeUriPath(value)` | function | `src/coord/paths.ts:117` | Decodes a URI-encoded path component, throwing CoordPathError on invalid encoding. |
| `resolveCoordRequestPath(requestPath, opts)` | function | `src/coord/paths.ts:145` | Validates and resolves a `request_path` against the configured `reviews_root`: rejects absolute paths, backslashes, URL-encoding, traversal, disallowed characters, and confirms realpath containment within repo and reviews root, requiring the shape `<item>/r<N>/request.md`. |
| `resolveReviewerWrapperPath(role, opts)` | function | `src/coord/paths.ts:263` | Five-step gated resolution of `tools/review-queue/run-<role>-reviewer.sh`: shape check, roster + headless check via loadCoordRoles, path construction, containment check, and existence+executable-bit check; throws CoordPathError on any failure. |

### `src/coord/roles.ts` — TS daemon loader for coord-roles.json

**Purpose:** Loads and JSON-Schema-validates `tools/review-queue/coord-roles.json` once at daemon boot before tool registration, producing the frozen `CoordRolesConfig` that is the daemon-side source of truth for per-role-per-event-type SLA deadlines and the slot universe used by coord_emit, deadlines, and coord_status.

**Depends on:** `node:fs`, `node:url`, `ajv` (Ajv, AnySchema, ValidateFunction), `ajv-formats`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `AddFormatsFn` | type | `src/coord/roles.ts:29` | Function type for the runtime-unwrapped ajv-formats plugin registration function. |
| `addFormats` | const | `src/coord/roles.ts:31` | Runtime-unwraps the ajv-formats CJS default export into a callable plugin function regardless of interop shape. |
| `CoordEventConfig` | interface | `src/coord/roles.ts:37` | Per-event config shape: default_deadline_sec, max_deadline_sec, expects (closer event_type). |
| `CoordRoleConfig` | interface | `src/coord/roles.ts:43` | Per-role config shape: name, headless flag, optional invoke_command, and a map of event configs. |
| `CoordRolesConfig` | interface | `src/coord/roles.ts:50` | Top-level config shape: array of CoordRoleConfig. |
| `DEFAULT_CONFIG_URL` | const | `src/coord/roles.ts:56` | Module-relative URL to `tools/review-queue/coord-roles.json`, cwd-independent. |
| `SCHEMA_URL` | const | `src/coord/roles.ts:57` | Module-relative URL to `tools/review-queue/schemas/coord-roles.schema.json`. |
| `getValidator()` | function | `src/coord/roles.ts:64` | Lazily compiles and caches the ajv validator for the coord-roles JSON schema. |
| `_resetValidatorCacheForTests()` | function | `src/coord/roles.ts:79` | Test-only reset of the cached ajv validate function. |
| `resolveConfigPath(configPath)` | function | `src/coord/roles.ts:83` | Resolves the config file URL from an explicit arg, then `ECHO_COORD_ROLES_PATH` env var, then the module-relative default. |
| `freezeConfig(config)` | function | `src/coord/roles.ts:94` | Deep-freezes the roles config (each event, each role's events map, each role, the roles array, and the config object). |
| `loadCoordRoles(configPath)` | function | `src/coord/roles.ts:125` | Reads and JSON-Schema-validates coord-roles.json, enforces the cross-field constraint `max_deadline_sec > default_deadline_sec` per role/event and role-name uniqueness, then returns a frozen CoordRolesConfig; throws (uncaught, crashing the daemon) on any failure. |

### `src/coord/source.ts` — server-derived coord atom source string

**Purpose:** Single chokepoint that derives the `source` field (`coord:<role>`) for coord atoms from the server-validated `EmitterIdentity`, ensuring the daemon never trusts a caller-supplied source value.

**Depends on:** `src/coord/identity.js` (EmitterIdentity), `src/coord/types.js` (COORD_SOURCE_PREFIX)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `deriveCoordSource(identity)` | function | `src/coord/source.ts:14` | Produces the `coord:<role>` source string from the server-derived emitter identity's role. |

### `src/coord/types.ts` — coord event type registry (tier + subject-role policy + schema version)

**Purpose:** Single source of truth for coord event_type classification: tier (round vs scheduler), subject_role policy (self_attestation / invocation / daemon_emitted), and schema_version; also defines the coord surface/session/source-prefix constants used to tag and filter coord atoms across the daemon.

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CoordTier` | type | `src/coord/types.ts:30` | Union `'round' \| 'scheduler'` — tier classification keyed by correlation_id or tick_run_id respectively. |
| `SubjectRolePolicy` | type | `src/coord/types.ts:38` | Union `'self_attestation' \| 'invocation' \| 'daemon_emitted'` — governs whether subject_role must equal emitter_role. |
| `CoordEventTypeEntry` | interface | `src/coord/types.ts:40` | Registry entry shape: tier, subject_role_policy, schema_version. |
| `COORD_EVENT_TYPE_REGISTRY` | const | `src/coord/types.ts:53` | Frozen registry of all known coord event_types (reviewer_invoked, tick_start, tick_end, tick_failed_to_bind, scheduler_health, scheduler_health_done, deadline_missed) mapped to their tier/policy/schema_version. |
| `lookupCoordEventType(eventType)` | function | `src/coord/types.ts:111` | Looks up a registry entry by event_type using an own-property guard (prototype-pollution safe), returning null for unknown types. |
| `KNOWN_COORD_EVENT_TYPES` | const | `src/coord/types.ts:123` | Frozen array of all currently-known coord event_type strings, derived from the registry's keys. |
| `COORD_SURFACE` | const | `src/coord/types.ts:131` | The `metadata.surface` value (`'coord'`) all coord atoms carry, used to exclude them from default search/cluster surfaces. |
| `COORD_SESSION_ID` | const | `src/coord/types.ts:136` | The `metadata.session_id` value (`'echo:coord'`) coord atoms carry, distinct from reviewer session ids. |
| `COORD_SOURCE_PREFIX` | const | `src/coord/types.ts:142` | The shared source prefix (`'coord:'`) for all coord atoms, used for source_prefix-scoped retrieval. |

### `src/coord/validate.ts` — per-tier coord_emit input validator

**Purpose:** Validates raw `coord_emit` MCP tool input against the type registry and role roster, enforcing tier-discriminated field requirements (correlation_id vs tick_run_id), subject_role policy rules, ISO timestamp shape, and payload shape, returning a typed `ValidatedCoordEmitInput` or throwing `CoordValidationError`.

**Depends on:** `src/coord/roles.js` (CoordRolesConfig), `src/coord/identity.js` (isKnownRole), `src/coord/types.js` (COORD_EVENT_TYPE_REGISTRY, lookupCoordEventType, CoordEventTypeEntry, CoordTier)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CoordValidationError` | class | `src/coord/validate.ts:26` | Error type thrown for any coord_emit input validation failure. |
| `ValidatedCoordEmitInput` | type | `src/coord/validate.ts:36` | Discriminated union (by `tier`) of the validated coord_emit shape, carrying correlation_id (round) or tick_run_id (scheduler) plus common fields. |
| `RawInput` | interface | `src/coord/validate.ts:58` | Loosely-typed shape of the raw, unvalidated coord_emit MCP input including the ignored caller-supplied `source` field. |
| `isPlainObject(v)` | function | `src/coord/validate.ts:73` | Type guard for a non-null, non-array object. |
| `isNonEmptyString(v)` | function | `src/coord/validate.ts:77` | Type guard for a string with length > 0. |
| `ISO_RE` | const | `src/coord/validate.ts:81` | Regex matching ISO 8601 timestamp strings (with optional fractional seconds and Z/offset). |
| `validateCoordEmitInput(rawInput, emitterRole, config)` | function | `src/coord/validate.ts:93` | Validates event_type against the registry, schema_version match, subject_role membership in the roster, rejects daemon_emitted event types from user input, enforces self_attestation subject_role==emitter_role, validates emitted_at/expected_by ISO shape and payload object shape, and rejects cross-tier fields (round vs scheduler), returning the discriminated ValidatedCoordEmitInput. |

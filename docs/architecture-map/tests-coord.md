# `tests/coord/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 23 files.

### `tests/coord/append-seam.test.ts` — coord_emit validation append-seam tests

**Purpose:** Exercises `validateCoordEmitInput` from `src/coord/validate.ts` (schema/identity/tier validation, timestamp canonicalization, cross-tier rejection, subject_role policy) and the `COORD_SURFACE`/`COORD_SESSION_ID` constants and `CoordValidationError` from `src/coord/types.ts`. Covers self-attestation vs invocation subject_role policy and confirms caller-supplied `source` is dropped in favor of server-derived `deriveCoordSource`.

**Depends on:** src/coord/identity.js (resolveEmitterIdentity), src/coord/roles.js (CoordRolesConfig type), src/coord/source.js (deriveCoordSource), src/coord/types.js (COORD_SESSION_ID, COORD_SURFACE), src/coord/validate.js (validateCoordEmitInput, CoordValidationError), vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "AC1 — coord append seam"` | describe | `tests/coord/append-seam.test.ts:62` | Validates round-tier/scheduler-tier events, unknown event_type/schema_version rejection, cross-tier field rejection, missing required tier fields, subject_role roster/self-attestation/invocation policy, ISO timestamp validation, daemon-only event_type rejection, and that caller-supplied `source` is dropped and replaced by `deriveCoordSource`. |
| `describe: "AC1 — coord metadata + canonicalization (constants surface)"` | describe | `tests/coord/append-seam.test.ts:301` | Asserts `COORD_SURFACE`/`COORD_SESSION_ID` constant values and that `CoordValidationError` carries `name` for `instanceof` checks. |

### `tests/coord/causality-reviewer-invoked-before-tick-start.test.ts` — durable-append ordering test for coord_invoke vs coord_emit

**Purpose:** Verifies the daemon-internal causality contract that `coord_invoke`'s `reviewer_invoked` atom is durably appended (with a lower `sequence_id`) before any child-emitted `tick_start` atom, by driving both MCP tool calls over HTTP against an in-process server and reading back append order via `storage.iterateCoordAtomsByAppendOrder`.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tests/coord/coord-request-fixture.js (COORD_REQUEST_PATH, installCoordRequestFixture), node:http, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "057b AC0 step 4 — reviewer_invoked precedes child tick_start"` | describe | `tests/coord/causality-reviewer-invoked-before-tick-start.test.ts:42` | Calls `coord_invoke` then `coord_emit` (tick_start) over the MCP HTTP endpoint and asserts `reviewerInvoked.sequence_id < tickStart.sequence_id` via `storage.iterateCoordAtomsByAppendOrder({})`. |

### `tests/coord/coord-emit-per-tier-input.test.ts` — per-tier discriminated input validation for coord_emit

**Purpose:** Focused unit tests on `validateCoordEmitInput`'s tier discrimination logic (round-tier requires `correlation_id`, scheduler-tier requires `tick_run_id`, cross-tier fields rejected) plus optional `expected_by`/`payload` passthrough.

**Depends on:** src/coord/roles.js (CoordRolesConfig type), src/coord/validate.js (validateCoordEmitInput), vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "AC1 — coord_emit per-tier input"` | describe | `tests/coord/coord-emit-per-tier-input.test.ts:36` | Verifies round-tier event with `correlation_id` succeeds, scheduler-tier with `tick_run_id` succeeds, cross-tier field combinations are rejected, missing required tier fields are rejected, and `expected_by`/`payload` pass through unchanged on round-tier events. |

### `tests/coord/coord-emit-wrapper-transport.test.ts` — coord-emit.sh shell wrapper transport/error-classification tests

**Purpose:** End-to-end tests of `tools/review-queue/coord-emit.sh`, spawning the real bash script against an in-process MCP daemon (and fixtures simulating unreachable/HTTP-500 daemons) to verify wrapper transport behavior: correct atom emission, daemon-down tolerance (`|| true`), and the three-way classification of daemon-rejected vs daemon-unreachable vs HTTP-error responses on stderr.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tools/review-queue/coord-emit.sh (spawned), node:child_process, node:net, node:http, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VALID_CORR` | const | `tests/coord/coord-emit-wrapper-transport.test.ts:21` | Fixed UUID reused as `--correlation-id` across the wrapper-transport test cases. |
| `pickClosedPort()` | function | `tests/coord/coord-emit-wrapper-transport.test.ts:30` | Binds a TCP probe to port 0, reads the OS-assigned port, then closes it to obtain a deterministically-closed port for daemon-unreachable simulation. |
| `runWrapperAsync(args, env)` | function | `tests/coord/coord-emit-wrapper-transport.test.ts:57` | Spawns the wrapper script asynchronously (vs `spawnSync`) so the in-process MCP daemon's libuv event loop can dispatch the HTTP request while curl waits; captures status/stdout/stderr. |
| `describe: "057b AC7 — coord-emit.sh wrapper transport"` | describe | `tests/coord/coord-emit-wrapper-transport.test.ts:94` | Verifies `coord-emit.sh tick_start` produces a valid coord atom with silent stdout/stderr on success, that the atom is accepted by the coord_emit validator (tier=round, subject_role=codex), that daemon-down does not abort the wrapper (exit 0 via `|| true`), and that `scheduler_health` with `--tick-run-id` is accepted as scheduler-tier. |
| `describe: "059 AC3 — coord-emit.sh distinguishes daemon-rejection from daemon-unreachable"` | describe | `tests/coord/coord-emit-wrapper-transport.test.ts:204` | Verifies three distinct wrapper stderr/exit-code behaviors: (i) daemon rejects (isError:true) surfaces verbatim rejection text on stderr with exit 0 and no atom; (ii) daemon unreachable produces fully empty stderr with exit 0 and no atom; (iii) HTTP 500 from a non-MCP fixture is surfaced as "returned HTTP 500" without being misclassified as a JSON-RPC rejection. |

### `tests/coord/coord-invoke-cwd-independent.test.ts` — coord_invoke path resolution after daemon chdir

**Purpose:** Verifies `coord_invoke`'s wrapper-path resolution (`resolveReviewerWrapperPath`) is cwd-independent by chdir'ing the process to `/` before starting the MCP server and invoking `coord_invoke`, asserting a non-error response with the expected `wrapper_path`.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tests/coord/coord-request-fixture.js (COORD_REQUEST_PATH, installCoordRequestFixture), node:http, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "057b AC0 — coord_invoke cwd-independent (r2 codex-ops F4 HIGH)"` | describe | `tests/coord/coord-invoke-cwd-independent.test.ts:40` | After `process.chdir('/')`, calls `coord_invoke` over MCP HTTP and asserts `isError === false` and that the response's `wrapper_path` matches `tools/review-queue/run-codex-reviewer.sh`. |

### `tests/coord/coord-invoke-fire-and-forget.test.ts` — coord_invoke fire-and-forget spawn timing tests

**Purpose:** Verifies `coord_invoke` returns quickly (bounded latency) even though the spawned reviewer wrapper's lifecycle may run for minutes, and that repeated invocations do not stall or leak daemon resources.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tests/coord/coord-request-fixture.js (COORD_REQUEST_PATH, installCoordRequestFixture), node:http, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `uuid(i)` | function | `tests/coord/coord-invoke-fire-and-forget.test.ts:19` | Builds a canonical uuid4 string with a fixed prefix and a unique trailing hex segment derived from `i`, for generating distinct `correlation_id`s. |
| `callInvoke(port, i)` | function | `tests/coord/coord-invoke-fire-and-forget.test.ts:30` | Issues a `coord_invoke` MCP HTTP call with a unique correlation id and returns the elapsed wall-clock time in ms. |
| `describe: "057b AC0 — fire-and-forget spawn timing"` | describe | `tests/coord/coord-invoke-fire-and-forget.test.ts:86` | Asserts a single `coord_invoke` returns under 1000ms, and that 10 sequential calls each return promptly (<2000ms) without daemon stall, with all 10 `reviewer_invoked` atoms successfully appended. |

### `tests/coord/coord-invoke-input-validation.test.ts` — coord_invoke input validation (shape + roster) tests

**Purpose:** Verifies `coord_invoke` rejects malformed inputs (bad correlation_id UUID, path-traversal/shell-metacharacter `request_path`, shape-invalid role strings, roster-invalid roles like non-headless `cursor` or unknown roles) before any spawn or atom append occurs.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tests/coord/coord-request-fixture.js (COORD_REQUEST_PATH, installCoordRequestFixture), node:http, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `callMcp(port, tool, args, role)` | function | `tests/coord/coord-invoke-input-validation.test.ts:26` | Posts a JSON-RPC `tools/call` request to the MCP HTTP endpoint with an optional `X-Echo-Role` header and returns `{isError, text}` parsed from the response content. |
| `countReviewerInvokedAtoms()` | function | `tests/coord/coord-invoke-input-validation.test.ts:91` | Queries storage for `coord:` source-prefixed atoms and counts how many have `metadata.coord.event_type === 'reviewer_invoked'`. |
| `describe: "057b AC0 — coord_invoke input validation"` | describe | `tests/coord/coord-invoke-input-validation.test.ts:99` | Verifies rejection (with zero atoms appended) of a malformed-version UUID correlation_id, path-traversal and shell-metacharacter `request_path` values, a set of shape-invalid `role` strings (`../`, `/`, `foo;rm`, `foo bar`, `FOO`, `''`), and roster-invalid roles (`cursor` as headless:false, and `nonexistent`). |

### `tests/coord/coord-invoke-spawns-wrapper.test.ts` — coord_invoke spawns reviewer wrapper script + env handoff

**Purpose:** Verifies `coord_invoke` spawns the role-specific wrapper script (`tools/review-queue/run-<role>-reviewer.sh`), not a raw codex argv, that a non-headless role (`cursor`) is rejected with a structured MCP error, and that a successful invoke synchronously appends a `coord:reviewer_invoked` atom attributed to `daemon` with the expected payload.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer, McpServerHandle), src/storage/memory.js (MemoryStorage), tests/coord/coord-request-fixture.js (COORD_REQUEST_PATH, installCoordRequestFixture), node:http, node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `callMcp(port, tool, args)` | function | `tests/coord/coord-invoke-spawns-wrapper.test.ts:28` | Posts a JSON-RPC `tools/call` request (with `X-Echo-Role: claude`) to the MCP HTTP endpoint and returns `{isError, text}`. |
| `describe: "057b AC0 — coord_invoke wrapper spawn + env handoff"` | describe | `tests/coord/coord-invoke-spawns-wrapper.test.ts:91` | Verifies the happy path appends `coord:reviewer_invoked` with `source=coord:codex`, `emitter_role=daemon`, correct `subject_role`/`correlation_id`/`payload.request_path`, and that `wrapper_path` matches `run-codex-reviewer.sh`; verifies a headless:false role (`cursor`) is rejected with a "not headless" structured error and no atom appended. |
| `describe: "057b AC0 — wrapper env handoff (subprocess.spawn env contract)"` | describe | `tests/coord/coord-invoke-spawns-wrapper.test.ts:132` | Documents (as a placeholder/sentinel assertion) that direct env-var-handoff probing isn't currently wired since roles are frozen at module load; defers full env-contract coverage to the fire-and-forget promptness test and notes a future extension path via a dedicated `headless:true` probe role. |

### `tests/coord/coord-request-fixture.ts` — shared test fixture for coord_invoke request_path

**Purpose:** Shared helper used by multiple coord test files to create (and later clean up) a minimal on-disk `request.md` fixture file at a fixed relative path, so `coord_invoke` tests have a real, valid `request_path` to reference.

**Depends on:** node:fs, node:path

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `COORD_REQUEST_PATH` | const | `tests/coord/coord-request-fixture.ts:4` | Fixed repo-relative fixture path `backlog/reviews/2026-05-16-057b/r1/request.md` used as a valid `request_path` value across coord_invoke tests. |
| `installCoordRequestFixture()` | function | `tests/coord/coord-request-fixture.ts:6` | Creates the fixture directory and writes a minimal frontmatter'd `request.md` file; returns a cleanup function that removes the fixture's parent directory tree. |

### `tests/coord/coord-roles-cwd-independent-path.test.ts` — coord-roles.json loader cwd-independence test

**Purpose:** Verifies the coord-roles config loader (`src/coord/roles.ts`) resolves the canonical `coord-roles.json` via a module-relative URL (`import.meta.url`), not `process.cwd()`, so the daemon still boots correctly after `process.chdir('/')` (e.g. under a launchd plist with an unrelated working directory).

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests), src/mcp/server.js (startMcpServer), src/storage/memory.js (MemoryStorage), vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "AC2 — cwd-independent coord-roles path resolution (r2 codex-ops F5 MED)"` | describe | `tests/coord/coord-roles-cwd-independent-path.test.ts:27` | After `process.chdir('/')`, asserts `startMcpServer` still boots successfully (non-zero assigned port), proving the coord-roles loader resolved its config file independent of cwd. |

### `tests/coord/coord-roles-validation.test.ts` — coord-roles.json schema/config loader validation tests

**Purpose:** Directly and end-to-end (via `startMcpServer`) tests `loadCoordRoles` from `src/coord/roles.ts`: well-formed config loading, frozen/immutable output, cross-field validation (`max_deadline_sec` must exceed `default_deadline_sec`), headless/IDE-mode `invoke_command` requirements, duplicate/invalid role-name rejection, missing/invalid JSON file handling, `ECHO_COORD_ROLES_PATH` env override, and that boot-time config errors throw from `startMcpServer()` itself rather than surfacing later at request time. Also sanity-checks the real checked-in `tools/review-queue/coord-roles.json`.

**Depends on:** src/coord/roles.js (_resetValidatorCacheForTests, loadCoordRoles), src/mcp/server.js (startMcpServer), src/storage/memory.js (MemoryStorage), node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeConfig(contents)` | function | `tests/coord/coord-roles-validation.test.ts:36` | Serializes an arbitrary config object to a temp `coord-roles.json` file and returns its path. |
| `WELL_FORMED` | const | `tests/coord/coord-roles-validation.test.ts:42` | A valid two-role (`codex` headless, `cursor` IDE-mode) coord-roles config object used as the baseline fixture across multiple test cases. |
| `describe: "AC2 — loadCoordRoles direct"` | describe | `tests/coord/coord-roles-validation.test.ts:70` | Verifies well-formed config loads and is frozen/immutable; rejects `max_deadline_sec <= default_deadline_sec` (equal and less-than cases); rejects `headless:true` without `invoke_command`; accepts `headless:false` without `invoke_command`; rejects duplicate role names, invalid slugs, and empty roles arrays; rejects missing/invalid-JSON config files; honors `ECHO_COORD_ROLES_PATH` env var when no explicit path is given. |
| `describe: "AC2 — startMcpServer boot gate"` | describe | `tests/coord/coord-roles-validation.test.ts:241` | Asserts `startMcpServer()` itself throws (rejects) at boot time for bad config (`max_deadline_sec <= default_deadline_sec`, or `headless` missing `invoke_command`) rather than deferring failure to a later request; asserts a well-formed config boots cleanly. |
| `describe: "AC2 — canonical config at tools/review-queue/coord-roles.json"` | describe | `tests/coord/coord-roles-validation.test.ts:301` | Loads the real checked-in `coord-roles.json` via the default module-relative path and sanity-checks every role's name slug shape, every event's `max_deadline_sec > default_deadline_sec` and non-empty `expects`, and that headless roles carry a non-empty `invoke_command`. |

### `tests/coord/coord-status-shape.test.ts` — coord_status tool output-shape and deadline-persistence tests

**Purpose:** Tests `buildCoordStatus` (`src/mcp/tools/coord-status.ts`) together with `DeadlineTracker` (`src/coord/deadlines.ts`): documented top-level output shape, per-role last-tick aggregation (start/end/duration), tier-aware `open_deadlines` reporting for round+scheduler tiers, that `last_miss_per_role_per_event_type` is durably rehydrated from atoms (surviving a fresh/restarted tracker) even when older than the `recent_missed` 24h horizon, that a later successful close clears the slot, and that an unrelated event_type (`reviewer_invoked`) does NOT clear a `tick_start` miss slot.

**Depends on:** src/mcp/tools/coord-status.js (buildCoordStatus), src/coord/deadlines.js (DeadlineTracker), src/coord/roles.js (CoordRolesConfig type), src/storage/memory.js (MemoryStorage), node:crypto (createHash), vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `seedAtom(storage, source, ts, coord)` | function | `tests/coord/coord-status-shape.test.ts:44` | Directly appends a synthetic coord-surface atom to storage with the given source/timestamp/`coord` metadata payload, bypassing normal validation, for deterministic status-computation fixtures. |
| `describe: "AC6 — coord_status shape"` | describe | `tests/coord/coord-status-shape.test.ts:58` | Verifies the documented top-level `coord_status` shape (`schema_version`, `tool`, `generated_at`, array fields, `daemon_uptime_sec`, `last_reconstruction_watermark`); per-role last-tick aggregation of `last_tick_start`/`last_tick_end`/duration; tier-aware `open_deadlines` surfacing both `round` and `scheduler` tiers; that a 48h-old uncleared miss survives a fresh `DeadlineTracker`/restart and appears in `last_miss_per_role_per_event_type` even though excluded from the 24h `recent_missed` horizon; that a later higher-sequence `tick_start` clears the miss slot; and that a `reviewer_invoked` atom does NOT clear a `(role, tick_start)` miss slot since its event_type doesn't match the expected closer. |

### `tests/coord/coord-volume-perf.test.ts` — deadline-reconstruction + coord_status perf budget test

**Purpose:** 057a AC6+AC8 fixture exercising `DeadlineTracker.reconstruct()` and `buildCoordStatus()` against a synthetic 100k-atom coord ledger built via `MemoryStorage`, asserting reconstruction completes under 1500ms and `coord_status` under 300ms.

**Depends on:** `src/coord/deadlines.js` (`DeadlineTracker`), `src/mcp/tools/coord-status.js` (`buildCoordStatus`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/storage/memory.js` (`MemoryStorage`), `node:crypto` (`createHash`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/coord-volume-perf.test.ts:33` | Frozen `CoordRolesConfig` with `codex` and `codex-ops` roles and their event-deadline definitions used for the synthesized ledger. |
| `COUNT` | const | `tests/coord/coord-volume-perf.test.ts:67` | Target atom count for the synthetic ledger (100,000). |
| `RECONSTRUCT_BUDGET_MS` | const | `tests/coord/coord-volume-perf.test.ts:68` | Perf budget (1500ms) for `DeadlineTracker.reconstruct()`. |
| `STATUS_BUDGET_MS` | const | `tests/coord/coord-volume-perf.test.ts:69` | Perf budget (300ms) for `buildCoordStatus()`. |
| `describe: "AC6+AC8 — coord volume perf fixture (100k atoms)"` | describe | `tests/coord/coord-volume-perf.test.ts:71` | Seeds 100k coord atoms (repeating groups of reviewer_invoked→tick_start→tick_end plus a parallel reviewer_invoked+deadline_missed pair to prime the idempotency cache), then times `reconstruct()` and `buildCoordStatus()` against fixed budgets. |

### `tests/coord/daemon-down-tolerance.test.ts` — coord-emit.sh best-effort exit-0 test

**Purpose:** 057b AC0 step 6 + AC7 test verifying `tools/review-queue/coord-emit.sh` always exits 0 (queue durability) even when the MCP daemon is unreachable or required tier keys are missing, so wrapper callers using `|| true` never block on coord emission failures.

**Depends on:** `tools/review-queue/coord-emit.sh` (external shell script under test), `node:child_process` (`spawnSync`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VALID_CORR` | const | `tests/coord/daemon-down-tolerance.test.ts:10` | Fixed UUID used as `--correlation-id` across the test cases. |
| `describe: "057b AC0/AC7 — daemon-down tolerance"` | describe | `tests/coord/daemon-down-tolerance.test.ts:12` | Runs `coord-emit.sh` for `tick_start` and `scheduler_health` against an unreachable port (`http://127.0.0.1:1/mcp`) and for `tick_end` with a missing tier key, asserting exit code 0 in all cases. |

### `tests/coord/deadlines-fire-once-and-remove.test.ts` — deadline single-fire + terminal-removal test

**Purpose:** 057a AC3 test verifying `DeadlineTracker.tick()`/`fireMissedDeadline` fires exactly one `deadline_missed` atom per overdue open record, removes the record from the open-record map (terminal), and that repeated heartbeats produce no duplicate atoms; also covers non-overdue records staying open and close-then-open semantics.

**Depends on:** `src/coord/deadlines.js` (`DeadlineTracker`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/storage/memory.js` (`MemoryStorage`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/deadlines-fire-once-and-remove.test.ts:14` | Frozen `CoordRolesConfig` with a single `codex` role and `reviewer_invoked`/`tick_start` deadline events. |
| `makeTrackerWithFixedNow(storage, nowMs)` | function | `tests/coord/deadlines-fire-once-and-remove.test.ts:36` | Constructs a `DeadlineTracker` with `now` pinned to `nowMs`, heartbeat disabled, and no reconciliation interval. |
| `describe: "AC3 — fireMissedDeadline single-fire + terminal removal"` | describe | `tests/coord/deadlines-fire-once-and-remove.test.ts:44` | Covers: repeated heartbeats over an overdue record fire exactly one `deadline_missed` atom and remove the open record; non-overdue records are not fired; a successful close (tick_start) arriving before the deadline removes the open record and opens the next one. |

### `tests/coord/deadlines-reconstruction.test.ts` — boot-time deadline reconstruction test

**Purpose:** 057a AC3 test for `DeadlineTracker.reconstruct()` covering ledger replay of close-then-open sequences, the post-reconstruction fire pass for already-overdue records at boot, idempotency-cache priming from a pre-existing `deadline_missed` atom across a simulated restart (no duplicate fire), and that append-order (not `emitted_at`) is authoritative during replay.

**Depends on:** `src/coord/deadlines.js` (`DeadlineTracker`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/storage/memory.js` (`MemoryStorage`), `node:crypto` (`createHash`, dynamically imported), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/deadlines-reconstruction.test.ts:22` | Frozen `CoordRolesConfig` with a single `codex` role and `reviewer_invoked`/`tick_start` deadline events. |
| `SHA256_HEX` | const | `tests/coord/deadlines-reconstruction.test.ts:44` | Regex `/^[0-9a-f]{64}$/` used to validate idempotency-key shape on fired `deadline_missed` atoms. |
| `seedAtom(storage, source, ts, coordMeta)` | function | `tests/coord/deadlines-reconstruction.test.ts:46` | Appends a synthetic coord atom to `storage` with the given source, timestamp, and `metadata.coord` payload, returning the new atom id. |
| `describe: "AC3 — boot reconstruction"` | describe | `tests/coord/deadlines-reconstruction.test.ts:60` | Covers: replaying close-then-open over a clean ledger leaves non-overdue records open; an overdue record at boot fires `deadline_missed` in the post-replay fire pass; restart-after-fired uses cache-hit priming to remove the open record without duplicate atoms; out-of-order `emitted_at` timestamps do not affect append-order-based replay correctness. |

### `tests/coord/idempotency-and-tier-keyspace.test.ts` — per-role idempotency + tier-keyspace isolation test

**Purpose:** 057a AC3 test verifying deadline idempotency keys are scoped per (correlation_id, role, event_type) so two roles sharing a correlation_id each get a distinct `deadline_missed` atom; that multiple subject_roles under one correlation_id open/close independently; that `round` and `scheduler` tiers don't cross-pollute; and that `DeadlineTracker.reconcile()` is idempotent.

**Depends on:** `src/coord/deadlines.js` (`DeadlineTracker`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/storage/memory.js` (`MemoryStorage`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/idempotency-and-tier-keyspace.test.ts:18` | Frozen `CoordRolesConfig` with `codex` (reviewer_invoked/tick_start/scheduler_health events) and `codex-ops` (reviewer_invoked/tick_start events) roles. |
| `describe: "AC3 — idempotency per-role + tier keyspace"` | describe | `tests/coord/idempotency-and-tier-keyspace.test.ts:62` | Covers: two roles sharing a correlation_id both missing their deadline produce 2 distinct `deadline_missed` atoms with distinct idempotency keys; closing one subject_role's record under a shared correlation_id does not close the other's; `round` vs `scheduler` tier open records for the same wrapper don't collide and closing one tier leaves the other untouched; `reconcile()` run twice produces stable snapshot state. |

### `tests/coord/identity-spoof-rejection.test.ts` — emitter-identity + self-attestation validation test

**Purpose:** 057a AC1+AC5 test for `resolveEmitterIdentity`, `deriveCoordSource`, and `validateCoordEmitInput`, verifying missing/empty/whitespace/unknown `X-Echo-Role` headers are rejected, caller-supplied `source` is always dropped in favor of server-derived identity, self-attestation events require `subject_role == emitter_role`, and invocation events allow `subject_role != emitter_role` only when `subject_role` is in the roster.

**Depends on:** `src/coord/identity.js` (`CoordIdentityError`, `resolveEmitterIdentity`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/coord/source.js` (`deriveCoordSource`), `src/coord/validate.js` (`validateCoordEmitInput`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/identity-spoof-rejection.test.ts:20` | Frozen `CoordRolesConfig` with `codex` and `codex-ops` roles used across the identity/validation assertions. |
| `TS` | const | `tests/coord/identity-spoof-rejection.test.ts:54` | Fixed ISO timestamp (`2026-05-16T08:00:00.000Z`) used as `emitted_at` in validator calls. |
| `describe: "AC1 — identity-spoof rejection"` | describe | `tests/coord/identity-spoof-rejection.test.ts:56` | Covers: missing/empty/whitespace `X-Echo-Role` rejected; unknown role name rejected with roster-not-found message; `CoordIdentityError` is instanceof-distinguishable and carries `.name`; valid (and whitespace-trimmed) role resolves correctly; server always derives `source` from identity, ignoring caller-supplied `source`; self-attestation events reject `subject_role != emitter_role`; invocation events accept mismatched `subject_role` only when it's in the roster, and reject when it isn't. |

### `tests/coord/internal-emitter-attribution.test.ts` — daemon-internal emitter attribution test

**Purpose:** 057b AC7 test for `emitReviewerInvoked` in `src/coord/internal-emitter.js`, verifying it appends a `coord:<subject_role>` atom with `metadata.coord.emitter_role = "daemon"` (bypassing the wrapper's `X-Echo-Role` gate since the daemon is the authenticated emitter), opens the corresponding pre-spawn deadline, and tolerates a null tracker without throwing.

**Depends on:** `src/coord/deadlines.js` (`DeadlineTracker`), `src/coord/internal-emitter.js` (`DAEMON_EMITTER_ROLE`, `emitReviewerInvoked`), `src/coord/roles.js` (`CoordRolesConfig` type), `src/storage/memory.js` (`MemoryStorage`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CFG` | const | `tests/coord/internal-emitter-attribution.test.ts:23` | Frozen `CoordRolesConfig` with a single `codex` role and `reviewer_invoked`/`tick_start` events. |
| `CORR` | const | `tests/coord/internal-emitter-attribution.test.ts:45` | Fixed correlation-id UUID reused across the test cases. |
| `describe: "057b AC7 — internal emitter daemon attribution"` | describe | `tests/coord/internal-emitter-attribution.test.ts:61` | Covers: `emitReviewerInvoked` appends an atom with `source = coord:codex`, `event_type = reviewer_invoked`, `subject_role`, `emitter_role = DAEMON_EMITTER_ROLE`, and `correlation_id`; it opens the pre-spawn deadline in the tracker's `round` tier before returning; it tolerates a `null` tracker without throwing. |

### `tests/coord/no-pre-push-spawn.test.ts` — request.py zero-coord-call invariant test

**Purpose:** 057b AC7 test verifying `tools/review-queue/request.py`'s only coord-related responsibility is writing `correlation_id` into `request.md` — it must make zero MCP calls and produce zero coord atoms even when a reachable daemon is configured via `ECHO_MCP_URL`.

**Depends on:** `src/coord/roles.js` (`_resetValidatorCacheForTests`), `src/mcp/server.js` (`startMcpServer`, `McpServerHandle`), `src/storage/memory.js` (`MemoryStorage`), `node:child_process` (`execSync`, `spawnSync`), `node:fs`, `node:os`, `node:path`, `tools/review-queue/request.py` + `_lib.py` + `_reviewers.py` + `reviewers.json` + schemas (external files copied into a scratch git repo), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REPO` | const | `tests/coord/no-pre-push-spawn.test.ts:18` | Captures `process.cwd()` as the source repo to copy `request.py` and related files from. |
| `beforeEach(...)` | function | `tests/coord/no-pre-push-spawn.test.ts:24` | Resets the roles validator cache, starts an in-memory MCP server on an ephemeral port, and creates a scratch git repo with a `backlog/ready/` item. |
| `afterEach(...)` | function | `tests/coord/no-pre-push-spawn.test.ts:45` | Stops the MCP server handle and removes the scratch workdir. |
| `describe: "057b AC7 — request.py emits zero coord atoms"` | describe | `tests/coord/no-pre-push-spawn.test.ts:50` | Copies `request.py`, its helper modules, `reviewers.json`, and JSON schemas into the scratch repo, runs `request.py <item-id> 1` with `ECHO_MCP_URL` pointed at the live test daemon, asserts exit 0 and that `request.md` gained a `correlation_id`, then asserts `storage.query({source_prefix:'coord:'})` returns zero atoms. |

### `tests/coord/non-pollution-three-way.test.ts` — coord-atom search/wait exclusion & opt-in test

**Purpose:** 057a AC1 test asserting the three-way non-pollution invariant: `search_memories()` excludes coord atoms by default, `search_memories({source_prefix:'coord:'})` and `search_memories({source:'coord:codex'})` opt in to forensic retrieval, and `wait_for_new_turns({source_prefix:'coord:'})` returns coord turn ids per the AC4 mailbox contract — all three checked individually and simultaneously on one store.

**Depends on:** `src/mcp/tools/search-memories.js` (`searchMemories`), `src/mcp/tools/wait-for-new-turns.js` (`waitForNewTurns`), `src/storage/memory.js` (`MemoryStorage`), `src/coord/types.js` (`COORD_SESSION_ID`, `COORD_SURFACE`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `seedCoord(store)` | function | `tests/coord/non-pollution-three-way.test.ts:21` | Appends two coord atoms (`coord:codex`, `coord:codex-ops`) and one non-coord `fs:` atom to `store`, returning their ids for assertion. |
| `describe: "AC1 non-pollution three-way"` | describe | `tests/coord/non-pollution-three-way.test.ts:52` | Covers: default `search_memories()` excludes coord atoms; `source_prefix="coord:"` returns them (forensic opt-in); exact `source="coord:codex"` returns only that role's atom; `wait_for_new_turns(source_prefix="coord:")` returns coord turn ids and excludes non-coord; all three invariants hold together via `Promise.all`. |

### `tests/coord/paths-resolution.test.ts` — coord path-safety validation test

**Purpose:** 057b AC0 test for `src/coord/paths.js`, verifying `REPO_ROOT` resolves correctly regardless of `process.cwd()`, `resolveReviewerWrapperPath` returns the correct wrapper script and rejects shape-invalid or roster-invalid role names (before any FS/MCP side effects), and `resolveCoordRequestPath` accepts valid request paths under configured `reviews_root` while rejecting path traversal and symlink-escape attacks.

**Depends on:** `src/coord/paths.js` (`CoordPathError`, `REPO_ROOT`, `resolveCoordRequestPath`, `resolveReviewerWrapperPath`), `node:fs` (`mkdirSync`, `mkdtempSync`, `realpathSync`, `rmSync`, `symlinkSync`, `writeFileSync`), `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SHAPE_INVALID` | const | `tests/coord/paths-resolution.test.ts:23` | Array of malformed role-name strings (path traversal, slashes, semicolons, spaces, uppercase, empty) used to test the shape-validation regex gate. |
| `makeCoordRepo(reviewsRoot)` | function | `tests/coord/paths-resolution.test.ts:39` | Builds a temp git-less repo scaffold with `.echo/project.json` and a `request.md` under the given `reviews_root`, returning the repo path. |
| `describe: "057b AC0 — paths resolution"` | describe | `tests/coord/paths-resolution.test.ts:65` | Covers: `REPO_ROOT` is a non-empty string; `resolveReviewerWrapperPath("codex")` resolves the `run-codex-reviewer.sh` wrapper and stays correct after `chdir("/")`; each shape-invalid role throws `CoordPathError` with a "shape-invalid" message before roster lookup; roster-invalid roles (`cursor` non-headless, `nonexistent`) throw with appropriate messages; `resolveCoordRequestPath` resolves valid default and custom `reviews_root` paths, rejects adversarial paths (`../`, absolute, percent-encoded traversal), and rejects symlinked `reviews_root` or symlinked request-path ancestors that resolve outside the repo/reviews_root. |

### `tests/coord/wait-for-new-turns-source-prefix.test.ts` — wait_for_new_turns source_prefix widening test

**Purpose:** 057a AC4 test for `waitForNewTurns` in `src/mcp/tools/wait-for-new-turns.js`, verifying the `source_prefix` parameter returns coord turns from any role, unions with `sources[]` when both are supplied (deduplicated by turn id), raises a structured validation error when both `sources[]` and `source_prefix` are absent/empty, and produces a byte-identical response shape for pre-AC4 `sources[]`-only callers.

**Depends on:** `src/mcp/tools/wait-for-new-turns.js` (`waitForNewTurns`), `src/storage/memory.js` (`MemoryStorage`), `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `SINCE` | const | `tests/coord/wait-for-new-turns-source-prefix.test.ts:14` | Fixed ISO timestamp used as the `since` cursor baseline. |
| `AFTER_SINCE` | const | `tests/coord/wait-for-new-turns-source-prefix.test.ts:15` | Fixed ISO timestamp 1 second after `SINCE`, used as the timestamp of seeded atoms. |
| `describe: "AC4 — wait_for_new_turns source_prefix"` | describe | `tests/coord/wait-for-new-turns-source-prefix.test.ts:17` | Covers: (a) prefix-only call returns coord turns from any role and excludes non-coord; (b) `sources[]` + `source_prefix` together return the union, deduplicated when an atom matches both filters; (c) both absent or both empty throw a structured validation error; (d) pre-AC4 `sources=[exact]`-only calls produce the exact legacy response shape (`schema_version`, `tool`, `turn_ids`, `next_since`, `timed_out`, `warnings`). |

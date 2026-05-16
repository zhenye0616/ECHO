---
id: 2026-05-16-057a-coord-substrate-and-observability
title: Coord layer 057a — substrate + observability (daemon-side read/write/track/report; synthetic-emitter testable; ships dormant until 057b activates production emission)
status: ready
priority: HIGH
estimate: 2-2.5d
created: 2026-05-16
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
task_state_ref: 2026-05-16-057a-coord-substrate-and-observability
agent_notes: |
  057a is the substrate-only half of the original 057 spec (decomposed
  2026-05-16 after 5 review rounds plateaued at 4-5 findings/round per
  the 049 fail-to-converge asymptote). 057a ships the daemon-side
  read/write/track/report surface; production event emission lands in
  057b. 057a is INDEPENDENTLY SHIPPABLE: it can deploy, sit dormant,
  and produce no behavior change for existing reviewers until 057b
  activates wrapper-side emission. All 057a tests use synthetic atoms
  via the coord_emit MCP tool.

  Parent context (read once): backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md and its r1-r5 review history at backlog/reviews/2026-05-15-057-coord-layer-narrow-append-and-deadlines/. The 9-finding fix set from r1 + 5-finding fix sets from r2-r5 are baked into AC1-AC8 below; each AC cites which finding(s) it closes.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC1 — narrow coord append seam (the load-bearing write surface)
  - src/mcp/tools/coord-emit.ts                    # new MCP write tool with per-tier discriminated input (r4 codex F1 MED)
  - src/mcp/server.ts                              # register coord_emit + coord_status
  - src/storage/sqlite.ts                          # narrow coord-write path; preserve single-writer constraint (r1 codex Q5 HIGH)
  - src/coord/types.ts                             # event types + schema_version registry + tier classification (round vs scheduler)
  - src/coord/validate.ts                          # per-tier event shape validation; reject unknown event_type / schema_version / cross-tier fields
  - src/coord/source.ts                            # server-derives source = coord:<role> from caller identity
  - src/coord/identity.ts                          # X-Echo-Role header → role mapping; rejects spoof
  # AC1 — non-pollution (search/clustering/normalize bypass)
  - src/mcp/tools/search-memories.ts               # default-exclude metadata.surface=coord; only when no explicit source_prefix="coord:" (r1 codex F6 MED)
  # AC4 — wait_for_new_turns source_prefix widening (read substrate)
  - src/mcp/tools/wait-for-new-turns.ts            # add `source_prefix: string` input parameter (codex strategist substrate consult 2026-05-16 + r1 codex F6 MED)
  # AC2 — role-typed deadline config
  - tools/review-queue/coord-roles.json            # per-role-per-event-type SLA + max bound; sibling of reviewers.json
  - tools/review-queue/schemas/coord-roles.schema.json
  - src/coord/roles.ts                             # NEW: TS daemon-side loader called from startMcpServer() at boot; cwd-independent path resolution via import.meta.url (r2 codex-ops F5 MED); reads coord-roles.json, validates schema with ajv (r2 codex F2 MED), enforces cross-field max_deadline_sec > default_deadline_sec, throws on bad config so daemon exits non-zero at startup (r1 codex F4 MED — bad-config = daemon-startup failure, not per-request)
  - tools/review-queue/_coord_roles.py             # CI/static-check sibling (mirrors _reviewers.py); pre-merge validation only; NOT loaded by the daemon at runtime (r1 codex F4 MED reframe)
  - package.json                                   # add ajv@^8 + ajv-formats@^3 as direct runtime deps for src/coord/roles.ts schema validation (r2 codex F2 MED — repo currently has no JS JSON-Schema validator)
  # AC3 — deadline tracker + boot reconstruction (round-tier + scheduler-tier separate maps; single mutation lane; durable append-order replay)
  - src/coord/deadlines.ts                         # in-memory two-tier tracker; single-actor serial mutation lane shared by event ingest, heartbeat, boot reconstruction, periodic reconciliation; in-memory idempotency cache + terminal record lifecycle on fire (cache-hit branch ALSO terminal — r2 codex-ops F1 HIGH); replay by durable append-order sequence_id NOT emitted_at (r2 codex F1 HIGH + r2 codex-ops F6 MED)
  - src/daemon/index.ts                            # wire deadlines.reconstruct() into daemon boot; HARD STARTUP GATE — MCP server does not accept coord_emit until reconstruction completes (r1 codex-ops F6 HIGH)
  - src/storage/interface.ts                       # add iterateCoordAtomsByAppendOrder({sinceSeq?, untilSeq?, limit?}) returning atoms in durable append order with sequence_id (r2 codex F1 HIGH — current QueryFilter has no append-order primitive; EventId is random UUID; SQLite orders by (timestamp, id) not durable ingest order)
  - src/storage/sqlite.ts                          # implement iterateCoordAtomsByAppendOrder using SQLite rowid as sequence_id; single-writer constraint guarantees rowid reflects ingest order
  - src/storage/memory.ts                          # implement iterateCoordAtomsByAppendOrder using monotonic insertion counter
  # AC6 — operator status surface
  - src/mcp/tools/coord-status.ts                  # new MCP read tool: open deadlines (per tier), recent missed, role last-tick, daemon uptime
  - tools/coord-status.sh                          # CLI sibling — curl + jq against the daemon for non-MCP operator inspection
  # AC8 — substrate tests (synthetic-emitter only; 057b adds production-emission tests)
  - tests/coord/append-seam.test.ts                # coord_emit validates schema + identity + canonicalizes timestamp + bypasses normalizer/trace (r1 codex Q1 HIGH)
  - tests/coord/identity-spoof-rejection.test.ts   # caller-supplied source ignored; X-Echo-Role spoof rejected; unknown role rejected (r1 codex Q5 HIGH)
  - tests/coord/non-pollution-three-way.test.ts    # search_memories() excludes coord; search_memories(source_prefix=coord:) returns coord; wait_for_new_turns(source_prefix=coord:) returns coord (r1 codex F6 MED)
  - tests/coord/coord-emit-per-tier-input.test.ts  # round-tier requires correlation_id; scheduler-tier requires tick_run_id; cross-tier rejected (r4 codex F1 MED)
  - tests/coord/coord-roles-validation.test.ts     # well-formed config loads via src/coord/roles.ts; bad-config (max_deadline_sec <= default_deadline_sec) causes startMcpServer() to throw at daemon boot (r1 codex F4 MED)
  - tests/coord/wait-for-new-turns-source-prefix.test.ts  # NEW (r1 codex F3 MED): prefix-only valid; sources[]+source_prefix unions; both-absent rejected; pre-AC4 sources[]-only call is byte-identical post-AC4
  - tests/coord/deadlines-reconstruction.test.ts   # daemon boot scans recent coord atoms, replays close-then-open, fires missed atoms for overdue records; MCP server NOT accepting coord_emit until reconstruction completes (r1 codex Q3 HIGH + r2 codex F2 MED + r1 codex-ops F6 HIGH startup-gate)
  - tests/coord/deadlines-fire-once-and-remove.test.ts    # NEW (r1 codex-ops F5 HIGH): repeated heartbeats on the same overdue record → exactly one deadline_missed atom; record removed from open map after first fire; coord_status() does not show stale open record
  - tests/coord/deadlines-reconstruction-concurrency.test.ts  # NEW (r1 codex F2 HIGH + r1 codex-ops F6 HIGH): tick_end during reconstruction does not resurrect closed tick_start; heartbeat firing during periodic-reconciliation produces exactly one atom
  - tests/coord/restart-after-fired-no-stale-open.test.ts  # NEW (r2 codex-ops F1 HIGH): synthesize a coord:deadline_missed atom durably + simulate restart; reconstruction's cache priming + cache-hit-also-terminal branch + first heartbeat → open record is removed; coord_status() does NOT show stale open deadline; no duplicate deadline_missed atom appended
  - tests/coord/out-of-order-emitted-at-replay.test.ts  # NEW (r2 codex F1 HIGH + r2 codex-ops F6 MED convergent): synthesize coord atoms whose emitted_at is out of order relative to append order (e.g. tick_start emitted_at < reviewer_invoked emitted_at, but appended after); reconstruction + reconciliation replay in append order, NOT emitted_at order, producing the correct final open-record state
  - tests/coord/last-miss-cleared-by-successful-close.test.ts  # NEW (r2 codex F3 MED): emit reviewer_invoked → miss tick_start → coord_status shows (codex, tick_start) in per-role-per-event-type last-miss; emit successful tick_start → entry cleared; emit fresh reviewer_invoked alone does NOT clear it
  - tests/coord/subject-role-multi-under-one-correlation.test.ts  # NEW (r1 codex F1 HIGH): two subject_roles under one correlation_id open + close independently
  - tests/coord/idempotency-per-role.test.ts       # two reviewers same correlation_id, both miss → 2 distinct deadline_missed atoms (per-role-per-event-type key) (r1 codex F5 + codex-ops F3 MED — original 057)
  - tests/coord/scheduler-vs-round-tier-keyspace.test.ts  # round-tier (correlation_id) and scheduler-tier (tick_run_id) maps don't collide; concurrent open records for one wrapper (r3 codex-ops F2 MED)
  - tests/coord/coord-status-shape.test.ts         # coord_status() output schema; per-role last-tick aggregation; tier-aware reporting; recent-missed uses max(role.max_deadline_sec) horizon ≥24h; per-role-per-event-type last-miss visible even when underlying atom is >24h old (r1 codex-ops F7 MED); deadline_missed atom payload carries metadata.coord.opened_event_type AND expected_event_type (r2 codex F3 MED)
  - tests/coord/coord-roles-cwd-independent-path.test.ts  # NEW (r2 codex-ops F5 MED): chdir to / before calling startMcpServer(); loader still resolves coord-roles.json via module-relative import.meta.url path
  - tests/storage/iterate-coord-by-append-order.test.ts  # NEW (r2 codex F1 HIGH): Storage.iterateCoordAtomsByAppendOrder parity across SqliteStorage + MemoryStorage; same-timestamp atoms replay in append order; range (sinceSeq, untilSeq] returns expected subset; out-of-order emitted_at does NOT affect iteration order
  # AC9 — task-state pointer per 046 AC1
  - backlog/task-state/2026-05-16-057a-coord-substrate-and-observability/builder.md
spec_refs:
  - backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md  # Parent spec (decomposed 2026-05-16 after r5 plateau). Read the r1-r5 review history before writing code — each finding's substance is baked into the AC text below but the reviewer reasoning is in the original review files.
  - backlog/reviews/2026-05-15-057-coord-layer-narrow-append-and-deadlines/r1  # through r5/. The 21+ findings (4 HIGH r1 + 3 HIGH r2 + 2 HIGH r3 + 4 HIGH r4 + 3 HIGH r5) are the design archive.
  - raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md  # Original brainstorm context; the four locked design decisions (scope, responsibility, location, boundary) carry over to 057a + 057b unchanged.
  - wiki/architecture/group-session.md  # 030's group-session primitive — the substrate 057a reuses for coord events. Coord atoms live in the existing ledger.
  - wiki/architecture/storage.md  # Lines 50, 68-76 (append-only, no trim), 119-127 (single-writer). AC1 + AC5 honor these invariants.
  - src/capture/gate.ts  # Lines 57-72 — capture-gate rejects unknown source schemes. AC1's coord seam is SEPARATE from this gate (no normalizer adapter; no trace-edge generation; default-excluded from search).
  - src/capture/pipeline.ts  # Lines 17-44 — timestamp canonicalization pattern AC1 reuses verbatim.
  - src/mcp/tools/wait-for-new-turns.ts  # Lines 121-132, 157-162 — current `sources[]` enumeration; AC4 adds optional `source_prefix` sibling parameter.
  - src/mcp/server.ts  # Lines 103-136, 127-132 — current MCP server + DNS-rebinding protection. AC5 X-Echo-Role identity model layers on top of existing loopback-only constraint.
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md  # AC2 pattern reference: per-role config in JSON + Python loader pattern. coord-roles.json mirrors reviewers.json shape.
  - backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # 050 worktree-isolation invariant: AC8 test fixtures run in ephemeral worktrees; daemon writes go through single-writer constraint.
---

## Why this spec exists

The original 057 monolithic spec hit the 049 fail-to-converge asymptote at r5 (decay r1=9 → r2=5 → r3=4 → r4=5 → r5=5; plateau at 4-5 substantive findings per round). The strategist + founder decision 2026-05-16 was to decompose into two independently shippable specs:

- **057a (this spec):** daemon-side read/write/track/report substrate. Verifiable with synthetic atoms emitted directly via `coord_emit`. Ships dormant — production event emission stays at zero until 057b lands.
- **057b (sibling):** strategist/wrapper-side production emission. Activates the substrate. Depends on 057a's contracts.

This boundary is load-bearing for review-cycle convergence: every finding from 057's r1-r5 cycle splits cleanly across the two specs. Substrate concerns (append-seam, schema, deadlines tracker, identity, observability) live in 057a; integration concerns (coord_invoke, wrapper emission, post-push hooks, daemon-attribution of synthetic events) live in 057b. Per the 049 decay shape, each smaller spec should converge in 3-4 rounds vs the monolithic 6-8+.

## Acceptance Criteria

**AC1 — Narrow coord append seam (`coord_emit` MCP tool with per-tier discriminated input).**

The capture pipeline at `src/capture/gate.ts:57-72` rejects unknown source schemes; that's load-bearing for the capture surface and stays unchanged. Coord events take a separate, daemon-owned path:

- **New MCP tool `coord_emit(event_type, payload, ...)`** at `src/mcp/tools/coord-emit.ts`. The tool is the ONLY entry point for writing coord atoms. Caller does NOT supply `source` — the daemon derives it server-side from caller identity per AC5.
- **Per-tier discriminated input** (closes r4 codex F1 MED):
  - **Round-tier events** (`reviewer_invoked`, `tick_start`, `tick_end`, `tick_failed_to_bind`): require `correlation_id: string (uuid4 shape)`; reject if `tick_run_id` is supplied.
  - **Scheduler-tier events** (`scheduler_health`, `scheduler_health_done`): require `tick_run_id: string (uuid4 shape)`; reject if `correlation_id` is supplied.
  - **Daemon-emitted events** (`deadline_missed`): the daemon writes these from inside 057a (per AC3 below); they carry whichever tier-key is appropriate for the deadline that fired.
  - **Common required fields** for all tiers: `event_type` (registry-known), `emitted_at` (ISO-Z; daemon canonicalizes), `schema_version` (int from registry), `subject_role` (string; validated against `coord-roles.json` — see `subject_role` paragraph below).
  - **`subject_role` semantics** (r1 codex F1 HIGH): every coord event names which role's SLA it pertains to. For self-attestation events (`tick_start`, `tick_end`, `scheduler_health`, `scheduler_health_done`), `subject_role` MUST equal the server-derived emitter role from AC5; the daemon validates equality and rejects mismatched pairs with structured MCP error. For invocation events (`reviewer_invoked`, `tick_failed_to_bind`), the emitter is the orchestrator (e.g. claude-strategist) and `subject_role` is the target reviewer (e.g. `codex`) whose deadline is being opened — the daemon validates that `subject_role` is in `coord-roles.json` but does NOT require `subject_role == emitter_role`. Daemon-emitted `deadline_missed` events carry the original record's `subject_role` (the role whose SLA missed). Unknown `subject_role` values are rejected. Registry entry for each `event_type` declares whether `subject_role` must equal `emitter_role` (self-attestation) or may differ (invocation); the validator derives behavior from the registry.
  - The tier classification + `subject_role` policy lives in the registry at `src/coord/types.ts`. Adding a new event type means one registry entry; the validator + tracker + status display all derive behavior from the registry.
- **Server-side processing:**
  - Validate `event_type` against the registry. Reject unknown types with structured MCP error.
  - Validate `schema_version` against the registry. Reject unknown versions.
  - Canonicalize `emitted_at` timestamp using the same pattern as `src/capture/pipeline.ts:17-44` (UTC-Z normalization at append-time; honors item 022's Bug A fix).
  - Mark `metadata.surface = "coord"` and `metadata.session_id = "echo:coord"`.
- **Storage path** goes through `src/storage/sqlite.ts`'s existing single-writer path — no parallel SQLite handle (preserves `wiki/architecture/storage.md:119-127` constraint).
- **Non-pollution invariants** (load-bearing — guards against contaminating retrieval queries that aren't about coordination, closes r1 codex F6 MED):
  - NO normalizer adapter registered in `src/normalize/dispatch.ts` for `coord:*` sources. Coord atoms bypass normalization, embedding, and clustering.
  - NO trace edges generated from coord atoms.
  - `search_memories()` with no filter DOES NOT return coord atoms by default. The exclusion lives in a DEDICATED filter at `src/mcp/tools/search-memories.ts` (NOT in the shared `withFsExclusion` helper at `src/mcp/util/fs-exclusion.ts` — that would also break `wait_for_new_turns(source_prefix="coord:")` per AC4).
  - `search_memories(source_prefix="coord:")` works (forensic retrieval).
  - **`wait_for_new_turns(source_prefix="coord:")` MUST return coord turn ids** (mailbox contract from AC4).

**AC2 — Role-typed deadline config (`coord-roles.json` + Python validator).**

Deadline tracking is policy. The split mirrors `reviewers.json` + `_reviewers.py` from 043:

- **New file `tools/review-queue/coord-roles.json`** declares per-role-per-event-type defaults. **`name` matches the reviewer slug exactly** (`codex`, `codex-ops`, `claude`, `cursor`) so wrapper identity and coord identity converge on one canonical entry (r1 codex F2 HIGH; r2 codex F1 HIGH; r2 codex-ops F1 HIGH convergent):
  ```json
  {
    "roles": [
      {
        "name": "codex",
        "headless": true,
        "invoke_command": ["codex", "exec", "-C", "{{WT}}", "--sandbox", "danger-full-access"],
        "events": {
          "reviewer_invoked": { "default_deadline_sec": 90,  "max_deadline_sec": 300,  "expects": "tick_start" },
          "tick_start":       { "default_deadline_sec": 600, "max_deadline_sec": 1200, "expects": "tick_end" },
          "scheduler_health": { "default_deadline_sec": 120, "max_deadline_sec": 300,  "expects": "scheduler_health_done" }
        }
      },
      {
        "name": "cursor",
        "headless": false,
        "events": { "tick_start": { ... }, ... }
      }
    ]
  }
  ```
  - `headless: true` is REQUIRED for roles auto-invokable by `coord_invoke` (which lives in 057b). IDE-mode roles (`cursor`) MUST have `headless: false` and MAY omit `invoke_command`. The schema if/then enforces this.
  - `invoke_command` is a **JSON array (argv vector), not a shell string** (r4 codex F2 HIGH — defense-in-depth against shell injection; 057b uses argv-spawn). Templated values are substituted as array elements.
- **JSON schema** at `tools/review-queue/schemas/coord-roles.schema.json` validates the static config shape (string/int/bool types, required fields per `headless` value via JSON Schema `if/then`).
- **TS daemon loader** at `src/coord/roles.ts` (r1 codex F4 MED + r2 codex F2 MED + r2 codex-ops F5 MED): a `loadCoordRoles()` function called ONCE from `startMcpServer()` initialization, BEFORE any tool registration. It (a) reads the config file at a **cwd-independent absolute path** (r2 codex-ops F5 MED) — resolution uses `new URL("../../tools/review-queue/coord-roles.json", import.meta.url)` (relative to the loader module's location), with an optional override via `ECHO_COORD_ROLES_PATH` env var for tests; the daemon never depends on `process.cwd()`. (b) Validates the parsed JSON against `tools/review-queue/schemas/coord-roles.schema.json` using **`ajv` (added to `package.json` dependencies as a direct runtime dep)** (r2 codex F2 MED — the repo currently has no JS JSON-Schema validator and AC2 must not silently assume one; `ajv` is the standard, lightweight, no-unstable-transitives choice. Use `ajv@^8` + `ajv-formats@^3`). (c) Enforces the cross-field constraint `max_deadline_sec > default_deadline_sec` per role per event in TypeScript (the constraint that JSON Schema draft-07 `if/then` cannot express). (d) Returns a frozen in-memory `CoordRolesConfig` consumed by `coord-emit.ts` / `coord-status.ts` / `src/coord/deadlines.ts`. On any validation failure (bad shape, missing required field, or `max_deadline_sec <= default_deadline_sec`) the loader throws; `startMcpServer()` propagates the throw, the daemon exits non-zero with a clear stderr diagnostic, and the operator sees a startup failure rather than a per-request error every 10 minutes. **Bad-config behavior is daemon-startup failure, not per-request failure** — the TypeScript daemon owns the runtime validation boundary.
- **Python sibling `tools/review-queue/_coord_roles.py`** is a CI/static-check helper (mirrors `_reviewers.py`'s role: pre-merge config validation, never on the daemon hot path). It re-implements the same validation rules for use by review-queue-side scripts and pre-commit-style checks; it is NOT loaded by the daemon at runtime. (Drift between the TS and Python validators is acceptable risk for V1; the daemon-side TS loader is authoritative for runtime behavior.)
- **Startup tests** in `tests/coord/coord-roles-validation.test.ts`: well-formed config loads via the TS loader; **bad-config (`max_deadline_sec <= default_deadline_sec`) causes daemon startup to fail** (test asserts on `startMcpServer()` throw, not on a subsequent `coord_emit` failure — closes r1 codex F4 MED); IDE-mode entry missing `invoke_command` accepted; headless entry missing `invoke_command` rejected at startup; **cwd-independent path resolution** (r2 codex-ops F5 MED): a test `chdir`s to `/` (outside the repo) before calling `startMcpServer()` and asserts the loader still finds `coord-roles.json` via the module-relative path.
- **`coord_emit` clamps caller-supplied `expected_by`** to the role's `max_deadline_sec`. If caller omits, daemon applies `default_deadline_sec`.
- **No reviewer role-specific code paths in the coord layer** — adding a new role is one JSON entry, mirroring 043's roster generalization.

**AC3 — Deadline tracker with reconstruction + two-tier keyspace + single mutation lane.**

In-memory tracker, durable via atom-log replay on daemon boot. The tracker is structured as a **single-actor serial mutation lane** (r1 codex F2 HIGH + r1 codex-ops F5 HIGH + r1 codex-ops F6 HIGH convergent) — every state-changing operation (event ingest's close-then-open transitions, heartbeat fires, boot reconstruction, periodic reconciliation) enqueues onto one ordered async queue. No two mutations execute concurrently. The lane is the single owner of the open-records-maps + idempotency cache. Read snapshots (e.g. for `coord_status()`) take a structural copy off the lane.

- **`src/coord/deadlines.ts`** maintains TWO in-memory maps of open records (r3 codex-ops F2 MED tier separation):
  - **Round-tier map** keyed by `(correlation_id, subject_role, event_type, expected_by)`
  - **Scheduler-tier map** keyed by `(tick_run_id, subject_role, event_type, expected_by)`
- **In-memory idempotency cache** (r1 codex F2 HIGH + r1 codex-ops F5 HIGH): a Set<string> of `coord.idempotency_key` values for `deadline_missed` atoms that have already fired in the current daemon process. The cache is the in-process authority for "this miss has already fired"; the durable atom log is the cross-restart authority (the cache is rebuilt from atoms during boot reconstruction). V1 does not evict from the cache.
- **Generic transition rule** (r2 codex F2 MED — must be explicit, not implicit): on EVERY incoming coord event `E`, the lane executes:
  1. Routes `E` to its tier map per registry classification (round vs scheduler).
  2. **Close phase:** for each open record `R` in that tier matching `(<tier-key>, subject_role)` AND whose configured `expects` value equals `E.event_type`, mark `R` as closed (in-memory delete; no `deadline_missed` will fire for it).
  3. **Open phase:** if `E.event_type` itself has a configured `expects` value in `coord-roles.json`, insert a new open record `(<tier-key>, subject_role, E.event_type, expected_by)` in the appropriate tier map.
  - Concretely (round-tier): `reviewer_invoked` arrives → no matching close → open phase inserts (expects `tick_start`); `tick_start` arrives → close finds + closes `reviewer_invoked` → open phase inserts (expects `tick_end`); `tick_end` arrives → close finds + closes `tick_start` → open phase finds no `expects` → no new record.
  - Scheduler-tier follows the same rule, keyed by `tick_run_id`.
- **Single `fireMissedDeadline(R)` path** (r1 codex F2 HIGH + r1 codex-ops F5 HIGH + r2 codex-ops F1 HIGH): the ONLY function in the daemon that appends `coord:deadline_missed` atoms. It runs on the serial lane and: (a) computes the tier-aware idempotency key for `R`; (b) checks the in-memory cache — **if the key is already present (e.g. reconstruction loaded it from a pre-existing `coord:deadline_missed` atom OR a previous heartbeat fired it), SKIP the append AND STILL REMOVE `R` from the open-records map (jump straight to step (e); the cache hit means the durable record already exists, so the open-map entry would be permanently stale otherwise — closes r2 codex-ops F1 HIGH)**; (c) otherwise, append ONE `coord:deadline_missed` atom through `src/storage/sqlite.ts`'s single-writer path; (d) insert the key into the cache; (e) **remove `R` from the open-records map (terminal lifecycle — no re-fire on next heartbeat, no stale open record in `coord_status()`)**. Because steps (a)–(e) are atomic on the lane, no two callers can race; because both branches end at (e), every code path through `fireMissedDeadline` is terminal for `R`. Restart-after-fired is safe: reconstruction's cache priming (step 1 of the boot task) plus the cache-hit-also-terminal invariant ensure the open record is removed on the first heartbeat after restart.
- **Background heartbeat (1-second tick)** enqueues a heartbeat task onto the lane. The task iterates the current open-records snapshot; for each `R` with `now > expected_by`, it calls `fireMissedDeadline(R)` (also on the lane). Multiple heartbeats cannot interleave (single lane); repeated heartbeats over the same overdue record fire exactly once total because step (e) removes the record.
- **Durable append-order storage seam** (r2 codex F1 HIGH + r2 codex-ops F6 MED convergent): both reconstruction and periodic reconciliation order events by **durable append sequence**, NOT by caller-supplied `emitted_at`. `emitted_at` is canonicalized but originates client-side and is vulnerable to clock skew or delayed delivery; using it as the replay ordering primitive lets out-of-order arrivals (e.g. `tick_start` with an earlier `emitted_at` than `reviewer_invoked`) corrupt the rebuilt open-record set. AC3 therefore extends the storage interface:
  - **New `Storage.iterateCoordAtomsByAppendOrder(opts: { sinceSeq?: number; untilSeq?: number; limit?: number })`** at `src/storage/interface.ts` — returns coord atoms in monotonic durable-append order, paginated. Implementations:
    - `SqliteStorage` uses the SQLite `rowid` (monotonic per insertion, durable across restart) as `sequence_id`. The query is `SELECT … FROM atoms WHERE source LIKE 'coord:%' AND rowid > ? AND rowid <= ? ORDER BY rowid LIMIT ?`. The single-writer constraint (`wiki/architecture/storage.md:119-127`) guarantees `rowid` reflects ingest order.
    - `MemoryStorage` (test/dev) uses a monotonic insertion counter — append assigns `_seq = ++counter`; iteration returns entries with `_seq` in `(sinceSeq, untilSeq]`.
  - **`Storage` returns `sequence_id`** as a field on each atom-iteration result so the daemon can record watermarks. (The existing `EventId` UUID stays unchanged for callers; `sequence_id` is an iteration-only artifact, not embedded in the atom itself.)
  - Parity test in `tests/storage/iterate-coord-by-append-order.test.ts` (NEW): same-timestamp coord atoms ingested in `[A, B, C]` order replay as `[A, B, C]` from both backends; range `(2, 4]` returns only `[B, C]` from a 5-atom backend; out-of-order `emitted_at` does NOT affect append-order iteration.
- **Reconstruction on daemon boot** runs as a single queued task on the lane BEFORE the MCP server accepts new `coord_emit` calls (a hard startup gate; r1 codex-ops F6 HIGH eliminates the concurrent-emit-during-boot race). It: (1) iterates coord atoms via `iterateCoordAtomsByAppendOrder({ sinceSeq: now - max-deadline-horizon-equivalent })` over the max-deadline horizon (24h V1; extend if any role's `max_deadline_sec > 86400`) — the time bound is converted to a `sinceSeq` value by binary search on the same iteration API; (2) populates the idempotency cache from any pre-existing `coord:deadline_missed` atoms encountered (so post-restart heartbeats do not double-fire across restart); (3) replays the close-then-open transition rule over the remaining atoms **in durable append order** (not `emitted_at` order — r2 codex-ops F6 MED); (4) records `last_full_replay_watermark = max(sequence_id)` of atoms consumed; (5) immediately calls `fireMissedDeadline` for any record still open AND past `expected_by` — fired records' open-map entries are removed by the cache-hit-also-terminal branch (r2 codex-ops F1 HIGH). Only after the task returns does `startMcpServer()` start accepting `coord_emit` requests.
- **Periodic reconciliation** (every 10 min) (r1 codex-ops F6 HIGH + r2 codex F1 HIGH): enqueues onto the same lane as a single task. It captures a **high-watermark `highSeq` = next `sequence_id` that live ingest WILL assign** (read off the storage seam at the moment the task acquires the lane), iterates `iterateCoordAtomsByAppendOrder({ sinceSeq: last_full_replay_watermark, untilSeq: highSeq })`, and replays the close-then-open rule on those atoms in durable append order (not `emitted_at` order — r2 codex-ops F6 MED). Because the task runs on the same serial lane as live ingest and heartbeat, it cannot race; because the scan stops at `highSeq`, atoms appended after the watermark (including `tick_end` events that closed records during the task wait) are processed in their normal ingest position behind the reconciliation task and cannot be "resurrected" by the replay. The task updates `last_full_replay_watermark = highSeq` on completion.
- **Idempotency key in metadata** (r1 codex F5 + codex-ops F3 MED convergent, original 057): tier-aware. Round-tier: `coord.idempotency_key = sha256(correlation_id + "|" + subject_role + "|" + event_type + "|deadline_missed")`. Scheduler-tier: `sha256(tick_run_id + "|" + subject_role + "|" + event_type + "|deadline_missed")`. Per-role-per-event-type so two reviewers sharing one round who both miss produce TWO distinct atoms.
- **Lookup mechanism**: the in-memory cache is the in-process source of truth; cache misses only happen at startup or before reconstruction completes (impossible — see startup gate above). The recent-`coord:deadline_missed`-atom scan during reconstruction is the cross-restart authority. Extending `src/storage/interface.ts:50-62` `metadata_match` to include `coord.idempotency_key` is V1.5+.
- **AC8 reconstruction fixtures** cover: overdue `reviewer_invoked`-no-`tick_start`; non-overdue closed `reviewer_invoked`-followed-by-`tick_start`; two-reviewer-same-correlation_id both miss (idempotency); restart-during-overdue-firing (no double-fire); **repeated 1-second heartbeats on the same overdue record fire exactly ONE atom AND record is gone from open map after the first fire** (r1 codex-ops F5 HIGH); **`tick_end` arrives during reconstruction → final open-records state has `tick_start` closed, no resurrection** (r1 codex-ops F6 HIGH); **heartbeat fires during periodic reconciliation task → exactly one atom appended, no duplicate, no skip** (r1 codex-ops F6 HIGH); **two distinct `subject_role` values under one `correlation_id` open and close independently — `codex` closing its `tick_start` does NOT close `codex-ops`'s open record** (r1 codex F1 HIGH); **restart-after-fired: pre-existing `coord:deadline_missed` atom + restart → reconstruction's cache priming + cache-hit-also-terminal branch → open record is removed on first heartbeat, no stale open in `coord_status()`, no duplicate atom appended** (r2 codex-ops F1 HIGH); **out-of-order `emitted_at` does NOT corrupt replay: atom append order is authoritative; `tick_start` appended-after-`reviewer_invoked` with `emitted_at < reviewer_invoked.emitted_at` still closes the invocation correctly** (r2 codex F1 HIGH + r2 codex-ops F6 MED).

**AC4 — `wait_for_new_turns` `source_prefix` widening + mailbox contract.**

- **Widen `wait_for_new_turns` with `source_prefix: string` optional input** (codex strategist substrate consult 2026-05-16 + r1 codex F3 MED). Current tool at `src/mcp/tools/wait-for-new-turns.ts:85-97,121-132,157-162,209-214,299-301` requires non-empty `sources[]` (source-app-mapped names + literal exact sources). AC4 widens the schema with an optional sibling `source_prefix: string` parameter. Subscribers can call `wait_for_new_turns(source_prefix="coord:")` (prefix-only) to receive ALL coord events from ANY role without enumerating role slugs.
- **One-of-required validation contract** (r1 codex F3 MED): **at least one of `sources[]` (non-empty) or `source_prefix` (non-empty) MUST be present**. The previous "MUST have non-empty `sources[]`" check loosens to this disjunction. Both absent OR both empty → structured MCP validation error.
- **Both-supplied = union semantics** (r1 codex F3 MED): when both `sources[]` and `source_prefix` are provided, the returned turn-id set is the UNION of turns matching either constraint (a turn whose source matches either filter qualifies). No deduplication beyond turn-id uniqueness is needed (turn ids are stable).
- **Backwards compatibility — byte-identical guarantee** (r1 codex F3 MED): any pre-AC4 caller invoking `wait_for_new_turns(sources=[...])` with no `source_prefix` parameter observes EXACTLY the same wire behavior (matching set, delivery latency, response format) as before. The widened validation rule still accepts every pre-AC4 input shape unchanged.
- **Mailbox contract** (codex Q4 MED reframe carried forward): durable event log is the primary contract — every coord event is appended to the ledger; any role can `search_memories(source_prefix="coord:<peer>", since=<watermark>)` at any time. Live long-poll via `wait_for_new_turns` is the latency optimization for connected subscribers (~100ms delivery on emission). Exited roles do NOT get events pushed — they learn on next invocation. **No push-to-stateless-roles claim.** No subscriber directory, no participant registry, no presence detection.

**AC5 — Identity (`X-Echo-Role` header) + schema versioning + single-writer.**

The MCP server at `src/mcp/server.ts:127-132` has host/DNS-rebinding protection. AC5 adds caller-identity:

- **Caller-identity → role mapping** at `src/coord/identity.ts`. For V1, accept identity via an HTTP header (`X-Echo-Role: <role>`) that the wrapper sets before invoking `coord_emit`. Server validates `<role>` is in `coord-roles.json`; rejects unknown roles. **The daemon DOES NOT trust caller-supplied `source` field** — `source = coord:<server-derived-role>`.
- **Required event fields** (already defined in AC1 per-tier): `schema_version`, `event_type`, `correlation_id`-or-`tick_run_id` (tier-keyed), `emitted_at`. Optional: `payload`, `expected_by`.
- **Schema-version registry** in `src/coord/types.ts`. Each event type carries a `schema_version`. Consumers that encounter an unknown `event_type` or `schema_version` MUST ignore (forward-compat).
- **Single-writer constraint** preserved: all coord writes go through `src/storage/sqlite.ts`'s existing write path (the same path capture events use). No parallel SQLite handle.
- **V1 emission is SCOPED TO WRAPPER PATHS (curl-style HTTP)** — native MCP clients do NOT emit in V1 because the existing MCP server doesn't expose request headers to tool handlers (r1 codex F4 MED). Cursor IDE-mode emission is deferred to V1.5+ along with the native-MCP identity path. Cursor's file-side review path stays unchanged.
- **`request.py` is NOT on the emission-path list** (carried from 057 r2-r4 cleanup). 057a does not modify `request.py`; the `correlation_id` field add lives in 057b alongside AC0 active-trigger.

**AC6 — Operator status surface (`coord_status` MCP + CLI).**

- **New MCP read tool `coord_status()`** at `src/mcp/tools/coord-status.ts`. Returns:
  - Open deadlines (per tier): `[{tier: "round"|"scheduler", subject_role, event_type, key, expected_by, age_sec}...]` where `key` is `correlation_id` for round-tier and `tick_run_id` for scheduler-tier.
  - **Recent missed deadlines** (r1 codex-ops F7 MED): last N `coord:deadline_missed` events over the `max(role.max_deadline_sec)` horizon (≥24h V1; widens automatically if any role's `max_deadline_sec` exceeds 24h). Each entry includes `subject_role`, `opened_event_type` (the event that opened the deadline — e.g. `reviewer_invoked`), `expected_event_type` (the event that should have closed it — e.g. `tick_start`), `key`, `missed_at`. Wide enough to surface overnight launchd reviewer failures the operator has not yet seen. List is bounded (V1: 200 most-recent entries; older entries drop off this list but remain visible via the per-role-last-miss list below).
  - **`coord:deadline_missed` atom payload contract** (r2 codex F3 MED): every `deadline_missed` atom carries BOTH `metadata.coord.opened_event_type` (the registry event type whose open record fired — e.g. `reviewer_invoked`) AND `metadata.coord.expected_event_type` (the registry's `expects` value for that opener — e.g. `tick_start`). This eliminates ambiguity about which key the operator surface uses (closes r2 codex F3 MED). The `event_type` field on the atom itself is the literal `"deadline_missed"`; `opened_event_type`/`expected_event_type` live in metadata.
  - **Per-role-per-event-type last miss** (r1 codex-ops F7 MED + r2 codex F3 MED — persistence-of-failure signal, key disambiguated): `[{subject_role, expected_event_type, last_missed_at, opened_event_type, key, age_sec}...]`. **The list is keyed by `(subject_role, expected_event_type)`** — i.e. the event the operator was waiting for. This list IGNORES the recent-window horizon: a `deadline_missed` atom older than 24h remains visible until a subsequent successful event with `event_type == expected_event_type` arrives for that `subject_role` (a successful `tick_start` from `codex` clears the `(codex, tick_start)` last-miss entry; a fresh `reviewer_invoked` does NOT clear it). The clearing rule is: on every incoming coord event `E`, the daemon checks the per-role-per-event-type-last-miss map for `(E.subject_role, E.event_type)` and removes the entry if present. Lets the founder check status in the morning and see "codex hasn't successfully sent `tick_start` since 3 days ago" without running a forensic search.
  - Per-role last-tick: `[{role, last_tick_start, last_tick_end, last_tick_duration_sec, last_scheduler_health, last_scheduler_health_done}...]`.
  - Daemon uptime + last reconstruction timestamp.
- **CLI sibling `tools/coord-status.sh`** for non-MCP operator inspection (curl + jq against the daemon HTTP surface). Founder can run from any terminal without opening Claude Code.
- Both surfaces are **read-only** — no mutate operations exposed via observability tools.

**AC7 (carried-forward NO-OP in 057a — production event emission is 057b's scope).**

057a's runtime ships with NO wrappers or skills modified to emit coord events. Existing reviewers (codex, codex-ops, cursor) continue to operate exactly as they do today; their behavior is byte-identical pre/post-057a deploy. The substrate is dormant in production until 057b lands and activates emission.

**AC8 — Falsifiable substrate tests (synthetic-emitter only).**

All 057a tests use the MCP `coord_emit` tool directly to inject synthetic atoms; no wrapper changes needed. Test inventory (each test is merge-blocking):

- `tests/coord/append-seam.test.ts` — `coord_emit` validates schema/identity/tier-discriminated input; unknown event_type rejected; unknown schema_version rejected; cross-tier fields rejected; timestamps canonicalized; metadata.surface="coord" set; storage path single-writer; **`subject_role` required and validated** (r1 codex F1 HIGH).
- `tests/coord/identity-spoof-rejection.test.ts` — caller-supplied `source` ignored; X-Echo-Role spoof of unknown role rejected; missing X-Echo-Role rejected; **self-attestation event with `subject_role != emitter_role` rejected; invocation event with `subject_role != emitter_role` accepted when `subject_role` is in `coord-roles.json`** (r1 codex F1 HIGH).
- `tests/coord/non-pollution-three-way.test.ts` — `search_memories()` returns 0 coord atoms; `search_memories(source_prefix="coord:")` returns N coord atoms; `wait_for_new_turns(source_prefix="coord:")` returns N coord turn ids. **All three must pass simultaneously.**
- `tests/coord/wait-for-new-turns-source-prefix.test.ts` (NEW r1 codex F3 MED) — (a) prefix-only call valid and returns expected coord turns; (b) both `sources[]` and `source_prefix` supplied → union returned; (c) both absent / both empty → structured validation error; (d) **snapshot match: pre-AC4 baseline `sources=[...]`-only call returns byte-identical results post-AC4** (legacy callers unchanged).
- `tests/coord/coord-emit-per-tier-input.test.ts` — round-tier emit with correlation_id succeeds; scheduler-tier emit with tick_run_id succeeds; cross-tier rejected.
- `tests/coord/coord-roles-validation.test.ts` (revised, r1 codex F4 MED) — well-formed config loads via the TS daemon loader at `src/coord/roles.ts`; **bad-config (`max_deadline_sec <= default_deadline_sec`) causes `startMcpServer()` to throw and the daemon to exit non-zero at startup, NOT at a subsequent `coord_emit` request**; IDE-mode entry missing `invoke_command` accepted; headless entry missing `invoke_command` rejected at startup.
- `tests/coord/deadlines-reconstruction.test.ts` — daemon boot scans + replays close-then-open; overdue records fire `deadline_missed`; idempotency on restart-during-firing; **startup gate: MCP server does NOT accept `coord_emit` calls until reconstruction completes** (r1 codex-ops F6 HIGH).
- `tests/coord/deadlines-fire-once-and-remove.test.ts` (NEW r1 codex-ops F5 HIGH) — heartbeat fires `deadline_missed` for an overdue record; **subsequent heartbeats over 10 s find no record in the open map and append no further atoms**; `coord_status()` does NOT show the fired record as still open.
- `tests/coord/deadlines-reconstruction-concurrency.test.ts` (NEW r1 codex-ops F6 HIGH + r1 codex F2 HIGH) — (a) `tick_end` enqueued during a running reconstruction task → after both complete, the `tick_start` record is closed and is NOT resurrected by the watermarked replay; (b) heartbeat task and periodic-reconciliation task both queued against the same overdue record → exactly one `deadline_missed` atom appended (no duplicate from race; no skip).
- `tests/coord/subject-role-multi-under-one-correlation.test.ts` (NEW r1 codex F1 HIGH) — two `subject_role` values (`codex`, `codex-ops`) open `tick_start` records under one shared `correlation_id`; `codex` emits its `tick_start` → only codex's record closes; codex-ops's record remains open and (if overdue) fires its own `deadline_missed` independently.
- `tests/coord/idempotency-per-role.test.ts` — two roles same correlation_id, both miss → 2 distinct `deadline_missed` atoms.
- `tests/coord/scheduler-vs-round-tier-keyspace.test.ts` — concurrent open records in both tiers for one wrapper don't collide; close-then-open in one tier doesn't affect the other.
- `tests/coord/coord-status-shape.test.ts` (extended, r1 codex-ops F7 MED) — output schema validates; per-role last-tick aggregation correct; tier-aware reporting; **recent-missed list uses `max(role.max_deadline_sec)` horizon (≥24h)**; **per-role-per-event-type last-miss entry remains visible when the underlying `deadline_missed` atom is older than 24h** (synthesize a 48h-old miss atom; assert it appears in the persistence-of-failure list but NOT in the recent-missed list).

**AC9 — Builder pointer per 046 AC1 + 047 AC3.**

Standard `backlog/task-state/<id>/builder.md` schema use. No CAS; single-owner invariant.

## Out of Scope (Don't Drift)

- **NO `coord_invoke` MCP tool.** 057b ships that.
- **NO `_run_reviewer.sh` edits.** 057a leaves wrapper emission untouched.
- **NO `request.py` edits.** No `correlation_id` field added in 057a (lives in 057b).
- **NO skill-side post-push hooks** in `review-queue-watch.md`/`review-pending.md`/`merge-and-cleanup.md`. 057b adds those.
- **NO cross-machine support.** V1 local-loopback only.
- **NO active-coordinator policy.** Layer is observe + report only.
- **NO cursor IDE-mode emission.** Deferred to V1.5+.
- **NO new write surface for capture events.** Capture pipeline at `src/capture/gate.ts` stays unchanged.

## After Completion (Strategist Notes)

Post-merge wiki promotion:

- **Update `wiki/operating-model/review-queue-protocol.md`** to add a "Coord substrate" subsection — same diagram, new horizontal lane showing the daemon's `coord_emit` write path + `wait_for_new_turns(source_prefix="coord:")` read path + `coord_status()` operator surface. Mark the wrapper-side emission as "057b — not yet active."
- **New page `wiki/architecture/coord-layer.md`** — substrate design (event taxonomy registry, tier classification, deadline tracker mechanics, identity model, mailbox-vs-push contract, operator status surface). Topic: Architecture. Subtopic: Coordination Layer.
- **Update `wiki/architecture/group-session.md`** to reference `echo:coord` events as a sibling well-known surface.
- **Update memory `project_friction_first_prioritization.md`** to record that 057 was decomposed into 057a + 057b on 2026-05-16 after r5 plateau; subsequent specs should consider decomposition earlier when the decay shape signals asymptotic convergence.
- **Update `_followups.md` HIGH #1 launchd silent-fail entry** — mark as ADDRESSED IN PRINCIPLE by 057a's deadline-missed coverage (deferred to 057b for full closure since 057a alone doesn't emit events to track).
- **Once 057b lands:** the combined 057a+057b acceptance is the falsifiable end-to-end test of today's `launchd silent-fail` incident.

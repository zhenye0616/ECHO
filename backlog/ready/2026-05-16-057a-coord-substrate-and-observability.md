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
  - tools/review-queue/_coord_roles.py             # cross-field max_deadline_sec > default_deadline_sec validator (r1 codex F3 MED — JSON Schema draft-07 can't express cross-field)
  # AC3 — deadline tracker + boot reconstruction (round-tier + scheduler-tier separate maps)
  - src/coord/deadlines.ts                         # in-memory two-tier tracker + reconstruction from atom log replay; generic close-then-open transition rule (r2 codex F2 MED + r3 codex-ops F2 MED)
  - src/daemon/index.ts                            # wire deadlines.reconstruct() into daemon boot
  # AC6 — operator status surface
  - src/mcp/tools/coord-status.ts                  # new MCP read tool: open deadlines (per tier), recent missed, role last-tick, daemon uptime
  - tools/coord-status.sh                          # CLI sibling — curl + jq against the daemon for non-MCP operator inspection
  # AC8 — substrate tests (synthetic-emitter only; 057b adds production-emission tests)
  - tests/coord/append-seam.test.ts                # coord_emit validates schema + identity + canonicalizes timestamp + bypasses normalizer/trace (r1 codex Q1 HIGH)
  - tests/coord/identity-spoof-rejection.test.ts   # caller-supplied source ignored; X-Echo-Role spoof rejected; unknown role rejected (r1 codex Q5 HIGH)
  - tests/coord/non-pollution-three-way.test.ts    # search_memories() excludes coord; search_memories(source_prefix=coord:) returns coord; wait_for_new_turns(source_prefix=coord:) returns coord (r1 codex F6 MED)
  - tests/coord/coord-emit-per-tier-input.test.ts  # round-tier requires correlation_id; scheduler-tier requires tick_run_id; cross-tier rejected (r4 codex F1 MED)
  - tests/coord/coord-roles-validation.test.ts     # bad-config rejection: max_deadline_sec <= default_deadline_sec; loader rejects (r1 codex F3 MED)
  - tests/coord/deadlines-reconstruction.test.ts   # daemon boot scans recent coord atoms, replays close-then-open, fires missed atoms for overdue records (r1 codex Q3 HIGH + r2 codex F2 MED)
  - tests/coord/idempotency-per-role.test.ts       # two reviewers same correlation_id, both miss → 2 distinct deadline_missed atoms (per-role-per-event-type key) (r1 codex F5 + codex-ops F3 MED)
  - tests/coord/scheduler-vs-round-tier-keyspace.test.ts  # round-tier (correlation_id) and scheduler-tier (tick_run_id) maps don't collide; concurrent open records for one wrapper (r3 codex-ops F2 MED)
  - tests/coord/coord-status-shape.test.ts         # coord_status() output schema; per-role last-tick aggregation; tier-aware reporting
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
  - **Common required fields** for all tiers: `event_type` (registry-known), `emitted_at` (ISO-Z; daemon canonicalizes), `schema_version` (int from registry).
  - The tier classification lives in the registry at `src/coord/types.ts`. Adding a new event type means one registry entry; the validator + tracker + status display all derive behavior from the registry.
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
- **JSON schema** at `tools/review-queue/schemas/coord-roles.schema.json` validates the static config shape (string/int/bool types, required fields per `headless` value via JSON Schema `if/then`). **Cross-field constraints move to Python** (r1 codex F3 MED): the `max_deadline_sec > default_deadline_sec` check lives in `tools/review-queue/_coord_roles.py` (sibling of `_reviewers.py`), called by `coord-emit.ts`/`coord-status.ts` at daemon startup. The loader rejects `max_deadline_sec <= default_deadline_sec` with a clear error; startup-fixture in `tests/coord/coord-roles-validation.test.ts` asserts the bad-config case is rejected.
- **`coord_emit` clamps caller-supplied `expected_by`** to the role's `max_deadline_sec`. If caller omits, daemon applies `default_deadline_sec`.
- **No reviewer role-specific code paths in the coord layer** — adding a new role is one JSON entry, mirroring 043's roster generalization.

**AC3 — Deadline tracker with reconstruction + two-tier keyspace.**

In-memory tracker, durable via atom-log replay on daemon boot:

- **`src/coord/deadlines.ts`** maintains TWO in-memory maps of open records (r3 codex-ops F2 MED tier separation):
  - **Round-tier map** keyed by `(correlation_id, subject_role, event_type, expected_by)`
  - **Scheduler-tier map** keyed by `(tick_run_id, subject_role, event_type, expected_by)`
- **Generic transition rule** (r2 codex F2 MED — must be explicit, not implicit): on EVERY incoming coord event `E`, the tracker:
  1. Routes `E` to its tier map per registry classification (round vs scheduler).
  2. **Close phase:** for each open record `R` in that tier matching `(<tier-key>, subject_role)` AND whose configured `expects` value equals `E.event_type`, mark `R` as closed (in-memory delete; no `deadline_missed` will fire for it).
  3. **Open phase:** if `E.event_type` itself has a configured `expects` value in `coord-roles.json`, insert a new open record `(<tier-key>, subject_role, E.event_type, expected_by)` in the appropriate tier map.
  - Concretely (round-tier): `reviewer_invoked` arrives → no matching close → open phase inserts (expects `tick_start`); `tick_start` arrives → close finds + closes `reviewer_invoked` → open phase inserts (expects `tick_end`); `tick_end` arrives → close finds + closes `tick_start` → open phase finds no `expects` → no new record.
  - Scheduler-tier follows the same rule, keyed by `tick_run_id`.
- **A background heartbeat (1-second tick)** fires `deadline_missed` events when `now > expected_by` AND no matching close has occurred. The emitted event uses the tier-appropriate key (`correlation_id` for round-tier; `tick_run_id` for scheduler-tier).
- **Reconstruction on daemon boot:** scan recent `coord:*` atoms over the max-deadline horizon (24h V1; extend if any role's `max_deadline_sec > 86400`). Replay the generic transition rule (close-then-open) over atoms in `emitted_at` order to rebuild the open-record set. Suppress any record with a matching completion atom OR an existing `coord:deadline_missed` atom with the matching idempotency key. Immediately fire `deadline_missed` events for any record still open AND past `expected_by`.
- **Idempotency key in metadata** (r1 codex F5 + codex-ops F3 MED convergent): tier-aware. Round-tier: `coord.idempotency_key = sha256(correlation_id + "|" + subject_role + "|" + event_type + "|deadline_missed")`. Scheduler-tier: `sha256(tick_run_id + "|" + subject_role + "|" + event_type + "|deadline_missed")`. Per-role-per-event-type so two reviewers sharing one round who both miss produce TWO distinct atoms.
- **Lookup mechanism**: since `src/storage/interface.ts:50-62` `metadata_match` whitelist cannot query a nested `coord.idempotency_key` directly, the daemon scans recent `coord:deadline_missed` atoms over the max-deadline horizon at append-time (small set; in-memory side-cache OK for V1). Extending `metadata_match` to include the key is V1.5+.
- **Periodic reconciliation:** every 10 minutes the tracker re-runs reconstruction to catch drift (defensive).
- AC8 reconstruction fixtures cover: overdue `reviewer_invoked`-no-`tick_start`; non-overdue closed `reviewer_invoked`-followed-by-`tick_start`; two-reviewer-same-correlation_id both miss (idempotency); restart-during-overdue-firing (no double-fire).

**AC4 — `wait_for_new_turns` `source_prefix` widening + mailbox contract.**

- **Widen `wait_for_new_turns` with `source_prefix: string` optional input** (codex strategist substrate consult 2026-05-16 + r1 codex F6 MED). Current tool at `src/mcp/tools/wait-for-new-turns.ts:121-132,157-162` accepts `sources[]` (source-app-mapped names + literal exact sources) but NOT a prefix. AC4 adds an optional `source_prefix` sibling parameter. Subscribers can call `wait_for_new_turns(source_prefix="coord:")` to receive ALL coord events from ANY role without enumerating role slugs.
- **Backwards compatibility:** existing callers with `sources[]` see no behavior change; the new parameter is optional and additive.
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
  - Recent missed deadlines: last N `coord:deadline_missed` events in last 1h.
  - Per-role last-tick: `[{role, last_tick_start, last_tick_end, last_tick_duration_sec, last_scheduler_health, last_scheduler_health_done}...]`.
  - Daemon uptime + last reconstruction timestamp.
- **CLI sibling `tools/coord-status.sh`** for non-MCP operator inspection (curl + jq against the daemon HTTP surface). Founder can run from any terminal without opening Claude Code.
- Both surfaces are **read-only** — no mutate operations exposed via observability tools.

**AC7 (carried-forward NO-OP in 057a — production event emission is 057b's scope).**

057a's runtime ships with NO wrappers or skills modified to emit coord events. Existing reviewers (codex, codex-ops, cursor) continue to operate exactly as they do today; their behavior is byte-identical pre/post-057a deploy. The substrate is dormant in production until 057b lands and activates emission.

**AC8 — Falsifiable substrate tests (synthetic-emitter only).**

All 057a tests use the MCP `coord_emit` tool directly to inject synthetic atoms; no wrapper changes needed. Test inventory (each test is merge-blocking):

- `tests/coord/append-seam.test.ts` — `coord_emit` validates schema/identity/tier-discriminated input; unknown event_type rejected; unknown schema_version rejected; cross-tier fields rejected; timestamps canonicalized; metadata.surface="coord" set; storage path single-writer.
- `tests/coord/identity-spoof-rejection.test.ts` — caller-supplied `source` ignored; X-Echo-Role spoof of unknown role rejected; missing X-Echo-Role rejected.
- `tests/coord/non-pollution-three-way.test.ts` — `search_memories()` returns 0 coord atoms; `search_memories(source_prefix="coord:")` returns N coord atoms; `wait_for_new_turns(source_prefix="coord:")` returns N coord turn ids. **All three must pass simultaneously.**
- `tests/coord/coord-emit-per-tier-input.test.ts` — round-tier emit with correlation_id succeeds; scheduler-tier emit with tick_run_id succeeds; cross-tier rejected.
- `tests/coord/coord-roles-validation.test.ts` — well-formed config loads; bad-config (`max_deadline_sec <= default_deadline_sec`) rejected at startup; IDE-mode entry missing `invoke_command` accepted; headless entry missing `invoke_command` rejected.
- `tests/coord/deadlines-reconstruction.test.ts` — daemon boot scans + replays close-then-open; overdue records fire `deadline_missed`; idempotency on restart-during-firing.
- `tests/coord/idempotency-per-role.test.ts` — two roles same correlation_id, both miss → 2 distinct `deadline_missed` atoms.
- `tests/coord/scheduler-vs-round-tier-keyspace.test.ts` — concurrent open records in both tiers for one wrapper don't collide; close-then-open in one tier doesn't affect the other.
- `tests/coord/coord-status-shape.test.ts` — output schema validates; per-role last-tick aggregation correct; tier-aware reporting.

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

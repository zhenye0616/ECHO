---
status: shipped
topic: Architecture
subtopic: Coordination Layer
aliases:
  - 057a
  - Coord substrate
  - Coord observability
  - coord_emit
  - coord_status
  - Deadline tracker
---

# Coord Substrate + Observability (057a)

The daemon-side **substrate** half of the [[coord-layer]]: the narrow `coord_emit` append seam, the role-typed deadline tracker with boot reconstruction, the identity model with schema versioning, and the `coord_status()` operator surface. Specced and shipped as item 057a (2026-05-16); the sibling [[coord-active-trigger-and-role-emission|057b]] activates production emission against this substrate. Read [[coord-layer]] first for the layer's purpose, four locked design decisions, decomposition rationale, and shared contract; this page documents the substrate's implementation.

**Ships dormant.** 057a's runtime adds NO wrappers or skills that emit coord events. Existing reviewers (codex, codex-ops, cursor) behave byte-identically pre/post-merge. The substrate is verified end-to-end via synthetic atoms emitted through the `coord_emit` MCP tool directly; no wrapper changes are needed to falsify the substrate.

## The Narrow Append Seam

The [[capture-gate|capture-gate]] at `src/capture/gate.ts:57-72` rejects unknown source schemes — that contract is load-bearing for the capture surface and stays unchanged. Coord events take a separate, **daemon-owned** path:

1. The caller invokes `coord_emit(event_type, payload, ...)` over loopback HTTP with an `X-Echo-Role: <role>` header.
2. The MCP server derives `source = coord:<role>` from the header. **The caller does not supply `source`** — any caller-supplied `source` field is silently ignored (identity-spoof rejection). Unknown roles are rejected.
3. The server validates the per-tier input shape, the registry-known `event_type`, the registry-known `schema_version`, and the `subject_role` rule for that event (self-attestation vs invocation; see below).
4. `emitted_at` is canonicalized to UTC-Z using the same logic as `src/capture/pipeline.ts:17-44` ([[timestamp-canonicalization]]); `metadata.surface = "coord"` and `metadata.session_id = "echo:coord"` are stamped.
5. The atom is appended through `src/storage/sqlite.ts`'s **existing single-writer path** — no parallel SQLite handle, preserving the [[storage|single-writer invariant]].

### Per-tier discriminated input

| Tier | Key | Event types |
|---|---|---|
| **Round** | `correlation_id` (uuid4) | `reviewer_invoked`, `tick_start`, `tick_end`, `tick_failed_to_bind` |
| **Scheduler** | `tick_run_id` (uuid4) | `scheduler_health`, `scheduler_health_done` |
| **Daemon-emitted** | inherits from open record's tier | `deadline_missed` (written by `fireMissedDeadline` only) |

Round-tier events MUST supply `correlation_id` and MUST NOT supply `tick_run_id`; scheduler-tier is the mirror. Cross-tier fields are rejected with a structured MCP error. Tier classification is declared once in the event-type registry at `src/coord/types.ts`; the validator, tracker, and status surfaces all derive behavior from that single registry entry.

### `subject_role` semantics

Every coord event names a `subject_role` — the role whose SLA the event pertains to. The registry declares per event type whether the rule is **self-attestation** (`subject_role == emitter_role`; e.g. `tick_start`, `tick_end`, `scheduler_health`, `scheduler_health_done`) or **invocation** (the orchestrator opens a deadline for a target reviewer; e.g. `reviewer_invoked` where `claude-strategist` emits on behalf of `codex`). Daemon-emitted `deadline_missed` atoms carry the original record's `subject_role`. Unknown roles are rejected at append time.

## Role-Typed Deadline Config

The split mirrors `reviewers.json` + `_reviewers.py` from item 043's [[per-round-reviewer-roster|per-round reviewer roster]]:

- **`tools/review-queue/coord-roles.json`** — per-role-per-event-type SLA defaults. `name` matches the reviewer slug exactly (`codex`, `codex-ops`, `claude`, `cursor`) so wrapper identity and coord identity converge on one canonical entry.
- **`tools/review-queue/schemas/coord-roles.schema.json`** — JSON Schema (draft-07) validating shape, types, required fields, and the `headless` if/then constraint (headless roles MUST carry `invoke_command` as a JSON argv array; IDE-mode roles MAY omit it).
- **`src/coord/roles.ts`** — TypeScript daemon-side loader called once from `startMcpServer()` initialization, BEFORE any tool registration. Reads the config via a **cwd-independent path** (`new URL("../../tools/review-queue/coord-roles.json", import.meta.url)`; override via `ECHO_COORD_ROLES_PATH` for tests), validates with `ajv@^8` + `ajv-formats@^3`, enforces the cross-field constraint `max_deadline_sec > default_deadline_sec` (which JSON Schema cannot express), and returns a frozen `CoordRolesConfig` consumed by the emit/status/deadlines surfaces.
- **`tools/review-queue/_coord_roles.py`** — Python sibling for CI/static-check use only. **Not loaded by the daemon at runtime.** Drift between the two validators is acceptable risk for V1; the TypeScript loader is authoritative.

### Bad config = daemon startup failure

A misconfigured `coord-roles.json` (bad shape, missing required field, or `max_deadline_sec <= default_deadline_sec`) causes `startMcpServer()` to throw at boot; the daemon exits non-zero with a clear stderr diagnostic. The operator sees a startup failure rather than every `coord_emit` call failing on every 10-minute scheduler tick — bad-config behavior is a **daemon-startup** failure mode, not a per-request one.

### Clamping

`coord_emit` clamps caller-supplied `expected_by` to the role's `max_deadline_sec`. If the caller omits `expected_by`, the daemon applies `default_deadline_sec`. There is no role-specific code path in the coord layer — adding a new role is one JSON entry.

## The Deadline Tracker

`src/coord/deadlines.ts` maintains TWO in-memory maps of open records:

- **Round-tier map** keyed by `(correlation_id, subject_role, event_type, expected_by)`
- **Scheduler-tier map** keyed by `(tick_run_id, subject_role, event_type, expected_by)`

The tracker is a **single-actor serial mutation lane**: every state-changing operation (event ingest's close-then-open transitions, heartbeat fires, boot reconstruction, periodic reconciliation) enqueues onto one ordered async queue. No two mutations run concurrently. The lane owns the open-records maps and the in-memory idempotency cache. Read snapshots for `coord_status()` take a structural copy off the lane.

### Generic close-then-open transition rule

On every incoming coord event `E`, the lane runs:

1. **Route** `E` to its tier map per registry classification.
2. **Close phase** — for each open record `R` in that tier matching `(<tier-key>, subject_role)` whose configured `expects` value equals `E.event_type`, mark `R` closed (in-memory delete; no `deadline_missed` will fire).
3. **Open phase** — if `E.event_type` itself has a configured `expects` value in `coord-roles.json`, insert a new open record `(<tier-key>, subject_role, E.event_type, expected_by)`.

Round-tier walkthrough: `reviewer_invoked` arrives → no matching close → open phase inserts (expects `tick_start`); `tick_start` arrives → close finds + closes `reviewer_invoked` → open phase inserts (expects `tick_end`); `tick_end` arrives → close finds + closes `tick_start` → open phase finds no `expects` → no new record. Scheduler-tier follows the same rule, keyed by `tick_run_id`.

### Single `fireMissedDeadline(R)` path

`fireMissedDeadline` is the **only** function in the daemon that appends `coord:deadline_missed` atoms. It runs on the serial lane and:

1. Computes the tier-aware idempotency key for `R` (round-tier: `sha256(correlation_id + "|" + subject_role + "|" + event_type + "|deadline_missed")`; scheduler-tier substitutes `tick_run_id`).
2. Checks the in-memory cache. **If the key is present** — reconstruction loaded it from a pre-existing atom, or a previous heartbeat fired it — **skip the append AND still remove `R` from the open-records map** (cache-hit-also-terminal branch). Without this, a restart-after-fired would leave a permanently stale open record.
3. Otherwise, append ONE `coord:deadline_missed` atom through the single-writer path.
4. Insert the key into the cache.
5. **Remove `R` from the open-records map** (terminal lifecycle — no re-fire on next heartbeat, no stale entry in `coord_status()`).

A 1-second background heartbeat enqueues a task that iterates the open-records snapshot and calls `fireMissedDeadline(R)` for each `R` with `now > expected_by`. Because the heartbeat runs on the same lane and step (5) removes the record, **repeated heartbeats over the same overdue record fire exactly once**.

### Per-role-per-event-type idempotency

The idempotency key is **per-role-per-event-type**, not per-correlation-id. Two reviewers (e.g. `codex` + `codex-ops`) sharing one `correlation_id` who both miss produce **TWO distinct `deadline_missed` atoms** — each role's miss is independently visible and clearable.

## Durable Append-Order Replay

Reconstruction and periodic reconciliation order events by **durable append sequence**, NOT by caller-supplied `emitted_at`. `emitted_at` is canonicalized but originates client-side and is vulnerable to clock skew or delayed delivery. The r3 design attempted a 24h `emitted_at`-bounded boot replay; reviewer cycle r4 showed the combination is unsafe (a late-appended atom carrying an older `emitted_at` would be skipped, producing a false-clean `coord_status()` instead of a `deadline_missed`).

V1 drops the time-horizon optimization in favor of **full ledger replay at boot**. The substrate atom volume is small enough (substrate is dormant until 057b activates emission; expected post-057b volume is ~3k coord atoms/day, ~100k after ~34 days) that full-scan-in-milliseconds is well within SQLite's capability.

Two storage methods at `src/storage/interface.ts` expose the seam:

1. **`iterateCoordAtomsByAppendOrder({ sinceSeq?, limit? })`** — returns coord atoms in monotonic durable-append order, paginated. Half-open `[sinceSeq, +∞)`. Each yielded record carries its `sequence_id`.
2. **`getCurrentCoordSequence(): number`** — returns `max(rowid)` over all currently-durable coord atoms (`0` if empty). Used by reconciliation to capture an inclusive watermark.

**SqliteStorage** uses the SQLite `rowid` (monotonic per insertion, durable across restart) as `sequence_id`:

```sql
SELECT rowid AS sequence_id, * FROM events
WHERE source LIKE 'coord:%' AND rowid >= ?
ORDER BY rowid LIMIT ?
```

**MemoryStorage** uses a monotonic insertion counter `_seq`. Both backends are parity-tested in `tests/storage/iterate-coord-by-append-order.test.ts`. The single-writer constraint guarantees `rowid` reflects ingest order.

### Boot reconstruction algorithm (hard startup gate)

Reconstruction is a single queued task on the lane that runs BEFORE the MCP server accepts `coord_emit` calls — a **hard startup gate** that eliminates the concurrent-emit-during-boot race:

1. `highSeq = getCurrentCoordSequence()` — snapshot the ledger end.
2. Iterate `iterateCoordAtomsByAppendOrder({ sinceSeq: 1 })` in pages, processing only atoms with `sequence_id <= highSeq`.
3. Prime the idempotency cache from any `coord:deadline_missed` atoms encountered (prevents post-restart double-fire).
4. Replay the close-then-open transition rule over the remaining atoms in durable append order.
5. Record `last_full_replay_watermark = highSeq` for periodic reconciliation.
6. Immediately call `fireMissedDeadline` for any record still open AND past `expected_by`. Fired records' open-map entries are removed by the cache-hit-also-terminal branch.

Only after the task returns does `startMcpServer()` start accepting `coord_emit` requests.

### Periodic reconciliation (every 10 min)

Enqueues onto the same lane as a single task:

1. `highSeq = getCurrentCoordSequence()` at the moment the task acquires the lane.
2. Iterate `iterateCoordAtomsByAppendOrder({ sinceSeq: last_full_replay_watermark + 1 })` in pages, processing only atoms with `sequence_id <= highSeq`.
3. Replay the close-then-open rule in durable append order.
4. Set `last_full_replay_watermark = highSeq` on completion.

Because the task runs on the same serial lane as live ingest and heartbeat, it cannot race. Because the scan stops at `highSeq` and the next pass uses `last_full_replay_watermark + 1`, the watermark boundary is half-open on the next side and inclusive on this side — no atom is skipped, no atom is processed twice.

## Identity Model

The MCP server at `src/mcp/server.ts:127-132` already has host/DNS-rebinding protection. The substrate layers caller-identity on top:

- **`X-Echo-Role: <role>` HTTP header** — the wrapper sets this before invoking `coord_emit`. The server validates `<role>` is in `coord-roles.json`; unknown roles are rejected. `source = coord:<server-derived-role>`; caller-supplied `source` is ignored.
- **Schema-version registry** at `src/coord/types.ts` — each event type carries a `schema_version`. Consumers that encounter an unknown `event_type` or `schema_version` MUST ignore (forward-compat).
- **V1 emission is wrapper-only (curl-style HTTP).** Native MCP clients do NOT emit in V1 because the existing MCP server doesn't expose request headers to tool handlers. Cursor IDE-mode emission is deferred to V1.5+.

## Non-Pollution Invariants

Coord atoms live in the same ledger but must not contaminate retrieval queries that aren't about coordination. The substrate enforces four invariants:

1. **No normalizer adapter** is registered in `src/normalize/dispatch.ts` for `coord:*` sources — coord atoms bypass normalization, embedding, and clustering.
2. **No trace edges** are generated from coord atoms.
3. [[mcp-search-memories|`search_memories()`]] with no filter **does not** return coord atoms (dedicated filter at `src/mcp/tools/search-memories.ts`; NOT in the shared `withFsExclusion` helper, which is reused by `wait_for_new_turns` and would otherwise break the mailbox contract).
4. [[mcp-search-memories|`search_memories(source_prefix="coord:")`]] **does** return them (forensic retrieval).

The fourth invariant pairs with the AC4 widening of [[mcp-wait-for-new-turns|`wait_for_new_turns`]]: `wait_for_new_turns(source_prefix="coord:")` MUST return coord turn ids. The previous "MUST have non-empty `sources[]`" check loosens to "**at least one of `sources[]` (non-empty) or `source_prefix` (non-empty) MUST be present**"; both supplied returns the union; pre-AC4 callers observe byte-identical behavior. This is the **mailbox contract** — the durable atom log is the primary surface; live long-poll is the latency optimization for connected subscribers (~100ms). Exited roles do not get events pushed; they learn on next invocation via `search_memories`.

## Operator Status Surface

`coord_status()` is the read-only MCP tool that gives the operator a complete picture without forensic search. The CLI sibling `tools/coord-status.sh` is `curl` + `jq` against the daemon HTTP surface — the founder can run it from any terminal without opening Claude Code. The response includes:

- **Open deadlines** (per tier): `{tier, subject_role, event_type, key, expected_by, age_sec}`.
- **Recent missed deadlines** — last 200 `coord:deadline_missed` events over a `max(role.max_deadline_sec)` horizon (≥24h). Each carries `opened_event_type` AND `expected_event_type` in `metadata.coord` to eliminate ambiguity about which key the operator surface is keyed on.
- **Per-role-per-event-type last miss** — the persistence-of-failure signal. Keyed by `(subject_role, expected_event_type)` (the event the operator was waiting for). **Fully durable across daemon restart**, derived entirely from the coord atom log + `coord-roles.json` slot universe — no in-memory `last_miss_clear_watermark` map.
- **Per-role last-tick** aggregation.
- **Daemon uptime + last reconstruction timestamp.**

### Slot universe is deterministic from `coord-roles.json`

The set of last-miss slots is `{ (role.name, event.expects) : for role in coord-roles.json["roles"], for event in role["events"], where event["expects"] is set }`. The `expects` field lives ONLY in `coord-roles.json` — the AC1 type registry at `src/coord/types.ts` carries tier classification and subject-role policy but NOT `expects` values. The deadline tracker's close/open/reconstruction and the status surface's slot-universe construction therefore read from the **same source** — no two-sources-of-truth hazard. The slot universe is recomputed at startup from `loadCoordRoles()`; zero in-memory persistence is required.

### On-demand rehydration

Per call, `coord_status()` iterates `iterateCoordAtomsByAppendOrder({ sinceSeq: 1 })` once, building per-slot `last_miss` (highest-`sequence_id` matching `deadline_missed` atom) and per-slot `last_close` (highest-`sequence_id` successful event whose `event_type == slot.expected_event_type AND subject_role == slot.subject_role`). For each slot: if `last_miss` exists AND (`last_close` is null OR `last_close.sequence_id < last_miss.sequence_id`), the slot is uncleared and appears in the response. The durable atom log is the **sole source of truth**.

### Clearing semantics

A successful event `E` (where `E.event_type` matches some slot's `expected_event_type` for `E.subject_role`, and `E` is NOT a `coord:deadline_missed` atom) clears the slot if `E.sequence_id > last_miss.sequence_id`. This rule is applied during the on-demand scan, not via a separate in-memory watermark map (the earlier design used such a map and lost it across restart). A fresh `reviewer_invoked` does NOT clear the slot (its `event_type == "reviewer_invoked"` is no slot's `expected_event_type`). The founder can check status in the morning and see "codex hasn't successfully sent `tick_start` since 3 days ago" — even after a daemon restart.

## V1 Performance Bound (perf-fixture-only)

The append-only ledger means coord-atom volume grows without trim. V1 sizing target: at 057b-era volume (~3k coord atoms/day = ~1.1M/year, ~100k after ~34 days), the full-replay reconstruction at boot AND the full-scan in `coord_status()` must complete within operational budgets.

`tests/coord/coord-volume-perf.test.ts` is the **operational contract**: synthesize 100k coord atoms in the ledger; assert reconstruction at boot completes in <1500ms on dev hardware; assert one `coord_status()` call completes in <300ms. (Measured 287ms / 80ms on dev hardware at merge.)

**No runtime warning mechanism in V1.** An earlier review round explored a startup warning, but the proposed mechanism conflated `getCurrentCoordSequence()` (rowid watermark) with coord-row count (rowid is shared with non-coord events; sparse-coord / busy-capture ledgers would false-fire on first coord atom), and it emitted a `scheduler_health` atom that no wrapper would close. V1.5+ adds the proper observability path with (a) a coord-row-count primitive (not rowid watermark), (b) a non-deadline-opening warning atom shape, and (c) visibility in `coord_status()` — all three are V1.5+ scope.

## Substrate Test Inventory

All tests use the MCP `coord_emit` tool directly to inject synthetic atoms; no wrapper changes are needed. Every test is merge-blocking. Highlights (~80 cases across 18 files):

- `tests/coord/append-seam.test.ts` — schema/identity/tier-discriminated validation; unknown event_type rejected; cross-tier rejected; timestamps canonicalized; `metadata.surface="coord"` stamped.
- `tests/coord/identity-spoof-rejection.test.ts` — caller-supplied `source` ignored; X-Echo-Role spoof rejected; self-attestation vs invocation rules enforced.
- `tests/coord/non-pollution-three-way.test.ts` — `search_memories()` returns 0 coord atoms; `search_memories(source_prefix="coord:")` returns N; `wait_for_new_turns(source_prefix="coord:")` returns N coord turn ids.
- `tests/coord/wait-for-new-turns-source-prefix.test.ts` — prefix-only call; sources/prefix union; both-absent rejection; pre-AC4 baseline byte-identical.
- `tests/coord/coord-emit-per-tier-input.test.ts` — round + scheduler tier; cross-tier rejected.
- `tests/coord/coord-roles-validation.test.ts` — well-formed config loads; bad-config makes `startMcpServer()` throw at boot.
- `tests/coord/coord-roles-cwd-independent-path.test.ts` — `chdir` to `/` before `startMcpServer()`; loader still resolves via module-relative path.
- `tests/coord/deadlines-reconstruction.test.ts` — boot scans + replays; overdue records fire `deadline_missed`; **startup gate: server does NOT accept `coord_emit` until reconstruction completes**.
- `tests/coord/deadlines-fire-once-and-remove.test.ts` — heartbeat fires once; record removed; no stale open in `coord_status()`.
- `tests/coord/restart-after-fired-no-stale-open.test.ts` — pre-existing `deadline_missed` atom + restart → cache-hit-also-terminal removes the open record on first heartbeat.
- `tests/coord/out-of-order-emitted-at-replay.test.ts` — atom append order is authoritative; out-of-order `emitted_at` does NOT corrupt replay.
- `tests/coord/last-miss-cleared-by-successful-close.test.ts` — clearing semantics via `sequence_id` comparison.
- `tests/coord/subject-role-multi-under-one-correlation.test.ts` — two `subject_role` values under one `correlation_id` open + close independently.
- `tests/coord/idempotency-per-role.test.ts` — per-role-per-event-type key → 2 distinct atoms.
- `tests/coord/scheduler-vs-round-tier-keyspace.test.ts` — tier maps don't collide.
- `tests/coord/coord-status-shape.test.ts` — output schema; horizons; last-miss visible >24h; survives daemon restart; slot universe derived from `coord-roles.json` only.
- `tests/coord/coord-volume-perf.test.ts` — 100k-atom fixture; <1500ms reconstruction, <300ms status.
- `tests/storage/iterate-coord-by-append-order.test.ts` — parity across SqliteStorage + MemoryStorage; `getCurrentCoordSequence` watermark boundary safety.

## Related

- [[coord-layer]] — parent overview, four locked design decisions, decomposition rationale, shared contract
- [[coord-active-trigger-and-role-emission]] — sibling 057b; activates production emission against this substrate
- [[storage]] — append-only ledger; coord atoms ride the same single-writer path
- [[mcp-server]] — host process; coord_emit and coord_status register as tools here
- [[mcp-wait-for-new-turns]] — widened with `source_prefix` to support the coord mailbox (AC4)
- [[mcp-search-memories]] — default-excludes `coord:*`; opt-in via `source_prefix="coord:"`
- [[capture-gate]] — separate write surface for capture events; coord seam is structurally distinct
- [[capture-pipeline]] — timestamp canonicalization pattern reused at the coord append seam
- [[timestamp-canonicalization]] — append-time canonicalization invariant honored by coord
- [[group-session]] — peer pattern: cross-tool coordination via shared ledger + `wait_for_new_turns`
- [[review-queue-protocol]] — uses coord events to track per-round reviewer SLAs once 057b activates emission
- [[per-round-reviewer-roster]] — 043 pattern for per-role JSON config + Python validator that `coord-roles.json` mirrors

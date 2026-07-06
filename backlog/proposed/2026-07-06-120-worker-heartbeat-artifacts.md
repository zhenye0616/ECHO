---
id: 2026-07-06-120-worker-heartbeat-artifacts
title: "Worker heartbeat artifacts + degraded status: the paired invariant for fail-closed workers"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-06
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-06-drift-failure-modes-root-causes.md   # B7 root cause: fail-closed without observable degraded state
  - raw/internal/decisions/2026-07-05-terminal-first-demo-surface.md       # observability over stations 1-3 is the sprint's demo goal
  - src/enrich/decision-drift.ts                                          # drift sweep run() + boot disable (:1089-1096), DriftSweepResult (:553-567)
  - src/enrich/granola-signals.ts                                         # signal worker run() (:800-814) + boot disable (:920-931); 115 observability block (:124-132)
  - src/enrich/granola-intake-candidates.ts                               # intake bridge run() + config/disabled handle (:95-112)
  - src/echo-home/paths.ts                                                # ECHO_HOME_PATHS.state — heartbeat directory
  - src/echo-home/adapters/atomic-write.ts                                # atomicWrite — the atomic writer to reuse
  - backlog/claimed/2026-07-05-117-loop-observability-stations-1-3.md      # READ-ONLY: doctor loop section that will consume this contract (AC3 names the heartbeat follow-up). DO NOT modify.
files_to_modify:
  # PROVISIONAL
  - src/enrich/worker-heartbeat.ts                     # NEW: exported path constant + WorkerHeartbeat type + best-effort writer + worker-name constants (the contract doctor consumes)
  - src/enrich/decision-drift.ts                       # write heartbeat on tick end + boot disable; add degraded distinction to DriftSweepResult
  - src/enrich/granola-signals.ts                      # write heartbeat on tick end + boot disable
  - src/enrich/granola-intake-candidates.ts            # write heartbeat on tick end + boot disable
  - tests/enrich/                                      # heartbeat coverage (ok / degraded / boot-disable / malformed-overwrite / write-failure-swallowed)
---

## Problem

The 114 batch (and the whole enrichment worker family) fails **closed** correctly — a config typo returns a disabled handle instead of crashing the daemon — but the disabled/degraded state is written only to logs (a write-only sink no one polls) and to in-memory handle fields (`DriftSweepWorkerHandle.configError`, `granola-signals` boot disable at `:920-931`) that nothing consumes. The sandboxed harness (decision record B7, PROBE3) showed a total judge outage returning `status:'ok'` every tick with a frozen watermark — externally indistinguishable from a quiet day. This is the same failure class as June's `f19dc419` ("36 raw granola atoms and zero signals" — a worker had silently self-disabled for weeks).

"Never crash the daemon" was adopted without its paired invariant: **degraded state must be externally observable.** This item gives each enrichment worker a small, atomically-written heartbeat artifact under `~/.echo/state/`, so accidental disablement and stalled ticks become queryable for the first time. Item 117's doctor loop (in flight) explicitly names this as its AC3 follow-up ("worker-written heartbeat file") — this item guarantees the artifact exists and exports a stable contract doctor can consume; it does not modify doctor.

## Acceptance Criteria

- **AC1 — heartbeat artifact + exported contract:** a new `src/enrich/worker-heartbeat.ts` exports (a) named worker-name constants (e.g. `granola-signals`, `drift-sweep`, `granola-intake-bridge`), (b) a `workerHeartbeatPath(name)` returning `join(ECHO_HOME_PATHS.state, 'worker-heartbeat-<name>.json')`, (c) a `WorkerHeartbeat` type `{ schema_version: 1; worker: string; last_tick_at: string; status: 'ok' | 'degraded' | 'disabled'; reason?: string; counters?: <the tick's existing result counters> }`, and (d) a best-effort `writeWorkerHeartbeat(name, heartbeat)` that persists via the existing `atomicWrite` helper. This module is the small contract 117's doctor imports — path + type + name constants only, no doctor coupling.
- **AC2 — every worker writes a heartbeat at tick end:** the granola signal worker, the drift sweep, and the granola intake bridge each write their heartbeat at the **end of every `run()`** (on the `ok`/`skipped`/`error`/`degraded` result alike), with `status` derived from the result and `counters` **reusing the existing result object** (signal worker: 115's observability block + `notes_seen`/`notes_extracted`/`signal_atoms_written`; drift sweep: `DriftSweepResult` fields `window_size`/`brain_invocations`/`contradictions`/`delivered`/`deferred`/`delivery_failed`/`judge_failed`/`watermark`; intake bridge: `notes_seen`/`candidates`/`posted`/`failed`/`skipped`). Do not recompute counters — copy from the result. Test: an `ok` tick writes a heartbeat with `status:'ok'`, the correct `worker`, a fresh `last_tick_at`, and the tick's counters.
- **AC3 — boot-time disable is observable for the first time:** every boot-time permanent-disable path writes a heartbeat with `status:'disabled'` and a `reason`: the granola signal worker's config-parse disable (`granola-signals.ts:920-931`, reason = the caught config error), the drift sweep's `disabledHandle` (`decision-drift.ts:1089-1096` — both the `DriftSweepConfigError` case, reason = `configError.message`, and the disabled-by-flag case, reason = e.g. `"ECHO_DRIFT_SWEEP_ENABLED unset"`), and the intake bridge's config/disabled handle. This makes accidental disablement (the `f19dc419` class) externally observable. Test: a worker started with a config-parse error / disabled flag writes a `status:'disabled'` heartbeat carrying the reason, without throwing.
- **AC4 — drift sweep reports `degraded` on an all-retryable stall:** the drift sweep distinguishes a **degraded** tick — brain invocations occurred but the watermark did **not** advance because every judge attempt this tick was a retryable infra failure (PROBE3) — from a plain `ok` tick. Represent this without breaking the existing `DriftSweepResult` `status` union that consumers switch on: add a discriminator on the `ok` branch (e.g. a `degraded: boolean` field, default `false`), mirror it in the `drift_sweep_ok` log, and map `degraded:true` → heartbeat `status:'degraded'`. A tick with no brain invocations (quiet day) or with any terminal progress is NOT degraded. Test: a tick whose judge stub throws only retryable infra errors reports `degraded:true` + a frozen watermark and writes a `status:'degraded'` heartbeat; a quiet tick (empty window) reports `degraded:false` + `status:'ok'`.
- **AC5 — heartbeat writes never harm the worker:** `writeWorkerHeartbeat` is **best-effort** — a write failure (e.g. `atomicWrite` refusing a symlinked target, ENOSPC) is caught and logged, never propagated into the worker's `run()` or boot path. Because writes are atomic **overwrites** and no worker ever reads a heartbeat, a pre-existing malformed heartbeat file cannot affect a worker. Tests: a pre-placed malformed `worker-heartbeat-<name>.json` is cleanly overwritten with valid JSON on the next tick and the worker does not throw; a stubbed `atomicWrite` failure is swallowed (the tick's own result is still returned unchanged).

## Out of Scope (Don't Drift)

- **No push alerting / notifications** off the heartbeat — it is a read-only artifact; surfacing is doctor's job (117) and later items.
- **No daemon lifecycle or dispatch changes** — workers are unchanged except for the added heartbeat write; no new interval, no supervisor.
- **No new logging framework or changes to existing log emissions** — heartbeats are additive; 115 counters and structured logs stay as-is.
- **No doctor changes** — this item exports the contract (path + type + name constants) only. Item 117 owns doctor; if 117 lands first, a small doctor follow-up wires the read. This item's own AC tests are the only consumer proven here. **Do not modify `backlog/**/2026-07-05-117-*` or `src/cli/**`.**
- **No heartbeat for non-enrichment workers** (capture pollers, responder) — enrichment workers only; others are later if the pattern proves out.
- **No schema_version negotiation / migration** — `schema_version: 1` written fresh each tick; there is nothing to migrate (the artifact is always overwritten).

## After Completion (Strategist Notes)

- New observability note: fail-closed enrichment workers now emit heartbeats; this is the durable fix for blindspot B7 (fail-closed-but-silent). Cross-reference from the drift-alert surface page.
- Hand the exported contract to 117's doctor: once both land, a doctor follow-up replaces AC3's *inferred* in-process-disable with *observed* heartbeat status. Note that follow-up in the map-vs-territory artifact's B7 entry.
- If a fourth worker adopts the pattern, promote `writeWorkerHeartbeat` usage into the worker-start template.

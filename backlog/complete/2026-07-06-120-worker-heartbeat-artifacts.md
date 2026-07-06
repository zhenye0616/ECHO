---
id: 2026-07-06-120-worker-heartbeat-artifacts
title: "Worker heartbeat artifacts + degraded status: the paired invariant for fail-closed workers"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-06
blocked_by: []
claimed_by: "builder-120-118-B4913C34"
claimed_at: "2026-07-06T01:31:07Z"
branch: "agent/worker-heartbeat-artifacts"
head_sha: "f1a53d84bad48b752a7235247fdcc29a96a371c9"
agent_notes: |
  Built to all 5 ACs. New src/enrich/worker-heartbeat.ts exports the
  doctor-facing contract (name constants + workerHeartbeatPath + WorkerHeartbeat
  type + best-effort mkdir-before-atomicWrite writeWorkerHeartbeat). All three
  enrichment workers write a heartbeat at the end of every run() (via a thin
  run() wrapper over the existing runInner) and on every boot-time disable, with
  an explicit TOTAL result->status mapping (error->degraded; signal
  brain_unavailable->degraded per the f19dc419 silent-brain class; in_flight->ok;
  disabled->disabled). Drift sweep gains a tick-local retryable_failures counter
  and a degraded predicate (brain_invocations>0 && retryable_failures>0 &&
  window-not-cleared && no-terminal-progress), surfaced in DriftSweepResult, the
  drift_sweep_ok log, and the heartbeat status.

  Design notes for reviewer: (1) heartbeat writes live in the run() wrapper, not
  in runXxxOnce, so the Once functions stay pure and existing direct-call tests
  are unaffected; the AC4 degraded-HEARTBEAT test therefore drives the worker,
  while AC4 result-shape tests call runDriftSweepOnce directly. (2) "watermark
  did not advance" = window fully cleared (blockingSeqs empty), NOT a value
  change vs prior (a held watermark still moves 0 -> blocker seq on tick 1). (3)
  Added beforeEach(setEchoHomeRoot(temp)) to decision-drift + granola-signals
  test files so heartbeat writes never touch real ~/.echo/state.

  SCOPE FLAG: tests/packaging/packed-manifest.test.ts is edited but is NOT in the
  PROVISIONAL files_to_modify. It pins the sorted npm-pack file set; AC1's new
  shipped module forces two new dist/enrich/worker-heartbeat entries into that
  set. The diff is exactly those 2 lines; without it the product suite is red.
  Surfaced per drift-rule 4 rather than silently absorbing.

  typecheck clean, lint clean. Enrich suites 79/79 pass. Full test:product: the
  only red tests are load-sensitive timing/perf/subprocess flakes that shift
  run-to-run (coord-volume-perf 100k <1500ms, ceo-slack-brain process-kill
  timing, cli/shell-reachable npm-pack+bash) — ALL pass in isolation, none touch
  enrich/heartbeat code. Run log:
  raw/internal/agent-runs/2026-07-06-2026-07-06-120-worker-heartbeat-artifacts.md
review_notes: |
  Merged on 2026-07-06 via founder reconciliation (strategist-operated;
  founder green-lit review + merge in session).

  Conflicts resolved:
  - none — --no-ff merge applied clean, as the sidecar predicted.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none (sidecar verdict: merge as-is, empty punch list)

  Fixups deferred to follow-up items:
  - none

  Verify: full suite green — run 1: 2014/2037 passed (1 file failed, known
  load-sensitive flake class); run 2 (identical tree): 0 failures. Lint,
  typecheck, coupled-invariants, sync-skills --check all clean. Reviewer
  independently observed 1746 passed on test:product incl. the three
  flagged flakes.

  Follow-up items (non-blocking):
  - optional hardening: write a heartbeat even on an uncaught runInner() throw
  - after 119 lands: wire item 117 doctor loop section to consume the exported
    heartbeat contract (117 AC3's own named follow-up)
  - sequence note: 119 (delivery retry) merges next; decision-drift.ts
    auto-merges (merge-tree verified); keep BOTH appended describe blocks in
    tests/enrich/decision-drift.test.ts
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
ready_content_sha: d3cc1983471d9c2e66b0961796e90af20281aeba49ac54729814cc191f2a6ff0
---

## Problem

The 114 batch (and the whole enrichment worker family) fails **closed** correctly — a config typo returns a disabled handle instead of crashing the daemon — but the disabled/degraded state is written only to logs (a write-only sink no one polls) and to in-memory handle fields (`DriftSweepWorkerHandle.configError`, `granola-signals` boot disable at `:920-931`) that nothing consumes. The sandboxed harness (decision record B7, PROBE3) showed a total judge outage returning `status:'ok'` every tick with a frozen watermark — externally indistinguishable from a quiet day. This is the same failure class as June's `f19dc419` ("36 raw granola atoms and zero signals" — a worker had silently self-disabled for weeks).

"Never crash the daemon" was adopted without its paired invariant: **degraded state must be externally observable.** This item gives each enrichment worker a small, atomically-written heartbeat artifact under `~/.echo/state/`, so accidental disablement and stalled ticks become queryable for the first time. Item 117's doctor loop (in flight) explicitly names this as its AC3 follow-up ("worker-written heartbeat file") — this item guarantees the artifact exists and exports a stable contract doctor can consume; it does not modify doctor.

## Acceptance Criteria

- **AC1 — heartbeat artifact + exported contract:** a new `src/enrich/worker-heartbeat.ts` exports (a) named worker-name constants (e.g. `granola-signals`, `drift-sweep`, `granola-intake-bridge`), (b) a `workerHeartbeatPath(name)` returning `join(ECHO_HOME_PATHS.state, 'worker-heartbeat-<name>.json')`, (c) a `WorkerHeartbeat` **exported TypeScript type** `{ schema_version: 1; worker: string; last_tick_at: string; status: 'ok' | 'degraded' | 'disabled'; reason?: string; counters?: Record<string, number> }` — `counters` is a flat numeric map (worker-agnostic so doctor reads one shape across workers; each worker copies its own numeric result fields in), and (d) a best-effort `writeWorkerHeartbeat(name, heartbeat)` that **`mkdirSync(dirname(path), { recursive: true })` before the `atomicWrite` overwrite** (r1 codex-ops F2 — a fresh/launchd `ECHO_HOME` may not have `state/` yet, and best-effort swallowing would otherwise erase the very observability this item adds; mirrors `writeDriftSweepCheckpoint`'s existing `mkdirSync`-before-`atomicWrite` at `decision-drift.ts:268`). This module is the small contract 117's doctor imports — path + type + name constants only, no doctor coupling.
- **AC2 — every worker writes a heartbeat at tick end, with an explicit result→status mapping:** the granola signal worker, the drift sweep, and the granola intake bridge each write their heartbeat at the **end of every `run()`**, with `counters` **reusing the existing result object** (signal worker: 115's observability block + `notes_seen`/`notes_extracted`/`signal_atoms_written`; drift sweep: `DriftSweepResult` fields `window_size`/`brain_invocations`/`contradictions`/`delivered`/`deferred`/`delivery_failed`/`judge_failed`/`watermark`; intake bridge: `notes_seen`/`candidates`/`posted`/`failed`/`skipped`) — do not recompute, copy from the result. The result→heartbeat-status mapping is **explicit and total** (r1 codex F1 / codex-ops F2 — the three-value status union cannot silently absorb the four-value result union): `ok` result → `ok` (or `degraded` when AC4's discriminator is set); `skipped/in_flight` → `ok` (worker alive, single-flight overlap); `skipped/disabled` → `disabled`; `skipped/brain_unavailable` (signal worker's lazy-preflight miss) → `degraded` with a reason (this is exactly the `f19dc419` silent-brain-down class — it must NOT read as healthy); `error` result → `degraded` with `reason` = the error message. A tick failure never maps to `ok`. Tests: an `ok` tick writes `status:'ok'` with the correct `worker`, a fresh `last_tick_at`, and the tick's counters; an `error` tick writes `status:'degraded'` + the error reason; a `skipped/brain_unavailable` tick writes `status:'degraded'`.
- **AC3 — boot-time disable is observable for the first time:** every boot-time permanent-disable path writes a heartbeat with `status:'disabled'` and a `reason`: the granola signal worker's config-parse disable (`granola-signals.ts:920-931`, reason = the caught config error), the drift sweep's `disabledHandle` (`decision-drift.ts:1089-1096` — both the `DriftSweepConfigError` case, reason = `configError.message`, and the disabled-by-flag case, reason = e.g. `"ECHO_DRIFT_SWEEP_ENABLED unset"`), and the intake bridge's config/disabled handle. This makes accidental disablement (the `f19dc419` class) externally observable. Test: a worker started with a config-parse error / disabled flag writes a `status:'disabled'` heartbeat carrying the reason, without throwing.
- **AC4 — drift sweep reports `degraded` on an all-retryable stall, from tracked fields:** the drift sweep distinguishes a **degraded** tick from a plain `ok` tick. Because the existing `DriftSweepResult` counters expose only the aggregate terminal `judge_failed` (not retryable failures), the sweep MUST add a **tick-local `retryable_failures` counter** (the sweep already logs `drift_judge_retryable` per statement at `decision-drift.ts:720` — count those) so the predicate cannot be built from ambiguous aggregates (r1 codex F2). The predicate for `degraded:true` is exactly: `brain_invocations > 0` **AND** `retryable_failures > 0` **AND** the watermark did **not** advance this tick **AND** no pair reached a terminal state this tick — i.e. brain was called and every judged pair hit a retryable infra failure (PROBE3). A tick with no brain invocations (quiet day), or with any terminal progress (a `judged-no-contradiction`/`delivered`/`terminal-judge-failed`/`delivery-failed` this tick), is NOT degraded, so a terminal judge failure is never miscounted as degraded. Represent this without breaking the existing `DriftSweepResult` `status` union that consumers switch on: add a discriminator on the `ok` branch (a `degraded: boolean` field, default `false`), expose `retryable_failures` in the result, mirror both in the `drift_sweep_ok` log, and map `degraded:true` → heartbeat `status:'degraded'`. Tests: a tick whose judge stub throws only retryable infra errors reports `degraded:true` + `retryable_failures>0` + a frozen watermark and writes a `status:'degraded'` heartbeat; a tick with a terminal `judged-no-contradiction` alongside a retryable failure reports `degraded:false` (terminal progress made); a quiet tick (empty window) reports `degraded:false` + `status:'ok'`.
- **AC5 — heartbeat writes never harm the worker:** `writeWorkerHeartbeat` is **best-effort** — a write failure (e.g. `atomicWrite` refusing a symlinked target, ENOSPC) is caught and logged, never propagated into the worker's `run()` or boot path. Because writes are atomic **overwrites** and no worker ever reads a heartbeat, a pre-existing malformed heartbeat file cannot affect a worker. Tests: a pre-placed malformed `worker-heartbeat-<name>.json` is cleanly overwritten with valid JSON on the next tick and the worker does not throw; a **fresh `ECHO_HOME` with no `state/` directory** still writes a valid heartbeat (AC1's `mkdirSync`-before-`atomicWrite` — the observability is not silently swallowed on first run, r1 codex-ops F2); a stubbed `atomicWrite` failure is swallowed (the tick's own result is still returned unchanged). The heartbeat coverage lands in a new `tests/enrich/worker-heartbeat.test.ts` (contract + boot-disable + malformed-overwrite + fresh-home + swallowed-write), with the drift `degraded` case extending the existing `tests/enrich/` drift-sweep suite (r1 codex F3 — named test target; exact vitest filter/commands remain builder-owned per house style, tests are asserted inline in the ACs above).

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

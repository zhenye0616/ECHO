# Agent Run — 2026-07-06-120-worker-heartbeat-artifacts

- **Agent:** builder-120-118-B4913C34 (Claude Code)
- **Branch:** agent/worker-heartbeat-artifacts
- **head_sha:** f1a53d84bad48b752a7235247fdcc29a96a371c9
- **Worktree:** ~/Desktop/Project_echo--worker-heartbeat-artifacts

## What I implemented

Each enrichment worker now emits an atomically-written heartbeat artifact under
`~/.echo/state/`, giving fail-closed workers the paired invariant they lacked:
a degraded or self-disabled worker is now externally observable.

- **New `src/enrich/worker-heartbeat.ts`** (AC1): exports the worker-name
  constants (`GRANOLA_SIGNALS_WORKER='granola-signals'`,
  `DRIFT_SWEEP_WORKER='drift-sweep'`, `GRANOLA_INTAKE_BRIDGE_WORKER='granola-intake-bridge'`),
  `workerHeartbeatPath(name)` → `join(ECHO_HOME_PATHS.state, 'worker-heartbeat-<name>.json')`,
  the exported `WorkerHeartbeat` type (`schema_version:1; worker; last_tick_at;
  status: ok|degraded|disabled; reason?; counters?: Record<string,number>`), and
  a best-effort `writeWorkerHeartbeat` that `mkdirSync`es the state dir before
  the `atomicWrite` overwrite and swallows+logs any write failure. This is the
  whole contract 117's doctor will import — no doctor coupling.
- **All three workers write at tick end + boot-disable** (AC2/AC3): the granola
  signal worker, drift sweep, and intake bridge each write their heartbeat at
  the end of every `run()` (via a thin `run()` wrapper around the existing
  `runInner`), with `counters` copied from the existing result object (never
  recomputed). Every boot-time permanent-disable path (config-parse disable,
  drift `disabledHandle` for both the config-error and disabled-by-flag cases,
  intake config/disabled handles) writes a `status:'disabled'` heartbeat
  carrying the reason. The result→status mapping is explicit and total:
  `error`→degraded, signal-worker `brain_unavailable`→degraded (the f19dc419
  silent-brain-down class, must not read healthy), `in_flight`→ok,
  `disabled`→disabled.
- **Drift `degraded` distinction from tracked fields** (AC4): added a tick-local
  `retryable_failures` counter (counts the `drift_judge_retryable` sites) and a
  `degraded` boolean to the `DriftSweepResult` `ok` branch. Predicate:
  `brain_invocations>0 && retryable_failures>0 && !watermarkAdvanced &&
  !terminalProgressThisTick`, where `watermarkAdvanced` means the watermark
  cleared the whole window (blockingSeqs empty), and `terminalProgressThisTick`
  is derived from `delivered/deliveryFailed/judgeFailed/noContradiction > 0`.
  Both new fields are mirrored in the `drift_sweep_ok` log and `degraded:true`
  maps to a `status:'degraded'` heartbeat.
- **Best-effort writes never harm the worker** (AC5): a symlinked/ENOSPC target
  or a fresh ECHO_HOME with no `state/` dir cannot break a tick; a pre-existing
  malformed heartbeat is cleanly overwritten.

## Files modified

- `src/enrich/worker-heartbeat.ts` — NEW (72 lines)
- `src/enrich/decision-drift.ts` — retryable_failures/degraded + heartbeat wiring
- `src/enrich/granola-signals.ts` — heartbeat wiring + boot-disable heartbeat
- `src/enrich/granola-intake-candidates.ts` — heartbeat wiring + boot-disable heartbeats
- `tests/enrich/worker-heartbeat.test.ts` — NEW (16 tests: contract, best-effort, AC2/AC3/AC4 integration)
- `tests/enrich/decision-drift.test.ts` — AC4 degraded result-shape tests + ECHO_HOME isolation
- `tests/enrich/granola-signals.test.ts` — ECHO_HOME isolation for wrapper-driving tests
- `tests/packaging/packed-manifest.test.ts` — snapshot pin updated for the two new dist/enrich files

## Decisions made during implementation

1. **Heartbeat writes live in the worker `run()` wrapper, not inside
   `runXxxOnce`.** The `Once` functions stay pure (existing direct-call tests
   are unaffected and write no heartbeats), and the wrapper is the only place
   that sees the full result union including the outer skipped variants
   (`in_flight`/`disabled`). This is why the AC4 degraded *heartbeat* test drives
   the worker via `startDriftSweepWorker(...).run()`, while the AC4 *result-shape*
   tests call `runDriftSweepOnce` directly.
2. **"Watermark did not advance" = window cleared (`blockingSeqs.length===0`),
   NOT `watermark !== priorWatermark`.** A held watermark still moves from 0 to
   the blocker's seq on the first tick, so a value-change comparison would
   wrongly read a stall as advanced. Caught this via the AC4 test.
3. **ECHO_HOME test isolation.** `decision-drift.test.ts` and
   `granola-signals.test.ts` drive the worker `run()`/boot-disable wrappers, so I
   added a `beforeEach(setEchoHomeRoot(temp))` to each so heartbeat writes land in
   a temp state dir, never the real `~/.echo/state`. `granola-intake-candidates.test.ts`
   only drives `runOnce` (no wrapper) and needed no change.
4. **`counters` kept to the spec-enumerated fields per worker** (drift: the 8
   AC2-listed DriftSweepResult fields; signal: notes_seen/notes_extracted/
   signal_atoms_written + the flattened 115 observability block; intake:
   notes_seen/candidates/posted/failed/skipped). Did not add retryable_failures
   to the drift counters — the degraded status + reason already convey the stall.

## FLAG FOR REVIEWER — file outside files_to_modify

`tests/packaging/packed-manifest.test.ts` is NOT in the item's (PROVISIONAL)
`files_to_modify`. It is a snapshot that pins the exact sorted set of files
`npm pack` ships. AC1 mandates a NEW shipped module (`src/enrich/worker-heartbeat.ts`),
which necessarily adds `dist/enrich/worker-heartbeat.d.ts` + `.js` to the packed
set — a mechanical, unavoidable consequence, not scope expansion. The diff to
that file is exactly the two new lines. Without the update the product suite is
red (packed-manifest fails), which would block the "test:product all clean"
handoff requirement. Surfacing per drift-rule 4 rather than silently absorbing.

## Acceptance criteria status

- **AC1** (heartbeat artifact + exported contract) — PASS. Constants, path,
  type, and mkdir-before-atomicWrite best-effort writer all exercised in
  `tests/enrich/worker-heartbeat.test.ts` (AC1 contract block).
- **AC2** (every worker writes at tick end, explicit total result→status map) —
  PASS. Signal ok/brain_unavailable, drift ok/degraded, intake ok covered;
  counters copied from result objects.
- **AC3** (boot-time disable observable) — PASS. Signal config-parse disable,
  drift disabled-by-flag + config-error, intake disabled-by-flag + config-error
  each write a `disabled` heartbeat with a reason, without throwing.
- **AC4** (drift degraded from tracked fields) — PASS. All-retryable stall →
  degraded:true + retryable_failures>0 + frozen watermark; terminal progress
  alongside a retryable failure → degraded:false; quiet tick → degraded:false +
  ok. Both result-shape and heartbeat assertions.
- **AC5** (writes never harm the worker) — PASS. Malformed-overwrite, fresh-home,
  and swallowed symlinked-write all covered.

## Test results

- `npm run typecheck` — clean (exit 0).
- `npm run lint` — clean (exit 0, eslint + task-state).
- `npm run test:product` — the four enrich suites: 79/79 pass (16 new in
  worker-heartbeat, 21 in decision-drift incl. 3 new AC4). Full suite: the only
  failures are load-sensitive timing/perf/subprocess tests that flake under
  full-suite CPU contention and shift run-to-run (`coord-volume-perf` 100k-atom
  <1500ms; `ceo-slack-brain` process-group-kill timing; `cli/shell-reachable`
  npm-pack+bash spawn hit a 65s timeout). ALL of them pass when run in isolation,
  and none touch enrichment/heartbeat code. Verified: packed-manifest is green
  after the snapshot update.

## Open questions for founder

None.

## Drift events caught

None. (The packed-manifest snapshot update is flagged above as a mechanical
consequence of a spec-mandated new shipped module, not drift.)

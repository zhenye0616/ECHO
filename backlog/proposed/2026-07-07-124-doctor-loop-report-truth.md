---
id: 2026-07-07-124-doctor-loop-report-truth
title: "Doctor loop report tells the truth — station-2 status observed via the 120 heartbeat contract (not inferred), station-1 source classes derived from store reality (no phantom rows)"
status: proposed
priority: HIGH
estimate: 0.5d
created: 2026-07-07
blocked_by: []
spec_refs:
  - src/cli/commands/doctor.ts                     # buildLoopStation2 (~:678), STATION2_DISABLE_INFERENCE_NOTE (~:673), LOOP_CAPTURE_SOURCE_CLASSES (~:212)
  - src/enrich/worker-heartbeat.ts                 # 120's exported contract: paths, WorkerName set, WorkerHeartbeat type
  - backlog/complete/2026-07-06-120-worker-heartbeat-artifacts.md   # the contract this item finally consumes (117's named follow-up)
  - tools/loop-dashboard.ts                        # downstream consumer via buildLoopReport — verify shape compatibility
  - wiki/architecture/loop-observability.md        # the shipped model this corrects (read-only)
files_to_modify:
  # PROVISIONAL
  - src/cli/commands/doctor.ts
  - tests/cli/doctor-loop.test.ts                  # doctor loop-section coverage (AC4 target)
  # AC3 shape-compat ONLY (no dashboard feature work) — permitted iff the report
  # shape changes; otherwise leave untouched:
  - tools/loop-dashboard.ts                        # /api/status doc-comment shape-compat only
  - tests/tools/loop-dashboard.test.ts             # 122 AC5-pinned shape test — update iff shape changes
---

## Problem

The doctor loop report — now load-bearing for `echoctl doctor`, the 122
dashboard, and the demo's health story — lies in two documented ways:

1. **Station-2 disable/staleness is inferred, not observed.** Item 120 shipped
   worker heartbeat files precisely so fail-closed workers stop being silent,
   but `src/cli/` has zero references to the heartbeat contract
   (`STATION2_DISABLE_INFERENCE_NOTE` unchanged at doctor.ts:673). Observed
   false alarm (2026-07-06 live check): the worker logged `worker_ok` every
   5 minutes on a quiet day but only touches its checkpoint when it extracts,
   so checkpoint-mtime read "stale (460 min)" while the worker was demonstrably
   alive 3 minutes earlier.
2. **Station-1 renders phantom source classes.** `LOOP_CAPTURE_SOURCE_CLASSES`
   lists `claude-code:` / `codex:` / `cursor:` but the session extractors emit
   `fs:`-prefixed atoms (claude-code.ts:596), so those rows read `count: 0`
   forever by construction — implying broken capture that isn't broken — while
   `coord:` (18k+ live events) is silently omitted.

Both are already documented as known bugs in [[echoctl-cli]] and
[[loop-observability]]; this item makes the report match reality.

## Acceptance Criteria

- **AC1 — station-2 observed:** `buildLoopStation2` reads the 120 heartbeat
  contract (exported paths/types from `src/enrich/worker-heartbeat.ts`) for the
  signal worker: disabled state and disabled-reason come from the heartbeat
  when one exists; liveness/staleness derive from the heartbeat's last-tick
  timestamp, not checkpoint mtime alone. A quiet-day tick (heartbeat fresh,
  checkpoint old, nothing extracted) reports healthy — the observed false-alarm
  scenario is a named regression test. Missing/malformed heartbeat falls back
  to the current inference WITH an explicit `inferred: true` marker in the
  report (never silently). The inference-note string is updated to reflect the
  new observed-first semantics.
- **AC2 — station-1 truthful classes:** per-source rows are derived from the
  source classes actually present in the store (distinct prefix scan or
  equivalent — builder judgment on the cheap query), plus the pinned
  always-interesting classes; a listed class with zero atoms is annotated as
  "no atoms with this source class in store" rather than rendering as a bare
  0-count that implies broken capture. `coord:` appears. The phantom
  `claude-code:`/`codex:`/`cursor:` rows either disappear or carry the
  annotation. Changing the EXTRACTORS' emitted prefixes is explicitly out of
  scope (capture-side attribution is a separate decision).
- **AC3 — downstream compatibility:** the dashboard (122) and its tests still
  pass against the updated report shape; if the shape changes, the
  `/api/status` contract doc-comment and the AC5-pinned shape test from 122
  are updated in the same commit (dashboard file edits allowed ONLY for
  shape-compat, no feature work).
- **AC4 — tests:** fixture-driven doctor loop-section tests added to
  `tests/cli/doctor-loop.test.ts` for: observed disabled state; the quiet-day
  false-alarm regression; missing-heartbeat fallback with `inferred: true`;
  class derivation with a store containing `fs:`/`coord:`/`api:granola` atoms
  and none of the phantom classes. If AC3's shape-compat path is taken, the
  122 shape test in `tests/tools/loop-dashboard.test.ts` is updated in the same
  commit. Verification commands, all green: targeted
  `npx vitest run tests/cli/doctor-loop.test.ts` (plus
  `npx vitest run tests/tools/loop-dashboard.test.ts` if the shape changed),
  then the full gate `npm run test && npm run lint && npm run typecheck`.

## Out of Scope (Don't Drift)

- No changes to extractor source prefixes or capture attribution (fs: stays
  fs: — that's a separate, bigger decision).
- No station 5, no new stations, no new persisted state, no daemon changes.
- No dashboard feature work (shape-compat edits only).
- No heartbeat-contract changes (120's exported contract is consumed as-is).
- Wiki updates happen at the post-shipment promotion pass, not in this item.

## After Completion (Strategist Notes)

- Update [[echoctl-cli]] and [[loop-observability]]: remove/rewrite the two
  known-bug callouts (station-2 inference, station-1 phantom rows) — they were
  documented as unfixed; this item fixes them.
- The map-vs-territory artifact's B7 entry gets its "observed, not inferred"
  closure note (120's After-Completion ask).
- This closes followups: heartbeat-wiring (×2 dupes), quiet-day staleness
  false-alarm, phantom classes (×2 dupes).

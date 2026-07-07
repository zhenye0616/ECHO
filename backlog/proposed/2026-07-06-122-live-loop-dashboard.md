---
id: 2026-07-06-122-live-loop-dashboard
title: "Live loop dashboard — serve-trace-pattern local page rendering the loop's health (doctor + heartbeats + store counts), auto-refreshing, strictly read-only"
status: proposed
priority: HIGH
estimate: 0.5-1d
created: 2026-07-06
blocked_by: []
spec_refs:
  - tools/serve-trace.ts                                   # the local-HTTP-page pattern to follow
  - src/cli/commands/doctor.ts                             # the loop report to reuse (117) — check exports; prefer in-process reuse
  - src/enrich/worker-heartbeat.ts                         # 120's exported contract: paths, names, WorkerHeartbeat type
  - backlog/complete/2026-07-06-121-intake-terminal-entry-guard.md  # entry-guard + vite-node --script precedent (MUST follow)
  - raw/internal/decisions/2026-07-05-terminal-first-demo-surface.md # sprint frame: mechanism visible, reuse-first
files_to_modify:
  # PROVISIONAL
  - tools/loop-dashboard.ts        # NEW: the only substantive new file
  - package.json                   # npm script `loop:dashboard` → `vite-node --script tools/loop-dashboard.ts`
  - tests/tools/                   # server + shape + read-only coverage
---

## Problem

The observability layer shipped (117 doctor loop section, 120 worker heartbeats)
but its surfaces are a point-in-time terminal command and raw JSON files. The
founder's operating model is direct-and-validate; "what is the loop doing right
now" should be one glanceable, self-refreshing local page — also the demo's
"mechanism visible" scene. Everything the page needs already exists; this item
is last-inch rendering only.

**Reuse-first constraint (founder, standing): do not write new code where
existing code can be reused.** Data comes exclusively from: the 117 doctor loop
report, the 120 heartbeat files (via their exported contract), and read-only
storage queries the doctor already performs. No new collectors, no daemon
changes, no new persisted state.

## Acceptance Criteria

- **AC1 — tool + entry:** `tools/loop-dashboard.ts`, launched via npm script
  `loop:dashboard` using `vite-node --script` and guarded with the house
  `import.meta` entry check (item 121 precedent — importing the module must
  never start the server; regression test required, same shape as 121's).
  Follows the `tools/serve-trace.ts` structure (node http, localhost). Binds
  127.0.0.1 ONLY. Port resolves in this precedence: `--port <n>` flag, then
  `ECHO_LOOP_DASHBOARD_PORT` env, then default `38480` (adjacent to
  serve-trace's 38479; no other named constant may define it). A port that is
  non-numeric, <1, or >65535 is a fatal startup error: print a one-line
  diagnostic to stderr and exit non-zero — never silently fall back to the
  default. (r1 codex F1.)
- **AC2 — data endpoint:** `GET /api/status` returns one JSON document
  assembled from existing sources: (a) the doctor loop report — `doctor.ts`
  exports in-process builders (`buildDoctorReport(opts)` /
  `buildLoopReport(...)`), so **in-process reuse is the primary path**; the
  `node dist/cli/index.js doctor --json` child is a fallback only, and if it is
  used it (i) runs with the same `ECHO_HOME` the server resolved, (ii) is
  bounded by a named-constant timeout, and (iii) is fail-soft — a missing or
  stale `dist`, a nonzero exit, a hung child (timeout), or unparseable output
  each map to a degraded doctor section in the response, never a thrown crash, a
  500, or a hang. Whichever path the builder picks, the dist-staleness
  implication is documented in a comment. (r1 codex F3, codex-ops F5.) (b) every
  `worker-heartbeat-*.json` read via 120's exported path/type contract
  (malformed file → per-worker error entry, never a crash); (c) a `generated_at`
  timestamp. Computation is throttled: refreshes more frequent than a
  named-constant minimum (default 10s) serve the cached document, and
  recomputation is **single-flight** — a poll arriving while a computation is in
  flight receives the last cached document (with a `stale: true` / in-flight
  marker) rather than starting a second doctor computation or child process; no
  unbounded process pileup is possible. (r1 codex-ops F6.)

  The response is a single top-level JSON object with a stable shape (r1 codex
  F2): `generated_at` (ISO string); `cache` (`{ stale: boolean, age_ms: number,
  computed_at: string }`); `serving` (`{ classification, staleness }` from the
  doctor loop report — carries dist-stale/src-dev identity); `stations` keyed by
  station id (`"1"`,`"2"`,`"3"`,`"4"`,`"6"`), each `{ status, ...station-specific
  fields }` where `status` reuses doctor's vocabulary (`ok | degraded |
  disabled`, plus `unknown` for the fail-soft doctor case); and `heartbeats` as
  a map of worker name → the 120 `WorkerHeartbeat` shape OR
  `{ error: <string> }` for a malformed/missing file. The AC5 shape test pins
  this contract.
- **AC3 — the page:** `GET /` returns ONE self-contained HTML page (inline
  CSS/JS, zero external requests) that polls `/api/status` on a named-constant
  interval (default 15-30s) and renders the loop as stations: 1 capture
  (per-source newest-atom age + counts, granola checkpoint age), 2 signals
  (heartbeat status + last tick + counters, signal-atom count, the known
  checkpoint-mtime-staleness caveat rendered as a tooltip/footnote not a
  fault), 3 packet (seed-store state counts, intake heartbeat status), 4 record
  (team-decision count), 6 drift (heartbeat status incl. disabled reason, last
  sweep counters when present), plus serving-code identity + dist staleness.
  Status semantics reuse doctor's ok/degraded/disabled vocabulary; degraded and
  hard faults must be visually unmissable. A fail-soft doctor section (missing/
  stale dist, timed-out or crashed child, unparseable output — the AC2 cases)
  renders as an unmissable degraded/unknown state on the page, never a blank or
  error-swallowed panel. (r1 codex-ops F5.) Both a working and a broken loop
  must be readable at a glance.
- **AC4 — strictly read-only:** the tool writes NOTHING: no seed stores, no
  checkpoints, no heartbeats, no db writes (storage opened read-only), no MCP
  calls, no network beyond serving localhost. A test asserts a full
  status-compute cycle against a scratch ECHO_HOME leaves the filesystem
  byte-identical. The test exercises **whichever doctor path the builder
  actually ships** — if the child fallback is wired, the no-write test drives it
  with the child rooted at the scratch ECHO_HOME; if the child path cannot be
  proven read-only under this test, the builder must use in-process reuse
  instead (which `buildDoctorReport`/`buildLoopReport` make available). (r1
  codex F3, codex-ops F4.)
- **AC5 — tests:** fixture-driven (scratch ECHO_HOME, fabricated heartbeats +
  doctor inputs or an injected report function): /api/status shape stable
  against the AC2 top-level contract and cached-vs-fresh behavior; single-flight
  under overlapping in-flight polls (no second computation/child spawned); the
  fail-soft doctor cases (missing/stale dist, timeout, nonzero exit, parse
  failure) each produce a degraded-not-crashed response; page serves;
  degraded/disabled states render distinguishably; the AC1 import-guard
  regression test AND the AC1 invalid-port fatal-exit test; the AC4 no-write
  test against the shipped doctor path. No live daemon required by any test.

## Out of Scope (Don't Drift)

- No historical charts, time-series, or persistence of any kind.
- No control actions — no enable/disable buttons, no restart, nothing writable
  from the page. Read-only is a safety property, not a v1 cut.
- No remote access, auth, TLS, or non-localhost binding.
- No changes to doctor, heartbeats, workers, or the daemon.
- No cloud/artifact variant.
- No station 4-6 deep views beyond the status chips described in AC3.

## After Completion (Strategist Notes)

- This is the demo's "mechanism visible" scene: run it beside the terminal
  intake card during the demo.
- Fold into the observability wiki page at the 116-122 promotion pass.
- If the founder wants push-style alerts later (page → notification), that is a
  new decision, not an extension of this item.

---
id: 2026-07-05-117-loop-observability-stations-1-3
title: "Loop observability for stations 1–3 — extend echoctl doctor with a read-only loop-health section built entirely from existing artifacts"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-05
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-05-terminal-first-demo-surface.md   # the sprint pivot + reuse-first constraint
  - raw/internal/decisions/2026-07-03-loop-gap-analysis.md             # named silent-failure modes this must surface
  - src/cli/commands/doctor.ts                                         # the report framework to EXTEND (DoctorReport, remediation copy)
  - src/cli/io/render.ts                                               # renderDoctorReport — reuse, don't fork
  - src/enrich/granola-signals.ts                                      # checkpoint shape + item-115 skip/settle counters
  - src/enrich/granola-intake-seed-store.ts                            # seed store states to count
  - src/storage/interface.ts                                           # query interface for per-source freshness
files_to_modify:
  # PROVISIONAL
  - src/cli/commands/doctor.ts      # new `loop` report section + rollup
  - src/cli/io/render.ts            # render the new section (existing style)
  - tests/cli/                      # doctor loop-section coverage (temp fixtures)
---

## Problem

Stations 1–3 fail silently: a brain-config typo permanently disables the signal worker
at boot (`granola-signals.ts:920-931`), one bad note aborts an extraction tick (`:730`),
a Granola auth failure logs and captures nothing, and nothing anywhere reports WHICH
code serves :38478 (hand-started vite-node on `src` vs launchd's stale packaged `dist`
— the audit's B6: a reboot silently swaps daemons and drops post-Jul-3 code). The
founder's operating model is direct-and-validate; validation currently requires reading
raw JSON logs. Demo-ready means one command that distinguishes "quiet day" from "frozen
pipeline."

**Reuse-first constraint (founder, 2026-07-05): do not write new code where existing
code can be reused.** Everything below is computable from artifacts that already exist:
the doctor report/render framework, checkpoint files, the seed store, the storage query
interface, and process args. No new daemon endpoints, no new logger, no new watcher.

## Acceptance Criteria

- **AC1 — a `loop` section in `echoctl doctor`:** extend `DoctorReport` with a `loop`
  section rendered through the existing `renderDoctorReport` pipeline and included in
  the existing `overall` rollup, honoring `--json`. No new command; no new process; the
  section is computed read-only at doctor runtime.
- **AC2 — station 1 (capture freshness):** per capture source class (`api:granola`,
  `git:`, `fs:`, extractor sources): newest atom timestamp + total count from the
  storage query interface, plus Granola checkpoint age (`high_water_mark`,
  `last_synced_at`, ingested-note count from `~/.echo/state/granola-checkpoint.json`).
  Missing checkpoint / unreadable db reported as degraded with remediation copy
  (existing `buildRemediationCopy` pattern), never a crash.
- **AC3 — station 2 (signal worker health):** from
  `granola-signals-checkpoint.json` + storage: checkpoint mtime (last activity),
  per-note `last_failure_at` entries surfaced as a failed-notes count with note ids,
  `derived:granola-signals` newest timestamp + count, current-vs-superseded run note.
  Flags with explicit semantics: `never-ran` (no checkpoint), `stale` (checkpoint age
  over a threshold with a named-constant default), `failing-notes` (any
  `last_failure_at` newer than its note's last success). LIMITATION the section must
  state honestly: an in-process permanent-disable (config-parse typo) is not directly
  observable from files — the report infers it as `stale`/`never-ran` and the
  remediation copy says to check daemon startup logs for `granola-signals` config
  errors.
- **AC4 — serving-code identity (kills audit B6):** report which process serves the MCP
  port: reuse the existing daemon probe (running/reachable/pid-lock), then classify the
  owning process's argv (`ps`-style lookup via the `execFile` pattern already imported
  in doctor.ts) as `packaged-dist` vs `src-dev (vite-node)` vs `unknown`, with the
  executing path. Staleness check: newest mtime under `src/` vs newest mtime under
  `dist/` → `dist-stale` warning when `src` is newer and the serving class is
  `packaged-dist`; also warn when serving class is `src-dev` (unsupervised dev process
  serving production). Both warnings carry remediation copy (`npm run build:cli`,
  daemon install script).
- **AC5 — station 3 (packet pipeline):** seed-store state counts
  (`pending/posting/posted/failed`) for each seed store found (canonical path + the
  item-116 terminal store if present), intake-bridge enabled/disabled per env flag, and
  `derived:team-decisions` count (0 is expected today — render as informational, not
  degraded). Absent stores render as `not yet run`, not errors.
- **AC6 — tests:** fixture-driven (temp ECHO_HOME, temp db or storage stub, fabricated
  checkpoints/seed stores, stubbed process-args lookup) covering: healthy, never-ran,
  stale, failing-notes, dist-stale, and src-dev-serving cases; `--json` shape stable;
  existing doctor tests untouched and green.

## Out of Scope (Don't Drift)

- **No new daemon code, endpoints, or MCP tools.** Doctor reads artifacts; the daemon
  is not modified.
- **No log-tailing, metrics server, dashboards, or persistent watchers.**
- **No station 4–6 sections** (decision store beyond the count, drift, Slack/Linear
  health) — later items when those stations are in sprint scope.
- **No new logging framework or changes to worker log emissions** — item-115 counters
  and existing structured logs stay as-is.
- **No auto-remediation** — report + copy-pasteable remediation commands only.

## After Completion (Strategist Notes)

- This is the audit's "5-second health check" (blindspot B7) and the structural fix for
  B6 (which-daemon roulette). Update the map-vs-territory artifact's B6/B7 entries.
- Demo runbook: `echoctl doctor` output is itself demo material for the
  mechanism-focused story — consider showing it in the demo alongside item 116's card.
- Post-shipment wiki: extend the echoctl-cli surface page; note the honest limitation
  from AC3 (in-process disable is inferred, not observed) as a candidate follow-up
  (worker-written heartbeat file) — do NOT build that in this item.

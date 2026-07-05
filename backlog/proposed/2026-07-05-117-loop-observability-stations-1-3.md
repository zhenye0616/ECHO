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
  `~/.echo/state/granola-signals-checkpoint.json` + storage: checkpoint mtime (last
  activity), per-note failure entries surfaced as a failed-notes count with note ids,
  `derived:granola-signals` newest timestamp + count, current-vs-superseded run note.
  The per-note fields are the checkpoint's `notes[<noteId>]` map entries
  `last_success_at` and `last_failure_at` (both optional ISO strings; the worker also
  records `last_failure_reason`). Flags with explicit semantics: `never-ran` (no
  checkpoint), `stale` (checkpoint age over a threshold with a named-constant default),
  `failing-notes` computed per note as: `last_failure_at` present AND
  (`last_success_at` absent OR `last_failure_at` > `last_success_at`) — this subsumes
  the never-successful case (`last_success_at` absent + a failure present). A note is
  NOT flagged when `last_success_at` >= `last_failure_at` (recovered) or when both
  fields are absent (never attempted). LIMITATION the section must state honestly: an
  in-process permanent-disable (config-parse typo) is not directly observable from
  files — the report infers it as `stale`/`never-ran` and the remediation copy says to
  check daemon startup logs for `granola-signals` config errors.
- **AC4 — serving-code identity (kills audit B6):** report which process serves the MCP
  port. A pid-lock is NOT proof of port ownership (it can be stale or point at a
  different process while another owns the port), so the report MUST resolve the actual
  listening pid via a concrete port-owner lookup (`lsof -nP -iTCP:<port> -sTCP:LISTEN`
  or `lsof -t -iTCP:<port>` via the `execFile` pattern already imported in doctor.ts),
  then classify THAT pid's argv as `packaged-dist` vs `src-dev (vite-node)` vs
  `unknown`, with the executing path. Verification contract: if the port-owner lookup
  fails/errors, or the daemon pid-lock and the observed listening pid disagree, render
  serving-code identity as `unknown`/degraded with remediation — never assert
  `packaged-dist` vs `src-dev` on unverified evidence. Staleness check: newest mtime
  under `src/` vs newest mtime under `dist/` → `dist-stale` warning when `src` is newer
  and the serving class is `packaged-dist`; also warn when serving class is `src-dev`
  (unsupervised dev process serving production). If `src/` or `dist/` is
  missing/unreadable (common in packaged or partially-built installs), the staleness
  result is `staleness-unknown`/degraded with remediation — never fatal, never a crash.
  All warnings carry remediation copy (`npm run build:cli`, daemon install script).
- **AC5 — station 3 (packet pipeline):** seed-store state counts
  (`pending/posting/posted/failed`) for each seed store found by glob
  `~/.echo/state/granola-intake-seeds*.json` — the canonical
  `~/.echo/state/granola-intake-seeds.json` plus the item-116 terminal store
  `~/.echo/state/granola-intake-seeds.terminal.json` when present. Intake-bridge
  enabled/disabled is read from the `ECHO_GRANOLA_INTAKE_ENABLED` env flag (unset/blank
  → disabled); because doctor's own process env may differ from the launchd daemon env
  that actually runs the loop, this value MUST be labeled doctor-env-only with an
  explicit limitation note, so an operator is not shown a false pipeline enabled/disabled
  state. Also `derived:team-decisions` count (0 is expected today — render as
  informational, not degraded). Absent stores render as `not yet run`, not errors.
- **AC6 — tests:** fixture-driven (temp ECHO_HOME, temp db or storage stub, fabricated
  checkpoints/seed stores, stubbed process-args + port-owner lookups) covering: healthy,
  never-ran, stale, failing-notes (incl. never-successful and recovered boundary),
  dist-stale, src-dev-serving, port-owner-unverifiable (port-owner lookup fails OR
  pid-lock disagrees with observed listening pid → `unknown`/degraded, not a false
  classification), and missing-src-or-dist (`staleness-unknown`, non-fatal) cases;
  `--json` shape stable; existing doctor tests untouched and green.

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

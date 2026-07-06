---
id: 2026-07-05-117-loop-observability-stations-1-3
title: "Loop observability for stations 1–3 — extend echoctl doctor with a read-only loop-health section built entirely from existing artifacts"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-05
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-06T00:14:00Z"
branch: "agent/loop-observability-stations-1-3"
head_sha: "58ca01925d012b8bad5029c582cbebac74cafc74"
pr_url: ""
agent_notes: |
  Re-handoff after reviewer BLOCK remediation cycle. All six ACs implemented plus
  the three reviewer riders. head_sha 58ca01925d012b8bad5029c582cbebac74cafc74 on
  agent/loop-observability-stations-1-3 (byte-equal with branch tip). Changes:
  src/cli/commands/doctor.ts, src/cli/io/render.ts, tests/cli/doctor-loop.test.ts.

  REMEDIATION (this cycle) — fixes the reviewer's two BLOCK causes:
  1. Read-only violation FIXED (substantive bug). The default loop-storage open
     now gates `new SqliteStorage(...)` on the db file already existing. A missing
     db is a SOFT not-yet-run state (station-1 condition 'db-missing', overall
     stays healthy) — doctor no longer silently creates+migrates an empty store or
     reports false counts=0. A present-but-corrupt db is still a HARD station-1
     fault. An injected openStorage (tests) is trusted as-is. This honors AC1
     "read-only" and AC2's missing-db contract. No SqliteStorage change;
     files_to_modify only (doctor.ts/render.ts/tests).
  2. win32-fixture junk-file side effect FIXED — fell out of fix 1 (the guard
     means the win32 doctor.test.ts fixtures no longer hit SqliteStorage, so no
     backslash-named \var\... files are materialized in cwd). Verified: removed the
     stale junk, re-ran the win32 test, none recreated.
  3. Added the missing AC6 fixture: portOwnerLookup THROWS -> serving unknown/
     degraded (soft), rest renders. Plus a read-only contract test (asserts the db
     file is NOT created) and an unreadable-db hard test.
  4. head_sha contract: updated IN THIS COMMIT with the stage move (the process
     lesson from the prior cycle — no post-handoff commit without a same-breath
     head_sha update).

  RIDERS (kept from the prior cycle, reviewer-endorsed): (1) rollup-boundary
  contract test pinning soft/hard split; (2) machine-readable per-station
  `condition` discriminator in --json + rendered [condition] tag (never-ran vs
  stale vs checkpoint-unreadable vs db-missing vs storage-error, etc.); (3) split
  documented in the section header comment + computeOverall.

  DESIGN DECISION (reviewer-endorsed): loop rolls into DoctorReport.overall ONLY
  on HARD faults; SOFT states (absent/never-run/not-yet-run/db-missing/
  nothing-listening) stay informational and never downgrade overall.

  Tests: doctor-loop.test.ts 24/24; existing tests/cli/doctor.test.ts 10/10
  untouched + green, NO junk files recreated; typecheck + lint clean. Full
  `npm test` = 1 failure = tests/cli/shell-reachable.test.ts (named known flake;
  passes in isolation 1/1 at ~24s — it packs a binary and exercises doctor's
  transitive imports incl. my new SqliteStorage chain, which packs fine; the
  full-suite failure is timeout/contention under parallel load). 053-completed-at-
  coercion now passes (the read-only fix removed the db-junk cause).

  REVIEWER NON-BLOCKING NOTES (recorded, NOT implemented per instruction, as
  candidate follow-ups): (a) queryClassHealth counts by loading full rows —
  heavy; a filtered/count-only storage seam is a later optimization (would touch
  storage/interface.ts, out of this item's files_to_modify). (b) a general
  read-only db open mode on SqliteStorage would let doctor open a present db
  without any migrate-on-open write; deferred (would touch SqliteStorage).
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
ready_content_sha: 692f1550c214b66b8355d78a7f43db49b47ca2ccc13a47bdb4f5825207c00300
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
  (existing `buildRemediationCopy` pattern), never a crash. Artifact-read robustness
  (mirrors AC3/AC5): doctor may run while the daemon is mid-write, so a malformed,
  unreadable, or partially-written `~/.echo/state/granola-checkpoint.json`, and a
  storage query/read failure, each degrade ONLY the station-1 section with
  operator-visible path + parse/read-error context and remediation while the rest of the
  report continues — never abort the health check.
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
  check daemon startup logs for `granola-signals` config errors. Artifact-read
  robustness: doctor may run while the daemon is mid-write, so a malformed, unreadable,
  or partially-written `granola-signals-checkpoint.json` degrades ONLY the station-2
  section with operator-visible path + parse-error context and remediation, and the rest
  of the report continues — it must never abort the health check.
- **AC4 — serving-code identity (kills audit B6):** report which process serves the MCP
  port. A pid-lock is NOT proof of port ownership (it can be stale or point at a
  different process while another owns the port), so the report MUST resolve the actual
  listening pid via a concrete port-owner lookup (`lsof -nP -iTCP:<port> -sTCP:LISTEN`
  or `lsof -t -iTCP:<port>` via the `execFile` pattern already imported in doctor.ts).
  `<port>` is doctor's already-resolved MCP port — the same value doctor probes and
  reports in `DoctorReport.port`, resolved by the existing precedence `--port` opt >
  `ECHO_MCP_PORT` env > `38478` default (`resolveMcpPort()` in `init.ts`); the lookup
  MUST NOT re-derive or hard-code a different port. Then classify THAT pid's argv as
  `packaged-dist` vs `src-dev (vite-node)` vs
  `unknown`, with the executing path. Verification contract: if the port-owner lookup
  fails/errors, or the daemon pid-lock and the observed listening pid disagree, render
  serving-code identity as `unknown`/degraded with remediation — never assert
  `packaged-dist` vs `src-dev` on unverified evidence. The port-owner lookup and the
  argv read are separate runtime steps, so the same `unknown`/degraded result (never a
  crash, never a false classification) applies when the argv lookup fails/errors,
  returns empty argv, or the resolved listening pid has vanished or become unreadable
  between the `lsof` resolution and argv classification. Staleness check: newest mtime
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
  informational, not degraded). Absent stores render as `not yet run`, not errors; a
  malformed, unreadable, or partially-written seed-store JSON degrades ONLY that store's
  entry with operator-visible path + parse-error context and remediation, and the rest
  of the report continues — never abort the health check.
- **AC6 — tests:** fixture-driven (temp ECHO_HOME, temp db or storage stub, fabricated
  checkpoints/seed stores, stubbed process-args + port-owner lookups). Non-failure
  scenario coverage: `healthy`; station-2 `never-ran` / `stale` / `failing-notes` (incl.
  the never-successful and recovered boundaries); `dist-stale` and `src-dev-serving`
  warnings; serving-code identity passes doctor's resolved MCP port (§AC4 precedence) to
  the stubbed port-owner lookup and the test asserts the stub received exactly that port;
  `--json` shape stable; existing doctor tests untouched and green. Every read-path
  failure mode is covered by this single degradation matrix (each row is one fixture) —
  the report degrades only the named scope and the rest of the report still renders,
  never a crash:

  | Read path / step | Trigger | Degraded scope | Required evidence | Rest of report |
  |---|---|---|---|---|
  | Station-1 Granola checkpoint (`granola-checkpoint.json`) | missing | station-1 | remediation copy | renders |
  | Station-1 Granola checkpoint | malformed / unreadable / partial-write | station-1 | path + parse/read-error + remediation | renders |
  | Station-1 storage query | db read failure / unreadable | station-1 | error + remediation | renders |
  | Station-2 signals checkpoint (`granola-signals-checkpoint.json`) | malformed / unreadable / partial-write | station-2 | path + parse-error + remediation | renders |
  | Station-3 seed store (`granola-intake-seeds*.json`) | malformed / unreadable / partial-write | that store's entry | path + parse-error + remediation | renders |
  | Serving-code port-owner lookup | lookup fails/errors OR pid-lock disagrees with observed listening pid | identity → `unknown`/degraded (no false classify) | remediation | renders |
  | Serving-code argv read | pid vanished / argv empty or unreadable after `lsof` | identity → `unknown`/degraded | remediation | renders |
  | Src/dist staleness | `src/` or `dist/` missing/unreadable | `staleness-unknown`/degraded (non-fatal) | remediation | renders |

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

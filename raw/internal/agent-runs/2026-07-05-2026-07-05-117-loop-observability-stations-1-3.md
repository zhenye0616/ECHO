# Agent run — 2026-07-05-117-loop-observability-stations-1-3

- **Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Claude Code builder)
- **Branch:** `agent/loop-observability-stations-1-3`
- **Worktree:** `~/Desktop/Project_echo--loop-observability-stations-1-3`
- **Claim commit:** `2267eb325daf8706767beca6611ee8d0e1126ec8` (main: `c4a5e7d0..2267eb32`)
- **Impl head_sha:** `3e1b3928135ea8bc63374b8b35b71cccd15eb1be`

## What I implemented

A read-only `loop` observability section on `echoctl doctor` covering loop
stations 1–3 plus serving-code identity, built entirely from artifacts that
already exist (reuse-first per the sprint constraint): the doctor
report/render framework, the storage query interface, the Granola poller +
signal-worker checkpoint files, the intake seed store, and process args.

- **`DoctorReport.loop: DoctorLoopReport`** — new typed section (station1,
  station2, serving, station3, status), rendered through the existing
  `renderDoctorReport` pipeline and folded into `computeOverall` (`--json`
  emits it unchanged via `JSON.stringify(report)`).
- **Station 1 (capture freshness):** per source class (`api:granola`, `git:`,
  `fs:`, `claude-code:`, `codex:`, `cursor:`) newest-atom timestamp + total
  count via `storage.query({ source_prefix })`; plus the Granola checkpoint's
  `high_water_mark` / `last_synced_at` / ingested-note count + age.
- **Station 2 (signal-worker health):** checkpoint mtime (last activity),
  `never-ran` / `stale` flags (named-constant `DEFAULT_LOOP_SIGNALS_STALE_MS`,
  1 h), failing-notes list computed with the exact AC3 predicate
  (`last_failure_at` present AND (`last_success_at` absent OR
  `last_failure_at` > `last_success_at`)), `derived:granola-signals` newest +
  count, plus honest limitation notes (in-process disable is inferred, not
  observed; count includes superseded runs).
- **Serving-code identity (kills audit B6):** resolves the actual listening
  pid via an injectable port-owner lookup (default `lsof -nP -iTCP:<port>
  -sTCP:LISTEN -t`) at doctor's already-resolved MCP port, cross-checks it
  against the daemon pid-lock, classifies that pid's argv as
  `packaged-dist` / `src-dev` / `unknown`, and computes `src/` vs `dist/`
  newest-mtime staleness (`dist-stale`, `src-dev-serving`, `staleness-unknown`).
- **Station 3 (packet pipeline):** seed-store status counts
  (`pending/posting/posted/failed`) for every `granola-intake-seeds*.json`
  found by glob (canonical + item-116 terminal store), reusing
  `FileGranolaIntakeSeedStore.list()`; `ECHO_GRANOLA_INTAKE_ENABLED` read from
  doctor's own env with an explicit doctor-env-only limitation note;
  `derived:team-decisions` count as informational (0 expected).

Every read path (checkpoints, seed stores, storage, port-owner lookup, argv,
src/dist mtimes) is wrapped so a malformed/unreadable/absent/partial artifact
degrades ONLY its own scope with path + error + copy-pasteable remediation and
the rest of the report still renders — never a crash.

## Files modified

| File | Δ |
|---|---|
| `src/cli/commands/doctor.ts` | +~620 (loop types, seams, station builders, serving lookup, staleness walk, wiring, computeOverall rollup) |
| `src/cli/io/render.ts` | +~70 (`renderLoopLines` + one call site + `basename` import) |
| `tests/cli/doctor-loop.test.ts` | +~560 (new; 19 tests) |

Branch `agent/loop-observability-stations-1-3` @ `3e1b3928135ea8bc63374b8b35b71cccd15eb1be`.

## Decisions made during implementation

1. **Overall-rollup severity model (load-bearing).** Each loop degradation
   carries a `severity: 'soft' | 'hard'`. Only HARD faults
   (malformed/unreadable/partial artifact reads, storage read errors, a
   pid-lock↔listener pid disagreement, and the `dist-stale` /
   `src-dev-serving` staleness warnings) downgrade the top-level `overall`.
   SOFT states (absent / never-run / not-yet-run / empty-db /
   nothing-listening / can't-verify-argv) are informational: they set the
   station's own status to `degraded` with remediation (per AC2/AC3/AC5 and
   the matrix), but do NOT flip `overall`. **Why:** AC6 requires the existing
   doctor tests to stay green, and those assert `overall: 'healthy'` in a
   temp home with no Granola checkpoints, an empty db, and nothing listening
   on the port — so absent/never-run/unknown MUST NOT flip `overall`.
   Missing-checkpoint therefore renders as a station-level `degraded` +
   remediation (operator-visible) while `overall` stays healthy. This
   reconciles AC1 ("included in the overall rollup"), AC2 ("missing checkpoint
   reported as degraded"), and AC6. Flagged to the strategist/team-lead at
   claim time; no objection received.
2. **Storage reuse via `SqliteStorage`.** Station 1/2/3 counts come from
   `new SqliteStorage(resolveDbPath())` behind an injectable `openStorage`
   seam, then `storage.query(...)`. This reuses the named storage query
   interface (spec_ref) rather than a bespoke read path. Known nuance:
   `SqliteStorage`'s constructor runs `migrate()` + `canonicalizeTimestamps()`
   which CAN write; on a current prod db these are no-ops, and any open/read
   failure degrades gracefully per AC. A future read-only-open follow-up is a
   candidate (noted, not built).
3. **`interface.ts` left untouched.** Per-source `count` is `query(...).length`
   (no per-source count method added — that would edit `interface.ts`, which
   is spec_ref/read-only, not in `files_to_modify`).
4. **All loop logic lives in `doctor.ts` + `render.ts`** (no new source file),
   respecting `files_to_modify`.

## Acceptance criteria status

- **AC1 (loop section, rendered, in overall, honors --json):** PASS —
  `DoctorReport.loop`; `renderLoopLines` in `renderDoctorReport`;
  `computeOverall` hard-fault rollup; `--json` shape test.
- **AC2 (station 1 capture freshness + graceful degradation):** PASS — source
  classes + Granola checkpoint; missing/malformed checkpoint and storage
  failure each degrade only station-1 (matrix tests).
- **AC3 (station 2 signal health + flags + honest limitation):** PASS —
  never-ran/stale/failing-notes with exact predicate incl. never-successful &
  recovered boundaries; disable-inference note; malformed checkpoint degrades
  only station-2.
- **AC4 (serving-code identity, kills B6):** PASS — port-owner lookup at
  doctor's resolved port; pid-lock cross-check (disagreement → unknown/hard,
  no false classify); argv classification; src/dist staleness incl.
  `staleness-unknown`.
- **AC5 (station 3 packet pipeline):** PASS — seed-store glob counts (canonical
  + terminal); intake flag doctor-env-only note; team-decisions informational;
  absent = not-yet-run; malformed store degrades only that entry.
- **AC6 (tests / degradation matrix):** PASS — 19 fixture-driven tests, one per
  matrix row + healthy/never-ran/stale/failing-notes/dist-stale/src-dev/port-
  precedence/json-shape/human-render; existing `tests/cli/doctor.test.ts`
  untouched and green.

## Test results (verbatim, in the worktree)

`npx vitest run tests/cli/doctor-loop.test.ts` →
`Test Files 1 passed (1) / Tests 19 passed (19)`

`npx vitest run tests/cli/doctor.test.ts` (existing, unmodified) →
`Test Files 1 passed (1) / Tests 10 passed (10)`

`npm run typecheck` → clean (`tsc --noEmit`, no output).

`npm run lint` → clean (`eslint . --max-warnings 0 && lint:task-state`).

`npm test` (full suite) →
`Test Files 2 failed | 188 passed | 1 skipped (191)` /
`Tests 2 failed | 1989 passed | 21 skipped | 1 todo (2013)`. Both failures are
NOT mine and pass in isolation:
- `tests/surfaces/ceo-slack-brain.test.ts > kills a timed-out brain process
  group` — the named known flake; passes in isolation (18/18).
- `tests/review-queue/053-completed-at-coercion.test.ts` — snapshots the
  PRODUCTION repo working tree and asserts it is unchanged; it failed because a
  concurrent teammate wrote three untracked files into the shared
  `~/Desktop/Project_echo` checkout during my full-suite run
  (`backlog/proposed/2026-07-06-118-drift-join-nomination.md`,
  `.../119-drift-delivery-retry.md`,
  `raw/internal/decisions/2026-07-06-drift-failure-modes-root-causes.md`, all
  timestamped 17:31). Passes in isolation (6/6). Environmental, unrelated to
  doctor/render.

## Manual verification

Ran the human render against a temp ECHO_HOME with fabricated checkpoints /
seed store / src-dev serving fixture: the loop block renders cleanly with
per-station lines, severity-tagged degradations, copy-pasteable remediation,
and the honest-limitation notes. `src-dev` classification + `src-dev-serving`
staleness + failing-note surfacing all behaved as designed.

## Open questions for founder

None. One flagged design decision (the overall-rollup severity model, item 1
above) — proceeding as described; reviewer can veto.

## Drift events caught

None. Stayed within `files_to_modify`; no new source files, no new
dependencies, no daemon changes, no new endpoints/MCP tools, no station 4–6
work, no auto-remediation (all per "Out of Scope").

## Process note (self-reported)

My first three source edits landed in the shared main checkout by mistake
(edited `/Users/zhenye/Desktop/Project_echo/...` instead of the worktree). I
relocated them into the worktree by `cp`, then reverted the two tracked files
in main with a targeted `git restore <pathspec>` (not a whole-tree destructive
op) and removed the stray untracked test file. Main was verified clean
(`git status --porcelain` empty) before any further work; all validated builds
ran in the worktree.

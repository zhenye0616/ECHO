---
status: shipped
topic: Architecture
subtopic: Loop Observability
aliases:
  - Loop Observability
  - Loop Health
  - Doctor Loop Section
  - Worker Heartbeats
  - Live Loop Dashboard
  - Card Provenance Trace
---

# Loop Observability

The read-only health layer over ECHO's own team loop (capture → signals → packet → record → drift). It answers "is the loop doing its job right now, and can I trust the card it just produced" without reading raw JSON logs or hand-written SQL. Four items shipped it: item 117 (`echoctl doctor`'s `loop` section), item 120 (worker heartbeat artifacts), item 122 (the live dashboard), and item 123 (card provenance). Landed 2026-07-05 to 2026-07-06 under the terminal-first demo surface's reuse-first constraint — every surface here composes existing artifacts; none adds a daemon endpoint, a new logger, or a persisted history.

## Definition

Loop observability is a station model over the loop's five built stages — 1 capture, 2 signals, 3 packet, 4 record, 6 drift (station 5, translate/status backflow, is unbuilt — see "Why there is no station 5" below) — computed entirely by reading artifacts the daemon and workers already write: the atom store, checkpoint files, seed stores, and (as of item 120) worker-written heartbeat files. Three surfaces read that model: a terminal command (`echoctl doctor`), a self-refreshing local page (`npm run loop:dashboard`), and a per-card provenance walk (`npm run trace:card`). All three are strictly read-only — none of them can create, migrate, or mutate anything the loop depends on.

## The station model

| Station | Name | Health source | Surfaced by |
|---|---|---|---|
| 1 | Capture | atom-store counts per source class + Granola checkpoint | doctor `station1`, dashboard `"1"` |
| 2 | Signals | `granola-signals-checkpoint.json` + `derived:granola-signals` atoms + heartbeat | doctor `station2`, dashboard `"2"` |
| 3 | Packet | `granola-intake-seeds*.json` seed-store counts + heartbeat | doctor `station3`, dashboard `"3"` |
| 4 | Record | `derived:team-decisions` atom count (preview only) | dashboard `"4"` (nested in doctor's `station3.teamDecisionsCount`) |
| — | Serving identity | which process/code serves the MCP port + `src`/`dist` staleness | doctor `serving`, dashboard `serving` |
| 6 | Drift | drift-sweep worker heartbeat only | dashboard `"6"` |
| 5 | Translate / backflow | *(none — not built)* | *(none)* |

Two things to notice in that table: station 4 has no dedicated report section of its own — it rides inside `DoctorLoopReport.station3` as a preview count, because `LOOP_TEAM_DECISION_SOURCE` (`derived:team-decisions`) is queried in the same `buildLoopStation3` pass as the seed stores. And station 6 has no doctor section at all; its entire health signal is the drift-sweep worker's heartbeat file, read independently.

### Why there is no station 5

Station 5 ("translate / status backflow" — reading Linear issue status back into the loop) is a real station in the loop's conceptual model, named as such in `raw/internal/decisions/2026-07-03-loop-gap-analysis.md`, but nothing has shipped to observe: the Linear client (`src/surfaces/ceo-slack-responder/linear-client.ts`) is create-only (one GraphQL mutation, no reads/polling/webhooks), so there is no capture substrate a health check could read from. Item 117 correctly scoped itself to "stations 1–3" plus serving identity; items 120/122/123 extended that to 4 and 6 as their artifacts (heartbeats, card atoms) came online. Station 5 gets a health section only after a station-5 capture surface exists.

## `echoctl doctor`'s `loop` section (item 117)

`DoctorReport` (`src/cli/commands/doctor.ts`) gained a `loop: DoctorLoopReport` field, computed by `buildLoopReport(opts, ctx)` and rendered through the existing `renderDoctorReport` pipeline — no new command, no new process. `DoctorLoopReport` is `{ station1, station2, serving, station3, status }`; `status` is `LoopStatus` (`'ok' | 'degraded'`), true station-agnostic OR of the four sub-statuses.

### Read-only storage discipline

`buildLoopReport`'s default storage open is gated on `existsSync(dbPath)` before ever constructing a `SqliteStorage` — because `SqliteStorage`'s constructor itself creates and migrates a missing db (item 117's review caught this the hard way), a missing db must never be opened by a health check. A missing db reports as a **soft** `db-missing` `Station1Condition`, not a crash and not a false "corrupt" report; a present-but-unreadable db is a **hard** `storage-error`. An injected `openStorage` (tests) is trusted as-is. `tools/loop-dashboard.ts` and `tools/trace-card.ts` both inherit this same existsSync-gated-open precedent.

### Severity model: soft vs. hard

Every `LoopDegradation` (`{ scope, severity, path?, detail, remediation }`) carries a `severity` of `'soft'` or `'hard'`. `computeOverall()`'s loop rollup (`loopHasHardFault(report.loop)`) downgrades the top-level `overall` to `'degraded'` **only** on hard faults — malformed/unreadable/partial artifact reads, storage read errors, a pid-lock/listener disagreement, an actionable staleness warning. Soft states (absent/never-run/not-yet-run/empty/nothing-listening) stay informational: they set the station's own `status`/`condition` and carry remediation copy, but never flip `overall`. This is what lets a fresh install (no checkpoints, empty db, nothing listening) report `overall: 'healthy'` instead of alarming on day one. Each station also exposes a machine-readable `condition` discriminator (`Station1Condition`, `Station2Condition`, `ServingCondition`, `Station3Condition`) so tooling can branch on state without parsing rendered prose.

### Station 1 — capture

`buildLoopStation1` queries `LOOP_CAPTURE_SOURCE_CLASSES` — `api:granola`, `git:`, `fs:`, `claude-code:`, `codex:`, `cursor:` — via `queryClassHealth(storage, sourceClass)` (a `source_prefix` query returning newest timestamp + count), plus the Granola checkpoint (`high_water_mark`, `last_synced_at`, ingested-note count) from `~/.echo/state/granola-checkpoint.json`.

**Known gap — three rows are dead-by-construction.** The `claude-code:`, `codex:`, and `cursor:` source-class rows will always report `count: 0` regardless of actual capture volume. Both extractors (`src/capture/extractors/claude-code.ts:596`, `src/capture/extractors/cursor.ts:1342`) emit their `CaptureEvent`s under the generic `fs:${path}` source prefix — the same prefix `fs-watcher.ts` uses — never under a `claude-code:`/`cursor:` prefix. No source anywhere in `src/capture/` emits a `codex:`-prefixed event either. So today all IDE-extractor traffic is invisibly folded into the `fs:` row, and the three dedicated rows are structurally unreachable. This is a documented follow-up, not yet filed as a fix.

### Station 2 — signals

`buildLoopStation2` reads `~/.echo/state/granola-signals-checkpoint.json` plus `derived:granola-signals` atom counts. Per-note failure entries (`LoopFailingNote`) come from the checkpoint's `notes[<noteId>]` map: a note is `failing` when `last_failure_at` is present and either `last_success_at` is absent or older than the failure. `DEFAULT_LOOP_SIGNALS_STALE_MS` (one hour) is the named-constant staleness floor — conservative against the signal worker's 5-minute tick interval.

**Checkpoint-mtime staleness is informational, not a fault** — both the dashboard page and doctor render it as a caveat/footnote (`STATION2_DISABLE_INFERENCE_NOTE`), never a degradation on its own, because an in-process permanent-disable (a config-parse typo) is not directly observable from files at all — it can only be *inferred* as `never-ran`/`stale`. That inference gap is exactly what item 120's heartbeats were built to close (see below): the dashboard's station 2 card renders the heartbeat status alongside this same disclaimer.

### Serving-code identity (kills the "which daemon" blind spot)

`buildLoopServing` answers "which process is actually serving the MCP port" — a pid-lock is not proof of ownership; it can be stale or point at a different process. It resolves the real listening pid via a port-owner lookup (`lsof`), classifies that pid's argv as `ServingClassification` (`'packaged-dist' | 'src-dev' | 'unknown'`), and compares newest-mtime under `src/` vs `dist/` to produce `ServingStaleness` (`'fresh' | 'dist-stale' | 'src-dev-serving' | 'staleness-unknown'`). Any lookup failure, pid-lock/listener disagreement, or vanished pid renders `unknown`/degraded — the report never asserts a classification on unverified evidence.

### Station 3 — packet

`buildLoopStation3` globs `~/.echo/state/granola-intake-seeds*.json` (the canonical seed store plus the terminal store from item 116) and reports `pending`/`posting`/`posted`/`failed` counts per store, plus `derived:team-decisions` count (station 4's preview — 0 is expected, rendered informational not degraded) and the `ECHO_GRANOLA_INTAKE_ENABLED` flag, explicitly labeled doctor-env-only because doctor's process env can differ from the launchd daemon's.

### Failure-mode discipline

Every artifact read in stations 1–3 follows the same degradation contract: a missing artifact is soft/informational; a malformed, unreadable, or partially-written artifact degrades **only that section**, carrying the operator-visible path plus parse/read-error context and remediation copy, while the rest of the report continues rendering. Doctor never crashes on a mid-write read (the daemon may be writing a checkpoint concurrently with a doctor run).

## Worker heartbeat artifacts (item 120)

Item 117 established "never crash the daemon" for fail-closed workers; item 120 supplies its missing twin — **degraded state must be externally observable.** The motivating failure mode (blindspot B7) is a total judge/brain outage returning `status: 'ok'` every tick with a frozen watermark: externally indistinguishable from a quiet day. This is the same class as the earlier `f19dc419` incident — a worker silently self-disabled for weeks, producing "36 raw granola atoms and zero signals."

`src/enrich/worker-heartbeat.ts` exports the whole contract doctor and the dashboard consume, with no coupling back into either:

- Worker-name constants: `GRANOLA_SIGNALS_WORKER`, `DRIFT_SWEEP_WORKER`, `GRANOLA_INTAKE_BRIDGE_WORKER` (union type `WorkerName`).
- `workerHeartbeatPath(name)` → `join(ECHO_HOME_PATHS.state, 'worker-heartbeat-<name>.json')`.
- The `WorkerHeartbeat` type: `{ schema_version: 1; worker: string; last_tick_at: string; status: 'ok' | 'degraded' | 'disabled'; reason?: string; counters?: Record<string, number> }`. `counters` is a flat numeric map so doctor/the dashboard read one shape across every worker.
- `writeWorkerHeartbeat(name, heartbeat)` — best-effort: `mkdirSync(dirname(path), { recursive: true })` before an `atomicWrite` overwrite (a fresh/launchd `ECHO_HOME` may not have `state/` yet; the mkdir guard is what stops that from silently erasing the observability the artifact exists to provide). Any write failure is caught and logged, never propagated into a worker's `run()` or boot path.

All three enrichment workers (`granola-signals.ts`, `decision-drift.ts`, `granola-intake-candidates.ts`) write a heartbeat at the end of every `run()` and on every boot-time permanent-disable, via an explicit, total result→status mapping: an `ok` tick → `ok`; `skipped/in_flight` (single-flight overlap) → `ok`; `skipped/disabled` → `disabled` with the disable reason; `skipped/brain_unavailable` (the exact `f19dc419` silent-brain-down class) → `degraded`; any `error` result → `degraded` with the error message as `reason`. A tick failure never maps to `ok`.

The drift sweep additionally tracks a tick-local `retryable_failures` counter and a `degraded: boolean` discriminator on `DriftSweepResult`'s `ok` branch: degraded means the brain was invoked, every judged pair hit a retryable infra failure, the watermark did not advance, and no pair reached a terminal state — so a genuine terminal judge failure is never miscounted as an infra stall. This is the drift sweep referenced elsewhere in [[drift-alert]]; the heartbeat is this station's only externally observable health signal (see "station 6" above).

## The live loop dashboard (item 122)

`tools/loop-dashboard.ts`, launched via `npm run loop:dashboard` (`vite-node --script`), follows the `tools/serve-trace.ts` local-HTTP-page pattern and the item-121 `import.meta` entry guard (importing the module never starts the server). Binds `127.0.0.1` only.

### Data sourcing: in-process, not the CLI child

The dashboard reuses `buildLoopReport` **in-process**, deliberately not `buildDoctorReport`. `buildDoctorReport` also runs the MCP reachability probe, the codex-adapter child check, and agent probes — none of which the dashboard needs, and all of which would violate its read-only/no-network contract. Calling `buildLoopReport` directly means the dashboard never spawns a child process, never hits the network beyond serving its own page, and its no-write guarantee follows straightforwardly from `buildLoopReport`'s own existsSync-gated storage open.

### Port resolution

`resolveDashboardPort(argv, env)`: `--port <n>` flag → `ECHO_LOOP_DASHBOARD_PORT` env → `DEFAULT_LOOP_DASHBOARD_PORT` (`38480`, adjacent to `serve-trace.ts`'s `38479`). An invalid explicit port (non-numeric, out of `1–65535` range, or a bare `--port` flag) is a fatal one-line stderr diagnostic + non-zero exit — it never silently falls back to the default.

### `/api/status` contract

A single JSON document: `generated_at`, `cache` (`{ stale, age_ms, computed_at }`), `serving` (`{ classification, staleness }`, straight from the loop report's `serving` section), `stations` keyed `"1" | "2" | "3" | "4" | "6"` (`StationId`), and `heartbeats` keyed by worker name. Heartbeats are built by iterating `EXPECTED_WORKERS` (the 120 `WorkerName` set) via `buildHeartbeats()` — **never** a `worker-heartbeat-*.json` glob, so a worker whose file is missing still surfaces as an explicit `{ error }` entry instead of silently vanishing from the map. `mapStation4` folds `loop.station3.teamDecisionsCount` into its own `"4"` entry; `mapStation6` builds its entire entry from the drift-sweep heartbeat alone, since doctor's loop report carries no drift section.

### Single-flight cache

`createStatusProvider()` throttles recomputation to `MIN_RECOMPUTE_INTERVAL_MS` (10 s) and guarantees at most one `buildLoopReport` call in flight at a time, bounded by `DOCTOR_COMPUTE_TIMEOUT_MS` (8 s). A poll arriving mid-computation either gets the last cached document stamped `cache.stale: true` (warm case) or joins the one shared in-flight computation (cold case — no prior document yet); a timeout or failure degrades the doctor-derived sections to a stable `unknown` skeleton (`unknownStations`) rather than ever returning `undefined`, a 500, or an unbounded stall. Heartbeats are read independently of the doctor computation, so they still render even when the doctor side times out.

The page itself (`GET /`) is one self-contained HTML document — inline CSS/JS, zero external requests — that polls `/api/status` on `DEFAULT_POLL_INTERVAL_MS` (15 s) and renders all five station cards plus serving identity, with `ok | degraded | disabled | unknown` (`StationStatus`) visually distinct via left-border color and a status chip.

## Card provenance trace (item 123)

Before this item, station 3's intake cards were unobservable: the founder's verdict on 2026-07-06 was "a card can be made with diff context from diff tools across diff time. this is the most important part and with no observability i cannot optimize and debug." An audit of the live chain found station 2's provenance complete (signal → raw note via `dedupe_key`/`parent_dedupe_key`/`extraction_run_id`) but two things dark: the card's own derivation, and everything the brain-backed classifier retrieved via MCP while producing it.

### The card atom

Every successful card post appends one `derived:intake-cards` atom (`GRANOLA_INTAKE_CARD_SOURCE` in `src/enrich/granola-intake-candidates.ts`), with `dedupe_key` `granola:card:<candidate_key>` (via `granolaCardDedupeKey`) so re-posts and the existing duplicate-suppression path can't double-write. Its metadata (`IntakeCardAtomMetadata`) carries the exact rendered card text, the classified fields, `candidate_key`, the consumed signal `dedupe_key` refs, `note_id`, `channel_id`, the seed-status timestamp, and a `classifier_run: ClassifierRunRecord`.

Card-atom write failure never blocks posting, but fail-soft is not silent-lossy: the seed record gains a durable `card_atom_status` field (`'written' | 'failed'`, `src/enrich/granola-intake-seed-store.ts`), written in the same seed-store update as the post. A `failed` marker cannot be cleared by a later duplicate-suppressed rerun — it's a permanent provenance-loss flag that `trace-card` surfaces as a banner.

### Retrieval correlation — the house pattern for brain-backed derivations

`ClassifierRunRecord` (`src/brain/brain.ts`) makes the classifier's ECHO MCP retrievals recoverable from the store after the child process exits, one hop from the card atom via `run_id`. Its `capture_status` is a required tri-state — `'ok' | 'zero_retrievals' | 'capture_failed'` — so a run that legitimately retrieved nothing is distinguishable from a run whose capture broke; capture failure surfaces as `capture_failed`, never a fabricated `zero_retrievals`.

The capture **mechanism** is a per-run localhost recording proxy: the brain child's `ECHO_MCP_URL` env var is pointed at the proxy instead of the real daemon (`DEFAULT_ECHO_MCP_URL = 'http://127.0.0.1:38478/mcp'`); the proxy forwards every request byte-for-byte to the real daemon — so it can never alter what the classifier sees — and tees a coarse summary of each `tools/call` exchange (`summarizeMcpToolInput`/`summarizeMcpToolResult`) into `RetrievalRecord[]`. This proxy-in-front-of-the-MCP-URL shape is documented as **the house pattern for future brain-backed derivations** (a drift responder, a CEO answerer) that need the same retrieval-correlation guarantee.

**Known blind spot.** The proxy only sees traffic that actually flows through it. A child that hardcodes the daemon's real MCP URL instead of resolving it from its injected `ECHO_MCP_URL` env var bypasses the proxy entirely and — because no request ever reaches it — the run records a fake `zero_retrievals` rather than `capture_failed`. This is a structural gap in the recording-proxy pattern, not a bug in this item's own wiring (the proxy is wired only into the intake classifier today, not the CEO responder); any future adopter of the pattern must verify the child actually resolves the injected URL.

### `trace:card`

`tools/trace-card.ts`, `npm run trace:card` (`vite-node --script`, item-121 entry guard), takes a `candidate_key` or `--note <note_id>` and prints the full provenance tree: card atom → classifier run (with its retrieval list, or the explicit zero-retrievals/capture-failed line, or the `card_atom_status: failed` provenance-loss banner) → consumed signal atoms (`GRANOLA_SIGNAL_SOURCE`, `derived:granola-signals`) → raw source atoms (`GRANOLA_RAW_SOURCE`, `api:granola`). Every stage names what's absent rather than erroring — a pre-123 card has no card atom, and the tool says exactly that while still walking the seed → signal → raw remainder for it.

## Read-only discipline, shared

All three surfaces — doctor's loop section, the dashboard, and `trace-card` — share one storage-open contract: `SqliteStorage`'s constructor mkdirs, creates, and migrates a missing db, so a health/trace tool must never construct one against a db that might not exist. Each gates its own storage open on `existsSync(dbPath)` first, treating a missing db as a soft "not yet run" state rather than materializing an empty store as a side effect of looking at it. Each of items 117, 122, and 123 has a dedicated test asserting a full run against a scratch `ECHO_HOME` leaves the filesystem byte-identical.

## Related

- [[system-architecture]] — the substrate these tools read: capture surfaces, storage, the atom shape
- [[echoctl-cli]] — the `echoctl doctor` command this extends
- [[terminal-intake-card]] — the station-3 posting surface whose derivation item 123 makes observable
- [[mcp-server]] — the retrieval interface the recording proxy interposes in front of
- Per [[append-only-ledger]] in the Claude wiki — the atom-store discipline `derived:intake-cards` and heartbeats build on

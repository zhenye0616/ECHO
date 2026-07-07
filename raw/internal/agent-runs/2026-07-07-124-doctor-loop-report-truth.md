# Agent run — 2026-07-07-124-doctor-loop-report-truth

- **Agent persona:** cc-124 (distinct ECHO_AGENT_ID; the default machine UUID was already holding builder-125's claim on item 125, so a fresh writer identity was required to avoid a false resume-attach)
- **Branch:** agent/doctor-loop-report-truth
- **Claim commit (main):** 54bce1d001ebdf567a05aa8f687ebf6dabdd5324
- **Branch head_sha:** 5042b0890efd6a6c9568c895331ce7deed7fd433
- **Worktree:** ~/Desktop/Project_echo--doctor-loop-report-truth

## Claim-time note (environmental)

`python3 tools/blocked.py` aborts globally (RC=2) because
`backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md` has
`priority: MEDIUM` (validator requires HIGH/MED/LOW). That is a different,
proposed (non-claimable) item, not 124. Because I was directed to a specific
sealed item, I verified 124's `ready_content_sha`
(`bfae14df5ffcde6396228eae6aa716650df455d047b354aba7b8649acae3d868`) byte-for-byte
against `blocked.normalized_content_sha()` — exact match — then did a targeted
atomic claim (git mv ready/→claimed/ + frontmatter + push, rebased once on a
concurrent push). Flagging 126's malformed priority for the strategist; it blocks
the deterministic selector for everyone.

## What was implemented

### AC1 — station-2 observed via the item-120 heartbeat contract
- `buildLoopStation2` now reads the `granola-signals` worker heartbeat via the
  120 exported contract (`workerHeartbeatPath(GRANOLA_SIGNALS_WORKER)`,
  `WorkerHeartbeat` type). New helper `readSignalsHeartbeat(now)` reads +
  validates the file; a missing OR malformed file returns `null` (NOT a hard
  fault — heartbeats are best-effort atomic overwrites).
- **Observed path (heartbeat present):** `inferred: false`. Disabled state +
  reason come from the heartbeat; liveness/staleness derive from
  `last_tick_at`, not checkpoint mtime. A `disabled` heartbeat → new
  `Station2Condition: 'disabled'` + soft `station-2:disabled` degradation with
  reason. A `degraded` heartbeat (the f19dc419 silent-brain class) → soft
  `station-2:degraded` degradation (surfaced, never read as healthy). Observed
  stale (last_tick older than `staleMs`) → soft `station-2:stale`.
- **Inferred fallback (missing/malformed heartbeat):** `inferred: true`,
  `heartbeat: null` — the exact pre-124 checkpoint-mtime inference (never-ran /
  stale), preserved byte-behavior so every existing station-2 test still passes.
- The checkpoint is still read in BOTH paths for per-note failing-notes + mtime
  display + the malformed-checkpoint hard fault; only the staleness DECISION is
  heartbeat-first.
- `STATION2_DISABLE_INFERENCE_NOTE` → `STATION2_OBSERVED_NOTE`, rewritten to the
  observed-first semantics.
- New report fields on `LoopStation2`: `inferred: boolean`,
  `heartbeat: LoopStation2Heartbeat | null`.

### AC2 — station-1 truthful source classes
- `LOOP_CAPTURE_SOURCE_CLASSES` repurposed as the PINNED always-interesting set:
  dropped the phantom `claude-code:`/`codex:`/`cursor:` (always 0 by
  construction — extractors emit `fs:`), added `coord:` (18k+ live events that
  were silently omitted).
- Station-1 rows = pinned ∪ classes-actually-present-in-store. Presence is a
  bounded newest-first distinct-prefix scan (`deriveStoreSourceClasses`,
  `LOOP_SOURCE_CLASS_DERIVE_SCAN_LIMIT = 5000`) — the "cheap query / equivalent"
  the AC allows; the pinned set guarantees the load-bearing surfaces appear
  regardless of the window. `sourceClassOf` keeps `api:granola`'s two-segment
  granularity and collapses everything else to the first-`:` prefix.
- A pinned class with zero atoms is annotated `no atoms with this source class
  in store` (new optional `annotation` field on `LoopCaptureSourceHealth`);
  present classes omit it. No extractor prefix changes (explicitly out of scope).

### AC3 — downstream compatibility
- `/api/status` types `sources` as opaque (`Record<string, unknown>`), so the
  additive `annotation` field is within-contract; the 122 AC5-pinned shape test
  (`sources.length`) still holds. `tools/loop-dashboard.ts` was NOT edited (no
  feature work, no doc-comment change needed). Only the dashboard test's
  `fakeLoopReport` fixture was updated for the two new required station2 fields.

### AC4 — tests
Added to `tests/cli/doctor-loop.test.ts` (6 new, all green): observed disabled;
quiet-day false-alarm regression (fresh heartbeat + 8h-old checkpoint → healthy,
not stale); observed stale; missing-heartbeat inferred:true fallback;
malformed-heartbeat inferred:true fallback (no hard fault); store-derived classes
(fs:/coord:/api:granola present, no phantom rows, coord: not annotated);
zero-atom pinned class annotated + rendered in doctor text.

## Files modified
- `src/cli/commands/doctor.ts` (in files_to_modify)
- `tests/cli/doctor-loop.test.ts` (in files_to_modify)
- `tests/tools/loop-dashboard.test.ts` (in files_to_modify — shape-compat fixture)
- `src/cli/io/render.ts` — **NOT in the (PROVISIONAL) files_to_modify list.**
  Added because AC2 says a zero-atom class must not "render as a bare 0-count":
  the station-1 source line is rendered here, so the annotation must be shown
  here (3-line change). Flagged for reviewer.

## Design calls flagged for review
1. **render.ts addition** (above) — provisional-list gap; minimal + directly
   serves AC2's rendering clause.
2. **Severity of observed disabled/degraded = SOFT** (informational, does not
   downgrade `overall`). Rationale: the item's thesis is "the report tells the
   truth" and the primary bug was a FALSE ALARM (over-reporting stale); the
   truth is surfaced via `condition`, the `heartbeat` field, and a soft
   degradation with reason. Making observed-disabled a HARD fault would change
   the load-bearing overall-rollup contract (pinned by the boundary test) and
   add new alarm behavior beyond AC1's letter — deferred as a founder policy
   call, not made unilaterally.
3. **`degraded` heartbeat handling** — AC1 names only `disabled` + staleness,
   but ignoring a `degraded` heartbeat would recreate the exact silent-failure
   the heartbeat exists to expose, so it is surfaced as a soft
   `station-2:degraded` degradation (condition stays `active` — worker is alive
   and ticking; the `heartbeat.status` field carries `degraded` for consumers).

## Acceptance status
- AC1: PASS (observed path + inferred fallback + quiet-day regression + note update)
- AC2: PASS (derived ∪ pinned, coord: surfaced, phantom gone, annotation)
- AC3: PASS (shape-compatible; fixture updated; dashboard source untouched)
- AC4: PASS (6 new tests; targeted + full gate green)

## Verification (verbatim, in worktree)
- `npx vitest run tests/cli/doctor-loop.test.ts` → 31 passed (31)
- `npx vitest run tests/tools/loop-dashboard.test.ts` → 13 passed (13)
- `npm run lint` → rc 0
- `npm run typecheck` → rc 0
- `npm run test` → 2084 passed, 21 skipped, 1 todo; **1 failed:**
  `tests/cli/shell-reachable.test.ts` (daemon-health timeout under full-suite
  load — the item-126 known flake named at handoff). Re-run in isolation:
  `npx vitest run tests/cli/shell-reachable.test.ts` → 1 passed (24.5s). Not
  related to this change.

## Open questions
None blocking. Items 1-3 above are review-time design calls, not builder
uncertainties.

---
id: 2026-07-07-129-deadline-anchor-emitted-at
title: "Coord deadlines anchor on emitted_at, not tracker-now — restarts stop silently re-baselining every open deadline; the deadline_missed detector becomes able to fire in production"
status: proposed
priority: HIGH
estimate: 0.25d
created: 2026-07-07
claimed_by: "cc-129-deadline-anchor"
claimed_at: "2026-07-07T18:14:41Z"
branch: "agent/deadline-anchor-emitted-at"
head_sha: "02489bbce9b3bd40459304a7fb408e5a940d0fdd"
pr_url: ""
agent_notes: |
  resolveExpectedBy now anchors the deadline time base on event.emitted_at
  (canonicalized) in all three duration branches, with a defensive
  this.now() fallback only when emitted_at is unparseable (parseEmittedAtMs
  helper). Replay/reconstruct is now wall-clock idempotent. New tests:
  deadlines-emitted-at-anchor.test.ts (AC2 restart-invariance, AC3
  old-emitted_at skew fires promptly, AC4 garbage-emitted_at fallback, no
  throw/NaN). Gates: npx vitest run tests/coord/ green 132/132 (3 runs);
  npm run test 2099 passed / 0 failed (exit 0 — both named flakes green in
  the full run, no isolation-pass tolerance needed); lint + typecheck clean.
  REVIEWER: two existing-fixture edits need scrutiny — in
  deadlines-reconstruction.test.ts (out-of-order test) and
  coord-status-shape.test.ts (close-after-miss test), a seeded tick_start's
  emitted_at moved from a far-past date to 2026-05-16T09:55 so its
  emitted_at-anchored window stays after `now` and does not fire under the
  new (AC3-intended) skew semantics. Both preserve the test's original
  intent (append-order authority / slot-clearing by sequence); neither hides
  a regression — they remove a side effect the old now-anchoring masked. Full
  rationale + verbatim gate output in
  raw/internal/agent-runs/2026-07-07-129-deadline-anchor-emitted-at.md.
blocked_by: []
spec_refs:
  - src/coord/deadlines.ts                          # resolveExpectedBy (~:398-415) — the one function to change; reconstruct/applyReplayAtom for context
  - tools/review-queue/coord-emit.sh                # :135 — proof the production emitter never sends expected_by
  - src/mcp/server.ts                               # :231-241 — reconstruct() awaited on every daemon boot
  - raw/internal/decisions/2026-07-07-time-bomb-audit.md   # the audit finding (severe, live, restart-gated)
files_to_modify:
  # PROVISIONAL
  - src/coord/deadlines.ts
  - tests/coord/                                    # missing-expected_by-across-restart coverage
ready_content_sha: fc1a16c0707cabecf6d745191cd0a563db6923ca494994a247fd238b72828eb7
review_notes: |
  Merged on 2026-07-07 via founder reconciliation (pre-approved clean-path run).

  Conflicts resolved:
  - none: src/coord/ + tests/coord/ untouched on main since claim; branch merged
    cleanly (4 files: src/coord/deadlines.ts, tests/coord/coord-status-shape.test.ts,
    tests/coord/deadlines-reconstruction.test.ts, new tests/coord/deadlines-emitted-at-anchor.test.ts).

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none (sidecar Pre-merge fixups list was empty)

  Fixups deferred to follow-up items:
  - none

  Reviewer recording (builder-flagged fixture edits, independently verified):
  - Both existing-fixture edits (deadlines-reconstruction.test.ts out-of-order test;
    coord-status-shape.test.ts close-after-miss test) were verified as forced by the
    semantics change AND intent-preserving: append-order authority and sequence-based
    slot-clearing properties remain intact. Neither hides a regression.
  - The live-semantics change (a deadline now measures from event emission, not from
    delivery/restart) is the spec-pinned intent, not drift.
  - Effect once merged: the deadline_missed detector becomes able to fire in
    production for the first time, retroactively covering historical ledger atoms
    whose emitted_at is parseable.

  Verify: npm test 2097 pass / 21 skipped / 1 todo, with the two founder-authorized
  load-flakes (tests/cli/shell-reachable.test.ts, tests/surfaces/ceo-slack-brain.test.ts)
  failing in the full run and each passing on isolation re-run (shell-reachable 1/1;
  ceo-slack-brain 18/18). lint clean; typecheck clean; check-coupled-invariants OK;
  sync-skills --check OK.

  Follow-up items (non-blocking):
  - cosmetic: parseEmittedAtMs's Number.isNaN check is unreachable
    (canonicalizeTimestamp throws first) — harmless defense-in-depth, note only.
  - real-world validation (spec After-Completion): with an artificially hung reviewer
    across daemon restarts, confirm the first-ever production deadline_missed atom appears.
---

## Problem

The 2026-07-07 time-bomb audit found the coord deadline system's SLA-miss
detector structurally defeated in production: the only production emitter
(`coord-emit.sh`) never sends `expected_by`; `resolveExpectedBy` computes the
deadline as `this.now() + default_deadline_sec` and holds it in memory only;
`reconstruct()` (awaited on every daemon boot) replays atoms whose metadata
carries no `expected_by` and recomputes from **restart** time. Every restart
re-baselines every open deadline, so a hung reviewer never produces
`deadline_missed` as long as the daemon restarts within the window — which it
routinely does. Every existing test seeds `expected_by` explicitly, so the
field-omitted path (the only path production takes) is untested.

## Acceptance Criteria

- **AC1 — the anchor change:** `resolveExpectedBy` derives its time base from
  `event.emitted_at` (canonicalized; defensive fallback to `this.now()` only
  when `emitted_at` is unparseable) instead of `this.now()`, in ALL three
  branches (caller-supplied clamp `emitted_at + max`, default
  `emitted_at + default_deadline_sec`, no-config fallback `emitted_at + 600s`).
  Live ingest behavior is effectively unchanged (`emitted_at ≈ now` at emit
  time); replay becomes idempotent — the deadline a record gets after N
  restarts is byte-identical to the one it got at first ingest.
- **AC2 — restart-invariance test (the untested production path):** a test
  seeds a coord atom WITHOUT `expected_by`, ingests it live, captures the
  resolved deadline, then constructs a fresh tracker and `reconstruct()`s from
  storage with a clock advanced past the restart — asserting the reconstructed
  record carries the SAME deadline (not restart-now + default), and that once
  the original window elapses the `deadline_missed` path fires even though a
  "restart" happened mid-window.
- **AC3 — skew semantics pinned:** a test covers a late-appended atom whose
  `emitted_at` is already older than its window at ingest/replay time: the
  deadline resolves to the past and the miss fires promptly. A code comment
  addresses the file's r4 skew lesson head-on: the 057a r4 concern was about
  using an `emitted_at` HORIZON to skip replay atoms (unsafe — drops
  late-appended events); anchoring the DEADLINE on `emitted_at` is the
  opposite posture — late/old events get truthfully-expired deadlines instead
  of silently fresh ones.
- **AC4 — retroactivity scoped, no migration:** because derivation happens at
  replay, historical ledger atoms whose `emitted_at` is parseable are covered
  automatically (r1 correction: not an unconditional claim — AC1's defensive
  fallback to `this.now()` fires for unparseable `emitted_at`). The builder
  verifies the parseability premise against reality: `emitted_at` is
  populated from `atom.timestamp` at replay (deadlines.ts applyReplayAtom)
  and from the validated emit input live, both ISO-pinned by existing
  validation — cite that chain in a comment. A test covers the fallback: an
  atom with a garbage `emitted_at` resolves its deadline from tracker-now
  (never throws, never NaNs into Math.min). No schema change, no new
  persisted field, no migration; `coord-emit.ts`/`coord-emit.sh` untouched.
- **AC5 — gate (concrete commands):** `npx vitest run tests/coord/` →
  green incl. the new AC2/AC3/AC4 tests; `npm run test` fully green, with
  exactly two tolerated exceptions — `tests/cli/shell-reachable.test.ts` and
  `tests/surfaces/ceo-slack-brain.test.ts` (the pre-126 load-flakes) — each
  tolerated ONLY with a recorded isolation pass (`npx vitest run <file>`) in
  the run log; `npm run lint`; `npm run typecheck`.

## Out of Scope (Don't Drift)

- No persist-at-emit variant (rejected: two files, additive schema change,
  and it cannot fix the historical atoms already in the ledger).
- No changes to `coord-emit.ts`/`coord-emit.sh`, the event registry,
  `default_deadline_sec`/`max_deadline_sec` values, or the TZ-suffix
  validation gap in `validate.ts:87` (separate audit follow-up).
- No new observability surfaces; `deadline_missed` emission mechanics stay
  as-is — this item only makes the timer honest.

## After Completion (Strategist Notes)

- Update the time-bomb audit doc's finding #1 status and the coord/observability
  wiki pages at the next promotion pass (the deadline mechanism's semantics
  materially changed from "resets on restart" to "anchored on emit").
- Real-world validation candidate: after a few daemon restarts with an
  artificially hung reviewer, confirm a `deadline_missed` atom actually
  appears — the first one ever, if the audit is right.

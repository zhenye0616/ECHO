# Agent run — 2026-07-07-129-deadline-anchor-emitted-at

- **Item:** `backlog/*/2026-07-07-129-deadline-anchor-emitted-at.md`
- **Agent persona:** `cc-129-deadline-anchor` (distinct ECHO_AGENT_ID — the
  machine default UUID was already on item 126's claim; a distinct id avoids
  falsely attaching to builder-126's active claim per the parallel-agent rule)
- **Branch:** `agent/deadline-anchor-emitted-at`
- **Claim commit (main):** `6cb6a10588fecf8ad22a890f990d52a6f942cfcd`
- **head_sha (feature branch):** `02489bbce9b3bd40459304a7fb408e5a940d0fdd`

## Run 1

### What implemented

`resolveExpectedBy` in `src/coord/deadlines.ts` now derives its deadline time
base from `event.emitted_at` instead of `this.now()`. Added a private
`parseEmittedAtMs(emitted_at)` helper that canonicalizes via
`canonicalizeTimestamp` (capture/pipeline naive→UTC) and returns epoch ms, or
`null` when unparseable (try/catch around the RangeError that
`new Date(bad).toISOString()` throws). `resolveExpectedBy` computes
`baseMs = parseEmittedAtMs(event.emitted_at) ?? this.now().getTime()` and uses
`baseMs` in all three duration-anchored branches:

- caller-supplied clamp: `max = baseMs + max_deadline_sec*1000` (AC1 "emitted_at + max")
- default: `baseMs + default_deadline_sec*1000` (AC1 "emitted_at + default")
- no-config fallback: `baseMs + 600s` (AC1 "emitted_at + 600s")

The fourth path (expected_by present but no eventConfig →
`canonicalizeTimestamp(event.expected_by)`) is not time-base anchored and is
unchanged.

Consequence (intended, per AC1): live ingest is effectively unchanged
(`emitted_at ≈ now`); replay/reconstruct becomes wall-clock idempotent — the
deadline after N restarts is byte-identical to first ingest. Previously each
`reconstruct()` recomputed open deadlines off restart-now, so a daemon that
restarted within the window (routine) re-baselined every open deadline and
`deadline_missed` could not fire.

### Files modified

- `src/coord/deadlines.ts` — `resolveExpectedBy` body + JSDoc; new
  `parseEmittedAtMs` helper. JSDoc carries the AC3 skew comment (anchoring the
  DEADLINE on emitted_at is the OPPOSITE of the 057a r4 rejected design, which
  used an emitted_at HORIZON to SKIP replay atoms) and the AC4 parseability-chain
  comment (emitted_at ISO-pinned at both entry points: live via validate.ts
  isNonEmptyString+ISO_RE, on replay via applyReplayAtom setting
  emitted_at=atom.timestamp).
- `tests/coord/deadlines-emitted-at-anchor.test.ts` — NEW. AC2/AC3/AC4.
- `tests/coord/deadlines-reconstruction.test.ts` — fixture-only edit (see below).
- `tests/coord/coord-status-shape.test.ts` — fixture-only edit (see below).

### Acceptance per criterion

- **AC1 (anchor change):** DONE. All three duration branches anchor on
  `baseMs` (emitted_at, with `?? this.now()` fallback). Verified by AC2/AC3/AC4
  tests + typecheck.
- **AC2 (restart-invariance test):** DONE. `deadlines-emitted-at-anchor.test.ts`
  first test: seeds a coord atom WITHOUT `expected_by`, ingests it live
  (captures deadline = EMIT+90s), constructs a fresh tracker, `reconstruct()`s
  with the clock advanced 45s into the window, asserts the reconstructed record
  carries the SAME deadline (and NOT restart-now+90s), then advances past the
  ORIGINAL window and asserts `tick()` fires `deadline_missed` with the original
  expected_by.
- **AC3 (skew semantics + comment):** DONE. Second test: late atom with
  `emitted_at` a full hour older than `now` → deadline resolves to the past →
  fires promptly during reconstruct's post-replay fire pass. Code comment in
  `resolveExpectedBy` JSDoc distinguishes this from the 057a r4 HORIZON lesson.
- **AC4 (fallback scoped + comment + garbage test):** DONE. Parseability-chain
  comment cites the two ISO-pinned entry points. Third test: atom with a
  garbage `emitted_at` (no `expected_by`) → `reconstruct()` does not throw
  (asserted `resolves.toBeUndefined()`), record opens with a valid ISO deadline
  = tracker-now+90s (never NaN into Math.min). No schema change, no persisted
  field, `coord-emit.ts`/`coord-emit.sh` untouched.
- **AC5 (gate):** DONE. See test output below. `npx vitest run tests/coord/`
  green (132/132, 3 consecutive runs; perf test 702-909ms < 1500ms budget).
  `npm run test` fully green: **2099 passed | 21 skipped | 1 todo, 0 failed**
  (exit 0). The two named tolerated flakes
  (`tests/cli/shell-reachable.test.ts`, `tests/surfaces/ceo-slack-brain.test.ts`)
  both passed inside the full run — no tolerance/isolation-pass needed this run.
  `npm run lint` clean. `npm run typecheck` clean.

### Two existing-fixture edits (reviewer: scrutinize these)

Both are fixture-timestamp-only changes that preserve each test's actual
intent; neither hides a regression — they remove an unintended side effect the
old now-anchoring masked:

1. `deadlines-reconstruction.test.ts` "out-of-order emitted_at: append order is
   authoritative" — the seeded tick_start carried `expected_by: futureExpected`
   AND an `emitted_at` of `2026-05-15T23:00`. Under emitted_at anchoring the
   clamp ceiling (`emitted_at + max_deadline_sec`) resolved to the past, so the
   newly-opened tick_end record fired during reconstruct (snap.round length 0
   instead of 1). Moved emitted_at to `2026-05-16T09:55` — still EARLIER than
   the reviewer_invoked (10:00) it closes, so the out-of-order-append assertion
   is intact, but the clamped window (09:55+1200s = 10:15) stays after `now`
   (10:00:15) so the record stays open as the test asserts.
2. `coord-status-shape.test.ts` "successful close after miss CLEARS the slot" —
   a lone tick_start seeded at `2026-05-15T10:00` opened a dangling tick_end
   deadline; under emitted_at anchoring that resolved to the past and added a
   spurious `(codex, tick_end)` miss slot, so `last_miss_per_role_per_event_type`
   was length 1 not 0. Moved emitted_at to `2026-05-16T09:55` (tick_end window
   10:05 > now 10:00) so it stays open, matching the pre-change behavior the
   slot-clearing assertion depends on.

The `coord-volume-perf.test.ts` 100k-atom test flaked ONCE in the first full
`tests/coord/` run (reconMs > 1500ms under vitest parallel-file contention) but
passed solidly in isolation (~320ms) and in 3 subsequent full-suite runs
(702-909ms). Load-sensitive, not a semantic regression — every seeded group
fully closes (reviewer→tick_start→tick_end), so nothing fires differently under
the anchor change.

### Verbatim gate output

```
# npx vitest run tests/coord/  (3 consecutive runs)
Test Files  23 passed (23)
     Tests  132 passed (132)
# perf: reconstruct <1500ms + coord_status <300ms at 100000 atoms — 702-909ms

# npm run typecheck
> tsc --noEmit
(clean, exit 0)

# npm run lint
> eslint . --max-warnings 0 && npm run lint:task-state
> python3 tools/task-state/lint.py
(clean, exit 0)

# npm run test
Test Files  202 passed | 1 skipped (203)
     Tests  2099 passed | 21 skipped | 1 todo (2121)
(exit 0)
```

### Open questions

None.

### Drift events

None. Change confined to `resolveExpectedBy` + one helper + coord tests, all
within `files_to_modify` (`src/coord/deadlines.ts`, `tests/coord/`).
`coord-emit.ts`/`coord-emit.sh`, the event registry, deadline-sec values, and
`validate.ts:87` TZ gap all left untouched per Out of Scope.

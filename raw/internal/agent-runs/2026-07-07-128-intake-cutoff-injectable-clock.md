# Agent run — 2026-07-07-128-intake-cutoff-injectable-clock

- **Item:** `2026-07-07-128-intake-cutoff-injectable-clock`
- **Branch:** `agent/intake-cutoff-injectable-clock`
- **Builder head_sha:** `78511aaa2a2d82d373939c11d93d25a72effb8a4`
- **Claim commit (on main):** `2b8eafd14ec07470468bab34b0c06b10674dca9d`
- **Outcome:** AC1 ✅, AC2 ✅ (via founder-ratified scope widen — see below), AC3 ✅, AC4 ✅. Fast-track hotfix; the 4 red intake-terminal AC6 tests are green, full suite is green modulo the two known pre-126 load-flakes (isolation-verified).

## Run 1 (2026-07-07)

### What implemented

**AC1 — cutoff derives from the injected clock.** `src/enrich/granola-intake-candidates.ts:477`:

```ts
// before
const cutoffIso = new Date(Date.now() - config.lookbackMs).toISOString();
// after
const cutoffIso = new Date(new Date(now()).getTime() - config.lookbackMs).toISOString();
```

Single-clock formulation. `now` is `deps.now ?? (() => new Date().toISOString())`, so the default (no injected clock) is byte-equivalent to the prior real-time behavior; only injected-clock callers change.

**AC3 — regression pin.** New `tests/enrich/granola-intake-cutoff-clock.test.ts`. Injects `now = 2020-01-08T00:00:00.000Z`, seeds a qualifying external-attendee note + action signal dated `2020-01-07T00:00:00.000Z` (inside the injected 7-day lookback, far older than any real wall-clock cutoff), asserts `result.status === 'ok'`, `candidates === 1`, `posted === 1`. A comment names the 2026-07-07 time-bomb. Direct `runGranolaIntakeBridgeOnce` call, self-contained config/helpers.

**AC2 — red-to-green (founder-ratified deviation).** See "AC2 premise error + ratified deviation" below. Added `now: () => '2026-06-30T10:06:00.000Z'` to the three AC6 tests that omitted it — `AC6.2` (its two `runIntakeTerminalOnce` calls), `AC6.3a`, `AC6.3b` — in `tests/tools/intake-terminal.test.ts`. Fixtures untouched; no other test change. This is exactly the "fixtures' fixed dates plus the injected now are self-consistent forever" state AC2 describes.

### AC2 premise error + ratified deviation

- **Premise error:** AC2 (and the spec's Problem section) assumed all 4 red AC6 tests inject a fixed `now`. Only **AC6.1** did. **AC6.2, AC6.3a, AC6.3b** did NOT pass `now` to `runIntakeTerminalOnce`, so they ran on the real wall clock. Their hardcoded 2026-06-30 fixtures aged out of the 7-day lookback exactly on 2026-07-07. The AC1 product fix greens ONLY the injected-clock test (empirically: base 4 failed/4 passed → after AC1 only 3 failed/5 passed).
- **Source of the error:** builder-126's run log states "the tests inject a fixed `now` … for everything else"; that mis-statement was inherited by the 128 spec.
- **Ratified deviation (exact shape):** founder-delegated authorization (via team lead, under the 121/123/124 fast-track precedent) to widen `files_to_modify` to include `tests/tools/intake-terminal.test.ts` and relax AC2's "no test file" clause for exactly these injections: add one `now: () => '2026-06-30T10:06:00.000Z',` line to each of AC6.2's two calls, AC6.3a, and AC6.3b (4 inserted lines total). Nothing else in the test file; fixtures stay untouched.
- **Reviewer note:** the independent reviewer should verify the injected-clock additions change no test semantics beyond clock injection (the assertions, fixtures, and classifier/post stubs are byte-identical; only the previously-defaulted `now` is now pinned to the fixture-consistent value already used by AC6.1).

### INFO-ONLY second-fuse audit (requested by team lead — no edits made)

Question: does `tests/enrich/granola-intake-candidates.test.ts` inject `deps.now` in its default-config tests, i.e. does the AC1 fix defuse the second computed fuse (2026-06-30 fixtures through the 30d default lookback → detonates ~2026-07-30T10:05Z)?

**Answer: it detonates regardless — the AC1 fix does NOT defuse it.** That file has ZERO `now:` injections; none of its `runGranolaIntakeBridgeOnce` calls pass `deps.now` (default-config tests at lines 168, 230, 256, 293/294, 341 all use `baseConfig()` = 30d lookback with 2026-06-30 fixtures and no clock injection). Because they read the real wall clock for the cutoff exactly like the intake-terminal AC6.2/3a/3b tests did, the AC1 product fix cannot reach them. This needs the follow-up item (inject a fixed `now` into those default-config tests, or relativize the fixtures). Same latent class as the strategist-notes grep-audit follow-up.

### Files modified

- `src/enrich/granola-intake-candidates.ts` — AC1 one-expression fix (line 477).
- `tests/enrich/granola-intake-cutoff-clock.test.ts` — NEW, AC3 regression pin.
- `tests/tools/intake-terminal.test.ts` — AC2 founder-ratified 4-line `now` injection (AC6.2 ×2, AC6.3a, AC6.3b).
- `raw/internal/agent-runs/2026-07-07-128-intake-cutoff-injectable-clock.md` — this log.

Branch `agent/intake-cutoff-injectable-clock` @ `78511aaa2a2d82d373939c11d93d25a72effb8a4`.

### Acceptance per criterion

- **AC1 ✅** — cutoff derives from `now()`; default behavior byte-equivalent.
- **AC2 ✅** — `npx vitest run tests/tools/intake-terminal.test.ts` → **8/8 passed** (was 4 failed/4 passed). Achieved via the founder-ratified test injection above; fixtures untouched.
- **AC3 ✅** — `npx vitest run tests/enrich/granola-intake-cutoff-clock.test.ts` → **green**. **Revert-check performed:** reverted line 477 to `new Date(Date.now() - config.lookbackMs)`, re-ran → **1 FAILED** (fixture older than wall-clock cutoff → candidate dropped), then restored the fix. The test is a genuine falsifier of the bug.
- **AC4 ✅ (gate):**
  - `npx vitest run tests/tools/intake-terminal.test.ts` → 8/8.
  - `npx vitest run tests/enrich/granola-intake-cutoff-clock.test.ts` → 1/1 (revert-red confirmed).
  - `npm run typecheck` (`tsc --noEmit`) → clean.
  - `npm run lint` (eslint --max-warnings 0 + lint:task-state) → clean.
  - `npm run test` → **2 failed / 2094 passed / 21 skipped / 1 todo (2118)**, 156s. The intake-terminal time-bomb (4 tests) is fully resolved. The only 2 failures are the two KNOWN pre-126 load-flakes, both isolation-verified green:
    - `tests/surfaces/ceo-slack-brain.test.ts` — full-suite ENOENT on `descendant.pid` under CPU contention; **isolated 18/18 pass** (1.95s). Fixed by item 126 AC2 (not yet merged — 126 is blocked on this item).
    - `tests/cli/shell-reachable.test.ts` — full-suite daemon-install port contention; **isolated 1/1 pass** (25.9s). Fixed by item 126 AC1 (not yet merged).

### Verbatim test output (key lines)

```
# intake-terminal after fix
 Test Files  1 passed (1)
      Tests  8 passed (8)

# regression pin (fixed)
 Test Files  1 passed (1)
      Tests  1 passed (1)

# regression pin under REVERTED bug (revert-check)
 Test Files  1 failed (1)
      Tests  1 failed (1)

# full suite
 Test Files  2 failed | 199 passed | 1 skipped (202)
      Tests  2 failed | 2094 passed | 21 skipped | 1 todo (2118)
   Duration  156.32s

# ceo-slack-brain isolated
      Tests  18 passed (18)
# shell-reachable isolated
      Tests  1 passed (1)
```

### Open questions

None blocking. Two follow-ups noted for the strategist (both pre-existing in the spec's "After Completion" + surfaced by the audit):
1. Second-fuse follow-up item: defuse the 30d-lookback fuse in `tests/enrich/granola-intake-candidates.test.ts` default-config tests (no `deps.now`; detonates ~2026-07-30). The AC1 fix does not reach it.
2. Grep audit for other injectable-clock/`Date.now()` splits in `enrich/` and `surfaces/`.

### Drift events

None. The temptation to fix the second fuse and to grep-audit the broader class was resisted (out of scope); reported as INFO/follow-up per the item's own "Out of Scope" and the team lead's INFO-ONLY instruction.

---

## Run 2 (2026-07-07) — founder-ratified extension: defuse the 2026-07-30 second fuse

### Context — reclaim after a crossed handoff

Run 1 completed and handed off to `pending_review` (state-commit `9de02245`,
head_sha `78511aaa…`). The team lead then sent a founder-ratified EXTENSION to
the same deviation (framed as "still pre-handoff, not a rider") — it had crossed
the handoff in flight. Per the "riders-after-handoff break head_sha" rule, I did
NOT silently append. I performed a protocol-correct **reclaim**: `git mv
pending_review/ → claimed/` on main (reclaim commit `4799946e`), applied the
extension on the branch, re-gated, and re-handed-off with a NEW head_sha. No
reviewer had touched the item, so the reclaim was clean.

### What implemented — extension

The Run 1 INFO-ONLY audit found a second fuse: 2026-06-30 fixtures through the
30d default lookback detonate ~2026-07-30 in the bridge tests that do NOT inject
`deps.now`. Applied the SAME treatment as the AC2 injection: add
`now: () => '2026-06-30T10:06:00.000Z'` to each detonating test's deps. No
fixture or assertion changes.

**Census (builder-verified, not just the dispatch's line numbers).** Grepped all
of `tests/` for `2026-06-30` × bridge invocation. The cutoff fuse hits exactly
the 3 dispatched files. Excluded, with reasons:
- `tests/enrich/worker-heartbeat.test.ts` — invokes the bridge but ALREADY
  injects `now` (2026-07-06 values) → robust, no edit.
- `tests/tools/trace-card.test.ts`, `tests/surfaces/ceo-slack-responder/{intake-seed,issue-provenance}.test.ts`
  — use the 2026-06-30 fixture but never invoke the bridge → no cutoff exposure.

**One MORE detonating case than the dispatch's census.** The dispatch named 3
default-baseConfig sub-cases in `granola-intake-candidates.test.ts`; there are
**four**. `records a failed post and reports it` (asserts `failed: 1`) also needs
the note in-window to reach the throwing `postSeed`, so it detonates 2026-07-30
identically. Injected `now` into all four. Correctly left alone: the internal-only
test (`produces zero candidates for an internal-only meeting` — asserts
`notes_seen: 0` via the attendee filter, robust either way) and the
lookback-override test (`respects the lookback bound` — 2020 fixture + 24h
lookback, filtered by design).

### Files modified (Run 2)

- `tests/enrich/granola-intake-candidates.test.ts` — `now` into 4 deps
  (`classifies…`, `caps candidates per note`, `skips already-posted`,
  `records a failed post`).
- `tests/daemon/granola-intake-schedule.test.ts` — `now` into the
  `startGranolaIntakeBridge` options of `runs the bridge after signal extraction`
  (the options type already exposes `now`, which flows to `deps.now`).
- `tests/enrich/granola-intake-card-atom.test.ts` — `now` into all 5 bridge
  tests (3 identical `const deps` via one replace-all + 2 inline calls).
- `raw/internal/agent-runs/2026-07-07-128-intake-cutoff-injectable-clock.md` —
  this Run 2 section.

10 injected lines total. Fixtures/assertions untouched. Branch
`agent/intake-cutoff-injectable-clock` @ `7c209b643618657496558395dc1c9cdc406485d0`.

### Why this is a genuine defuse (mechanism, not a re-run under a fake clock)

The mechanism is identical to AC3's proven revert-check: after the AC1 product
fix, the cutoff derives from `now()`; pinning `now` to `2026-06-30T10:06:00Z`
keeps the fixed 2026-06-30 fixtures permanently inside any positive lookback.
The test logs confirm the injected clock flows (`"now":"2026-06-30T10:06:00.000Z"`,
`notes_seen: 1`). No wall-clock dependence remains in these paths.

### Acceptance / gate (Run 2)

- 3 extension files: `npx vitest run …candidates.test.ts …schedule.test.ts …card-atom.test.ts` → **18/18 passed**.
- `npm run typecheck` → clean. `npm run lint` → clean.
- `npm run test` → **1 failed / 2095 passed / 21 skipped / 1 todo (2118)**, 149s.
  The single failure is the known pre-126 `tests/cli/shell-reachable.test.ts`
  daemon-install port-contention load-flake; **isolated 1/1 pass** (23.6s).
  `ceo-slack-brain` passed in this full run (it and shell-reachable are the two
  named intermittent pre-126 load-flakes; both fixed by item 126, which is
  blocked on this item). All intake tests green.

### Net effect

128 now defuses the ENTIRE known calendar for this fixture class: the 2026-07-07
fuse (AC2, Run 1) and the 2026-07-30 fuse (this extension). The INFO-ONLY
question is answered inline: the AC1 product fix alone does NOT defuse the
30d-lookback tests (they didn't inject `now`); the extension does.

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

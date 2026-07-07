# Agent run — 2026-07-07-126-daemon-smoke-test-serialization

- **Item:** `2026-07-07-126-daemon-smoke-test-serialization`
- **Branch:** `agent/daemon-smoke-test-serialization`
- **Builder head_sha:** `88061f9e10e750f522cc4ed6a48763c804ff33f5`
- **Claim commit (on main):** `6ba1037bf674e0c74cd949da7de57decf4f2fa29`
- **Outcome:** AC1 ✅ and AC2 ✅ complete and verified; **AC3 🔴 BLOCKED** by a pre-existing, deterministic, date-triggered failure in `tests/tools/intake-terminal.test.ts` (outside this item's `files_to_modify`). AC4 escape hatch triggered — escalating via `pending_review` instead of papering over an out-of-scope defect.

## Run 1 (2026-07-07)

### What implemented

**AC1 — race-safe port for the shell-reachable daemon smoke.** The spec's problem
statement referenced a fixed port `47095`, but that literal was already gone: since
item 076 the test used a `findFreePort()`/`canListen()` helper that binds a port,
closes it, and hands the number to the daemon. That is exactly the check-then-use
(TOCTOU) race AC1 forbids — between `close()` and the daemon's later bind, an
overlapping worktree run, a stale daemon, or another suite file can steal the port,
producing the intermittent "did not become healthy on port N" flake.

Replaced it with a bounded-retry loop that makes the daemon's OWN bind+health the
allocation signal: try a random candidate port in `[40000,50000)`, run
`echoctl daemon install`; if it does not reach health, `daemon uninstall` the failed
attempt and retry a fresh candidate (max 6). No pre-bind probe at all, so there is no
TOCTOU window. On success the resolved `daemonPort`/`overrides` drive the existing
stop/start/initialize/status/logs/coord_invoke assertions unchanged. Added a guard so
the `finally` cleanup only runs `daemon stop`/`uninstall` when a port actually
resolved — otherwise empty `overrides` would target the *default (production)* daemon.
Removed the now-unused `findFreePort`/`canListen` helpers and the `node:net`
`createServer` import. Justified in an in-file comment.

**AC2 — ceo-slack-brain `descendant.pid` ENOENT under load.** Root cause diagnosed and
documented in the test file: the test verifies the product kills a timed-out brain's
whole process group by reading a `descendant.pid` file that the stub writes only AFTER
it (a) cold-starts a fresh Node interpreter, (b) ESM-loads the stub, and (c) spawns a
grandchild Node process. Under full-suite CPU contention that cold-start chain routinely
exceeds the test's 200ms `timeoutMs`, so the timeout-driven kill fires BEFORE the stub
registers its pid and the follow-up `readFile` throws ENOENT (18/18 in isolation,
intermittent under load — documented at the 116 merge). The product's process-group
kill was never wrong; the test window was too tight. Fix is test-internal: raise
`timeoutMs` 200→2000 and `killGraceMs` 50→200 so the stub reliably registers its
descendant before the kill, and poll for the pid file (`waitForFile`, bounded, tolerates
transient ENOENT) instead of a single read. The descendant is a long-lived
`setInterval`, so the larger timeout does not change what is asserted — only that the
descendant is reliably registered before the kill.

**Serialization (vitest.config.ts): evaluated, NOT applied.** AC1 requires port-dynamism
regardless of serialization ("serializing the suite would not close this race"); AC2
permits a targeted fix. Both were fixed with race-safe targeted changes that are robust
on their own (proven below across 3 full-suite runs under load). Adding a vitest
serialized group would be extra mechanism the load-bearing fixes do not need — declined
per disposition discipline (prefer the minimal fix). Note for strategist: the third,
out-of-ACs flake the dispatch mentioned (`tests/packaging/packaged-boot.test.ts` under
concurrent npm-pack/prepack rebuild races) would be the natural first member of such a
serialized group if one is later introduced; shell-reachable also runs `build:cli`+`npm
pack`, so a "real-daemon + npm-pack smokes" group could host both.

### Files modified

- `tests/cli/shell-reachable.test.ts` — AC1 bounded-retry port allocation; removed
  `findFreePort`/`canListen` + `createServer` import; guarded `finally` cleanup.
- `tests/surfaces/ceo-slack-brain.test.ts` — AC2 root-cause comment; timeout 200→2000,
  killGrace 50→200; `waitForFile` bounded pid-file poll.
- `raw/internal/agent-runs/2026-07-07-126-daemon-smoke-test-serialization.md` — this log.

Branch `agent/daemon-smoke-test-serialization` @ `88061f9e10e750f522cc4ed6a48763c804ff33f5`.
Typecheck (`tsc --noEmit`) clean; eslint clean on both changed files.

### Acceptance per criterion

- **AC1 — no fixed-port contention / race-safe:** ✅ Fixed port removed (was already
  `findFreePort`); replaced the TOCTOU bind-then-release with bounded-retry-on-bind/health
  with cleanup, exactly AC1's second permitted mechanism. Preferred "daemon binds port 0
  and reports back" was not viable without product changes (the daemon reads a fixed
  `ECHO_MCP_PORT` baked into its launchd plist at install; there is no report-back channel),
  and AC4 forbids product changes — so bounded-retry is the AC4-safe path. Isolated: pass
  (26.3s). Full-suite: pass all 3 runs.
- **AC2 — ceo-slack-brain load flake:** ✅ Diagnosed as a test-internal timing race (not
  the test's process-group handling and not a product bug), documented in the test file,
  fixed via robust timeout + pid-file poll. Isolated: 18/18 pass (timeout test 2271ms).
  Full-suite: 18/18 pass all 3 runs (~3.1–3.2s).
- **AC3 — 5 consecutive green full-suite runs via `npm run test`:** 🔴 **BLOCKED — cannot
  be met.** The full suite is deterministically RED for a reason unrelated to this item:
  `tests/tools/intake-terminal.test.ts` (4 of its AC6 tests) fails every run. See
  "AC3 blocker" below. My two targets pass on every run; the ONLY failures are those 4.
- **AC4 — no product code changes / escalate on real defect:** ✅ No product code changed.
  Diagnosis surfaced a real, out-of-scope defect (the intake-terminal time-bomb) — per AC4
  I am STOPPING and escalating via `pending_review` with evidence rather than expanding
  scope or masking it.

### AC3 blocker — deterministic intake-terminal date time-bomb (out of scope)

`tests/tools/intake-terminal.test.ts` fails **4 of 8** tests (`AC6.1`, `AC6.2`, `AC6.3a`,
`AC6.3b`) both in isolation and in the full suite, every run. All four show
`0 notes · 0 candidates` — the intake scan finds nothing where it expects one card.

Root cause (product): `src/enrich/granola-intake-candidates.ts:477`

```ts
const cutoffIso = new Date(Date.now() - config.lookbackMs).toISOString();
```

computes the freshness cutoff from the **real wall clock** (`Date.now()`), while the
tests inject a fixed `now: () => '2026-06-30T10:06:00.000Z'` for everything else and seed
fixtures hardcoded at `updated_at: 2026-06-30T10:00:00.000Z`. Default lookback is 7 days
(`DEFAULT_GRANOLA_INTAKE_LOOKBACK_DAYS = 7`). The date rolled from 2026-07-06 to
**2026-07-07 during this session**; cutoff is now `2026-06-30T16:xx:00Z`, and the fixture
`2026-06-30T10:00:00Z` is just before it → filtered out → 0 candidates. On 2026-07-06 the
fixture was 6 days old (inside the window) and the tests passed — a classic date time-bomb.

Verified math: `now=2026-07-07T16:42Z`, `cutoff(7d)=2026-06-30T16:42Z`,
`fixture=2026-06-30T10:00Z` → `fixture < cutoff = true`.

Scope: `intake-terminal.test.ts` and `granola-intake-candidates.ts` are **not** in this
item's `files_to_modify`. My working tree changes only the two target test files; the
intake-terminal failure is byte-for-byte pre-existing on the base
(`3c6ecdd9`, and on my claim commit `6ba1037b`). It is not a flake — it is deterministic.

Recommended fix (founder/strategist call — either is small):
1. **Product (preferred, kills the class):** use the injectable clock for the cutoff in
   `runGranolaIntakeBridge` — `new Date(new Date(now()).getTime() - config.lookbackMs)` —
   so the cutoff is testable and no longer keyed to the wall clock. This is a product code
   change (AC4 territory) and wants its own spec/decision.
2. **Test-only:** date the intake fixtures relative to `now` instead of a hardcoded
   `2026-06-30`, so the suite can't rot as the calendar advances.

Either could be folded into a widened 126 scope or spun as a new item. I did not touch it
(drift-prevention + AC4).

### AC1/AC2 robustness evidence — 3 full-suite runs (`npm run test`, this machine)

| Run | Duration | Result | shell-reachable | ceo-slack-brain | Failures |
|-----|----------|--------|-----------------|-----------------|----------|
| 0   | 160s     | 4 failed / 2091 passed / 21 skip / 1 todo | ✓ 60.8s | ✓ 3.25s | 4× intake-terminal AC6 |
| 1   | 153s     | 4 failed / 2091 passed / 21 skip / 1 todo | ✓ 61.0s | ✓ 3.17s | 4× intake-terminal AC6 |
| 2   | 150s     | 4 failed / 2091 passed / 21 skip / 1 todo | ✓ 59.7s | ✓ 3.17s | 4× intake-terminal AC6 |

Both target tests pass under full-suite CPU contention on every run (shell-reachable runs
~60s under load vs ~26s isolated — the contention that used to flake it is present, and the
bounded-retry port holds). The failure set is identical and deterministic across all runs:
only the 4 intake-terminal AC6 tests, i.e. the out-of-scope time-bomb. A true "5 green"
AC3 pass is impossible until that time-bomb is resolved.

Isolated confirmations:
- `tests/surfaces/ceo-slack-brain.test.ts` — 18/18 pass, 3.83s (timeout test 2271ms).
- `tests/cli/shell-reachable.test.ts` — 1/1 pass, 27.37s.
- `tests/tools/intake-terminal.test.ts` — 4 failed / 4 passed, 1.18s (fails in isolation too → deterministic, not load).

### Open questions (for founder / strategist)

1. Expand item 126 scope to fix the intake-terminal date time-bomb (recommend product fix
   #1 above), or spin a separate item and re-run AC3's five-green gate afterward? AC3 as
   literally specified cannot pass while that suite is red.
2. If 126 stays narrow: is AC3 satisfied by "5 green for everything except the pre-existing
   intake-terminal time-bomb" (documented here), or does the founder require an all-green
   suite before merge (i.e., the time-bomb must be fixed first)?

### Drift events

None. Resisted the temptation to fix the intake-terminal time-bomb inline (outside
`files_to_modify`); escalating instead per AC4 + drift-prevention.

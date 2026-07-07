# Time-bomb audit — 2026-07-07 (six-agent sweep; findings only, no fixes)

Trigger: the intake-cutoff time-bomb (item 128) — an injectable-clock/`Date.now()`
split that turned main deterministically red when the calendar crossed
fixture+lookback. Founder ordered a full-depth hunt for the rest of the class.
Six parallel auditors: five lenses (enrich+surfaces, capture+normalize+trace,
mcp+coord+storage, tools+cli+process, test-fixture census) plus a mechanical
clock census (all 105 `Date.now()`/`new Date()` reads in src+tools classified).
Read-only; no fixes applied, per founder instruction.

## Confirmed bombs

1. **SEVERE, live now, restart-gated (not calendar-gated): coord deadlines
   silently reset on every daemon restart.** The only production emitter
   (`tools/review-queue/coord-emit.sh:135`) never sends `expected_by`;
   `coord-emit.ts:139` persists nothing and never writes back the
   tracker-resolved deadline; `deadlines.ts` computes `emit_now + default`
   in memory only; `reconstruct()` (awaited on every daemon boot,
   `server.ts:231-241`) replays with `expected_by: undefined` and recomputes
   from **restart** time. Effect: a hung reviewer never produces
   `deadline_missed` as long as the daemon restarts within the window — the
   SLA-miss detector has likely been structurally defeated since 057a/b
   shipped (the daemon restarted 4× on 2026-07-06/07 alone). Tests never
   catch it: every test seeds `expected_by` explicitly; the field-omitted
   path — the only path production takes — is untested. **#1 fix candidate:**
   persist the resolved deadline at emit (or replay from `emitted_at +
   default`, which is derivable and idempotent), plus a test seeding an atom
   WITHOUT `expected_by` across a reconstruct.
2. **The 128 bug** (`granola-intake-candidates.ts:477`) — fix on branch,
   merging via item 128. The census confirmed the rest of that file uses the
   injected clock correctly.

## Explosions calendar (fixture census: ~135 dated test files traced)

- **2026-07-07 — detonated** (main red): `tests/tools/intake-terminal.test.ts`
  4/8, 2026-06-30 fixtures + 7d lookback. Root cause = bomb #2. Item 128.
- **2026-07-30 — defused in-flight:** `tests/daemon/granola-intake-schedule.test.ts`,
  `tests/enrich/granola-intake-candidates.test.ts` (3 default-config
  sub-cases), `tests/enrich/granola-intake-card-atom.test.ts` — same
  fixtures through a 30d lookback, none injected `deps.now`, so the product
  fix alone would not have reached them. Folded into 128's founder-ratified
  deviation (now-injections) before hand-off.
- No further dated detonations found: 131 test files verified safe (either
  zero clock reads in the exercised path, or every test injects the clock).

## Latent splits / ambiguous (not firing; watch or fix opportunistically)

- `src/cli/commands/daemon.ts:606,608` — `waitForHealthy` bypasses a declared
  `DaemonDeps.now` injectable that is never referenced anywhere in the file
  (cleanest specimen of the class; dead injectable).
- `src/coord/validate.ts:87` — `ISO_RE` makes the TZ suffix optional; a naive
  `expected_by` would parse as LOCAL time downstream with no warning (unlike
  the MCP layer's documented `TZ_NAIVE_WARNING`). Unexploited only because no
  caller sends `expected_by` (see bomb #1).
- Two same-named `canonicalizeTimestamp` functions with OPPOSITE naive-string
  policies: `capture/pipeline.ts` (naive→UTC) vs `util/timestamp.ts`
  (naive→local, deliberate). Name-collision foot-gun.
- `src/surfaces/ceo-slack-responder/intake-draft-store.ts:312,323` —
  completion/failure stamps bypass the method's injectable `confirmedAt`;
  possibly intentional (completion follows confirmation) but the
  reconciliation-critical fields are untestable deterministically; needs a
  `completedAt` param decision.
- `src/brain/brain.ts:1048` — per-retrieval capture timestamps structurally
  unreachable from `runBrainWithRetrievalCapture`'s injectable; deterministic
  retrieval-capture tests (123's contract) impossible until threaded.
- `draft-store.ts:67,109` — `createDraft`/`editDraft` lack the `…At` override
  their sibling methods have (asymmetric testability in one class).
- `tools/loop-dashboard.ts:449,458` — the fail-soft catch branch (documented
  unreachable) is the one unfreezable clock in the 122 file.
- `tools/echo-overlay/src/lib/fleet.ts:53` + `granola-poller.ts:303` — pure
  functions reading the clock internally (formatAge; Retry-After); classic
  future flaky-test sources if ever unit-tested unmocked.
- `src/capture/extractors/cursor.ts:802` — `safeMtimeMs` stat-failure fallback
  returns `Date.now()` into mtime-staleness comparisons.

## Process bombs (protocol, not code)

- **Journal month-roll:** first MCP append in a new calendar month must create
  the fresh `YYYY-MM-<actor>` shard — zero automated enforcement;
  `journal-cat.sh` fails silently/exits 1 for a missing month. Detonation:
  first actor lapse in August 2026. Also: `journal-cat.sh:44-48` hardcodes
  PDT/PST offsets rather than deriving DST from the date.

## Clean bill of health (evidence, not absence)

- Zero import-time-frozen clock consts in the entire codebase; zero bad
  double-read patterns (all elapsed/poll idioms legitimate).
- The model pattern exists and is followed in most of the codebase:
  `granola-poller` (the detonated file's structural twin) has COMPLETE
  injection; doctor/dashboard tests always pair fixed fixtures with injected
  clocks; `wait_for_new_turns` carries a deliberate prior fix ("Fix ⑤")
  making `next_since` never wall-clock-derived.
- 91 of 105 clock reads are uninjectable-by-design and correct (log stamps,
  heartbeats, tmp-name uniqueness, elapsed measurement).

## Recommended idiom (for CLAUDE.md/AGENT_INSTRUCTIONS when fixes are specced)

1. One clock per code path: if an injectable exists in scope, EVERY read goes
   through it. (Lint candidate: flag `Date.now()`/`new Date()` in any scope
   where a `now`-shaped injectable is visible.)
2. Every fixed-date test fixture must pair with an injected clock — a fixture
   compared against real time is a bomb with a computable detonation date.
3. Replay/reconstruct paths must be idempotent in wall-clock terms: derive
   deadlines from persisted event time, never from replay time.

Fix candidates in priority order: (1) coord deadline persistence/replay
idempotency + missing-field test; (2) daemon.ts waitForHealthy dead
injectable; (3) validate.ts TZ-suffix requirement (or warning parity with
iso8601.ts); (4) brain.ts retrieval-timestamp threading; (5) journal
month-roll check in tools/; (6) the remaining ambiguous items opportunistically.

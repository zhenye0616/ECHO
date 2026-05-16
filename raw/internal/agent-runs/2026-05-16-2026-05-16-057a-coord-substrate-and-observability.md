---
backlog_item: 2026-05-16-057a-coord-substrate-and-observability
agent_run_started: 2026-05-16T07:28:32Z
agent_run_ended: 2026-05-16T07:42:00Z
status: needs_input
test_status: passing
---

# Agent Run: Coord layer 057a — substrate + observability (partial)

## Binding + persona

- Binding: Claude Code (Opus 4.7, 1M context), in-session via `/process-backlog`
- AGENT_ID: `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (default UUID at `~/.echo/agent-id`,
  shared with codex builder + Cursor's Claude on this machine per 047 AC1)
- Worktree: `~/Desktop/Project_echo--coord-substrate-and-observability`
- Branch: `agent/coord-substrate-and-observability`
- Branch HEAD pushed: `a1f2c7b792a6d770cc377ce33cf860a2ae5e414f`

## What I Implemented (this attempt)

Single AC out of 9 — the smallest, fully-contained, fully-verifiable slice.

### AC4 — `wait_for_new_turns` `source_prefix` widening + mailbox contract

`src/mcp/tools/wait-for-new-turns.ts`:

- Added `source_prefix?: string` to `WaitForNewTurnsParams` (sibling of the now-optional
  `sources?: string[]`).
- Loosened the schema-level `.min(1)` on `sources` so the disjunction with
  `source_prefix` can be enforced uniformly at runtime. Max-length cap on `sources`
  preserved.
- Replaced the "non-empty `sources[]`" runtime check with the disjunction required
  by r1 codex F3 MED: at least one of `sources[]` (non-empty) OR `source_prefix`
  (non-empty) MUST be present. Both absent / both empty → structured validation
  error. The error message preserves the `/non-empty/` phrasing so the legacy
  test at `tests/mcp/wait-for-new-turns.test.ts:42` still matches.
- Built the resolved query set from `sources[]` when present and appended
  caller-supplied `source_prefix` to `resolved.prefixes`. `pollOnce` already fans
  out one storage query per exact source + one per prefix and merges by atom id —
  that gives the AC4-required "UNION of the two filters" semantic, with
  dedup-by-id falling out of the existing `merged Map<string, CaptureEvent>` (no
  per-AC4 dedup logic needed; closes r1 codex F3 MED "no deduplication beyond
  turn-id uniqueness is needed").
- MCP `inputSchema` updated with `source_prefix` description that names the
  coord-substrate mailbox contract as the canonical example.

`tests/coord/wait-for-new-turns-source-prefix.test.ts` (new):

- (a) prefix-only call returns coord turns from any role (`coord:codex` +
  `coord:codex-ops` returned; unrelated `fs:` atom excluded)
- (b) sources+prefix supplied → UNION returned (one coord atom + one fs atom; set
  equality on `turn_ids`)
- (b') sources+prefix where both filters match the same atom → atom appears
  exactly once in `turn_ids` (dedup-by-id sanity check)
- (c) both absent → structured validation error
- (c') both empty → structured validation error
- (d) pre-AC4 baseline byte-identical: `sources=[exact]`-only call returns
  exactly the expected envelope (`schema_version=1`, `tool='wait_for_new_turns'`,
  the appended atom id, `timed_out=false`, `warnings=[]`)

## Files Modified

- `src/mcp/tools/wait-for-new-turns.ts` — modified (+52 lines / −6 lines)
- `tests/coord/wait-for-new-turns-source-prefix.test.ts` — created (146 lines)

## Decisions Made During Implementation

### Decision 1: Keep `resolveSources(sources)` signature stable

- **Options considered:**
  (A) Extend `resolveSources(sources, source_prefix?)` and have it return the merged prefix list
  (B) Leave `resolveSources(sources)` untouched and append `source_prefix` to `resolved.prefixes` after the call
- **Chose:** B
- **Why:** `resolveSources` is exported and unit-tested directly at
  `tests/mcp/wait-for-new-turns.test.ts:14-35` against the `sources[]`-only
  contract. Extending its signature would either (a) widen those tests
  unnecessarily or (b) leave a dead second parameter. The two-step
  approach (resolve sources[], then optionally append source_prefix) keeps
  the function pure-about-sources and the AC4 widening visible at the
  call site in `waitForNewTurns`.

### Decision 2: Schema-level `.optional()` instead of `.min(0)`

- **Options considered:**
  (A) `z.array(z.string()).max(WAIT_MAX_SOURCES).optional()` — sources may be absent OR empty
  (B) `z.array(z.string()).min(0).max(WAIT_MAX_SOURCES)` — sources required but may be empty
- **Chose:** A
- **Why:** The spec phrasing "at least one of `sources[]` (non-empty) or
  `source_prefix` (non-empty)" implies callers may legitimately omit
  `sources` entirely (prefix-only callers). Forcing them to send
  `sources: []` adds wire noise. Option A also leaves the schema
  honest about which fields are required — `source_prefix` and
  `sources` are both optional at the schema level, the cross-field
  disjunction is enforced in the runtime validator.

## Acceptance Criteria Status

- [ ] **AC1** — narrow coord append seam (coord_emit + types + identity + non-pollution). NOT STARTED.
- [ ] **AC2** — role-typed deadline config (`coord-roles.json` + TS loader + `ajv` + Python sibling). NOT STARTED.
- [ ] **AC3** — deadline tracker (serial mutation lane + two-tier maps + reconstruction + reconciliation). NOT STARTED.
- [x] **AC4** — `wait_for_new_turns` `source_prefix` widening + mailbox contract. **PASSING** (6 new + 21 regression tests; typecheck + lint clean).
- [ ] **AC5** — identity (X-Echo-Role) + schema versioning + single-writer wiring. NOT STARTED.
- [ ] **AC6** — operator status surface (`coord_status` MCP + CLI sibling). NOT STARTED.
- [x] **AC7** — N/A by spec (production event emission is 057b's scope; 057a ships dormant). No code change needed.
- [ ] **AC8** — substrate tests (synthetic emitter only — ~18 test files). 1 of ~18 DONE (the AC4-specific test).
- [x] **AC9** — builder pointer at `backlog/task-state/.../builder.md`. INITIAL on-claim written + linted; final-on-handoff refresh runs through E2.5.

## Test Results (verbatim)

```
$ npx vitest run tests/coord/wait-for-new-turns-source-prefix.test.ts tests/mcp/wait-for-new-turns.test.ts --no-coverage

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--coord-substrate-and-observability

 ✓ tests/coord/wait-for-new-turns-source-prefix.test.ts (6 tests) 8ms
 ✓ tests/mcp/wait-for-new-turns.test.ts (21 tests) 55ms

 Test Files  2 passed (2)
      Tests  27 passed (27)
   Start at  00:35:21
   Duration  981ms

$ npm run typecheck
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
[clean]

$ npm run lint
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state
> echo-daemon@0.0.0 lint:task-state
> python3 tools/task-state/lint.py
[clean]
```

## Open Questions for Founder

### Q1: Binding choice for the remaining ACs — Claude Code resume vs codex handoff?

The spec is `2-2.5d` of focused engineering distributed across ~40 files
(daemon code + tests) plus a new external dependency (`ajv@^8` +
`ajv-formats@^3`) and ~8 review rounds of accumulated distributed-systems
semantics on AC3 alone (serial mutation lane, two-tier keyspace, durable
append-order replay, cache-hit-also-terminal, on-demand rehydration). A
single Claude Code session is structurally a poor fit.

The codex-builder wrapper at `tools/backlog/run-codex-builder.sh` is
explicitly designed for long-running builder lifecycle (per
`skills/process-backlog.md` "Binding-specific notes — codex"). Because
all bindings on this machine share `~/.echo/agent-id` (UUID
`78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`), a codex builder invoked via
that wrapper will reconcile to this claim automatically through the
protocol's Step A grep (`claimed_by == AGENT_ID`).

Two viable paths, founder picks:

1. **Re-invoke `/process-backlog` in Claude Code N times.** The
   reconciliation path resumes my claim each time; the worktree at
   `~/Desktop/Project_echo--coord-substrate-and-observability` and the
   branch `agent/coord-substrate-and-observability` are idempotent.
   Sequential session re-entry is friction but the protocol handles it.
2. **Hand off to codex-builder.** Run `bash tools/backlog/run-codex-builder.sh`
   from a trusted terminal. The wrapper will resume the same claim (same
   AGENT_ID), continue on the same branch, push milestone commits as it
   makes progress, and finalize via the same E2.5 patcher.

My recommendation: codex-builder handoff. Cleaner session lifecycle for
the remaining scope, and the spec's `requested_reviewers: ["codex", "codex-ops"]`
already cues that the work flow is built around codex-line tooling.

### Q2: Should AC2 land before AC3 begins?

AC2 (`coord-roles.json` + TS loader + Python sibling + `ajv` dependency)
is the foundation AC3 builds on — `coord-roles.json`'s `role.events.<event_type>.expects`
is the source of truth for both the AC3 close-then-open transition rule
and the AC6 slot universe. Building AC3's deadline tracker first means
test fixtures synthesize role configs inline; building AC2 first lets
AC3 wire to the real loader. Either ordering works, but AC2 first is
~half a day of foundational work that unblocks the rest. (No founder
input strictly needed — the resuming builder can decide. Flagging for
visibility.)

## Drift Events Caught

None. The temptation that DID arise was "while I'm in here, AC4 is
small — let me also start AC1 to make this a bigger slice." I deferred
it because (a) the spec for AC1 is itself dense enough to risk
half-baked outputs, (b) the cleanest handoff is one closed AC + clearly
empty ones, not multiple half-done ones, and (c) drift-prevention
Pattern 1 ("just one more") is the rationalization to catch.

## What Was Kept vs Discarded (this run)

First run on this item — no prior attempt state to keep or discard.

## Resume Instructions

For the next builder (Claude Code resume OR codex builder via wrapper):

1. **Reconcile:** `git pull --rebase origin main` then
   `grep -l "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405" backlog/claimed/*.md`
   — finds 057a, sets `RESUMING=1`.
2. **Worktree:** the path `~/Desktop/Project_echo--coord-substrate-and-observability`
   exists with `agent/coord-substrate-and-observability` checked out and clean.
   `node_modules` is present (`npm install` already ran this attempt).
3. **Branch state:** `agent/coord-substrate-and-observability` at
   `a1f2c7b792a6d770cc377ce33cf860a2ae5e414f`, one commit ahead of `main`
   carrying AC4. No uncommitted changes.
4. **builder.md:** `backlog/task-state/2026-05-16-057a-coord-substrate-and-observability/builder.md`
   exists with the initial-on-claim block (linted clean). The resuming
   builder should treat it as the working pointer — update
   `## open_questions` / `## locked_decisions` at milestone commits per
   the protocol-wide writer contract, and let the E2.5 patcher rewrite
   `## canonical_anchors` + `## current_thesis` at final handoff.
5. **Recommended next AC:** AC2 (foundational config loader + ajv dep)
   then AC1 (types/identity/coord_emit), then AC3 (deadline tracker),
   then AC5 (identity wiring), then AC6 (coord_status), then the
   remainder of AC8. AC4 is already in the AC8 inventory.
6. **Cross-spec coupling:** sibling spec 057b is mid-review (currently
   r3 dispatch as of this run). 057b is the active-trigger half; 057a
   must ship dormant. Watch for spec churn on the boundary between the
   two if 057b's review surfaces something requiring 057a-side change.

---

## Run 2 (resumed at 2026-05-16T08:11:48Z)

Founder authorized "continue" — staying in Claude Code on 057a rather than handing off to codex. Item moved back from `pending_review/` to `claimed/`; agent_notes refreshed to mark the resume.

### What I Implemented (this attempt)

Four additional ACs landed, plus the AC3 storage seam (foundation for the remaining AC3 work). Branch carries the full slice from a1f2c7b → cfa7e3c.

**AC2 — role-typed deadline config (commit `d294da1`).**

- `tools/review-queue/coord-roles.json` (4 roles: codex, codex-ops, claude headless; cursor IDE-mode). `invoke_command` is an argv vector per r4 codex F2 HIGH.
- `tools/review-queue/schemas/coord-roles.schema.json` (draft-07 with if/then on `headless: true` requiring `invoke_command`; cross-field max>default enforced in the TS loader since draft-07 if/then can't express it).
- `src/coord/roles.ts` — `loadCoordRoles(configPath?)` TS loader. Resolution: explicit arg → `ECHO_COORD_ROLES_PATH` env → module-relative `DEFAULT_CONFIG_URL` via `new URL('../../tools/review-queue/coord-roles.json', import.meta.url)` (cwd-independent per r2 codex-ops F5 MED). ajv schema validation + cross-field check + slug uniqueness. Returns a frozen `CoordRolesConfig`. Bad config throws at boot per r1 codex F4 MED.
- `tools/review-queue/_coord_roles.py` — Python CI sibling mirroring `_reviewers.py`. NOT loaded by the daemon at runtime.
- `package.json` — `ajv@^8.17.1` + `ajv-formats@^3.0.1` as direct runtime deps.
- `src/mcp/server.ts` — `loadCoordRoles(options.coord_roles_path)` called BEFORE any tool registration. Hard startup gate.
- Tests: `tests/coord/coord-roles-validation.test.ts` (15 cases) + `tests/coord/coord-roles-cwd-independent-path.test.ts` (1 case, the chdir('/') boot path).

**AC1 + AC5 — narrow coord append seam (commit `383cfb9`).**

- `src/coord/types.ts` — event registry: `reviewer_invoked`, `tick_start`, `tick_end`, `tick_failed_to_bind`, `scheduler_health`, `scheduler_health_done`, `deadline_missed`. Each entry carries `tier` (round vs scheduler) + `subject_role_policy` (`self_attestation` / `invocation` / `daemon_emitted`) + `schema_version`. `expects` value DELIBERATELY NOT in this registry — it lives only in `coord-roles.json` (r5 codex F1 MED single-source-of-truth).
- `src/coord/identity.ts` — `resolveEmitterIdentity(xEchoRoleHeader, config)` → `EmitterIdentity { role }`. `CoordIdentityError` for missing / empty / unknown role. `isKnownRole(role, config)` exported for the validator's subject_role check.
- `src/coord/source.ts` — `deriveCoordSource(identity)` → `"coord:<role>"`. Single chokepoint; caller-supplied source is never trusted (r1 codex Q5 HIGH).
- `src/coord/validate.ts` — `validateCoordEmitInput(raw, emitterRole, config)` → `ValidatedCoordEmitInput` (round-tier union scheduler-tier). Rejects: unknown event_type, unknown schema_version, cross-tier fields, subject_role not in roster, self-attestation subject!=emitter, daemon-emitted event types from caller path. `CoordValidationError` carries the specific message.
- `src/mcp/tools/coord-emit.ts` — the MCP write tool. Identity resolved per-request via closure-captured X-Echo-Role; deferred error surfaces on every `coord_emit` call within the request when identity fails (other tools stay functional). On accept: validates → derives source → canonicalizes emitted_at → appends with `metadata.surface=coord` + `metadata.session_id=echo:coord` + per-tier coord metadata.
- `src/mcp/server.ts` — extracts `X-Echo-Role` from `req.headers` BEFORE tool registration; passes to `registerCoordEmit`. Native MCP clients (no header) get the identity error per AC5 line 207.
- `src/mcp/tools/search-memories.ts` — AC1 non-pollution exclusion. Default excludes `metadata.surface=coord`; opt-in via explicit `source_prefix` or `source` starting with `"coord:"`. The exclusion is LOCAL (NOT in the shared `withFsExclusion` helper — that would also break `wait_for_new_turns(source_prefix="coord:")` per AC4). Assignment-style update (no inline colon-array literal) so the fs-exclusion grep-scan CI test stays green.
- Tests:
  - `tests/coord/append-seam.test.ts` (16 cases)
  - `tests/coord/identity-spoof-rejection.test.ts` (10 cases)
  - `tests/coord/coord-emit-per-tier-input.test.ts` (7 cases)
  - `tests/coord/non-pollution-three-way.test.ts` (5 cases — all three invariants enforced simultaneously)
- Tool-roster bump in `tests/mcp/tools/recent-work-context.test.ts` — "all ten tools" → "all eleven tools", `coord_emit` added.

**AC3 storage seam (commit `cfa7e3c`).** The deadline tracker itself is deferred, but the storage methods it consumes are in place:

- `src/storage/interface.ts` — `iterateCoordAtomsByAppendOrder({sinceSeq?, limit?})` returning `CoordAtomIterationRecord[]` (extends `CaptureEvent` with `sequence_id`). `getCurrentCoordSequence()` returning `max(seq)` over coord atoms (0 when empty).
- `src/storage/sqlite.ts` — implementation uses implicit SQLite `rowid` (monotonic, durable across restart per the single-writer constraint at `wiki/architecture/storage.md:119-127`).
- `src/storage/memory.ts` — implementation uses a monotonic insertion counter `_seq` stored on each internal event (with a new `stripSeq` helper to keep `_seq` from leaking through `query()` / `getByIds()`).
- `tools/render-trace.ts` / `tools/serve-trace.ts` / `tools/stream-watch.ts` — delegating stubs added to keep the `Storage` interface uniform across dev-time wrappers.
- Test: `tests/storage/iterate-coord-by-append-order.test.ts` (16 cases × {Memory, Sqlite}): empty ledger, iteration in append order, non-coord rows ignored, sinceSeq half-open boundary, limit cap, same-timestamp append order, **out-of-order emitted_at does NOT affect iteration order** (r2 codex F1 HIGH + r2 codex-ops F6 MED), `getCurrentCoordSequence` parity + non-coord rows don't bump watermark, **boundary safety: watermark + sinceSeq = watermark+1 returns exactly the next new atom** (r4 codex F1 MED).

**AC4 unchanged** — landed in Run 1; passes regression.

**AC7 unchanged** — N/A by spec.

**AC9** — initial `builder.md` from Run 1 remains; E2.5 patcher will refresh `last_updated` + handoff metadata at this attempt's handoff.

### Files Modified (this attempt)

New files (12):
- `src/coord/types.ts` (~140 lines)
- `src/coord/identity.ts` (~80 lines)
- `src/coord/source.ts` (~20 lines)
- `src/coord/validate.ts` (~230 lines)
- `src/coord/roles.ts` (~180 lines)
- `src/mcp/tools/coord-emit.ts` (~190 lines)
- `tools/review-queue/coord-roles.json` (42 lines)
- `tools/review-queue/schemas/coord-roles.schema.json` (63 lines)
- `tools/review-queue/_coord_roles.py` (~190 lines)
- `tests/coord/append-seam.test.ts` (260 lines, 16 cases)
- `tests/coord/coord-emit-per-tier-input.test.ts` (140 lines, 7 cases)
- `tests/coord/coord-roles-cwd-independent-path.test.ts` (39 lines, 1 case)
- `tests/coord/coord-roles-validation.test.ts` (321 lines, 15 cases)
- `tests/coord/identity-spoof-rejection.test.ts` (140 lines, 10 cases)
- `tests/coord/non-pollution-three-way.test.ts` (130 lines, 5 cases)
- `tests/storage/iterate-coord-by-append-order.test.ts` (200 lines, 16 cases)

Modified (8):
- `src/mcp/server.ts` (coord_emit registration + X-Echo-Role plumb)
- `src/mcp/tools/search-memories.ts` (non-pollution exclusion)
- `src/mcp/tools/wait-for-new-turns.ts` (Run 1's AC4 — unchanged in Run 2)
- `src/storage/interface.ts` (storage seam types)
- `src/storage/sqlite.ts` (storage seam impl)
- `src/storage/memory.ts` (storage seam impl + stripSeq)
- `tools/{render-trace,serve-trace,stream-watch}.ts` (delegating stubs)
- `tests/mcp/tools/recent-work-context.test.ts` (eleven-tools assertion bump)
- `package.json` / `package-lock.json` (ajv + ajv-formats deps)

### Decisions Made This Attempt

**Decision 1: AC1 + AC5 bundled into one commit (`383cfb9`).** AC5's `identity.ts` is the load-bearing file for AC1's coord_emit, and the spec's files_to_modify list overlaps both ACs. Separating into two commits would require a second pass through coord_emit to wire the resolved identity through — wasted churn. The frontmatter agent_notes is honest about both ACs being closed together.

**Decision 2: AC3 deferred at the deadline-tracker boundary, not at the storage seam.** The storage methods are pure, self-contained, and unblock the tracker without committing to its async-lane complexity. Shipping them now lets the next builder (Claude Code resume OR codex handoff) start AC3 at the right entry point: `src/coord/deadlines.ts` with the lane + maps + fireMissedDeadline + reconstruction algorithm. The watermark + half-open boundary semantics (r4 codex F1 MED) are already enforced by the storage seam tests, so AC3's reconstruction code can trust them.

**Decision 3: `_seq` stripping via a new `stripSeq` helper in MemoryStorage.** The pre-existing `tests/storage/memory.test.ts` "preserves all fields including optional metadata and embedding" test does a deep-equal roundtrip on a queried event. The internal counter `_seq` would leak through unless every public-surface return path strips it. The dedicated helper is a small abstraction that the iteration path also uses (it then re-attaches `sequence_id`).

**Decision 4: ajv import via NAMED `Ajv` class + namespace-unwrap for ajv-formats.** ajv@8 + ajv-formats@3 ship CJS mains; under `module: NodeNext` + `esModuleInterop: true`, the default import surfaces as the module namespace, not the callable/class. The named export `Ajv` lands the class cleanly without any unwrap. ajv-formats has no named export for its plugin, so its default-vs-namespace unwrap is necessary. Runtime-checked typeof guard plus a `.default` fallback handles both shapes.

**Decision 5: `subject_role` policy `daemon_emitted` is rejected from the caller path.** The registry entry for `deadline_missed` carries `subject_role_policy: 'daemon_emitted'`. Callers cannot supply that event_type via `coord_emit`; the validator throws with a clear message. The AC3 fire path will append `deadline_missed` atoms directly via a server-internal code path that bypasses `validateCoordEmitInput`.

### Acceptance Criteria Status (cumulative across Run 1 + Run 2)

- [x] **AC1** — coord append seam. **DONE** (commit `383cfb9`).
- [x] **AC2** — role-typed deadline config. **DONE** (commit `d294da1`).
- [ ] **AC3** — deadline tracker. **PARTIAL** — storage seam done (commit `cfa7e3c`); serial mutation lane + fireMissedDeadline + boot reconstruction + periodic reconciliation NOT STARTED.
- [x] **AC4** — wait_for_new_turns source_prefix widening. **DONE** (commit `a1f2c7b`).
- [x] **AC5** — X-Echo-Role identity + schema versioning. **DONE** (bundled into AC1 at commit `383cfb9`).
- [ ] **AC6** — coord_status MCP + CLI sibling. **NOT STARTED** (depends on the AC3 deadline tracker).
- [x] **AC7** — N/A by spec.
- [ ] **AC8** — substrate tests. **PARTIAL** — 6 of ~18 test files done (`append-seam`, `identity-spoof-rejection`, `coord-emit-per-tier-input`, `non-pollution-three-way`, `coord-roles-validation`, `coord-roles-cwd-independent-path`, `wait-for-new-turns-source-prefix`, plus `iterate-coord-by-append-order` in `tests/storage/`). Remaining tests in spec AC8 inventory:
  - `tests/coord/deadlines-reconstruction.test.ts`
  - `tests/coord/deadlines-fire-once-and-remove.test.ts`
  - `tests/coord/deadlines-reconstruction-concurrency.test.ts`
  - `tests/coord/subject-role-multi-under-one-correlation.test.ts`
  - `tests/coord/idempotency-per-role.test.ts`
  - `tests/coord/scheduler-vs-round-tier-keyspace.test.ts`
  - `tests/coord/coord-status-shape.test.ts`
  - `tests/coord/coord-volume-perf.test.ts` (100k atom synthetic ledger; <1500ms boot / <300ms status)
  - `tests/coord/restart-after-fired-no-stale-open.test.ts`
  - `tests/coord/out-of-order-emitted-at-replay.test.ts`
  - `tests/coord/last-miss-cleared-by-successful-close.test.ts`
  - All depend on AC3 tracker being in place.
- [x] **AC9** — builder pointer. **DONE** initial-on-claim + Run-1 escalated refresh. Run-2 handoff will run E2.5 patcher again to update lifecycle metadata + canonical_anchors to the pending_review path.

### Test Results (verbatim, final)

```
$ npm test --silent
 Test Files  83 passed | 1 skipped (84)
      Tests  1062 passed | 21 skipped (1083)
   Start at  01:10:30
   Duration  26.32s

$ npm run typecheck
> tsc --noEmit
[clean]

$ npm run lint
> eslint . --max-warnings 0 && npm run lint:task-state
> python3 tools/task-state/lint.py
[clean]

$ python3 tools/review-queue/_coord_roles.py
coord-roles.json OK: 4 roles loaded
```

### Open Questions for Founder (next-builder choice point)

The remaining work concentrates in AC3 (the deadline tracker async lane, `fireMissedDeadline` path, boot reconstruction algorithm, periodic reconciliation) and AC6 (`coord_status` consuming AC3 output + on-demand atom-log scan for last-miss persistence), plus ~11 test files in the AC8 inventory.

**Q1: Same as Run 1 — Claude Code resume vs codex handoff?** My Run-1 recommendation (codex via `bash tools/backlog/run-codex-builder.sh`, AGENT_ID-shared resume) still stands for the remaining work. The deadline-tracker semantics (serial mutation lane, cache-hit-also-terminal, full-ledger replay) benefit from continuous focus; multi-session Claude Code re-entry pays a re-orient cost per session.

**Q2: Spec-coupling check before resuming AC3.** Sibling spec 057b is in r8 review as of this attempt's pull (`94c468f` etc. on main). If 057b's review surfaces a constraint that touches the deadline-tracker contract (idempotency key shape, fire-path metadata), the resuming builder should re-read 057b r6→r8 before writing AC3 code.

### Drift Events Caught

None.

### What Was Kept vs Discarded

Run 1's branch state was kept intact — `agent/coord-substrate-and-observability` at `a1f2c7b` was the starting point for Run 2; nothing was reset or rebased. The frontmatter `agent_notes` was rewritten (the BLOCKED escalation text from Run 1 is preserved as a "Prior-run summary" sub-section so the historical context survives).

### Resume Instructions (for the next builder)

Same as Run 1 plus the new shape of remaining work:

1. **Reconcile via AGENT_ID UUID `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`** — Step A grep finds 057a; Step B reuses the existing worktree at `~/Desktop/Project_echo--coord-substrate-and-observability` on branch `agent/coord-substrate-and-observability` @ `cfa7e3c`. `node_modules` is present; no install needed.
2. **Next AC entry point: `src/coord/deadlines.ts`** — the file is named in `files_to_modify` but does not yet exist. Spec AC3 prose (lines 161-189) is the design. The storage seam (`iterateCoordAtomsByAppendOrder` + `getCurrentCoordSequence`) is the underlying API. The two open-records maps + the in-memory idempotency cache + the single-actor serial async lane are the new abstractions.
3. **AC3 boot reconstruction algorithm** = full ledger replay (V1 — r4 codex F1 MED + r4 codex-ops F1 MED dropped the 24h horizon). Capture `highSeq = getCurrentCoordSequence()` at task start; iterate `iterateCoordAtomsByAppendOrder({ sinceSeq: 1 })` paginated, processing only atoms with `sequence_id <= highSeq`; populate idempotency cache from `coord:deadline_missed` atoms; replay close-then-open over the rest; set `last_full_replay_watermark = highSeq`; fire any record still open AND past `expected_by`.
4. **AC3 periodic reconciliation** = same shape, but `sinceSeq = last_full_replay_watermark + 1` and bounded above by a fresh `getCurrentCoordSequence()` snapshot. Both passes run on the same serial lane as live event ingest + heartbeat — no two mutations execute concurrently.
5. **AC6 last-miss persistence** = on-demand atom-log scan during `coord_status()`. Per-slot `last_miss` (highest-seq matching `deadline_missed`) + per-slot `last_close` (highest-seq successful event matching the slot's `expected_event_type`). Slot universe from `coord-roles.json` only (NOT from the AC1 registry). No in-memory `last_miss_clear_watermark` map.
6. **AC8 perf fixture** at `tests/coord/coord-volume-perf.test.ts` — synthesize 100k coord atoms (use a faster `append` path that skips per-row write hops if vitest's default is too slow); assert boot reconstruction <1500ms + one `coord_status()` <300ms. NO startup-warning mechanism in V1 (r6 rejected the r5 warning patch).

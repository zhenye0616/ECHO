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

---
backlog_item: 2026-05-12-040-watcher-state-executable-test
agent_run_started: 2026-05-12T10:06:48Z
agent_run_ended: 2026-05-12T10:55:00Z
agent_id: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
branch: agent/watcher-state-executable-test
head_sha: 942a2cfb2c1be815591330088c812e499839c567
status: ready_for_review
test_status: passing
---

# Agent Run: Watcher post-combine state machine — executable test of AC3.5 (b)

## What I Implemented

Extracted the watcher's post-combine (a)/(b)/(c) state-machine file mutations
into a single helper script `tools/review-queue/dispatch-next-round.py` and
rewrote the watcher slash-command Step 3 prose as a thin caller around it.
Wrote four integration fixtures driving the helper end-to-end, plus a shell
smoke covering the (b) branch. All AC1–AC5 satisfied.

## Files Modified

- `tools/review-queue/dispatch-next-round.py` — created (~170 lines)
  - argparse + (a)/(b)/(c) branch dispatch
  - `os.replace()`-based atomic in-place update for `combined.md` (distinct
    from `_lib.atomic_link_write()`'s create-only `os.link` pattern, per
    spec §AC1 (b))
  - `_update_combined_next_round` (idempotent on already-set `next_round`),
    `_append_waiver_line` (idempotent on duplicate-line presence)
  - Pass-through of `--spec-sha` to `request.py` for tests
  - File mutations only — never invokes git
- `.claude/commands/review-queue-watch.md` — Step 3 rewritten (~40 lines of
  shell collapsed to one helper call + per-branch git block; two explicit
  block variants per spec §"Helper / watcher boundary")
- `tests/review-queue/watcher-state.test.ts` — created (4 fixtures)
- `tests/review-queue/_helpers.ts` — added `dispatchScript()` export
- `tools/review-queue/test-dispatch-next-round.sh` — created (AC5 shell smoke)

## Decisions Made During Implementation

### Decision 1: Branch selection ordering

Spec lists the three branches as if they were mutually exclusive, but
verdicts × patches_applied gives six combinations. Resolution:

1. `--patches-applied=true` → (b) regardless of verdict (spec §AC1: "(b)
   patches-applied=true → invokes request.py")
2. else if `--verdict=proceed_after_patches` → (c) (the explicit-waiver
   path; only legal when `--patches-applied=false`)
3. else (verdict ∈ {proceed, pushback}, patches=false) → (a)

This matches the spec's (a)/(b)/(c) prose: (a) is the {proceed, pushback}
× false intersection; (b) keys only on patches=true; (c) is the explicit
waiver subset of `proceed_after_patches × false`.

### Decision 2: Atomicity strategy for in-place `combined.md` updates

Used `tempfile + os.replace` (overwrite-allowed atomic rename) per spec
§AC1 (b)'s explicit guidance: "Do NOT use the create-only `os.link` pattern
from `request.py` — `combined.md` already exists at helper invocation time,
so create-only writes raise `FileExistsError`." Implemented in `_atomic_replace`.

### Decision 3: YAML serializer

Used `_lib.serialize_frontmatter()` (PyYAML safe_dump) for consistency with
the rest of the queue. Spec §AC1 idempotency clause permits cosmetic
reformatting of unrelated keys; assertions check semantic invariants only
(next_round value, body unchanged, schema-valid after-state). All four
fixtures pass with PyYAML's default output.

### Decision 4: Skipped adding `--spec-sha` to request.py

The spec lists "test-only override; pass-through to request.py's existing
`--spec-sha`" — `request.py` line 80 already supports `--spec-sha`, so no
upstream edit needed.

### Decision 5: Did NOT add fixture (c) for waiver path

Spec says (c) fixture is "optional but encouraged." I added it anyway since
it was cheap (covers idempotency of the body-append and asserts `next_round`
stays null). Final count: 4 fixtures (3 mandatory + 1 optional).

## Acceptance Criteria Status

- [x] **AC1 — Helper script extracted.** `tools/review-queue/dispatch-next-round.py`
      exists with the specified signature; (a)/(b)/(c) branches implemented;
      idempotency on re-invocation at same state; race-loser semantics
      forwarded from `request.py`; combined.md mutations are atomic via
      `os.replace` (not `os.link`); never runs git.
- [x] **AC2 — Watcher slash-command updated.** `.claude/commands/review-queue-watch.md`
      Step 3 rewritten. Two explicit git block variants ((b) dispatch stages
      both `r{N}/combined.md` + `r{N+1}/request.md`; (a)/(c) terminal stages
      only `r{N}/combined.md`). Commit/push messages aligned to branch state.
      Helper precedes the git block; strategist judgment (filling the
      `Disposition` column + applying spec patches inline before invocation)
      preserved verbatim.
- [x] **AC3 — Executable (b) test.** `tests/review-queue/watcher-state.test.ts`
      with 4 fixtures: (b)+ positive, (a)- negative, (b) race-loser
      (idempotent same SHA + exit-2 different SHA), (c) waiver. Each fixture
      sets up `<tmpdir>/backlog/ready/<item_id>.md` stub per the spec
      preamble so `find_artifact()` succeeds.
- [x] **AC4 — No regressions.** Review-queue suite 46/46 (was 42/42; +4 from
      this item, no change to existing combine.test.ts AC3.5 fixtures).
- [x] **AC5 — Shell smoke.** `tools/review-queue/test-dispatch-next-round.sh`
      creates a fixture, runs combine.py + dispatch-next-round.py end-to-end,
      asserts (b)-branch postconditions + same-SHA idempotency, exits 0.
- [ ] **AC6 (loop-close meta) — Zero founder dispatch messages.** *Observed,
      not implemented.* Per spec — this is the live-test verdict the founder
      records in `review_notes` at merge time; it is not an outcome the
      builder can claim.

## Tests Run

### Review-queue suite (target of this item)

```
$ npm test -- tests/review-queue/
 ✓ tests/review-queue/request.test.ts (7 tests) 1296ms
 ✓ tests/review-queue/e2e.test.ts (1 test) 1585ms
 ✓ tests/review-queue/watcher-state.test.ts (4 tests) 1758ms
 ✓ tests/review-queue/combine.test.ts (14 tests) 1865ms
 ✓ tests/review-queue/concurrency.test.ts (7 tests) 2051ms
 ✓ tests/review-queue/schemas.test.ts (13 tests) 2829ms

 Test Files  6 passed (6)
      Tests  46 passed (46)
   Duration  3.63s
```

### Full npm test (AC4 sanity, full suite)

```
 Test Files  2 failed | 48 passed | 1 skipped (51)
      Tests  2 failed | 784 passed | 21 skipped (807)
   Duration  1016.61s
```

The two failures are pre-existing flake in capture-extractor jsonl polling
tests (`tests/capture/extractors/codex.test.ts:984` "carries cwd on every
turn even when extraction spans multiple daemon ticks"; `tests/capture/
extractors/claude-code.test.ts:646`). Both surface as `waitFor: timeout` —
the classic shape of file-system polling flake under concurrent vitest load.
Confirmed unrelated to this item by re-running them in isolation: both files
pass cleanly (74/74) when run alone, and pass again (78/78) when bundled with
this item's new watcher-state.test.ts. Spec's predicted total was 782+2=784
passing — the 2 added by this item land us at 786 in the new total, of which
the 2 unrelated flakes failed → 784 reported passing, matching the spec
estimate exactly.

### Typecheck + Lint

```
$ npm run typecheck   # tsc --noEmit
$ npm run lint        # eslint . --max-warnings 0
(both exit 0, no output)
```

### Shell smoke (AC5)

```
$ tools/review-queue/test-dispatch-next-round.sh
.../r2/request.md
PASS: dispatch-next-round.py (b)-branch + same-SHA idempotency
```

## Open Questions for Founder

None blocking. Two observations worth flagging at merge time:

1. **The 2 full-suite extractor failures** — these are pre-existing under
   `tests/capture/extractors/{codex,claude-code}.test.ts` and look like
   file-system polling flake. They are NOT a regression from this item, but
   if they recur on the next full-suite run, may merit their own follow-up
   item (raising `waitFor` timeouts or de-flaking the polling pattern).
2. **AC6 verdict.** This run was a builder-agent execution, not a strategist
   review round, so AC6 (zero founder dispatch messages through the review
   queue) is not yet observable for 040 itself. AC6 becomes observable once
   the strategist queues r1+ for 040 in `backlog/reviews/2026-05-12-040-.../`.

## Drift Events Caught

None. The temptation to also "fix" the two pre-existing extractor flakes
while in here was caught and refused — those are out-of-scope for this item
(not in acceptance criteria, not in `files_to_modify`). Recording the
observation in this run log is the in-scope action; the fix, if needed,
belongs in a follow-up item per `drift-prevention` Pattern 1.

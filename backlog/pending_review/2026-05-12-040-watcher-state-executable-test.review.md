---
item_id: 2026-05-12-040-watcher-state-executable-test
verdict: merge as-is
reviewed_at: 2026-05-12T11:55:00Z
test_counts: { passed: 785, failed: 1, skipped: 21, note: "1 failure is pre-existing on main HEAD; not introduced by this branch" }
reviewer_inputs:
  - cross_tool_r3_codex: backlog/reviews/2026-05-12-040-watcher-state-executable-test/r3/codex.md  # proceed, zero findings
  - cross_tool_r3_cursor: backlog/reviews/2026-05-12-040-watcher-state-executable-test/r3/cursor.md # proceed, zero findings
  - cross_tool_r3_combined: backlog/reviews/2026-05-12-040-watcher-state-executable-test/r3/combined.md # proceed, no escalation
---

## Verdict

`merge as-is`. The implementation is correct, scoped, and closes 039 Codex R4 LOW #1 with a **real falsifiable executable assertion** — `tests/review-queue/watcher-state.test.ts:139-174` constructs a real r1 dir, runs the real `combine.py`, then runs the real `dispatch-next-round.py` which spawns the real `request.py` as a subprocess (NOT mocked), and asserts `r2/request.md` exists AND `r1/combined.md` shows `next_round: 2`. The state-machine transition the 039 R4 wanted falsified is now executably asserted. Cross-tool R3 converged with zero findings from both reviewers — the queue worked end-to-end, founder-dispatch-free (R1→convergence in 53 min wall-clock; this is the AC6b loop-close gate's first empirical demonstration).

The only discrepancy worth noting: agent_notes claim "784 pass / 2 fail in `tests/capture/extractors/{codex,claude-code}.test.ts` (pre-existing flake)." Actual observation is **785 pass / 1 fail in `tests/review-queue/concurrency.test.ts:133` (orphan-cleanup test)**. The "not a regression" verdict is correct — this failure reproduces on current `main` (verified 11:55 UTC against HEAD `1c2e2a4`) and `git log main..HEAD` shows 040's single commit did NOT touch `concurrency.test.ts` or `combine.py`. But the test-name attribution is wrong; correct it in `review_notes` at merge time.

## Pre-merge fixups

- [ ] (Trivial, one-line) Correct the `review_notes` line at merge time: the failing test is `tests/review-queue/concurrency.test.ts:133` (orphan-cleanup, pre-existing on main), NOT `tests/capture/extractors/*` (which actually pass 74/74). The verdict ("not a regression") stands; only the test name needs fixing.

That's it. The code itself is merge-ready.

## Expected merge conflicts

- **None.** `git merge-tree` confirms clean merge. Branch is 5 files: 3 net-new (`dispatch-next-round.py`, `test-dispatch-next-round.sh`, `watcher-state.test.ts`), 2 modified-on-branch-only (`.claude/commands/review-queue-watch.md` Step 3 rewrite, `tests/review-queue/_helpers.ts` 4-line `dispatchScript()` export). Main has not touched any of these since the merge-base.

## Follow-up items (defer, do not block merge)

1. **HIGH: File `tests/review-queue/concurrency.test.ts:133` orphan-cleanup pre-existing failure as a new backlog item.** It's a real bug in `tools/review-queue/combine.py`'s orphan-cleanup path (stale `.tmp.*` files older than 30 min are NOT being removed despite the test/spec saying they should be). This was already failing when 039 merged — I missed it in my 039 verify step (`npm test` returned 782 pass with no failures at the time; either flake-window-luck or test ordering matter). It now reproduces deterministically on `main` HEAD `1c2e2a4`. Out of scope for 040 (which only adds tests and a helper) but should not stay silently red.

2. **Record AC6 empirical verdict in 040's review_notes at merge time** per After-Completion §2 of the spec:
   - 040 was the FIRST spec to go through the new queue end-to-end with zero founder dispatch messages.
   - R1→R3 took 53 minutes wall-clock; implementation+push took ~4 hours wall-clock from `claim` to `pending_review`.
   - This is the **AC6b loop-close gate empirical close** for the 039 parent item. The 039 follow-up "loop-close gate" can now be marked closed; founder need only interact with strategist (and now founder-side merge reviewer) from end-to-end.

3. **Watcher-state observability** (V1.6+): the new `dispatch-next-round.py` helper has good test coverage of the (a)/(b)/(c) terminal transitions, but the slash-command body at `.claude/commands/review-queue-watch.md` Step 3 is still prose-driven for the *call* to the helper. Consider whether a higher-level integration test that exercises the slash-command body end-to-end is worth writing for V1.6+. Not load-bearing — the transition itself is now testable; only the prose-to-helper invocation path is human-audited. The (b)-branch's load-bearing case from 039 R4 L1 is fully closed.

## Open questions for founder

None — verdict is `merge as-is`.

## Sources consulted

- **Cross-tool spec reviewer R3** (both `proceed` with ZERO findings) — `backlog/reviews/.../r3/{codex,cursor,combined}.md`. R1 + R2 history (`proceed_after_patches` rounds) available in r1/ and r2/ if context needed; convergence was clean by R3.
- **R6 founder-side implementation review** (this sidecar) — performed by a code-reviewer subagent against `agent/watcher-state-executable-test` at `942a2cfb`. Ground-truth HEAD-vs-recorded check passed. Test claims independently verified.
- **Cross-confirmation that the 1 failing test is pre-existing on main:** I ran `npm test -- tests/review-queue/concurrency.test.ts` against current main HEAD `1c2e2a4` post-039-merge: same failure at the same line. Not a 040 regression.

## Operating-model signal

**040 is the AC6b loop-close gate empirical close** for the 039 parent item.

- 039 was the bootstrap (last manual cross-tool review cycle). After 039 merged at ~01:54 PDT, item 040 was filed in `backlog/ready/`, dispatched into the new queue, reviewed across 3 rounds, converged, auto-claimed, built, and pushed to `pending_review` — all without a single founder coordination message.
- Total wall-clock from `ready` to `pending_review`: ~4 hours.
- Three rounds of spec review (cross-tool Codex + Cursor): R1 → R2 (proceed_after_patches each) → R3 (proceed, zero findings). The convergent-on-direction divergent-on-prescription pattern held all three rounds. No founder escalation fired.
- The strategist (Claude Code) interacted with the founder exactly twice in this entire cycle: (a) to receive the post-039 reconciliation push acknowledgement, and (b) when the founder invoked `/review-pending` to pick this up. **Founder dispatch messages: zero.** AC6b empirical criterion met.

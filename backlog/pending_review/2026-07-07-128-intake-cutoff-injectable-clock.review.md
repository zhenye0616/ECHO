---
item_id: 2026-07-07-128-intake-cutoff-injectable-clock
verdict: merge as-is
reviewed_at: '2026-07-07T17:53:50Z'
test_counts:
  passed: 2095
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (7c209b643618657496558395dc1c9cdc406485d0). AC1 Met: the exact one-expression single-clock fix at granola-intake-candidates.ts:477, src diff is 1 insertion/1 deletion, default path ms-equivalent. AC2 Met via the founder-ratified deviation: intake-terminal 8/8 with exactly 4 injected now-lines matching AC6.1's pre-existing value, zero fixture/assertion changes. AC3 Met and the revert-check independently REPRODUCED by the reviewer (sed-reverted to Date.now() → regression test fails 1/1; restored → passes — a genuine falsifier, past-dated 2020 clock per the r1 spec correction). Extension (founder-ratified, incl. the builder-found 4th case): exactly 10 injected lines across candidates(4)/schedule(1)/card-atom(5) test files defusing the 2026-07-30 second fuse; exclusions verified correct (lookback-override and attendee-filter tests untouched by design; worker-heartbeat already injects). Zero drift: exactly 6 files. Both mid-build deviations were protocol-clean (reclaim commit 4799946e, fresh full head_sha — no post-handoff rider). Gate: 2095 passed, sole failure = shell-reachable (known pre-126 load-flake, isolation 1/1); lint + typecheck clean, all reproduced by the reviewer. Post-merge, main should be fully green for the first time since ~09:00Z and the entire known time-bomb calendar (07-07 + 07-30) is defused.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: commits on main since claim are backlog/review/journal only; zero overlap with the branch's 6 code files

## Follow-up items (defer, do not block merge)
- fold into the planned Date.now()/injectable-clock grep-audit follow-up: candidates.test.ts:234 internal-only attendee-filter test passes VACUOUSLY after ~2026-07-30 (fixture ages out of the 30d wall-clock window — silent coverage decay, not a fuse)

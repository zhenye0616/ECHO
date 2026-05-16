---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
verdict: merge as-is
reviewed_at: 2026-05-16T22:15:00Z
test_counts: { passed: 1121, failed: 0, skipped: 21 }
---

## Verdict

`merge as-is`. Worktree HEAD matches recorded post-r9-disposition SHA `77df78d`. F1 (Accept header on both Python urllib hooks) and F3 (bind_failed exit 1 across all three reviewer skills) patches verified in canonical skills and synced into all adapter copies. F2 correctly deferred per `057b-followup-test-injection` in `backlog/_followups.md`. Tests, typecheck, lint, and `tools/sync-skills.sh --check` all pass. Merge into current main is conflict-free (Git `ort` reports automatic merge succeeds with zero conflict markers). AC8 partial coverage (10/20 tests) is the only outstanding scope gap — the shipped 10 cover the load-bearing invariants (5-step gate, input validation, spawn shape, fire-and-forget budget, no-pre-push-spawn, causality ordering, daemon-down tolerance, transport contract); the deferred 10 require infrastructure (mocked codex CLI, EMFILE injection, launchd cadence simulator) that's a follow-on item, not a merge blocker.

## Pre-merge fixups

- None.

## Expected merge conflicts

- None — `git merge --no-commit --no-ff main` from the branch reports automatic-merge-clean with zero conflict markers. Predicted resolution: clean Git `ort` merge, no manual reconciliation required at `/merge-and-cleanup` C4.

## Follow-up items (defer, do not block merge)

- **`057b-followup-test-injection`** (already filed in `backlog/_followups.md`) — wire `coord_invoke` test handler to accept an injected spawn-mock so `tests/coord/coord-invoke-spawns-wrapper.test.ts` and `coord-invoke-fire-and-forget.test.ts` no longer invoke the real production wrapper during `npm test`. Reviewer's `npm test` run produced no observable side-effects (clean `git status`, no new `backlog/reviews/057b*` rounds, no queue-errors rows), but the lurking footgun remains for non-default dev environments.
- **AC8 remaining 10 tests** — ship `active-trigger-roundtrip`, `pre-spawn-deadline-fires`, `scheduler-health-two-phase`, `correlation-id-shared-active-and-fallback`, `pinned-request-mode`, `tick-end-covers-clean-exits`, `pinned-request-bind-failed-closes-deadline`, `coord-invoke-spawn-error-noncrash`, `scheduler-health-bootstrap-scope`, `silent-fail-detection`. File as a successor item once mocked-codex-CLI + launchd-cadence-simulator scaffolding is designed.
- **LOW: `src/coord/paths.ts:140` exec-bit POSIX assumption** — inline comment correctly notes the owner-executable check assumes POSIX exec-bit semantics; would false-fail on FAT-mounted volumes. Revisit if daemon ships in container or non-POSIX FS context.

## Open questions for founder

None — verdict is `merge as-is`.

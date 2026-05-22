---
item_id: 2026-05-21-066-process-backlog-handoff-atomicity
verdict: redo before merge
reviewed_at: 2026-05-22T05:51:27Z
test_counts: { passed: 1164, failed: 2 }
---

## Verdict
The branch has the core P1 transcript and current-consumer specialization tests, but it fails the required `npm test` run and partially misses AC1. Do not merge until the shipped 048 process-backlog shape markers are restored and the generic P1 harness validates every named crash point, including allowed dirty surfaces.

## Pre-merge fixups
- [ ] `skills/process-backlog.md` and `.claude/commands/process-backlog.md` — reintroduce the `E2.5. Final builder-state refresh (protocol-wide)` and `E2.6. Commit + push (single final commit)` markers while preserving the new P1 ordering; their removal breaks existing `tests/backlog/process-backlog-skill.test.ts` expectations.
- [ ] `tests/skills/atomic-state-transition-harness.test.ts` — update the generic harness to recover or finish from every `prePublishSteps` crash point independently, not only after all pre-publish steps have run.
- [ ] `tests/skills/atomic-state-transition-harness.test.ts` — assert each observation's `dirtySurfaces` is constrained by that step's `allowedDirtySurfaces`.
- [ ] Re-run `npm test`, `npm run lint`, and `npm run typecheck` inside `/Users/zhenye/Desktop/Project_echo--process-backlog-handoff-atomicity` and update the pending item only after all pass.

## Expected merge conflicts
- `skills/process-backlog.md` — no textual conflict expected against current `main`, but merging as-is creates a semantic conflict with the shipped 048 process-backlog shape contract.
- `.claude/commands/process-backlog.md` — no textual conflict expected; keep it byte-synced from `skills/process-backlog.md` via `tools/sync-skills.sh`.
- `tests/skills/atomic-state-transition-harness.test.ts` — clean add expected.

## Follow-up items (defer, do not block merge)
- Consider adding a small negative fixture proving AC1 fails when an early crash point is unrecoverable.

---
item_id: 2026-05-08-023-chokidar-flake-quarantine
verdict: merge with founder fixups
reviewed_at: 2026-05-08T08:47:00Z
reviewed_by: strategist (claude opus 4.7) via superpowers:code-reviewer subagent
head_sha: fbaa7586e8eac794762cd5883ff36ab341bfc4cd
test_counts: { passed: 437, skipped: 15, failed: 0 }
---

## Verdict

Merge with founder fixups. Implementation is faithful to Path C, surgical, all acceptance criteria met cleanly, lint/typecheck/test all green. No drift — agent stayed strictly inside `files_to_modify` and respected the Out-of-Scope rule that forbade quarantining `fs-watcher.test.ts`. Reviewer re-ran the suite once: 437 passed / 15 skipped / 0 failed, matching the agent's verification.

The only blocking decision is the agent's own surfaced open question. Baseline runs B and C both showed `tests/capture/surfaces/fs-watcher.test.ts` flaking with the same chokidar close-race (~33% per-run rate). The spec's "0 failures × 3 consecutive runs MUST" criterion is met to the letter, but joint-pass-by-luck probability is ~30% — substantively weaker than the MUST language implies. The agent correctly flagged this rather than silently expanding scope. Founder must confirm the carve-out before merge.

## Pre-merge fixups

- [ ] **Founder decision: fs-watcher.test.ts carve-out.** Recommend option (b) — merge 023 as-is, then file a tight successor item: "apply Path C describe.skip to `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher` block, ~30 LOC, ~15 min." The 021-section annotation in `backlog/_followups.md:124-125` already pre-lays the breadcrumb. Option (a) would require re-claiming and re-running verification at ~same total cost as filing the successor.

(No code-level pre-merge fixups — implementation is correct.)

## Expected merge conflicts

- `tests/capture/extractors/cursor.test.ts` — clean merge expected; main's last touch predates branch base.
- `tests/daemon/lifecycle.test.ts` — clean merge expected; same as above.
- `backlog/_followups.md` — clean merge expected; last main touch (`dc861b4`, 021 followups) is in branch ancestry; annotations append at section trailers, no interleave. Only risk: a concurrent `/merge-and-cleanup` pass appending fresh 2026-05-08 followups to the same trailing sections — none in flight.
- `vitest.config.ts` — not touched, no conflict.

Overall: **no merge conflicts expected.**

## Follow-up items (defer, do not block merge)

- **File the chokidar real-fix item** (post-V1.5; 2-3d). Tracking comments at `tests/capture/extractors/cursor.test.ts:310-317` and `tests/daemon/lifecycle.test.ts:121-129` cite 023 but no successor. When 023 lands in `complete/`, those references become tombstones. Investigate deterministic synchronization via `probeFreshness` handle (already flagged in 016 followup) or sentinel-event subscription.
- **fs-watcher Path C successor** (the option (b) item from the pre-merge fixup, if founder confirms (b)). ~15 min, same shape as 023 but for a single describe block.
- **Optional: grep-anchored CI ship-blocker** for V1 cut. CI fails if `describe.skip` paired with `2026-05-08-023` is still present after a target date. Insurance against deferral outliving memory.

## Design-choice judgments (all stand)

| Choice | Verdict | Reasoning |
|---|---|---|
| `describe.skip` instead of per-`it.skip` | Stand | Spec body said per-`it.skip` but author didn't know flake rotates across the describe block. Agent has direct empirical evidence; smallest-edit answer that restores signal. Spec's intent better served. |
| Path A rejected as out-of-budget | Stand | Spec heuristic explicitly endorses Path C when failure sets fluctuate. |
| Path B rejected for `lifecycle.test.ts` | Stand | Verified: `tests/daemon/lifecycle.test.ts:182` has inline `expect(elapsed).toBeLessThan(8000)` — testTimeout bump cannot affect this assertion. Reasoning correct. |
| `vitest.config.ts` untouched despite being in `files_to_modify` | Stand | Listed only for Paths A/B contingency. Path C didn't need it. Opportunistic edits would have been drift. |

## Acceptance status

| Criterion | Status | Evidence |
|---|---|---|
| 3 baseline `npm test` runs recorded | ✅ Met | run log §"Test results — baseline" lines 56–103 (3, 5, 4 failures) |
| Path chosen with rationale | ✅ Met | run log §"Path decision rationale" lines 26–34 |
| 3 consecutive post-fix runs clean | ✅ Met (caveat) | run log lines 105–132; reviewer re-run 437/15/0; ~30% joint-pass-by-luck on fs-watcher's ~33% solo flake rate |
| 6 `_followups.md` sections annotated; 014 carve-out preserved | ✅ Met | grep returns 6; 014's annotation explicitly carves out claude-code + fs-watcher portions |
| `npm run lint` clean | ✅ Met | reviewer re-run exit 0 |
| `npm run typecheck` clean | ✅ Met | reviewer re-run exit 0 |
| Run log present | ✅ Met | `raw/internal/agent-runs/2026-05-08-2026-05-08-023-chokidar-flake-quarantine.md` |

## Open questions for founder

1. **Confirm fs-watcher.test.ts carve-out.** Reviewer recommends option (b): merge 023 as-is + file a 15-min successor item. Reply confirms the carve-out and unblocks the merge.

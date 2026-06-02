---
backlog_item: 2026-06-02-086-claim-gate-spec-review-convergence
agent_run_started: 2026-06-02T22:34:19Z
agent_run_ended: 2026-06-02T22:47:36Z
status: ready_for_review
test_status: passing
branch: agent/claim-gate-spec-review-convergence
head_sha: 09ad3ac45fc7d4c96ab4c06645b927e33c637436
---

# Agent Run: 086 Claim Gate Spec-Review Convergence

## What I Implemented

Implemented a spec-review convergence gate in `tools/blocked.py` so `ready/` items with non-empty `requested_reviewers` are claimable only with `spec_review: converged` plus a fresh normalized-content digest, or founder-owned `spec_review: waived`. Added the shared digest CLI used by the watcher prose, extended the existing selector test harness, updated builder/backlog docs, and regenerated the Claude watcher adapter from the canonical skill.

## Files Modified

- `tools/blocked.py` — review marker parsing/preservation, normalized digest helper, validation, candidate gate, and listing reasons.
- `tools/test_blocked.py` — extended from 18 to 29 tests for review-gate behavior and validation.
- `skills/review-queue-watch.md` — terminal marker instructions for both watcher terminal paths.
- `.claude/commands/review-queue-watch.md` — regenerated adapter copy via `tools/sync-skills.sh`.
- `docs/AGENT_INSTRUCTIONS.md` — builder claim contract and non-builder-managed marker fields.
- `backlog/README.md` — two-axis ready/claimable docs and marker field docs.

Branch: `agent/claim-gate-spec-review-convergence`

Head SHA: `09ad3ac45fc7d4c96ab4c06645b927e33c637436`

## Decisions Made During Implementation

- Added `tools/blocked.py --spec-review-sha <item.md>` so watcher prose and selector code share one digest function instead of duplicating normalization logic in prose or another script.
- Treated malformed scalar `requested_reviewers` as blocked with `malformed-requested-reviewers`, not as validation-fatal, matching AC2's fail-closed requirement.
- Kept `blocked.py --validate` focused on explicit marker schema errors: bad `spec_review`, missing/malformed converged digest, and malformed digest under any value.
- The spec_ref `backlog/ready/2026-06-02-085-reviewer-invocation-contract.md` had moved to `backlog/pending_review/2026-06-02-085-reviewer-invocation-contract.md` on current main before implementation. I read the moved file as the same referenced item.
- Initial `npm test` failed because the fresh worktree had no `node_modules/.bin/vitest`. Ran `npm install` in the worktree, then reran `npm test` successfully. `npm install` reported existing audit findings; no audit fixes were run because they are outside 086.

## Acceptance Criteria Status

- [x] AC1 — Watcher terminal paths now instruct writing `spec_review: converged` plus digest, staged in the same terminal commit; adapter regenerated and sync check passes.
- [x] AC2 — Selector preserves inline-list `requested_reviewers`, `spec_review`, and `spec_review_sha`; review gate lives in `spec_review_satisfied()`.
- [x] AC3 — Normalized-content digest excludes marker and agent-managed fields; tests cover marker-only fresh and AC-body stale.
- [x] AC4 — `docs/AGENT_INSTRUCTIONS.md` and `backlog/README.md` document the gate, `waived`, and watcher/founder marker ownership.
- [x] AC5 — `--validate` rejects bad `spec_review`, missing converged digest, and malformed digest fields.
- [x] AC6 — `tools/test_blocked.py` covers requested cases and passes.
- [x] AC7 — No-review-required behavior is covered by absent/empty `requested_reviewers` tests. Real `--list-all` output is empty because the current backlog has no `ready/` items.

## Tests Run

### `python3 tools/test_blocked.py`

```text
Ran 29 tests in 2.853s

OK
```

### `python3 tools/blocked.py --validate`

```text
OK: 85 items across all stages, no errors
```

### `python3 tools/blocked.py --list-all`

```text

```

### `python3 tools/blocked.py --list-blocked`

```text
(none)
```

### `tools/sync-skills.sh --check`

```text
OK: all Claude command adapters match canonical skills/
```

### `git diff --check`

```text

```

### `npm test`

```text
Test Files  142 passed | 1 skipped (143)
     Tests  1505 passed | 21 skipped (1526)
  Start at  15:44:49
  Duration  78.98s (transform 4.70s, setup 0ms, collect 30.07s, tests 384.67s, environment 22ms, prepare 16.14s)
```

## Open Questions for Founder

None.

## Drift Events Caught

None.

## Notes

No ECHO MCP tools were available in this Codex tool surface during the run, so I made zero ECHO MCP calls and did not add a dogfooding journal entry for this builder work.

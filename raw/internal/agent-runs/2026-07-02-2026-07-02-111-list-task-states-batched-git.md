---
backlog_item: 2026-07-02-111-list-task-states-batched-git
agent_run_started: 2026-07-03T03:23:06Z
agent_run_ended: 2026-07-03T03:36:55Z
status: ready_for_review
test_status: passing
branch: agent/list-task-states-batched-git
head_sha: e50237dcef0ce6fcc86d81c8283c0b1d7be6dd4c
---

# Agent Run: 111 — list_task_states batched git reads

## What I Implemented

Reworked `listTaskStates()` so a bare `{}` call resolves one pinned SHA, discovers task-state pointers from a single pinned `ls-tree`, resolves backlog stages with four pinned stage `ls-tree` calls, reads pointer blobs with one `cat-file --batch`, and computes `last_updated` with one `git log --name-only` walk.

Added the AC2 fixture/baseline first, then rewired production code in a later commit. The focused batching test deep-equals the checked-in baseline and asserts the exact 8-child git ledger through one injectable runner seam.

## Files Modified

- `src/mcp/util/role-state-git.ts` — 252 lines; added `GitRunner`, growth-sized capture defaults, batched blob reads, and batched commit-time reads.
- `src/mcp/tools/list-task-states.ts` — 207 lines; rewired `listTaskStates()` to batched stage/blob/commit-time reads at the single resolved SHA.
- `tests/mcp/tools/fixtures/build-list-task-states-fixture.ts` — 147 lines; deterministic fixture repo builder with fixed git identity/dates.
- `tests/mcp/tools/fixtures/list-task-states-baseline.json` — 83 lines; generated from the pre-rewire implementation before production changes.
- `tests/mcp/tools/list-task-states-batching.test.ts` — 123 lines; ledger, baseline equivalence, injected failure cleanup, and high-cardinality output coverage.

Branch: `agent/list-task-states-batched-git`
Head SHA: `e50237dcef0ce6fcc86d81c8283c0b1d7be6dd4c`

## Decisions Made During Implementation

- Used a single synchronous `GitRunner` seam around `spawnSync` so existing synchronous `getRoleState()` / `listTaskStates()` contracts and unmodified tests stay intact.
- Used `cat-file --batch` with stdin piped and `DEFAULT_GIT_MAX_BUFFER_BYTES = 64 MiB`; this satisfies the growth-sized batch-output path without introducing an async API change.
- Kept `get_role_state` behavior unmodified except for optional runner plumbing in shared helpers.
- Committed fixture + baseline before production rewiring to make AC2's baseline sequence visible in git history.

## Acceptance Criteria Status

- [x] AC1 — constant spawn count through a single accounting seam: focused test asserts exactly 8 git children by argv for bare `{}`.
- [x] AC2 — output equivalence against reproducible baseline: fixture builder + checked-in baseline added before rewire; focused test deep-equals baseline.
- [x] AC3 — single-SHA pinning preserved: all batched commands take the resolved SHA; existing role-state tests pass unmodified.
- [x] AC4 — product gate green: `tests/mcp/recent-calls-endpoint.test.ts` passes in 1.117s; full `npm run test:product` passes.
- [x] AC5 — full verification: typecheck, lint, and product suite all pass.
- [x] AC6 — batch subprocess robustness: focused tests cover injected batch parse failure with no active simulated child left across repeated calls and high-cardinality batch output above 1 MiB.

## Test Results

### Focused role-state tests

```
$ npx vitest run tests/mcp/tools/list-task-states-batching.test.ts tests/echo-mcp/role-state.test.ts

✓ tests/mcp/tools/list-task-states-batching.test.ts (3 tests) 2911ms
✓ tests/echo-mcp/role-state.test.ts (15 tests) 7832ms

Test Files  2 passed (2)
     Tests  18 passed (18)
```

### Product gate test

```
$ npx vitest run tests/mcp/recent-calls-endpoint.test.ts

✓ tests/mcp/recent-calls-endpoint.test.ts (2 tests) 1117ms
  ✓ GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper 1104ms

Test Files  1 passed (1)
     Tests  2 passed (2)
```

### Typecheck

```
$ npm run typecheck

> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

### Lint

```
$ npm run lint

> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

### Full product suite

```
$ npm run test:product

Test Files  153 passed | 1 skipped (154)
     Tests  1610 passed | 21 skipped | 1 todo (1632)
  Duration  47.19s
```

## Open Questions for Founder

- None.

## Drift Events Caught

- None.

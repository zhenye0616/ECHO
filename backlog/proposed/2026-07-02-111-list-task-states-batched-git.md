---
id: 2026-07-02-111-list-task-states-batched-git
title: "list_task_states latency stays flat as task-state dirs accumulate — collapse ~6 git spawns per task into a constant number of batched git reads at the same pinned SHA"
status: proposed
priority: HIGH
estimate: 0.5-1d (batching is localized to one tool + one git-util module; the care point is preserving the single-SHA pinning invariant and byte-identical output)
created: 2026-07-02
blocked_by: []
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - src/mcp/tools/list-task-states.ts        # the tool: per-task resolveStageAtRef (4× cat-file -e) + commitTimeForPathAtRef (path-limited git log) + readBlobAtRef
  - src/mcp/util/role-state-git.ts           # git helpers to extend with batched variants (ls-tree per stage dir, cat-file --batch, single-walk commit times)
  - src/mcp/tools/get-role-state.ts          # shares the git-util module; must keep working unmodified
  - tests/echo-mcp/role-state.test.ts        # existing behavior coverage for list_task_states / get_role_state — must pass unmodified
  - tests/mcp/recent-calls-endpoint.test.ts  # the product-gate test currently tipped over its 15s budget by this tool's ~11.7s call
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md  # AC4 origin: the single-resolved-SHA invariant (defends HEAD-race / multi-snapshot) that batching must preserve
  - skills/role-typed-task-state.md          # read contract for task-state pointers; output shape is consumed by cold-start bindings
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder confirms paths against the substrate before claiming.
  - src/mcp/util/role-state-git.ts           # batched helpers: listTreeAtRef reuse for stage dirs, blob reads via `git cat-file --batch`, commit times via one `git log --name-only` walk (or ls-tree + single log)
  - src/mcp/tools/list-task-states.ts        # rewire listTaskStates() onto the batched reads; per-entry logic unchanged
  - tests/mcp/tools/list-task-states-batching.test.ts  # NEW — spawn-count assertion via injected gitCapture spy + output-equivalence against the naive path on a fixture repo
---

# 111 — list_task_states batched git reads (flat latency at any task count)

## Problem

`list_task_states` with empty args takes **~11.7s** on the current repo while
every other MCP tool answers in single-digit milliseconds (measured 2026-07-01
via per-tool timing against `startMcpServer`). The cost model: for each of the
~48 `backlog/task-state/<task-id>/` dirs the tool spawns ~6 sequential git
subprocesses —

- `resolveStageAtRef`: up to 4× `git cat-file -e` probing
  `backlog/{ready,claimed,pending_review,complete}/<id>.md`. Since completed
  items are the terminal (and now universal) state and `complete` is probed
  LAST, all 4 always run today (~0.03s each);
- `commitTimeForPathAtRef`: a path-limited `git log -1` over the full ~3.8k-commit
  history (~0.10s — the dominant term);
- `readBlobAtRef`: one `git cat-file` per anchor pointer.

≈290 spawns ≈ 11.7s, growing linearly forever: task-state dirs are permanent
(complete items keep theirs). Consequences today:

1. **Product:** every MCP client calling `list_task_states` — the designated
   cold-start discovery surface for role-typed bindings — stalls ~12s per call.
2. **Product gate:** `tests/mcp/recent-calls-endpoint.test.ts` smoke-calls every
   registered tool inside a 15s budget; this one call consumes ~78% of it, so
   the test now fails under full-suite load. Bumping the timeout would mask a
   real, still-compounding product regression — wrong fix.

## Design

Behavior-preserving refactor: same output, same pinned-SHA semantics, constant
git-spawn count. All reads already share one `resolveRefOnce` SHA; batching
keeps that invariant trivially (every batched command takes the same `<sha>`).

- **Task-id discovery (pinned):** discovery of `backlog/task-state/<task-id>/`
  dirs comes from the SAME single recursive
  `git ls-tree -r --name-only <sha> backlog/task-state/` call that yields the
  pointer paths — never from the working tree (which would break AC3's
  single-SHA invariant for `ref` calls) and never from per-dir probes (which
  would break AC1's constant spawn count). This call is enumerated in the
  spawn budget below (r1 codex finding).
- **Stage resolution:** replace per-task `cat-file -e` probes with one
  `git ls-tree --name-only <sha> backlog/<stage>/` per stage (4 total) and a
  set-membership lookup.
- **Blob reads:** one `git cat-file --batch` process fed all anchor-pointer
  paths at `<sha>:<path>`. Lifecycle is part of the contract: the helper
  closes the child's stdin when done, awaits process exit, and kills + reaps
  the child on parse error, missing object, or early abort — the MCP server
  is long-running, so leaked children/fds compound (r1 codex-ops finding).
- **Commit times:** one history walk — `git log --format=… --name-only <sha> --
  backlog/task-state/` — building a path→last-commit-time map (first time a
  path appears in the walk is its most-recent touch). Equivalent to N
  `git log -1 -- <path>` calls at a single walk's cost.
- **Output sizing:** the two batched-output commands (`git log --name-only`
  walk, `cat-file --batch`) must use streaming reads or an explicit
  max-buffer sized for repo growth — a fixed default capture buffer that was
  fine for per-file reads can hard-fail the unattended MCP call once batched
  output exceeds it (r1 codex-ops finding).

Enumerated spawn budget (= the AC1 constant): 1 `rev-parse` (resolveRefOnce)
+ 1 `ls-tree -r backlog/task-state/` (discovery + pointer paths) + 4
`ls-tree backlog/<stage>/` + 1 `cat-file --batch` + 1 `git log --name-only`
walk = **8 total**; expected latency well under 1s on this repo.

## Acceptance Criteria

- **AC1 — constant spawn count.** For a bare `{}` call, total git subprocesses
  is the fixed enumerated budget of 8 (rev-parse; ls-tree -r task-state
  discovery; 4× stage ls-tree; cat-file --batch; log --name-only walk),
  independent of the number of task-state dirs. Task-id discovery MUST come
  from the pinned ls-tree call, not the working tree. Asserted by test via an
  injected/spied `gitCapture` (no wall-clock flakiness).
- **AC2 — output equivalence against a named baseline.** Baseline mechanism
  (r1 codex finding — the old code path no longer exists once rewired): the
  builder generates the expected output ONCE by running the pre-change
  implementation (at the commit before the rewire) against the test fixture
  repo, and checks it in as a static expected-JSON fixture; the test
  deep-equals the batched implementation's result against that fixture at the
  same ref. Copying old production logic into the test, or comparing the new
  implementation to itself, are both explicitly non-compliant. Fixture repo
  must cover tasks across multiple stages, a stage-less task, a
  strategist-less task, and a malformed anchors file exercising
  `_parse_error` degradation. `tests/echo-mcp/role-state.test.ts` passes
  unmodified.
- **AC3 — single-SHA pinning preserved.** All batched commands are pinned to
  the one `resolveRefOnce` SHA; the `ref` param and the echoed resolved-SHA
  response field behave exactly as today (046 AC4 R2 invariant).
- **AC4 — product gate green.** `tests/mcp/recent-calls-endpoint.test.ts`
  passes within the existing 15s budget in the FULL product suite (not just
  isolation), with the `list_task_states` smoke call completing in <1s on this
  repo. Do not raise the 15s budget.
- **AC5 — full verification.** `npm run typecheck`, `npm run lint`,
  `npm run test:product` all pass.
- **AC6 — batch subprocess robustness.** (r1 codex-ops findings.) (a) The
  `cat-file --batch` helper closes stdin, awaits child exit, and kills +
  reaps the child on parse error, missing object, or early abort; a test
  injects an error path and asserts no orphaned git child remains across
  repeated calls. (b) The `git log --name-only` walk and `cat-file --batch`
  reads use streaming or an explicit max-buffer sized for growth; a
  high-cardinality fixture (≥10× today's task-dir count, generated
  synthetically) asserts output larger than the old per-file capture size is
  handled correctly. No timing assertions in either test.

## Out of Scope (Don't Drift)

- No change to the tool's input/output schema, sort order, degradation
  semantics, or the `binding` no-op param.
- No caching layer, daemon-side index, or watch-based invalidation — this is
  batching only. If batching alone can't hold <1s at 10× today's task count,
  note it in agent_notes for a follow-up item instead of building it here.
- Do NOT touch `get_role_state`'s behavior (shared helpers may gain batched
  variants, but its call path stays correct and covered by existing tests).
- Do NOT modify `tests/cli/shell-reachable.test.ts` — that failure is item 110
  (separate root cause).

## After Completion (Strategist Notes)

- Update the `skills/role-typed-task-state.md` read-contract page only if the
  latency characteristics are documented there (they are not today — likely
  no-op).
- Journal observation already on record (2026-07-01 audit): discovery-surface
  latency compounding with archive growth is a pattern to watch on other
  git-walking tools (`pending_decisions` measured 156ms — fine today).

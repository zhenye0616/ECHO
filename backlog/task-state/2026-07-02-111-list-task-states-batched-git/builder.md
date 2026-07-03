---
task_id: 2026-07-02-111-list-task-states-batched-git
role: builder
binding: codex
claim_branch: agent/list-task-states-batched-git
last_updated: 2026-07-03T03:24:00Z
---

## current_thesis
Claimed 111 as codex builder. Preserve `list_task_states` output and single-SHA semantics while replacing per-task git probes with the spec's fixed 8-child batched git plan.

## locked_decisions
- AC1: a bare `{}` `list_task_states` call must spawn exactly the fixed 8 git children through one injectable accounting seam, including streaming children, with task discovery from the pinned `ls-tree` result.
- AC2: add the deterministic fixture builder and checked-in baseline before rewiring production code; equivalence compares the batched output to that baseline, not to copied old logic or the new implementation itself.
- AC3: preserve one `resolveRefOnce` SHA for every batched command and the existing `ref` echo behavior.
- AC4: keep `tests/mcp/recent-calls-endpoint.test.ts` under its existing 15s budget, with `list_task_states` under 1s on this repo; do not raise the timeout.
- AC5: `npm run typecheck`, `npm run lint`, and `npm run test:product` must pass.
- AC6: every streaming batched git child must be awaited and cleaned up on error/abort, with growth-safe output handling and high-cardinality coverage.

## open_questions
- None blocking at claim time. Escalate if the implementation requires files outside `files_to_modify`, a new dependency, or behavior changes outside the accepted output-preserving batching scope.

## dont_touch
- Do not change the tool's input/output schema, sort order, degradation semantics, or `binding` no-op parameter.
- Do not add caching, a daemon-side index, or watch-based invalidation.
- Do not change `get_role_state` behavior; shared helpers may gain batched variants only.
- Do not modify `tests/cli/shell-reachable.test.ts`.
- Do not edit wiki pages, docs status/backlog files, or backlog item bodies.

## canonical_anchors
- spec: backlog/claimed/2026-07-02-111-list-task-states-batched-git.md

---
task_id: 2026-06-03-088-proposed-stage-pipeline
role: builder
writer: codex-builder
binding: codex
claim_branch: agent/proposed-stage-pipeline
last_updated: 2026-06-04T06:28:06Z
---

## current_thesis

Claimed by codex builder `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`. Implement the proposed-stage pipeline: make folder location the source of claimability, replace 086's `spec_review` state gate with `ready_content_sha`, automate promotion/bounce, generate BACKLOG output through a tool only, and keep spec-review content mechanics unchanged.

## locked_decisions

- AC1: add `backlog/proposed/.gitkeep`; document `proposed/` as spec draft/review stage and remove inbox references from docs/skills.
- AC2: update `tools/blocked.py` so stages include proposed, candidates come only from ready, `ready_content_sha` match gates claimability, proposed ids are known-but-unsatisfied deps, stale ready items fail closed, and 086 `spec_review` state gating is removed after the migration window.
- AC3: update `tools/review-queue/request.py` artifact lookup to scan proposed before ready, claimed, pending_review, and complete.
- AC4: add `tools/review-queue/promote.py` plus watcher integration for stage-only terminal promotion, recovery/bounce commit+push mode, terminal-promotable predicate, reviewed-content identity check, ready mismatch bounce, and proposed-stage path-(c) cut via `dispatch-next-round.py`.
- AC5: add `tools/backlog_index.py` as a generated BACKLOG renderer with fixture-only `--check`; do not modify tracked `docs/BACKLOG.md`.
- AC6: land migration in the never-half-broken order, including migrating live 087b from `spec_review: waived` to current `ready_content_sha`.
- AC7: update coherent operating-model docs and canonical skills, then regenerate listed `.claude/commands/*` adapters through `tools/sync-skills.sh`.
- AC8: rework selector tests and add promotion, request, watcher-dispatch, and backlog-index tests; full test/lint/typecheck/sync/diff hygiene must pass or be escalated.
- AC9: constrain scope to stage topology plus claim/promotion mechanism only.

## open_questions

- None blocking at claim time.
- Non-blocking observation: `task_state_ref` is set, but no strategist pointer directory existed at claim; builder proceeds from the spec body and mandatory refs.

## dont_touch

- Do not change spec-review convergence computation, reviewer rosters, or round mechanics except the proposed-stage path-(c) dispatch guard required by AC4/AC8.
- Do not build `echo_skill()`, render-at-use-time adapters, code-owned machine artifact emission, or adapter-drift freshness gates.
- Do not create or rework `inbox/`; raw ideas remain ECHO context, not backlog artifacts.
- Do not hand-edit tracked `docs/BACKLOG.md`; builder ships the generator and fixtures only.
- Do not edit `wiki/**`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, item bodies, or files outside the spec's `files_to_modify`.

## canonical_anchors

- spec: backlog/claimed/2026-06-03-088-proposed-stage-pipeline.md
- reviews: backlog/reviews/2026-06-03-088-proposed-stage-pipeline/

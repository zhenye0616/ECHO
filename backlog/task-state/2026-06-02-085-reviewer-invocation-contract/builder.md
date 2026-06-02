---
task_id: 2026-06-02-085-reviewer-invocation-contract
role: builder
writer: codex-builder
binding: codex
claim_branch: agent/reviewer-invocation-contract
last_updated: 2026-06-02T22:22:38Z
handoff_branch: agent/reviewer-invocation-contract
handoff_head_sha: 40756238ab84a7a7be4c2be103e3d969b6224873
handoff_run_log: raw/internal/agent-runs/2026-06-02-2026-06-02-085-reviewer-invocation-contract.md
---

## current_thesis

Claimed by codex builder `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`. Implement the reviewer-invocation MVP: replace the reviewer shell-string path with one argv-based `reviewer-bindings.json`, split AI-child `agent_sandbox` from wrapper-owned commit capability, keep reviewer artifact ownership otherwise behavior-preserving, and leave all named successors out of scope.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED — see agent_notes and raw/internal/agent-runs/2026-06-02-2026-06-02-085-reviewer-invocation-contract.md for blocker.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: add `tools/review-queue/reviewer-bindings.json` plus schema; one entry per current reviewer, argv vectors for headless modes, `ide-manual` cursor without argv, `agent_sandbox` defaulting to `read-only`, and expected artifact metadata.
- AC2: remove `_reviewer_gate.py --print invoke_command` and `_run_reviewer.sh` `bash -c "$INVOKE_CMD"`; resolve argv/stdin/sandbox from the new binding file and exec argv directly with prompt stdin redirection.
- AC2 coord seam: `coord_invoke` still spawns the existing reviewer wrapper with `shell:false`; the spawned wrapper is the single source that reads `reviewer-bindings.json`.
- AC3: codex/codex-ops/claude AI children resolve `agent_sandbox: read-only`; wrapper/writer retains today's git commit+push responsibility and committed markdown artifact boundary.
- AC4: update `docs/review-queue-setup.md` so review child guidance says read-only child plus writer-owned commit capability, removing the danger-full-access blessing for review children.
- AC5: add tests for schema parse/validation, argv execution with no `bash -c`, behavior equivalence with current `reviewers.json`, sandbox defaults, and required command/test suite.
- AC6: no file outside `files_to_modify`; do not move coord-roles SLA config, reviewer artifact ownership, watcher/headless behavior, requested-reviewer claim gate, or any successor scope.

## open_questions

- None blocking at claim time.
- Non-blocking observation: `task_state_ref` is set, but no strategist pointer directory existed at `origin/main` when claimed; builder proceeds from the spec body and mandatory refs.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch

- Do not edit `wiki/**`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, item bodies, or `backlog/complete/**`.
- Do not modify files outside the spec's `files_to_modify` list unless escalating.
- Do not implement orchestrator-owned canonical sidecars, normalized review intermediates, 5th capture-kind behavior, evidence byte caps/redaction, schema enum-sync codegen, per-binding smoke installers, headless watcher/strategist, requested-reviewer claim gates, coord-roles SLA migration, or the claude required-flag decision.
- Do not change merge/founder checkpoints or reviewer self-commit behavior beyond the specified review-child sandbox split.

## canonical_anchors

- spec: backlog/pending_review/2026-06-02-085-reviewer-invocation-contract.md

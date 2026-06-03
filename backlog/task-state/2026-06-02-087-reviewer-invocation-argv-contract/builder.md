---
role: builder
task_id: 2026-06-02-087-reviewer-invocation-argv-contract
last_updated: 2026-06-03T04:53:33Z
lifecycle: claimed
branch: agent/reviewer-invocation-argv-contract
claim_commit: 181eec8d
handoff_branch: agent/reviewer-invocation-argv-contract
handoff_head_sha: 5083f9d5cee2621170881b62ccba542dccf54432
handoff_run_log: raw/internal/agent-runs/2026-06-02-2026-06-02-087-reviewer-invocation-argv-contract.md
---

## current_thesis
Claimed 087 for implementation. The build is the narrow argv-invocation contract only: add reviewer-bindings.json + schema, route reviewer wrapper/installer/gate runtime invocation through argv + stdin_from, document current behavior, and prove behavior preservation with tests.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 5083f9d5cee2621170881b62ccba542dccf54432.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: create tools/review-queue/reviewer-bindings.json and tools/review-queue/schemas/reviewer-bindings.schema.json; include codex, codex-ops, cursor, and claude entries.
- AC1 locked shape: headless prompt path is carried by stdin_from, not argv; argv keeps stdin sentinel values and must not contain prompt paths or {{PROMPT}}.
- AC2: remove the reviewers.json shell-string path, _reviewer_gate.py --print invoke_command, and _run_reviewer.sh bash -c exec path; execute argv arrays losslessly.
- AC2: gate failure rc must be observed before preflight/exec; empty argv is a failure with durable queue-error diagnostics.
- AC2: reviewer-bindings.json is the only runtime-read invocation source for wrapper, installer, gate, and coord_invoke-spawned wrapper paths.
- AC3: docs must describe current reality accurately: codex/codex-ops review children still run danger-full-access and self-commit in 087.
- AC4: tests must cover binding/schema validation, no bash -c seam, behavior equivalence, coord_invoke same-source, path-with-spaces argv/stdin channels, packaging files entry, installer migration, gate failure, and prompt-path resolution.
- AC5: no sandbox flip, no commit-ownership move, no coord-roles SLA migration, no reviewers.json schema cleanup.

## open_questions
- None blocking at claim time.
- The task-state directory lacked a strategist.md despite task_state_ref; treating that as a missing upstream pointer, not an implementation blocker.

## dont_touch
- Do not implement the read-only-child + writer-owned-commit migration; that is 087b.
- Do not normalize /review-pending output or introduce an orchestrator-owned canonical sidecar.
- Do not add a fifth capture kind, NormalizedReviewIntermediate, evidence byte caps, enum-sync codegen, per-binding smoke, headless watcher, or requested_reviewers claim-gate changes.
- Do not move coord-roles.json SLA config.
- Do not modify the 056 claude required-flag gate.
- Do not retire or relax reviewers.json invoke_command or its schema; leave legacy data validated but runtime-unused for invocation.

## canonical_anchors

- spec: backlog/pending_review/2026-06-02-087-reviewer-invocation-argv-contract.md
- reviews: backlog/reviews/2026-06-02-087-reviewer-invocation-argv-contract/

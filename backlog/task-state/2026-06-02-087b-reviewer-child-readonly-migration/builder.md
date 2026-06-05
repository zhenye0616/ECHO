---
task_id: 2026-06-02-087b-reviewer-child-readonly-migration
role: builder
binding: codex
last_updated: 2026-06-05T03:37:43Z
branch: agent/reviewer-child-readonly-migration
claim_sha: ""
handoff_branch: agent/reviewer-child-readonly-migration
handoff_head_sha: 6c95b171218bf946889662f8db5ffc71c866ec5f
handoff_run_log: raw/internal/agent-runs/2026-06-03-2026-06-02-087b-reviewer-child-readonly-migration.md
---

## current_thesis
Reclaimed by Codex builder on `agent/reviewer-child-readonly-migration` after the founder-authorized allow-list fix for `tests/review-queue/reviewer-bindings.test.ts`. Implement only the reviewer-child read-only migration: move codex/codex-ops reviewer artifact publication, coord lifecycle, selection, git sync, and capture parsing into the wrapper; make the child content-only and read-only.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE + REVIEWED — CONFIRM (merge-ready) at 6c95b171218bf946889662f8db5ffc71c866ec5f. Independent review found 4 findings (2 HIGH, 2 MED); 5 root-cause fixer passes (05a7ef3a→765d5e17→c9f88ea0→9b94d42f→b7e3104e→6c95b171), each re-confirmed by a fresh read-only reviewer; final confirm CONFIRM. Full npm test green (1540 passed/21 skipped); isolated trial merge into origin/main clean.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: wrapper owns codex/codex-ops request selection, bind validation, git sync, immutable packet prep, coord lifecycle, schema validation, response write, commit, push, and post-response journaling; child only reasons and emits content.
- AC2: codex/codex-ops capture uses existing `stdout_json`; raw stdout/stderr are diagnostics only. Parse the final assistant-message event and publish that content.
- AC2: rc nonzero, empty stdout, and malformed/schema-invalid content are terminal/retry-bounded: durable queue error plus selector-consumed marker, committed and pushed before ephemeral worktree cleanup, with bounded diagnostics and explicit terminal-capture-failure `tick_end`.
- AC3: flip both metadata and resolved argv for codex/codex-ops to `read-only`; no codex/codex-ops binding may retain `danger-full-access` in argv or `agent_sandbox`.
- AC4: docs describe codex/codex-ops read-only child plus wrapper-owned commit; claude/cursor remain on prior model and are not claimed read-only.
- AC5: tests cover binding resolution, child no-commit path, stdout_json final-message parsing, terminal marker durability from fresh origin-backed scan, coord lifecycle outcomes, pre-spawn wrapper branches, and a write-free child happy path.
- AC6: no new capture kind, no claude/cursor migration, no coord-roles SLA changes, no combine.py/watcher native capture-failed classification.

## open_questions
- None blocking.

## dont_touch
- Do not edit `combine.py` or watcher native marker classification; selector-only marker consumption is in scope.
- Do not migrate claude or cursor publication semantics; only monthly-journal/no-HTML prose cleanup applies there.
- Do not touch the `056-claude-required-flag-gate` decision.
- Do not add `NormalizedReviewIntermediate`, evidence byte-cap/redaction, schema enum-sync codegen, per-binding preflight/smoke, or headless watcher work.
- Do not modify wiki, docs outside `docs/review-queue-setup.md`, or backlog item bodies.

## canonical_anchors

- spec: backlog/pending_review/2026-06-02-087b-reviewer-child-readonly-migration.md
- reviews: backlog/reviews/2026-06-02-087b-reviewer-child-readonly-migration/

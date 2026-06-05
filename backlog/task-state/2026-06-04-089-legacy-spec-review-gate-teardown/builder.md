---
role: builder
task_id: 2026-06-04-089-legacy-spec-review-gate-teardown
last_updated: 2026-06-05T06:04:08Z
lifecycle: claimed
branch: agent/legacy-spec-review-gate-teardown
claim_commit: 929a6448fcd88af23a6e25f603ebd7fbf44d7635
---

## current_thesis
Claimed 089 as Codex builder. Implement the narrow 088 migration teardown: remove the legacy `spec_review` dual-read claim path so folder location plus matching `ready_content_sha` is the sole live claim contract, while preserving seal normalization and avoiding new validation drift.

## locked_decisions
- AC1: delete `legacy_spec_review_satisfied()` and remove the fallback from `ready_content_satisfied()`; missing, malformed, or mismatched `ready_content_sha` must fail closed.
- AC2: stop validating `spec_review` / `spec_review_sha`; stray legacy fields are inert and must not make `--validate` exit 2.
- AC3: keep `CONTENT_MARKER_FIELDS` unchanged with `ready_content_sha`, `spec_review`, and `spec_review_sha` excluded from the normalized hash.
- AC3: remove `spec_review_content_sha()`, clean `promote.py`'s dead `spec_review_sha` strip branch, and drop `--spec-review-sha` only after a live caller sweep.
- AC4: remove legacy dual-read prose from `docs/AGENT_INSTRUCTIONS.md`, remove the watcher legacy-marker branch, regenerate `.claude/commands/review-queue-watch.md`, and keep `tools/sync-skills.sh --check` green.
- AC5: rework `tools/test_blocked.py` legacy tests to assert fail-closed without a seal and lenient-ignore for arbitrary `spec_review` values; run the full specified verification set.
- AC6: do not change the proposed-stage pipeline, seal semantics, promotion/bounce/identity logic, request/dispatch flow, backlog index behavior, or historical records.

## open_questions
- None blocking at claim time.
- The task-state directory had no strategist pointer despite `task_state_ref`; treating this as missing upstream context, not an implementation blocker.

## dont_touch
- Do not rename `ready_content_sha` or change seal normalization beyond preserving the existing marker exclusion set.
- Do not add new validation or hard-error paths for legacy fields; at most a warning would have required reviewer approval, so avoid it.
- Do not edit `docs/BACKLOG.md`, `wiki/**`, historical `backlog/complete/**`, `backlog/reviews/**`, or `raw/internal/agent-runs/**`.
- Do not touch open followups for code-owned sidecar emission, adapter freshness, capture-failed classification, or the stale `ECHO_COORD_REQUEST_PATH` ops bug.
- Do not modify files outside the spec's `files_to_modify` list except protocol-owned run log/backlog/task-state handoff files.

## canonical_anchors
- spec: backlog/claimed/2026-06-04-089-legacy-spec-review-gate-teardown.md
- reviews: backlog/reviews/2026-06-04-089-legacy-spec-review-gate-teardown/

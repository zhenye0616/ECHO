---
item_id: 2026-06-04-089-legacy-spec-review-gate-teardown
verdict: merge as-is
reviewed_at: 2026-06-05T07:49:15Z
test_counts: { passed: 1555, failed: 0 }
producer: codex-child
---

## Verdict
`merge as-is`. Independent review by a fresh-context codex reviewer (the builder was also codex but a
separate run/process — reviewer-independence satisfied) found all six acceptance criteria Met with
`file:line` evidence, zero drift, and zero blocking bugs. The legacy `spec_review` teardown is real and
correct: `legacy_spec_review_satisfied()` removed and `ready_content_satisfied()` fails closed on
missing/malformed/mismatched seal (`tools/blocked.py:321-330`); `VALID_SPEC_REVIEW` + the validation
block removed and a stray `spec_review` field is inert (no exit-2); `CONTENT_MARKER_FIELDS` correctly
left UNCHANGED (`tools/blocked.py:61`) per the r1 spec-review disposition, so existing seals stay stable;
`--spec-review-sha` alias removed after a live caller sweep found no executable callers, `--ready-content-sha`
retained and test-pinned; `promote.py` regex now strips only `requested_reviewers`. Full suite re-run at
the recorded head_sha `c4150c62`: `npm test` 1555 passed / 21 skipped / 0 failed, lint + typecheck clean,
`tools/test_blocked.py` 35 passed, `blocked.py --validate` clean, `backlog_index.py --check` fixture-pass,
`sync-skills.sh --check` matched.

## Pre-merge fixups
- none (no blocking findings)

## Expected merge conflicts
- none — `git merge-tree` reported a clean merge. Current `main` advanced only on pending-review
  metadata, task-state/run logs, `_followups.md`, and friction notes; it did not edit any of the six
  implementation/doc files this branch changed. Empty file intersection → clean `--no-ff`.

## Follow-up items (defer, do not block merge)
- Optional: add a direct malformed-`ready_content_sha` fixture to `tools/test_blocked.py` (missing +
  mismatch paths are covered; malformed is handled in code at `blocked.py:326-327` but not directly
  fixtured). Non-blocking — implementation already fails closed.
- The 089 pipeline-shakedown friction follow-ups (stale `status` seal, builder `review:` handoff
  mislabel, reviewer serialization) are already filed to `backlog/_followups.md` with codex root-cause
  analysis — separate from this item's merge.

## Open questions for founder
none — verdict is merge as-is; no escalation.

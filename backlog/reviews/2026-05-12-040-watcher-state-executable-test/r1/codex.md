---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 1
reviewer: codex
artifact_sha: 4c6d98f9b4eab66f3c42a406bb99003a4e24b60e
completed_at: "2026-05-12T09:30:49Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: AC1 lines 53-57, tools/review-queue/_lib.py atomic_link_write
    finding: >-
      The spec says dispatch-next-round.py should update an existing
      rN/combined.md while using the atomic link pattern already used by
      request.py. That pattern is create-only: _lib.atomic_link_write links
      the temp file to final and returns race_lost when final already exists.
      Because combined.md already exists before the helper runs, a builder who
      follows this literally cannot set next_round or append the waiver line.
      Patch the spec to require an explicit in-place atomic replacement
      strategy for combined.md, plus idempotent behavior when combined.md
      already has the intended next_round or waiver.
  - severity: medium
    where: AC1 signature lines 44-50 and AC3 fixture 3 lines 73-76
    finding: >-
      The required race-loser test needs the helper to re-invoke request.py at
      the same simulated spec_commit_sha and then at a different one, but the
      helper signature has no --spec-sha pass-through. request.py already
      exposes --spec-sha, and the existing review-queue tests use temp repo
      roots that are not necessarily git repos. Add a test-only --spec-sha
      option to dispatch-next-round.py and require it to pass through to
      request.py, or explicitly require the fixture to initialize a git repo and
      create two HEAD commits.
  - severity: medium
    where: AC1 behavior lines 53-57 and AC2 watcher parity line 59
    finding: >-
      The helper accepts --verdict=pushback, and the current watcher prose
      allows a pushback round to converge when all findings are deferred to
      follow-ups with no patches. AC1 only defines proceed+false,
      patches-applied=true, and proceed_after_patches+false waiver behavior, so
      pushback+false is undefined even though AC2 says the watcher mutation
      steps move behind the helper. Specify whether pushback+false is a no-op
      with next_round remaining null after strategist disposition, or keep that
      branch explicitly outside the helper.
  - severity: low
    where: Goal line 38 and AC2 line 59
    finding: >-
      The extraction boundary is ambiguous about git staging and commit/push of
      the helper outputs. Line 38 includes git add in the sequence being
      extracted, while AC1 only describes file writes and AC2 only preserves the
      pre-helper spec-patch commit. The watcher command should say exactly what
      happens after the helper succeeds: either the helper stages rN/combined.md
      and rN+1/request.md and the watcher commits/pushes them, or the watcher
      runs a concrete git add/commit/push-with-retry block for those paths.
---

# Codex review

Directionally sound: extracting the watcher state transition into a helper is the right way to make AC3.5(b) executable. The issues above are spec patches needed before a builder has an unambiguous implementation target.

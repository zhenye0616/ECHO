---
item_id: "2026-07-06-123-card-provenance-trace"
round: 1
reviewer: "codex"
artifact_sha: "175e4c4b112ce8a230fc59cbbad397204c9b6f8b"
completed_at: '2026-07-07T03:50:40Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC1 and AC5"
    finding: "AC1 requires fail-soft atom writes and duplicate suppression, but it does not define a recovery or marker path when the post succeeds and the atom write fails; a rerun can be suppressed before recreating the missing granola:card:<candidate_key> atom, leaving silent provenance loss. Patch AC1/AC5 to require a durable failure marker or retry-on-suppressed-run behavior, and test that an atom-write failure cannot be hidden by a later duplicate-suppressed rerun."
  - severity: "medium"
    where: "Acceptance Criteria / AC2 and AC3"
    finding: "AC2 leaves the persisted retrieval-correlation shape unspecified while AC3 requires trace-card to recover and print retrievals by classifier_run.run_id. Patch the spec to name the minimum stored record/atom contract, including the lookup key, the explicit zero-retrieval marker, and required fields for coarse inputs/results so the builder and tests can prove the trace output is recoverable after process exit."
---

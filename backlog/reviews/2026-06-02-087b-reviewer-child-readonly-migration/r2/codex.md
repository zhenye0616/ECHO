---
item_id: "2026-06-02-087b-reviewer-child-readonly-migration"
round: 2
reviewer: "codex"
artifact_sha: "8f718f35fc1d7d8f6ee2c78165116d66e376d32a"
completed_at: '2026-06-03T06:26:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:57,65,69 plus 087 parent schema tools/review-queue/schemas/reviewer-bindings.schema.json:71"
    finding: >-
      AC2/AC6 say the read-only child should switch to an already-087-defined
      capture.kind named `stdout`, but the parent 087 binding schema does not
      define that value; its capture enum is `committed_file`, `stdout_json`,
      `stdout_text`, `stderr_text`, and `none`. A builder cannot both set
      capture.kind to `stdout` and pass the parent schema, and adding a new
      `stdout` enum value violates AC6's no-new-kind rule. Patch the spec to
      name the exact existing enum value, probably `stdout_text` for Markdown,
      in the spec_ref note, Locked Decision 1a, AC2, AC5, and AC6.
  - severity: "high"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:65,68"
    finding: >-
      AC2/AC5 promise that rc != 0, empty stdout, or schema-invalid captured
      content produces a durable queue-error and is not an infinite re-poll,
      but appending to raw/internal/queue-errors.md does not change round
      eligibility. The current scanner reselects any request with no
      `<reviewer>.md` and no `combined.md`, and `queue_error.sh` only commits a
      log row. If the wrapper exits after a capture failure without writing a
      terminal marker or response artifact, the next launchd tick will pick the
      same request again. Patch AC2/AC5 to define the state transition that
      makes capture failure terminal or explicitly retry-bounded, and add the
      test for that marker/skip behavior.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md:64,68"
    finding: >-
      AC1 moves tick_start/tick_end ownership to the wrapper and requires
      tick_start before spawning the child, but the current tick_start
      correlation_id and no-candidate/stale-combined decisions are produced by
      the child prompt's Step 2 scan-pick/pinned validation. Without explicitly
      moving request selection and bind validation into `_run_reviewer.sh` (or
      a wrapper-owned helper) before spawn, the wrapper cannot know which
      correlation_id to emit in fallback mode and cannot correctly publish or
      classify no-candidate, stale_combined, bind_failed, duplicate_response,
      and upstream_duplicate outcomes. Patch AC1/AC5 to require wrapper-owned
      selection/bind-validation and tests for those pre-spawn branches.
---

## Codex Review

Verdict: `proceed_after_patches`.

The R2 direction addresses the R1 trust-boundary issues, but three implementation details still need to be pinned before this is safe to hand to a builder: the exact 087 capture enum value, the terminal state for failed captured output, and the wrapper-owned request-selection boundary needed for pre-spawn coordination.

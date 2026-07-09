---
item_id: "2026-07-09-130-decision-changeset-compiler-v0"
round: 2
reviewer: "codex-ops"
artifact_sha: "d9d8b5fe8c5a993d3280f8fdc4371eb8d49d8a37"
completed_at: '2026-07-09T18:58:57Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md:43"
    finding: "The line_key contract says keys are fixed at compile time, but AC2 allows human split/add edits after compile time. Patch the spec to define how split/add allocate stable persisted line_key values before the edited card is rendered and confirmed, and require those keys to be derived from immutable draft/edit metadata rather than mutable line text so crash retry cannot duplicate atoms or Linear mutations."
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md:54"
    finding: "AC8 makes confirm callbacks no-op while status is applying, but the spec does not define how an applying draft is resumed after the owner process crashes. Patch the spec to require an operational recovery path, such as an apply owner token plus stale lease/retry scan or explicit operator unlock, with visible evidence on the Slack card or logs when a draft is stuck in applying."
  - severity: "medium"
    where: "backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md:51"
    finding: "AC5 requires close idempotency and no duplicate closing comments, but the close mutation contract does not require a durable close marker that can be observed after a crash between posting the Linear comment and updating local draft state. Patch the spec to require the closing comment or Linear metadata to include a deterministic decision_atom_id plus target issue id marker, and require retry to check that marker before posting another close comment."
---

---
item_id: "2026-07-09-130-decision-changeset-compiler-v0"
round: 2
reviewer: "codex"
artifact_sha: "d9d8b5fe8c5a993d3280f8fdc4371eb8d49d8a37"
completed_at: '2026-07-09T18:58:47Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "The v0 pipeline stage 5-6 / AC2 / AC5"
    finding: "Define persisted line ids and line_key generation for split/add lines. The current line_key is fixed at compile time, but split and add create lines after compile time, so a builder has to guess whether keys are derived from render order, parent line_key, reply id, or an op counter. Patch the spec to require stable draft-local ids and keys for post-compile lines, plus tests proving retry does not duplicate atoms for split/add lines."
  - severity: "medium"
    where: "The v0 pipeline stage 5 / AC8"
    finding: "Require an atomic draft-store transition for confirm, such as pending+revision N to applying, and specify the stale/already-applying return cases. As written, AC8 describes the desired behavior but not the store-level compare-and-set needed to prevent two concurrent confirms at the same revision from both entering apply. Patch AC8 and the draft-store expectations with a deterministic concurrency/idempotency test."
  - severity: "medium"
    where: "The v0 pipeline stage 6 / AC5 / AC8"
    finding: "Clarify how a crashed draft left in status applying is resumed. The spec says confirm while applying is a no-op, but also says retry resumes per-line from applying; without a named resume trigger or lease/attempt rule, an orphaned applying draft can stay stuck or force operator guessing. Patch the spec to define whether startup, scheduled retry, or a confirm handler resumes applying drafts, and what evidence proves no live apply is still owning it."
  - severity: "medium"
    where: "AC5 / linear-client.ts close path"
    finding: "Specify the Linear close idempotency mechanism. Linear close plus comment does not inherently dedupe on decision_atom_id plus target issue id, so a crash after posting the closing comment but before marking the draft applied can repost the comment. Patch the spec to require a durable or queryable close stamp, such as a unique marker in the closing comment that linear-client checks before posting, and add a test for closed issue plus existing marker as a no-op."
---

---
item_id: "2026-06-08-098-per-actor-journal-shards"
round: 1
reviewer: "codex-ops"
artifact_sha: "8f0af04305cb440bf5ea6fe0c8e35b24339f28cd"
completed_at: '2026-06-08T21:59:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "files_to_modify / AC1"
    finding: "The spec claims to stop reviewer, watcher, monitor, and interactive-client journal conflicts, but the only automated write path being patched is tools/review-queue/_run_reviewer.sh. Required patch: either add the watcher/monitor journal append sites to files_to_modify and acceptance criteria, or explicitly narrow this item to reviewer-wrapper shards and stop claiming the unattended watcher/monitor collision is fixed."
  - severity: "medium"
    where: "LD2 / AC1"
    finding: "The wrapper path is derived directly from $REVIEWER_NAME without a required runtime validation step. Required patch: add an AC and test that the actor slug is validated against the declared lowercase [a-z][a-z0-9-]* rule before constructing the path, and that invalid or empty reviewer names fail loudly instead of creating an unexpected shard path."
  - severity: "medium"
    where: "AC3 / AC5"
    finding: "journal-cat.sh is required to strip preambles and sort by timestamp, but the spec does not require lossless handling of malformed or unparseable entry blocks. Required patch: require the helper to either preserve every non-preamble block or fail non-zero with source path/line evidence, and add a test so HTML regeneration or synthesis cannot silently drop journal entries."
---

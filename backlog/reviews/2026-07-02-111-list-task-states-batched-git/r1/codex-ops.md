---
item_id: "2026-07-02-111-list-task-states-batched-git"
round: 1
reviewer: "codex-ops"
artifact_sha: "52272d3339d7033fdcdb9b5e69e83e9fbfb082e0"
completed_at: '2026-07-02T07:09:44Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Design / Blob reads"
    finding: "The spec introduces a shared `git cat-file --batch` subprocess but does not require lifecycle handling for parser errors, missing objects, or client cancellation. Required patch: add an AC/test that the batch helper closes stdin, observes process exit, and kills/reaps the child on early failure so repeated MCP calls cannot leak git processes or file descriptors inside the long-running MCP server."
  - severity: "medium"
    where: "Acceptance Criteria / AC1 and AC4"
    finding: "The spec caps subprocess count and current-repo wall time, but one batched `git log --name-only` or `cat-file --batch` can still fail under repo growth by exceeding the capture buffer or memory budget, turning the unattended MCP call into a hard error. Required patch: specify streaming or explicit max-buffer sizing for these batched reads and add a high-cardinality fixture/assertion that the helper handles output larger than the old per-file capture size without adding a timing assertion."
---

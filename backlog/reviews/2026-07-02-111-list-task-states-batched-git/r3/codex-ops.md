---
item_id: "2026-07-02-111-list-task-states-batched-git"
round: 3
reviewer: "codex-ops"
artifact_sha: "e2039af104d1a4d063dcde0b2d4184da2de81488"
completed_at: '2026-07-02T07:43:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 - batch subprocess robustness"
    finding: "AC6 requires close/await/kill/reap behavior for cat-file --batch but not for a streaming git log --name-only walk. If the log walk is implemented as a streaming child, parser errors, MCP request aborts, or consumer failures can leave that process walking history unattended in the long-running MCP server. Patch AC6 to require every streaming batched git child, including the log walk, to be awaited and killed/reaped on error or early abort; capture-with-sized-buffer remains acceptable if it is awaited and surfaces failures."
---

## Findings

The spec is close, and the single accounting seam plus exact 8-child ledger closes the raw streaming bypass called out in the round focus. The remaining ops gap is lifecycle symmetry: the robustness contract now protects the interactive `cat-file --batch` process, but the log walk is also allowed to stream and can become the long-running unattended child under abort/error paths.

---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 2
reviewer: "codex"
artifact_sha: "29c83350eaa7e88fe1f6a33817ecd3860a9f308e"
completed_at: '2026-07-13T21:41:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Split retrieval MCP from loop coordination tools"
    finding: "The required roster is described only with examples, while the implementation is tested against a manifest authored by the same builder; required compatibility tools or schemas could be omitted and the test would still pass. Enumerate the exact tool IDs, expected count, and pinned request/response contracts, including the final names for source resolution and bounded wait/recent-context operations."
  - severity: "medium"
    where: "AC6 — Preserve capture, normalization, storage, and retrieval behavior; Tests"
    finding: "Parity is currently a list of behavior labels and directory-level test targets without a source-at-SHA inventory or declared expected results. Add an extraction/parity matrix mapping owned source modules and tests to destination paths and named assertions, and require AC8 counts to match declared baselines instead of merely recording whatever the new repository runs."
  - severity: "medium"
    where: "AC7 — Record provenance and prove source independence"
    finding: "The final condition that the source checkout be inaccessible has no executable harness, and a sanitized home does not prevent absolute filesystem reads. Specify a repository-owned command or test script, the isolation mechanism supported by the pinned Node/macOS environment, and a negative assertion that fails on any read, import, dependency, or child-process access to Project_echo."
  - severity: "medium"
    where: "AC8 — Prove local service parity and stop before cutover; files_to_modify"
    finding: "AC8 requires writing the migration record through the absolute canonical Project_echo checkout, while files_to_modify declares the repository-relative path. In an isolated feature worktree this could mutate the canonical checkout and omit the record from the review branch. Require the record to be written at raw/internal/migrations/2026-07-13-135-echo-context.md in the active orchestrator worktree; only the new echo-context repository should use the fixed absolute path."
  - severity: "medium"
    where: "AC1 — Create one local echo-context Git repository with no remote"
    finding: "The absent-target precondition has no atomic ownership or crash-resume contract. A failure after directory creation makes the item non-retriable, and another process can race creation. Define an atomic bootstrap marker containing item ID and source SHA, exact matching-state resume rules, mismatch refusal behavior, and cleanup or retained-state handling for failures."
  - severity: "medium"
    where: "AC8 — Prove local service parity and stop before cutover"
    finding: "The integration test simultaneously requires an ephemeral port and operation without network, which is contradictory unless loopback is explicitly allowed. State that external network access is forbidden while loopback is permitted, or replace the port transport with a non-network transport, and provide the exact smoke-test command."
---

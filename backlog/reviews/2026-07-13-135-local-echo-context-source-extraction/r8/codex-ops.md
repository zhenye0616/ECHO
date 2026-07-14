---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 8
reviewer: "codex-ops"
artifact_sha: "0f4063700b43a79b7f6f1b6375a5502bcd186bc3"
completed_at: '2026-07-14T00:00:59Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Pin and prove the context-only retrieval surface"
    finding: "The fixture manifest must pin its own digest, but no non-self-referential hash domain is defined. Hashing the complete bytes including that digest is not deterministically implementable. Specify either a sidecar digest or canonical JSON serialization with the digest field omitted, and require the parity checker to validate that exact rule."
  - severity: "medium"
    where: "AC7 — Preserve provenance and prove source independence"
    finding: "The spec requires `git diff --check` to pass from exported HEAD, but a metadata-free archive or fresh export is not a Git worktree and that command will fail. Require it in the target repository before export plus an explicit exported-tree whitespace check, or define the export as a detached clone/worktree and reconcile that with the independence boundary."
  - severity: "medium"
    where: "AC7 — Preserve provenance and prove source independence"
    finding: "Only the MCP fixture runs are explicitly sandboxed. The two npm installs may still execute dependency lifecycle scripts with network and filesystem access to Project_echo, sibling repositories, or live state before independence checks run. Require a controlled fetch phase followed by offline sandboxed installs, or disable lifecycle scripts and enumerate any narrowly sandboxed rebuilds, with run-owned temp/cache paths and recorded exits."
  - severity: "medium"
    where: "AC1 and AC8 — interrupted build and migration handoff"
    finding: "Durable evidence is required only after all checks pass, so an install, parity, sandbox, or service failure can leave an incomplete target and ephemeral terminal output without an operator-visible failure record. Require every failed stop to record the failing phase, command, exit, target HEAD/tree when available, and retained/archive paths in the Project_echo run log or agent notes before returning; cleanup only run-owned scratch resources and preserve the no-adopt/no-delete target rule."
---

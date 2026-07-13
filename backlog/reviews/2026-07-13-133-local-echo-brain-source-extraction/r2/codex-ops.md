---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 2
reviewer: "codex-ops"
artifact_sha: "29c83350eaa7e88fe1f6a33817ecd3860a9f308e"
completed_at: '2026-07-13T21:37:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 and AC7 — destination creation and verification lifecycle"
    finding: "The fail-if-target-exists rule makes any crash after creating the destination permanently block unattended retries, while check-then-create permits overlapping runs to race and expose a partial repository at the canonical path. Require an exclusive atomic lock, a unique same-filesystem staging directory, durable failure evidence with the run ID and staging path, deterministic stale-run handling, and final rename to echo-brain only after commit and parity verification succeed."
  - severity: "high"
    where: "AC7 — temporarily inaccessible source checkout"
    finding: "The spec does not constrain how Project_echo becomes temporarily inaccessible; renaming it, changing its permissions, or unmounting it can disrupt concurrent builders, reviewers, and recovery after signals. Require process-scoped filesystem denial for the verification child, explicitly forbid host-wide mutation of the source checkout, and fail safely with durable evidence when scoped isolation is unavailable."
  - severity: "medium"
    where: "AC2 and AC7 — Node and package-manager execution contract"
    finding: "An exact package.json engines value does not make npm reject the wrong Node runtime, and the sanitized-environment sequence does not define PATH or a package-manager version. Require preflight checks for the exact Node version, an explicitly pinned npm version, and resolved executable paths before installation or writes; record those values and make any mismatch a hard failure."
  - severity: "medium"
    where: "AC5 and AC7 — immutable build input and output cleanup"
    finding: "Building from committed objects does not by itself prevent HEAD movement, undeclared untracked outputs, or a concurrent local operation from changing the artifact input during verification. Require one captured commit SHA under the extraction lock, a clean-tree check including untracked files except declared output paths, build and tests against that immutable SHA, the SHA embedded in the artifact manifest, and trap-based cleanup or preservation of temporary outputs on every exit path."
---

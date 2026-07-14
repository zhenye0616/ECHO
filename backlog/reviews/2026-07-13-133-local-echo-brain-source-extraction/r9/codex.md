---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 9
reviewer: "codex"
artifact_sha: "5e48df5c8b01480ddc76bb50d4f60aee17cf088b"
completed_at: '2026-07-14T00:22:34Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — Prove clean-install and source independence"
    finding: "The sandbox contract is not reproducible or fully falsifiable. The Git-only environment scrub does not cover npm and Node injection through NODE_OPTIONS, NODE_PATH, npm_config_*/NPM_CONFIG_*, Corepack variables, or PATH, and the filesystem-denial sandbox has no named tool, retained profile path, phase boundaries, or enforcement probes. Prescribe an `env -i` allowlist with trusted absolute binaries; retain the exact ephemeral profile and invocation under the stable evidence root; separate script-disabled registry fetch from offline install, lifecycle, and test phases; and require probes proving the intended reads and registry fetch succeed while forbidden filesystem and network operations fail."
  - severity: "medium"
    where: "AC6 — Preserve product behavior at the pinned boundary"
    finding: "A standalone `check:test-parity` without Project_echo or retained source bytes cannot recompute the asserted source blobs/content hashes or replay source-to-target substitutions, and the substitution representation has no deterministic application rules. Define an ordered, non-overlapping substitution schema and either retain immutable source inputs for standalone replay or narrow the standalone checker to schema and destination verification while assigning source-hash and transformation verification exclusively to AC7's pinned-source operator audit."
  - severity: "medium"
    where: "AC7 — verification command list"
    finding: "A no-argument `git diff --check` in the required clean post-commit clone checks an empty worktree/index diff and cannot detect whitespace errors already committed at HEAD. Specify the comparison explicitly, such as `git diff-tree --check --root HEAD` or an empty-tree-to-HEAD `git diff --check`, and record that exact invocation."
  - severity: "medium"
    where: "frontmatter files_to_modify and AC8"
    finding: "AC8 requires writes to the Project_echo agent-run log, backlog `agent_notes` and stage handoff, but `files_to_modify` allows only the target repository, evidence root, and migration record. Add the exact workflow-metadata paths or state an explicit workflow-owned metadata exemption so the required handoff does not violate the declared write boundary."
---

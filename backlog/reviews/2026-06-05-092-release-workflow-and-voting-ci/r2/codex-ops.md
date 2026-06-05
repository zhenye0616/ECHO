---
item_id: "2026-06-05-092-release-workflow-and-voting-ci"
round: 2
reviewer: "codex-ops"
artifact_sha: "50cdb60c55336cbf1ac9904fa27fdcbdc13238da"
completed_at: '2026-06-05T21:08:05Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:69"
    finding: >-
      AC2 requires SHA-256 verification on ubuntu/macos/windows, but it does not pin a portable verifier or shell contract. A builder could satisfy the prose with `sha256sum -c`, which is not guaranteed in the default Windows runner shell and would make the workflow_dispatch rehearsal fail only at runtime. Patch AC2/AC2b to require an OS-portable checksum verifier before install, such as a Node `crypto` script/one-liner, or explicit per-OS commands with the shell pinned.
---

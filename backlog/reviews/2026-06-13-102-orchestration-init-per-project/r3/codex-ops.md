---
item_id: "2026-06-13-102-orchestration-init-per-project"
round: 3
reviewer: "codex-ops"
artifact_sha: "815272edcaf757c0f7fe820248ba8c96c13726db"
completed_at: '2026-06-13T09:21:53Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-13-102-orchestration-init-per-project.md:138"
    finding: "Patch-on-patch scope leak: AC6 and Out of Scope defer the agent-command-dir override to item 104, but files_to_modify still instructs tools/review-queue/_run_reviewer.sh and tools/review-queue/reviewer-bindings.json to implement command-dir override behavior. That can make 102 add an unreviewed unattended command-copy runtime path instead of the intended synced/in-repo command-file path. Patch the file comments to remove command-dir override from 102 and constrain AC6 to reviews_root-relative response artifact paths only."
---

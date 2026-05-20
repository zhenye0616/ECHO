---
item_id: 2026-05-20-064-mcp-compact-view-projection
round: 2
spec_commit_sha: 125bb8d771702804e9c7016a0fbec3825c2bae25
artifact_path: backlog/ready/2026-05-20-064-mcp-compact-view-projection.md
class: structural-reform
requested_at: '2026-05-20T22:19:16Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 63ba36b6-5cc9-4d15-9151-c23dee6fc1b7
focus_hints: Verify the five r1 patches in spec commit a800b2d resolve the original
  findings without introducing new mechanism bugs. (1) tests/ paths in files_to_modify
  + AC2 + AC3 + AC5 all consistent with the existing tests/mcp/ layout; (2) AC4's
  findClustersOutputSchema widening + tests/mcp/server.test.ts test instruction is
  implementable as one server-test addition (verify getAtomsOutputSchema requirements
  too); (3) AC5's budget-after-projection requirement is unambiguous about WHICH bytes
  the prefix-drop loop sizes on, and the overflow tests are constructable from existing
  fixtures; (4) AC6 + line-15 FindClustersCluster type update is the right scope;
  (5) tools/raycast-echo/test/mcp.test.ts NEW requirement composes with existing Raycast
  vitest config.
---

# What to review

Read `backlog/ready/2026-05-20-064-mcp-compact-view-projection.md` at commit `125bb8d771702804e9c7016a0fbec3825c2bae25`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

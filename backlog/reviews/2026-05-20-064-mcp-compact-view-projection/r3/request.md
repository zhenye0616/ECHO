---
item_id: 2026-05-20-064-mcp-compact-view-projection
round: 3
spec_commit_sha: 2ca2572bbce31e7936802f6624a04929af184736
artifact_path: backlog/ready/2026-05-20-064-mcp-compact-view-projection.md
class: structural-reform
requested_at: '2026-05-20T22:32:41Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f4266561-ccec-4d2d-98b8-29c70b0b9294
focus_hints: Verify two r2 patches in spec commit 10b69a9 resolve r2 codex findings.
  (1) AC4 open_loop_hints_omitted KEEP + 35-hint test fixture; (2) AC5 view=compact
  + fields=[...] composition clarification preserves always-on fields (id/source/timestamp/truncations)
  per getAtomsOutputSchema. codex-ops r2 was proceed/0-findings; r3 codex-ops should
  confirm operational contracts still hold.
---

# What to review

Read `backlog/ready/2026-05-20-064-mcp-compact-view-projection.md` at commit `2ca2572bbce31e7936802f6624a04929af184736`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

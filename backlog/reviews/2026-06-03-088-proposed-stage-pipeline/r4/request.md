---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 4
spec_commit_sha: e13d3df2ed885ad5c4519f6202d01a003b87c14f
artifact_path: backlog/ready/2026-06-03-088-proposed-stage-pipeline.md
class: structural-reform
requested_at: '2026-06-03T21:51:26Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7f878d5c-9f42-48ed-a430-deeaa2333cef
focus_hints: "Verify: (1) content-identity mismatch path is refuse-only (no mutation,\
  \ stays in proposed/, queue-errors.md, NO inline dispatch) \u2014 no remaining commit-owner\
  \ ambiguity; (2) the 4 generated .claude/commands/*.md adapters are in files_to_modify\
  \ with do-not-hand-edit notes so sync-skills.sh --check is satisfiable."
---

# What to review

Read `backlog/ready/2026-06-03-088-proposed-stage-pipeline.md` at commit `e13d3df2ed885ad5c4519f6202d01a003b87c14f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

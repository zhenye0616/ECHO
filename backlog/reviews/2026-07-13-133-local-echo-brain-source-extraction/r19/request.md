---
item_id: 2026-07-13-133-local-echo-brain-source-extraction
round: 19
spec_commit_sha: 0276fed4749229d70a8b76bce98769c5e97ce6a9
artifact_path: backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md
class: structural-reform
requested_at: '2026-07-14T05:30:09Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 6dddebd9-caad-41f9-959b-6e40b1fe1dcc
focus_hints: SEAL ROUND (promote.py bytes-integrity gate) — the r18 verdicts converged
  and the only changes since r18 are the in-fence fixes the r18 findings themselves
  required (see r18/combined.md; diff 19fe3ae2..0276fed4749229d70a8b76bce98769c5e97ce6a9 is 9 lines). Verify ONLY that
  diff faithfully implements those r18 findings. Anything else is pre-dispositioned
  rejected per raw/internal/decisions/2026-07-13-extraction-specs-r17-founder-disposition.md.
  Convergence stands regardless of verdict; this round exists to seal the reviewed SHA.
---

# What to review

Read `backlog/proposed/2026-07-13-133-local-echo-brain-source-extraction.md` at commit `0276fed4749229d70a8b76bce98769c5e97ce6a9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

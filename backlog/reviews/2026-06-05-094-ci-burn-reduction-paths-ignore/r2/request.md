---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
round: 2
spec_commit_sha: 99f56455533ee164aaf156b11adba971bc288603
artifact_path: backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md
class: narrow
requested_at: '2026-06-06T00:04:22Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f1c4c70a-d254-4414-9068-016647a10132
focus_hints: 'Verify the r1 patches at 6834ecc2: (1) Locked-3''s sanctioned tag-safety
  exception is narrow and resolves the AC3/AC5 trigger-only inconsistency without
  opening general job-edit scope; (2) AC2b (required-checks ground truth: none exist,
  403 free-tier; builder re-verifies via gh api at build time; forward-guard note
  for the future aggregate-gate spec) closes the PR-stranding concern without new
  mechanism.'
---

# What to review

Read `backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md` at commit `99f56455533ee164aaf156b11adba971bc288603`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

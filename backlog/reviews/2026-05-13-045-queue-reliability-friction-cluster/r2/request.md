---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
round: 2
spec_commit_sha: bb1309f1d6487274748b458c114efbcaf239e0ce
artifact_path: backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md
class: narrow
requested_at: '2026-05-13T22:28:07Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r2 verifies 5 patches: C1 AC1 stderr-only success path + queue-errors\
  \ only on terminal failure (with AC1d clean-tree test); D1 AC1 helper test + prompt-grep\
  \ split; D2 AC6 push-with-retry.sh replaces bare push || true; D3 AC6 staged-but-not-committed\
  \ paragraph removed; D4 AC2 smoke check before any production state change; D5 AC5a\
  \ 4-condition identity guard before rm -rf. r1 findings: 7 \u2192 r2 target \u2264\
  3. 045 class:narrow; no new scope outside the 5 patches."
---

# What to review

Read `backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md` at commit `bb1309f1d6487274748b458c114efbcaf239e0ce`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

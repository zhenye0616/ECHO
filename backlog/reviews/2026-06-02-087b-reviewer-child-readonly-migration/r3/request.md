---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 3
spec_commit_sha: 22008a762c89696d75969b9e8f0936123abe8a32
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T06:40:08Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: aaab99d4-df0e-4f54-9fc0-6e384763b506
focus_hints: "Verify r2 rework at spec SHA 50f4ff9d (founder adjudicated proceed despite\
  \ r2 codex/codex-ops verdict split \u2014 assess whether the patches make the runtime\
  \ contract SAFE, do not re-litigate proceed-vs-pushback): (1) capture.kind is stdout_text\
  \ everywhere (valid 087 enum; no bare 'stdout' kind); (2) capture-failure is TERMINAL\
  \ \u2014 writes a skip marker the eligibility scanner honors so a failed round is\
  \ NOT reselected (AC2 + AC5 iv), distinct from the queue-errors.md human row; (3)\
  \ wrapper owns pre-spawn request selection + bind-validation so it emits the right\
  \ correlation_id and classifies no-candidate/stale_combined/bind_failed/duplicate/upstream_duplicate\
  \ (AC1 + AC5 vi); (4) write-free child \u2014 wrapper does git-sync + prepares immutable\
  \ packet pre-spawn, child writes ONLY stdout, AC5(vii) proves it under --sandbox\
  \ read-only; (5) Locked-3 full-write-free-BEFORE-sandbox-flip ordering holds (no\
  \ intermediate read-only-but-still-writing state)."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `22008a762c89696d75969b9e8f0936123abe8a32`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

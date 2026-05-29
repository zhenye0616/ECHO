---
item_id: 2026-05-28-079-loop-reliability-pack
round: 2
spec_commit_sha: 2d4886a539fd6e4e25039548e38964780e368a71
artifact_path: backlog/ready/2026-05-28-079-loop-reliability-pack.md
class: narrow
requested_at: '2026-05-29T05:48:06Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 2902c491-96b4-4fe4-a7d8-5a5f9fa74e7b
focus_hints: "VERIFICATION round \u2014 all 6 r1 findings accepted+patched at 2d4886a5.\
  \ Verify: (AC1) combine.py guard validates PHYSICAL worktree (toplevel basename\
  \ echo-<role>-<uuid> + parent==TMPDIR + registered-worktree + path-equality with\
  \ ECHO_REVIEW_QUEUE_REPO_ROOT) so stale env cannot bypass; test-compat rule keeps\
  \ 044 temp-clone --repo-root --all green. (AC2) ENTIRE pull+push cycle routes through\
  \ echo_effect push (no pull/rebase/push under test/dry-run); false-completed-tick\
  \ guard \u2014 non-live push status distinguishable + commit-reviewer-response.sh\
  \ commit-before-push treats it non-completed (no completed tick / no orphaned local-only\
  \ commit). (AC3) canonical schema pins the COMMITTED pending_review/<id>.review.md\
  \ shape (Verdict/Pre-merge fixups/Expected merge conflicts/Follow-up items, +Open\
  \ questions iff block) NOT the child-review RUN_DIR 8-heading intermediate; producer\
  \ is the only additive field (no migration); schema path tools/review-queue/schemas/;\
  \ round-trip a real review-pending sidecar through validate-sidecar.py then merge-and-cleanup\
  \ Step-A/C reads."
---

# What to review

Read `backlog/ready/2026-05-28-079-loop-reliability-pack.md` at commit `2d4886a539fd6e4e25039548e38964780e368a71`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

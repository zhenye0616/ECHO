---
item_id: 2026-06-27-108-slack-linear-intake-gate
round: 2
spec_commit_sha: 1509a93db764083ec1253d24acb6ab4995176d71
artifact_path: backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md
class: narrow
requested_at: '2026-06-27T22:12:06Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 72cca509-e12f-4018-a220-9846ee7826f1
focus_hints: Verify R4 exactly-once-across-Linear-create (idempotency token + needs-reconcile)
  and R5 Slack ingress de-dupe are buildable without inventing mechanism; confirm
  R2 config-driven name->ID resolution removes any Linear read path.
---

# What to review

Read `backlog/proposed/2026-06-27-108-slack-linear-intake-gate.md` at commit `1509a93db764083ec1253d24acb6ab4995176d71`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

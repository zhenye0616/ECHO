---
item_id: 2026-06-08-098-per-actor-journal-shards
round: 3
spec_commit_sha: 595b4ade56a784b6cb55c648908410f9475d9c68
artifact_path: backlog/proposed/2026-06-08-098-per-actor-journal-shards.md
class: narrow
requested_at: '2026-06-08T22:14:04Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: d904ac29-edde-497c-99a2-cc3524771605
focus_hints: 'Verify r2 re-scoping at 2774f5fa: the same-slug residual (incl. same-vendor
  cross-role, e.g. claude reviewer tick vs watcher) is now named accurately in LD2/LD5/Out-of-Scope,
  the documented topology (codex/codex-ops reviewers + claude watcher = distinct shards)
  is correctly asserted to avoid it, and a successor trigger covers future signal.
  NOTE: complete closure needs per-process slugs, which LD2 forbids (shard explosion).
  If you believe per-process-class slugs MUST ship in THIS path-only item, state that
  explicitly (it is a scope disagreement to escalate to the founder), not a re-raised
  patch request.'
---

# What to review

Read `backlog/proposed/2026-06-08-098-per-actor-journal-shards.md` at commit `595b4ade56a784b6cb55c648908410f9475d9c68`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

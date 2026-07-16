---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 24
spec_commit_sha: f80003a7fbd08755dbff669951ed07bf43b390d0
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: narrow
requested_at: '2026-07-16T17:32:31Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 935e5b93-dc01-439d-8729-88772a94db19
focus_hints: 'Verify only f80003a7fbd08755dbff669951ed07bf43b390d0: pre-spawn failure
  is terminal without a nonexistent exit or PGID only after error, no positive PID/PGID,
  and closure of every materialized stream; positive-PID children retain exit/stream/PGID
  gating and descendant termination. Treat another finding against this patch-added
  terminal-shape mechanism as a removal or executable-reduction trigger, not another
  prose expansion.'
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `f80003a7fbd08755dbff669951ed07bf43b390d0`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-06-08-098-per-actor-journal-shards
round: 4
spec_commit_sha: d558864206d74491ac80cb6cb28d6301baa94871
artifact_path: backlog/proposed/2026-06-08-098-per-actor-journal-shards.md
class: narrow
requested_at: '2026-06-08T22:23:08Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b91dafb7-0182-406e-8fa8-17b7a2ce6e63
focus_hints: "Verify r3 patches at 4b81a99e: (a) AC4 same-merge skill-sync gate +\
  \ grep closes the stale-path interim window (no writer can follow a stale prompt\
  \ to the frozen file post-cutover); (b) AC5 real-data smoke test (journal-cat.sh\
  \ 2026-06 must exit 0 after cutover note) catches a parser/real-data mismatch before\
  \ merge. r2 slug residual is settled (do not re-raise unless you believe per-process\
  \ slugs must ship in THIS path-only item \u2014 that is a founder-escalation scope\
  \ call, not a patch)."
---

# What to review

Read `backlog/proposed/2026-06-08-098-per-actor-journal-shards.md` at commit `d558864206d74491ac80cb6cb28d6301baa94871`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-07-04-112-subject-key-unification
round: 2
spec_commit_sha: 3f914b7ad31399552b1bddee7b4837fbf786e2fa
artifact_path: backlog/proposed/2026-07-04-112-subject-key-unification.md
class: narrow
requested_at: '2026-07-04T19:27:57Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8d4eb2cd-6b26-4a6d-9e1f-4a9fb4991717
focus_hints: 'Verify: (AC5) the new metadata_match legacy fallback in search-memories.ts
  is scoped to team-decision atoms and does not alter matching for signal/other atoms;
  (AC3) new-atom retrieval works from AC2 key-write alone and the builder''s granted
  authority over search-memories.ts is bounded (no schema/whitelist change); (Out
  of Scope) free-text-vs-metadata_match boundary for legacy atoms is coherent; (Tests)
  byte-stable dedupe fixture + mixed-generation fixture are concrete enough to catch
  format/fallback drift'
---

# What to review

Read `backlog/proposed/2026-07-04-112-subject-key-unification.md` at commit `3f914b7ad31399552b1bddee7b4837fbf786e2fa`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

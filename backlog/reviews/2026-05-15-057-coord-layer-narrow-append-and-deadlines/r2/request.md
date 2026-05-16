---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 2
spec_commit_sha: 5beaf38b35336b0e25142f5ac01e6db22a18c1ba
artifact_path: backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md
class: structural-reform
requested_at: '2026-05-16T03:41:49Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: 'Verify r1 9-fix set: (1) AC0 trigger moved to watcher post-push hook;
  request.py coord_invoke is best-effort only; (2) coord:reviewer_invoked daemon-emitted
  at spawn time opens pre-spawn deadline; (3) best-effort emission with bounded timeouts;
  coord failures non-fatal to queue; (4) coord-roles.json names = reviewer slugs;
  headless+invoke_command required for headless roles; coord_invoke refuses IDE-mode;
  (5) AC2 cross-field validation in Python loader; (6) V1 emission wrapper-scoped;
  Cursor IDE-mode emission deferred to V1.5+; (7) idempotency key includes role+event_type;
  lookup via side-cache scan; (8) non-pollution three-way contract at search-memories.ts
  level only (NOT shared helper); search_memories() excludes coord; search_memories(coord:)
  returns coord; wait_for_new_turns(coord:) returns coord; (9) tests/coord/{pre-spawn-deadline-fires,daemon-down-tolerance,coord-roles-validation,non-pollution-three-way,idempotency-per-role}.test.ts
  cover each load-bearing invariant. Also check NEW load-bearing failure surfaces
  I might have missed.'
---

# What to review

Read `backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` at commit `5beaf38b35336b0e25142f5ac01e6db22a18c1ba`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-07-04-113-signal-window-interface
round: 5
spec_commit_sha: 4ffb9531599ed63dfebaf78ae0a5b309cc05dff9
artifact_path: backlog/proposed/2026-07-04-113-signal-window-interface.md
class: narrow
requested_at: '2026-07-04T19:50:04Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 206e194b-b302-4fc2-bd4e-1e3d6d60dcfa
focus_hints: Verify AC3 pins limit-applied-last (all predicates filter before ordering;
  limit truncates the fully-filtered ordered result); Tests include the limit-after-filter
  case (cursor+loop/scope, leading filtered-out rows, small limit -> eligible later
  row returned) and the full-fidelity round-trip (oversized content/metadata returned
  untruncated); no regression to r2 structural cut (no nextSinceSeq) or r3 rowid durability
  invariant.
---

# What to review

Read `backlog/proposed/2026-07-04-113-signal-window-interface.md` at commit `4ffb9531599ed63dfebaf78ae0a5b309cc05dff9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

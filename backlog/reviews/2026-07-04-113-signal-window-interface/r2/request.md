---
item_id: 2026-07-04-113-signal-window-interface
round: 2
spec_commit_sha: 301784c7a241d4bcef2e7a8780906afafa585477
artifact_path: backlog/proposed/2026-07-04-113-signal-window-interface.md
class: narrow
requested_at: '2026-07-04T19:30:47Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: cdc3019f-62b0-4ed5-bbcd-149c53d7c74b
focus_hints: 'Verify AC1 {entries,nextSinceSeq} return with sequence_id per entry
  and empty-window advancement; AC3 sequence_id>=sinceSeq half-open predicate + generalized
  watermark accessor (getCurrentSequence) + sort/composition (cursor AND event-time)
  + coord-seam non-regression (iterate-coord-by-append-order.test.ts stays green);
  AC4 W=getCurrentSequence() snapshot; AC6 import-closure test; new ## Tests section
  paths concrete/falsifiable; normalization stays out of src/mcp/internal.'
---

# What to review

Read `backlog/proposed/2026-07-04-113-signal-window-interface.md` at commit `301784c7a241d4bcef2e7a8780906afafa585477`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

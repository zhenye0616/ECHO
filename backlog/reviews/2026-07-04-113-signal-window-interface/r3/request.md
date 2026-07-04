---
item_id: 2026-07-04-113-signal-window-interface
round: 3
spec_commit_sha: 4bdca93b63311cd12e9cf3c17834e92b8d64f3ce
artifact_path: backlog/proposed/2026-07-04-113-signal-window-interface.md
class: narrow
requested_at: '2026-07-04T19:39:48Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 96c45a48-98f5-4fa7-808d-257d6ec13d8c
focus_hints: Verify AC1 returns only the ordered entries list (no nextSinceSeq / no
  returned cursor anywhere); every entry still carries sequence_id; caller-derived
  advancement rule (max(entry.sequence_id)+1, empty window leaves cursor unmoved)
  stated and limit-safe; AC3 getCurrentSequence() + AC4 late-arrival intact; Tests
  assert limit-truncation no-skip and empty-window cursor-hold, all nextSinceSeq assertions
  gone; no snapshot/transaction mechanism added in its place.
---

# What to review

Read `backlog/proposed/2026-07-04-113-signal-window-interface.md` at commit `4bdca93b63311cd12e9cf3c17834e92b8d64f3ce`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

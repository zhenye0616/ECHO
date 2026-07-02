---
item_id: 2026-07-01-109-granola-meeting-intake-bridge
round: 3
spec_commit_sha: 14b65cce04303fa5a593e251d2a504e153124222
artifact_path: backlog/proposed/2026-07-01-109-granola-meeting-intake-bridge.md
class: narrow
requested_at: '2026-07-02T03:01:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b6ee2ebf-d77e-4f0a-b4b6-8397da6c8933
focus_hints: 'Verify r2 propagation patches at the patched SHA: (1) AC3 event-id ordering
  invariant complete/testable given slack_event_ids lives on the draft record; crash-window
  test well-specified? (2) AC2 single-flight atomic create/claim closes overlapping-run
  corruption without promising Slack-level exactly-once? (3) AC6 dismiss-path candidate-key
  attribution end-to-end? If clean, call claim-ready.'
---

# What to review

Read `backlog/proposed/2026-07-01-109-granola-meeting-intake-bridge.md` at commit `14b65cce04303fa5a593e251d2a504e153124222`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

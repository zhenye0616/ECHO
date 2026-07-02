---
item_id: 2026-07-01-109-granola-meeting-intake-bridge
round: 1
spec_commit_sha: 5972dcfe86f1dea91f10c801e1e454c41a50efbd
artifact_path: backlog/proposed/2026-07-01-109-granola-meeting-intake-bridge.md
class: narrow
requested_at: '2026-07-02T02:46:36Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 90b0d431-5e44-498e-8602-d1c2454cd506
focus_hints: 'spec review of a NEW proposed item (not code): (1) is the Slack-as-transport
  + self-bot seed-marker carve-out sound (loop safety, spoofing, exactly-once draft
  per candidate key)? (2) is the cross-machine idempotency chain (signal dedupe_key
  -> at-least-once seed -> responder dedupe) crash-safe at every seam? (3) are the
  ACs testable and the Out-of-Scope guardrails tight enough to prevent drift (esp.
  no auto-create, no Slack capture)? (4) buildability against the real substrate:
  106 signal atom shapes, 108 draft store, daemon worker scheduling'
---

# What to review

Read `backlog/proposed/2026-07-01-109-granola-meeting-intake-bridge.md` at commit `5972dcfe86f1dea91f10c801e1e454c41a50efbd`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-06-18-103-ceo-context-loop-n2
round: 2
spec_commit_sha: a6e09212b0b2633a458f9d1e8e4a744502724d8a
artifact_path: backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md
class: narrow
requested_at: '2026-06-19T18:26:01Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 70098ca9-92ea-48bd-9543-d779b492d97e
focus_hints: "Verify: AC1 grading record format (WHY: comment in Linear / raw/internal/decisions/\
  \ note) is buildable and ECHO-ingested without new capture; AC2 proxy surface (local\
  \ MCP-wrapping proxy with pre-shared secret, kill switch = stop process, no bearer\
  \ in URL/logs) is minimal shape with no scope creep; AC4 event log (raw/internal/ceo-loop-events.jsonl\
  \ with timestamp, consumer_id, query_intent_category, success, founder_interrupted\
  \ fields, \u22652 unprompted sessions DoD) is sufficient for audit"
---

# What to review

Read `backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md` at commit `a6e09212b0b2633a458f9d1e8e4a744502724d8a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

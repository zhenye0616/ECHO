---
item_id: 2026-07-04-114-drift-sweep-v0
round: 2
spec_commit_sha: 48a2834fa10e4871eecd740bfdb98d2642b04008
artifact_path: backlog/proposed/2026-07-04-114-drift-sweep-v0.md
class: narrow
requested_at: '2026-07-04T19:31:38Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 77e93ddf-f720-47e7-9223-7580f5d01874
focus_hints: "Verify: (a) AC1 watermark advances only after all window pairs terminal;\
  \ crash-before-watermark re-processes window without skip/double-deliver. (b) AC3\
  \ checkpoint written atomically as last judging step before AC5 delivery; terminal-malformed\
  \ verdict vs retryable runBrain infra error split; terminal failures emit operator-visible\
  \ evidence (pair keys, judge version, reason, per-tick counts). (c) AC5 per-pair\
  \ delivery state + at-most-once posture (intent-before-post, ambiguous-crash \u2192\
  \ delivery-failed not re-posted, never silently dropped); responder.ts block_actions\
  \ callback path + ceo-loop-events.md dismissal append. (d) out-of-scope wall holds:\
  \ no persisted verdict atoms, Granola-only supply, no decision-store schema change."
---

# What to review

Read `backlog/proposed/2026-07-04-114-drift-sweep-v0.md` at commit `48a2834fa10e4871eecd740bfdb98d2642b04008`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-05-22-069-raycast-cold-start-continuity-hero
round: 1
spec_commit_sha: dab0bbb
artifact_path: backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md
class: narrow
requested_at: '2026-05-22T19:55:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: d1f416d4-dc78-4f68-a4d3-8c406b548f7b
focus_hints: "V1 80% ROI cut of the Raycast landing surface: replace EmptyState.tsx:31-49\
  \ Open loops \xB7 Today with single confidence-gated Continue hero. Verify (a) AC1\
  \ rank-signal additions don't break existing has_open_loop consumers; (b) hero gate's\
  \ three AND conditions (running session OR top-cluster with unresolved hint + 18h\
  \ fresh + code/session anchor) are correct against current cluster engine + sessions\
  \ library; (c) AC2 pickHero decision tree matches existing renderCluster ActionPanel\
  \ for cluster-resume (065) and warmSession ActionPanel for running-session; (d)\
  \ AC3 test coverage pins all four hero-pick branches; (e) the 10-item OoS list doesn't\
  \ accidentally exclude something load-bearing."
---

# What to review

Read `backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md` at commit `dab0bbb`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

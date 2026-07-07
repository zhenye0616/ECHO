---
item_id: 2026-07-07-126-daemon-smoke-test-serialization
round: 2
spec_commit_sha: 47f0c3ea599d6c49d2de533a380df24691986e0b
artifact_path: backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md
class: narrow
requested_at: '2026-07-07T07:26:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ef8ad4de-c39c-457a-b786-dee0b8ba1984
focus_hints: Verify AC1 requires port-dynamism (fixed 47095 removed) and not serialization-alone
  for the shell-reachable smoke; AC3 names npm run test as the 5-consecutive-run command
  with per-run timings and no longer places the merger-prompt special-case retirement
  inside a builder AC (it's After Completion strategist work); all changes remain
  test-infra only with AC4 escape hatch intact.
---

# What to review

Read `backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md` at commit `47f0c3ea599d6c49d2de533a380df24691986e0b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

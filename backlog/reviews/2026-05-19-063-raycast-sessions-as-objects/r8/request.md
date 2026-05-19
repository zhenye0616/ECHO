---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 8
spec_commit_sha: fee455861832651296df9c81a29bc5d4adce4f80
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T23:59:25Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: bb15089c-dc30-4627-8303-02c98ddb4be2
focus_hints: "Verify (a) AC6.7 per-id Promise chain (inflight[id] serialization) is\
  \ correctly specified AND serializes concurrent mergeRowAndWrite calls; (b) AC6.4\
  \ step 2 drainInflightWrites(id) is correctly inserted BEFORE steps 3+4 (final update\
  \ + terminal end); (c) AC8.12(d) test is falsifiable \u2014 a builder implementation\
  \ without the drain OR without the per-id chain WILL fail it; (d) convergence-readiness\
  \ check: if r8 finds 0-2 LOW-only items OR proceed, the spec is claim-ready."
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `fee455861832651296df9c81a29bc5d4adce4f80`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

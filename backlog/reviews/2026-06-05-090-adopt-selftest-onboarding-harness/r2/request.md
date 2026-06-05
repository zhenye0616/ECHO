---
item_id: 2026-06-05-090-adopt-selftest-onboarding-harness
round: 2
spec_commit_sha: 67be1ac2595cd2c5f38a4f8252e015afc15b661f
artifact_path: backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md
class: narrow
requested_at: '2026-06-05T20:15:19Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8536ef57-898f-40cd-8ae7-af29d17ebb02
focus_hints: 'Verify: (a) AC2 atomic :0 port alloc threaded to daemon+all MCP/client
  checks + 38478 sentinel + parallel-no-collision tests; (b) AC2 cleanup on success/failure/timeout
  + no-daemon-left assertion; (c) AC3/AC4 per-leg continue-on-error in YAML not branch
  protection, Windows non-voting until 091; (d) AC1 check-id contract reconstructable
  without the orphaned worktree.'
---

# What to review

Read `backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md` at commit `67be1ac2595cd2c5f38a4f8252e015afc15b661f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

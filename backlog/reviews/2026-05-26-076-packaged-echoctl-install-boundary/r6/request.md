---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 6
spec_commit_sha: 1f18ab423caf780195b61e872e323c04c08b7f7d
artifact_path: backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md
class: narrow
requested_at: '2026-05-27T05:57:54Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a8c22b18-fb38-4492-8f3f-67fe66f2c7bd
focus_hints: 'Verification only after r5 ops-hardening patches. (a) AC3.3 step 10
  + AC3.4.1 bootout-on-probe-timeout + loaded-but-unhealthy refuses no-op closes the
  KeepAlive crash-loop short-circuit gap; (b) AC3.3 step 6+7 XML-safe + atomic plist
  write + plutil -lint closes the plist-corruption-then-bootout gap; (c) daemon.test.ts
  coverage names the new test cases. codex hit proceed/0-findings at r5; this round
  verifies codex-ops''s two ops fixes landed correctly. Convergence test: if both
  reviewers return proceed/0-findings OR LOW-only, R6 is terminal.'
---

# What to review

Read `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md` at commit `1f18ab423caf780195b61e872e323c04c08b7f7d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

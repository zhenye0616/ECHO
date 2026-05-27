---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 2
spec_commit_sha: 94f78d887f8f9d2751444c8378c47839273c45e7
artifact_path: backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md
class: narrow
requested_at: '2026-05-27T05:09:30Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 6c06a7df-67f6-478c-a6b4-631593e94d6c
focus_hints: 'Verify the 6 r1 dispositions survive fresh-eyes re-read: (a) AC1.5 coord_invoke
  de-scope is the right side of customer/operating-model line; (b) AC3.2 plist envs
  (ECHO_HOME + ECHO_MCP_PORT + NODE_EXEC_PATH) + AC5.1 step 4 status-assertion together
  close the launchd-env-inheritance gap; (c) AC3.8 --label override plumbed through
  every verb; (d) AC3.3 step 5 preflight checks exhaustive enough that any broken
  tarball aborts BEFORE bootout; (e) AC5.2 pre-flight skip when production cannot
  be snapshotted is correct.'
---

# What to review

Read `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md` at commit `94f78d887f8f9d2751444c8378c47839273c45e7`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

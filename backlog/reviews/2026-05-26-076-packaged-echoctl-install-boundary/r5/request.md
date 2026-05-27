---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 5
spec_commit_sha: 2df181d10a46d8de00e08bf2644b94f88a1142dd
artifact_path: backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md
class: narrow
requested_at: '2026-05-27T05:50:26Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3fff1ff8-b9c8-46b9-be74-c588d7f39060
focus_hints: Verification only after r4 test-contract + wording patches. (a) AC3.5
  output contract now lists home/data-dir/db-path as required output; verify AC5.1
  step 4 reads cleanly against this. (b) AC3.4.1 neg-path test split into preflight-exit-2
  vs probe-timeout-exit-1 (aligned with AC3.3 step 12). (c) shell-reachable.test.ts
  frontmatter no longer suggests SIGTERM. If no findings or only LOW-severity wording
  remains, R5 should be terminal.
---

# What to review

Read `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md` at commit `2df181d10a46d8de00e08bf2644b94f88a1142dd`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

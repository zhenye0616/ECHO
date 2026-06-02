---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
round: 3
spec_commit_sha: 93c9b6ef11db1d05d5ac5946f7359651f6ae6be0
artifact_path: backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md
class: narrow
requested_at: '2026-06-02T07:17:09Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 0cfc065a-e75a-468b-a18a-a953f3249b1c
focus_hints: "Verify r2 removal at 93c9b6ef11db1d05d5ac5946f7359651f6ae6be0: Locked#4+AC3(b)\
  \ no longer instruct any 'claude mcp get'/output-parse or auto remove+re-add; exit-1\
  \ duplicate = 'already-exists (unverified)' handled via probe/doctor + AC2 remediation;\
  \ init cannot report claude-code healthy on a duplicate without an independent probe\
  \ pass; two-live-daemons stale-but-reachable accepted as V1 limitation per OoS#8.\
  \ Removal, not new mechanism \u2014 expect convergence."
---

# What to review

Read `backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md` at commit `93c9b6ef11db1d05d5ac5946f7359651f6ae6be0`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

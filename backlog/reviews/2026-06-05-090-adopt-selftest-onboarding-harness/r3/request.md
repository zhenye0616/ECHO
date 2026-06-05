---
item_id: 2026-06-05-090-adopt-selftest-onboarding-harness
round: 3
spec_commit_sha: adf4893e1a2f23221aa26a68da9a2a25ac9a7ee1
artifact_path: backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md
class: narrow
requested_at: '2026-06-05T20:28:38Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9790c832-62b8-4eb4-8d03-1ec6c78dfbdc
focus_hints: "Verify the r2 structural cut: (a) worktree no longer load-bearing \u2014\
  \ AC1 self-contained, no orphaned line anchors in files_to_modify/spec_refs; (b)\
  \ AC2 uses existing ECHO_MCP_PORT=0\u2192daemon-binds-:0\u2192read mcp_port/mcp_url\
  \ (no daemon change) + sentinel(38478)/parallel/cleanup-all-3-paths tests; (c) AC3\
  \ onboarding wholly continue-on-error, quality sole voting gate, zero 'green legs\
  \ vote' residue; (d) AC1/AC4 voting selftest test is fake-runner (never real daemon),\
  \ real selftest only in non-voting onboarding."
---

# What to review

Read `backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md` at commit `adf4893e1a2f23221aa26a68da9a2a25ac9a7ee1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

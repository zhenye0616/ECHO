---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
round: 2
spec_commit_sha: de4620a122e659b40060a912e03e8cbd8822d6f6
artifact_path: backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md
class: narrow
requested_at: '2026-06-02T07:07:57Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 0d59dca4-a437-404a-92db-bd2d6fa38b7b
focus_hints: 'Verify the 5 r1 patches at de4620a1: (1) AC3(b)/Locked#4 duplicate path
  does claude mcp get echo -> compare -> remove+re-add on stale URL (not swallow exit-1);
  stale-URL fake-CLI test. (2) AC3(c) registration spawn bounded: timeout(30s) + stdin-ignored
  + bounded capture; never-exits fake-CLI test. (3) AC4 smoke is mechanical non-zero
  hard-fail on missing/wrong argv. (4) AC2 doctor mcp-not-configured copy includes
  ''claude mcp remove echo -s local'' escape hatch. (5) OoS#5 wording matches real
  runInit probe-before-daemon order. Confirm AC7 no scope beyond files_to_modify.'
---

# What to review

Read `backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md` at commit `de4620a122e659b40060a912e03e8cbd8822d6f6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
round: 1
spec_commit_sha: c55be7b34cba261a2a6daae80167f2006c713220
artifact_path: backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md
class: narrow
requested_at: '2026-06-02T06:45:09Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 4ccd9b91-7b17-4ef4-b1c6-179be1bf999a
focus_hints: 'Verify the locked decisions: (1) CLI-not-JSON registration, (2) --scope
  user correctness against the installed claude CLI, (3) best-effort/idempotent non-fatal
  semantics. Check J1 placement (wire-path vs init.ts step vs named adapter) and J2
  deterministic smoke assertion. Confirm OoS #4 (daemon runtime already handled by
  076 process.execPath + node>=22) is accurate.'
---

# What to review

Read `backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md` at commit `c55be7b34cba261a2a6daae80167f2006c713220`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

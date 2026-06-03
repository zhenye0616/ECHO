---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 5
spec_commit_sha: f8ac132b764c44d558107e45b0bc70dfa448340b
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T07:09:18Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: be3159b0-9db1-42a8-b661-823596e77ff1
focus_hints: "Verify r4 capture-channel correction at spec SHA d3d7ad8b: capture.kind\
  \ is stdout_json \u2014 the wrapper parses codex's FINAL assistant-message event\
  \ as the payload; raw stdout_text/stderr are diagnostics ONLY (codex stdout has\
  \ banner/model/workdir/prompt/token noise); AC5(iii) regression proves the wrapper\
  \ publishes only the final message from noisy raw stdout. Confirm internal consistency\
  \ (Locked-1a/AC2/AC5/AC6/spec_ref all say stdout_json, no lingering stdout_text-as-payload)\
  \ and NO regression in prior contracts: terminal-marker commit+push-before-cleanup\
  \ + origin-backed test, wrapper-owned pre-spawn selection/lifecycle, write-free\
  \ child + immutable packet, codex/codex-ops-only scope (claude/cursor prose-only),\
  \ full-write-free-before-flip ordering."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `f8ac132b764c44d558107e45b0bc70dfa448340b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-05-15-056-claude-as-reviewer-headless
round: 3
spec_commit_sha: d64afefd8bdcb149278e85ffea27c5a6ec05f718
artifact_path: backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md
class: structural-reform
requested_at: '2026-05-15T23:49:56Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: 'Verify r2 4-fix set: (1) combined.schema.json adds explicit claude_response
  property; combine.py untouched; (2) reviewers-config.schema.json uses if/then for
  mode-conditional invoke_command; cursor row omits the field; (3) Option A is the
  only allowed strategy; spec body does NOT describe Option B as live; (4) _install_reviewer_launchd.sh
  added to files_to_modify; installer preflights executable via command -v before
  plist write; fails non-zero + no plist created when missing; (5) AC9 covers all-4-slugs-load
  + combined-schema-with-claude_response + spaces-in-paths + install-context-fail-closed;
  (6) the claude example invoke_command (PROMPT-only, no WT) validates under the new
  mode-conditional rule. Also check: no introduced contradictions between AC1 / AC2
  / AC5 / AC7 / AC8; the convergence-call rationale is correct.'
---

# What to review

Read `backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md` at commit `d64afefd8bdcb149278e85ffea27c5a6ec05f718`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

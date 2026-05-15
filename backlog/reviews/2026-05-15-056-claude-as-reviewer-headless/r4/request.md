---
item_id: 2026-05-15-056-claude-as-reviewer-headless
round: 4
spec_commit_sha: 9540a631dff608377372c42f1f40b70fee5b8a6e
artifact_path: backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md
class: structural-reform
requested_at: '2026-05-15T23:58:29Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify r3 2-fix set: (1) AC2/AC5/AC9 mode-conditional invoke_command\
  \ \u2014 cursor row in reviewers.json may omit invoke_command (or carry null); _reviewers.py\
  \ loads it with invoke_command=None; reviewers-config.schema.json if/then makes\
  \ invoke_command required ONLY when mode==headless; _reviewer_gate.py --print invoke_command\
  \ for cursor exits non-zero with stderr 'IDE-mode reviewer cursor has no invoke_command';\
  \ AC9 test asserts each of those. (2) AC5 part 4 durable queue-error mechanism \u2014\
  \ wrapper appends row to raw/internal/queue-errors.md, commits, pushes via push-with-retry.sh\
  \ BEFORE 050 cleanup trap fires; AC9 failure-path test simulates missing-executable\
  \ OR missing-PROMPT-token, asserts row exists on origin/main after wrapper exits\
  \ non-zero. Convergence check: does r4 surface any NEW load-bearing issue, or are\
  \ both reviewers proceed with zero findings? If zero findings, 056 terminates after\
  \ r4."
---

# What to review

Read `backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md` at commit `9540a631dff608377372c42f1f40b70fee5b8a6e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

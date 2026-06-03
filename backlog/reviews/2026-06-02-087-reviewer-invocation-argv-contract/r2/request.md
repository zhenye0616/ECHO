---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 2
spec_commit_sha: 77ce84a51f2ae112d83473551d0167c8d907100e
artifact_path: backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md
class: narrow
requested_at: '2026-06-03T03:21:02Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 420fc985-d1c5-43df-b39d-960d3fc80344
focus_hints: "Verify r1 patches at spec SHA 12eb7214: (1) AC2 NUL-delimited Python\u2192\
  Bash argv handoff (mapfile -d '' \u2192 exec \"${ARGV[@]}\" < stdin_from, no IFS\
  \ split, no second bash -c) + AC4(v) space-in-WT/PROMPT-path regression survives\
  \ as one argv element; (2) AC1 prompt-via-stdin_from contract + AC4(vi) no current\
  \ headless argv contains the prompt path, codex - / claude -p sentinel preserved;\
  \ (3) AC4(vii) package.json files-whitelist includes reviewer-bindings.json + AC5\
  \ manifest-only narrowing; (4) AC2/AC4(viii) _install_reviewer_launchd.sh preflight\
  \ migrated off --print invoke_command. Confirm still behavior-preserving: no read-only\
  \ flip, no commit moved off child, no SLA config moved."
---

# What to review

Read `backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md` at commit `77ce84a51f2ae112d83473551d0167c8d907100e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
round: 3
spec_commit_sha: 205cd4fec7f865bc00565fab264dc1d92c09c276
artifact_path: backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md
class: narrow
requested_at: '2026-06-05T23:28:02Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7f10f3cb-6f19-44f2-af10-ea6b83ab17c2
focus_hints: 'Verify the r2 patches at 7c1fd79f close both findings with zero new
  mechanism: (1) AC4 env contract (HOME/USERPROFILE/ECHO_HOME/CODEX_HOME per selftest.ts:390-394,
  ECHO_MCP_PORT must-not-override) + command skeleton + required run-log fields are
  executable and falsifiable as written; (2) AC1 missing-source hard-failure contract
  (diagnostic naming the path, no partial SKILL.md, no marker write) is consistent
  with adapter-layer atomic-write discipline.'
---

# What to review

Read `backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md` at commit `205cd4fec7f865bc00565fab264dc1d92c09c276`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 4
spec_commit_sha: 348f81eff314baee1d29b43a1b41cc4f506639d5
artifact_path: backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md
class: narrow
requested_at: '2026-05-27T05:34:33Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 29baace1-e412-4681-bf26-31fef7a9a59e
focus_hints: "Verify the 5 r3 dispositions: (a) AC3.4.1 shared preflight+probe-wait\
  \ helper now closes the AC6 daemon-restart upgrade-to-outage gap fully (no remaining\
  \ verb under documented operator flows can bootout-and-fail-silent); (b) AC5.1 step\
  \ 4 coord_invoke assertion provably exercises the wrapper-absent path (headless\
  \ role 'codex' + valid request_path/correlation_id + specific run-codex-reviewer.sh\
  \ CoordPathError text); (c) AC5.1/AC5.2 conditional mtime check no longer fails\
  \ under live production but still proves test-daemon isolation positively; (d) AC2.3\
  \ reworded as verification (no mandatory churn) \u2014 scripts/copy-sql-migrations.js\
  \ (AC2.2) remains the single load-bearing fix; (e) no remaining contradiction between\
  \ files_to_modify and Out-of-Scope. Convergence test: if only LOW-severity wording\
  \ findings remain, the next round should be terminal."
---

# What to review

Read `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md` at commit `348f81eff314baee1d29b43a1b41cc4f506639d5`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

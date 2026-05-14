---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 2
spec_commit_sha: 56175d0190c6c18820e643fb1e2e25b448571c1a
artifact_path: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md
class: narrow
requested_at: '2026-05-14T22:21:50Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R1 disposition patches landed at 56175d0. Verify: (1) AC1 step 4 'all\
  \ three handoffs' (cd + export ECHO_REVIEW_QUEUE_REPO_ROOT + codex exec -C) is mechanically\
  \ sufficient to keep child Codex in $WT \u2014 codex F1 + codex-ops F3 convergent\
  \ fix; (2) AC1 pre-flight order (rm -rf BEFORE git worktree prune) actually cleans\
  \ admin entries on real .git/worktrees/* under codex F2; (3) AC1 step 7 push-failure-recovery\
  \ preserves both worktree AND flock-protected queue-errors append \u2014 does the\
  \ spec body now clearly carve out this single-line raw/ write as outside the live-main\
  \ invariant? (codex-ops F1); (4) AC1 pre-flight safe-list from 'git worktree list\
  \ --porcelain' correctly skips active merger conflict-pause AND echo-FAILED-* (codex-ops\
  \ F2); (5) AC5 HEAD:main refspec is now load-bearing in both prose and AC6 test\
  \ wording (codex F3); (6) AC7 standalone worktree-helper.py CLI shape \u2014 does\
  \ it match existing _reviewer_gate.py invocation style and avoid the hyphenated-directory\
  \ import issue (codex F4); (7) AC6.6 launchd-TMPDIR smoke gate is implementable\
  \ as a real test (env -i bash -c ...) and surfaces a recognizable diagnostic (codex-ops\
  \ F4); (8) AC6.7 active-merger-pause-GC negative test mechanically enforces the\
  \ safe-list (codex-ops F2); (9) AC6.8 push-failure breadcrumb test covers both echo-FAILED-*\
  \ preservation AND queue-errors append (codex-ops F1). Look for new operational\
  \ surface introduced by these dispositions; cycle-shape note: 049 fail-to-converge\
  \ pattern is the canonical 'new findings emerge each round from prior dispositions'\
  \ shape \u2014 flag aggressively if any R2 finding traces back to an R1 disposition\
  \ rather than the original spec."
---

# What to review

Read `backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` at commit `56175d0190c6c18820e643fb1e2e25b448571c1a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

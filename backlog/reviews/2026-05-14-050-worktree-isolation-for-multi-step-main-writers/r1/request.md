---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 1
spec_commit_sha: 469a8e7da38ec23e163011e6ea1e9669b7adf479
artifact_path: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md
class: narrow
requested_at: '2026-05-14T21:54:31Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Worktree-isolation friction-fix spec. Key load-bearing claims to verify:\
  \ (1) AC1 reviewer-wrapper rewrite is mechanically correct ($TMPDIR + uuidgen +\
  \ worktree add --detach + cleanup trap + pre-flight prune); (2) AC3 deletes .git/echo-merge-in-progress\
  \ without leaving a defense-in-depth gap (does the spec correctly cover all places\
  \ that could create or read that file?); (3) AC5 push-with-retry.sh CWD-agnostic\
  \ rewrite preserves push contract semantics under worktree CWD vs main CWD; (4)\
  \ AC6 test scenarios (especially AC6.2 reviewer-during-merger collision sim and\
  \ AC6.4 crashed-tick recovery) genuinely exercise the failure modes today's gap\
  \ allows; (5) AC7's helper-invocation shape from bash wrapper (the spec waves at\
  \ python3 -c 'from tools.review_queue._lib ...' which won't work because the dir\
  \ is hyphenated \u2014 flag if a cleaner helper-script approach is needed); (6)\
  \ Risk R1 $TMPDIR-in-launchd is a real macOS concern \u2014 does the AC1 hard-fail\
  \ surface it adequately or does the spec also need a smoke-test gate?"
---

# What to review

Read `backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` at commit `469a8e7da38ec23e163011e6ea1e9669b7adf479`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

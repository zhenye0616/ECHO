---
item_id: 2026-05-13-044-reviewer-cycle-infrastructure-debt
round: 3
spec_commit_sha: 38ce307e0a11e18417eb6a721e2e3ce54d97b545
artifact_path: backlog/ready/2026-05-13-044-reviewer-cycle-infrastructure-debt.md
class: narrow
requested_at: '2026-05-13T20:43:08Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r2 added 2 patches: D3 extended AC1 touch list to push-with-retry.sh:25\
  \ (both git pull sites now use -c rebase.autoStash=true) with expanded test; D4\
  \ deferred to _followups.md 045. Verify AC1 lists BOTH watcher Step 1 AND push-with-retry.sh,\
  \ both with autostash. Verify test asserts full watcher transaction (not just Step\
  \ 1). Decay so far: r1=7, r2=2. r3 target: both proceed (path-a terminal) OR mechanical-only\
  \ findings (path-c waiver). NO scope-creep \u2014 any new finding outside C1-C3,\
  \ D1-D2, D3 deferral patches goes to _followups.md, not the spec."
---

# What to review

Read `backlog/ready/2026-05-13-044-reviewer-cycle-infrastructure-debt.md` at commit `38ce307e0a11e18417eb6a721e2e3ce54d97b545`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

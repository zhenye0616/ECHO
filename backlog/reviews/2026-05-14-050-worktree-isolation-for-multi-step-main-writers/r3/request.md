---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 3
spec_commit_sha: c74fde90fc4542ff3b5e80b1cb64b42018f5169c
artifact_path: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md
class: narrow
requested_at: '2026-05-14T22:37:33Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R3 is a VERIFICATION round on a SIMPLIFICATION pass, not iteration.\
  \ Spec body SHRANK at c74fde9: dropped push-failure-preservation (was AC1 step 7),\
  \ dropped Python worktree-helper.py invention (was AC7), dropped AC6.6 (TMPDIR smoke),\
  \ dropped AC6.7 (active-merger GC), dropped AC6.8 (push-failure breadcrumb). AC6.4\
  \ rewritten as 'registered worktrees never GC'd regardless of mtime' covering BOTH\
  \ founder-paused merger + crashed registered survivor. Pre-flight collapsed to:\
  \ prune admin first, then 'skip all registered, rm -rf only unregistered orphans\
  \ >60min'. Three failure modes filed as 050-followup-D/E/F instead of in-scope.\
  \ Verify: (1) The simplified AC1 lifecycle (steps 1-6, single unified cleanup trap)\
  \ is genuinely implementable \u2014 no hidden dependencies on the dropped features.\
  \ (2) AC6.4 single test covers both scenarios cleanly. (3) \xA7Out of Scope correctly\
  \ carves out push-failure preservation, queue-terminality races, and crashed-registered\
  \ cleanup with sufficient context for the followup builder. (4) \xA7Crash semantics\
  \ is internally consistent now that 'push-failure-not-lost-work' is removed. (5)\
  \ \xA7Risks R1 simplification (hard-fail + operator runbook, no AC6.6) is acceptable\
  \ for production launchd discipline. (6) Cycle-shape framing in \xA7After Completion\
  \ is accurate \u2014 this IS the 049 R3-R4 lesson applied at R2. NEW FINDINGS-ON-DISPOSITION\
  \ should be flagged aggressively: if R3 surfaces findings whose root cause is the\
  \ R2 simplification rather than the original spec, that's a signal we over-simplified\
  \ \u2014 consider redrafting from scratch rather than further iteration. Convergence\
  \ target: both reviewers proceed/proceed_after_patches with 0-2 LOW/nit findings."
---

# What to review

Read `backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md` at commit `c74fde90fc4542ff3b5e80b1cb64b42018f5169c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

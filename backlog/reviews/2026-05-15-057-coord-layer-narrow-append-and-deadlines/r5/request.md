---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 5
spec_commit_sha: 2d15276209d77278022d2c1bff4929d64d46f234
artifact_path: backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md
class: structural-reform
requested_at: '2026-05-16T04:12:37Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify r4 5-fix set on clean spec sha 93331c1 (NOTE: r4 commit a7ba02d\
  \ had autostash conflict markers; cleaned in 93331c1; recurring substrate bug filed\
  \ separately): (1) coord_invoke argv-spawn + strict input validation + pinned-request\
  \ mode + tick_failed_to_bind on mismatch; (2) coord_emit per-tier discriminated\
  \ input (round-tier correlation_id vs scheduler-tier tick_run_id mutually exclusive);\
  \ (3) AC5 V1 emission-path list excludes request.py explicitly; (4) tick_end covers\
  \ EVERY clean exit (completed/stale_combined/duplicate_response/upstream_duplicate);\
  \ only crash leaves deadline open. Decay shape: r1=9 \u2192 r2=5 \u2192 r3=4 \u2192\
  \ r4=5 (049 asymptotic). Convergence likelihood: depends on whether r5 surfaces\
  \ new adjacent gaps."
---

# What to review

Read `backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` at commit `2d15276209d77278022d2c1bff4929d64d46f234`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

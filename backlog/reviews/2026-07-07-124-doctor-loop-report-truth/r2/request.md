---
item_id: 2026-07-07-124-doctor-loop-report-truth
round: 2
spec_commit_sha: fe40dffc061296059a05b7951cdb0c88bdc694d6
artifact_path: backlog/proposed/2026-07-07-124-doctor-loop-report-truth.md
class: narrow
requested_at: '2026-07-07T07:15:15Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: d1574be1-7f54-43c2-8915-bf14f66ea836
focus_hints: Verify files_to_modify now permits exactly the AC3 shape-compat dashboard
  files (tools/loop-dashboard.ts + tests/tools/loop-dashboard.test.ts, shape-compat
  ONLY) and no capture-side attribution/extractor-prefix paths; verify AC4 names tests/cli/doctor-loop.test.ts
  + concrete gate commands and is consistent with AC3's shape-compat conditionality.
---

# What to review

Read `backlog/proposed/2026-07-07-124-doctor-loop-report-truth.md` at commit `fe40dffc061296059a05b7951cdb0c88bdc694d6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

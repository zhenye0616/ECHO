---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
round: 1
spec_commit_sha: f0ad7483e1fdf9fe6b8837f981adcf16845800c1
artifact_path: backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md
class: narrow
requested_at: '2026-06-05T23:59:42Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b4610506-e773-4ed8-8480-821334449a52
focus_hints: "Is paths-ignore the right mechanism vs job-level if-guards? Does AC3's\
  \ tag-ref/paths-ignore ambiguity match GitHub's real semantics \u2014 and is the\
  \ restructure escape hatch well-specified? Is the four-root ignore list (backlog/raw/docs/wiki)\
  \ correct \u2014 anything that should/shouldn't fire CI?"
---

# What to review

Read `backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md` at commit `f0ad7483e1fdf9fe6b8837f981adcf16845800c1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

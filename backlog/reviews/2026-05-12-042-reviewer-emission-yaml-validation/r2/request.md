---
item_id: 2026-05-12-042-reviewer-emission-yaml-validation
round: 2
spec_commit_sha: ac48694d5e2617054c5d30940859f48d9b979beb
artifact_path: backlog/ready/2026-05-12-042-reviewer-emission-yaml-validation.md
class: narrow
requested_at: '2026-05-12T23:46:31Z'
requested_reviewers:
- codex
- cursor
focus_hints: Verify AC2/AC3 use combined_verdict (not verdict); verify combined.schema.json
  declares offending_response + parse_error explicitly under additionalProperties:false;
  verify AC2 two-phase collect-then-emit (both reviewer files parsed before combined.md
  write); verify AC2a/AC2b fixture path strings are repo-root-relative (backlog/reviews/.../r1/cursor.md)
  not item-relative (r1/cursor.md); verify minItems:2 gate on array shapes.
---

# What to review

Read `backlog/ready/2026-05-12-042-reviewer-emission-yaml-validation.md` at commit `ac48694d5e2617054c5d30940859f48d9b979beb`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

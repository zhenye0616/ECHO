---
item_id: 2026-06-08-099-code-owned-sidecar-writer
round: 2
spec_commit_sha: 53e3d7138e5586d00aac01102c2f76029ffb9381
artifact_path: backlog/proposed/2026-06-08-099-code-owned-sidecar-writer.md
class: narrow
requested_at: '2026-06-09T06:09:33Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: cd80dbb7-4a89-44b9-ba18-da1bdd615249
focus_hints: 'Verify r1 patches close the findings: (a) descriptor contract implementable;
  (b) AC2 atomic no-clobber closes TOCTOU; (c) AC7 gate+TOCTOU tests and AC6 cwd-independent
  invoke sufficient.'
---

# What to review

Read `backlog/proposed/2026-06-08-099-code-owned-sidecar-writer.md` at commit `53e3d7138e5586d00aac01102c2f76029ffb9381`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

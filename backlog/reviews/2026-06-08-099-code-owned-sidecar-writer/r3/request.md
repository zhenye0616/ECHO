---
item_id: 2026-06-08-099-code-owned-sidecar-writer
round: 3
spec_commit_sha: ea5765c3a354af7047eeec66458ced879a9751b3
artifact_path: backlog/proposed/2026-06-08-099-code-owned-sidecar-writer.md
class: narrow
requested_at: '2026-06-09T06:16:50Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 643656f1-1125-4460-bb78-199342fa9c8a
focus_hints: "Verify r2 removals: (a) sole finalize path is temp\u2192validate\u2192\
  atomic os.link no-clobber, closing TOCTOU+truncation; (b) target derived from item_id\
  \ (no caller path) is sufficient confinement; (c) gate-test runs in disposable temp\
  \ git repo."
---

# What to review

Read `backlog/proposed/2026-06-08-099-code-owned-sidecar-writer.md` at commit `ea5765c3a354af7047eeec66458ced879a9751b3`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

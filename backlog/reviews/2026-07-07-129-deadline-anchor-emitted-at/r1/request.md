---
item_id: 2026-07-07-129-deadline-anchor-emitted-at
round: 1
spec_commit_sha: 3f2c92e78dcb9ca2a6debacd57ec1b383f4c7cb9
artifact_path: backlog/proposed/2026-07-07-129-deadline-anchor-emitted-at.md
class: narrow
requested_at: '2026-07-07T17:45:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b0dda096-2864-41c7-9939-17aa8a2992d6
focus_hints: "verify the emitted_at anchor is correct in all three resolveExpectedBy\
  \ branches incl. the caller-supplied clamp; AC3's skew-semantics stance vs the file's\
  \ own r4 horizon lesson (opposite posture \u2014 is the distinction sound); AC2's\
  \ restart-invariance test actually exercises the field-omitted production path;\
  \ confirm no-migration retroactivity claim"
---

# What to review

Read `backlog/proposed/2026-07-07-129-deadline-anchor-emitted-at.md` at commit `3f2c92e78dcb9ca2a6debacd57ec1b383f4c7cb9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

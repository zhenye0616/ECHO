---
item_id: 2026-06-05-091-upstream-windows-compat-fixes
round: 3
spec_commit_sha: c2426d101063dd1ec30eed3e21bf258c997d83e1
artifact_path: backlog/proposed/2026-06-05-091-upstream-windows-compat-fixes.md
class: narrow
requested_at: '2026-06-05T20:31:53Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 91e046bf-0d04-467a-94b7-2dccf6ba04e4
focus_hints: 'Verify c98c0370: AC4 launchd gate is platform===''darwin'' (NOT win32-only)
  so win32 AND linux make zero launchctl calls + return manual-daemon; tests/cli/{daemon,doctor}.test.ts
  assert non-darwin path for win32 AND linux; darwin unchanged. Narrow re-check of
  darwin-gate only; codex already proceed.'
---

# What to review

Read `backlog/proposed/2026-06-05-091-upstream-windows-compat-fixes.md` at commit `c2426d101063dd1ec30eed3e21bf258c997d83e1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

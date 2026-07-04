---
item_id: 2026-07-04-113-signal-window-interface
round: 4
spec_commit_sha: 18c01009260d97adb43ed8dc7e38f66412ee7b1d
artifact_path: backlog/proposed/2026-07-04-113-signal-window-interface.md
class: narrow
requested_at: '2026-07-04T19:44:30Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e35b470e-4c43-498c-854a-2c301ee478e9
focus_hints: Verify AC3 pins the SQLite rowid durability invariant (append-only/single-writer/no-VACUUM
  -> rowid never renumbered) and defers any explicit-sequence-column migration to
  a future deletes/VACUUM item (no new durability machinery in 113); Tests include
  cursor-durability-across-daemon-reopen; confirm the r2 structural cut still clean
  (no nextSinceSeq reintroduced, caller-derived limit-safe advancement intact).
---

# What to review

Read `backlog/proposed/2026-07-04-113-signal-window-interface.md` at commit `18c01009260d97adb43ed8dc7e38f66412ee7b1d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

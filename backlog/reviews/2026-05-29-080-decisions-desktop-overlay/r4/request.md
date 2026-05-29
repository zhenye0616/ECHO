---
item_id: 2026-05-29-080-decisions-desktop-overlay
round: 4
spec_commit_sha: b3675c45046e84c3fa7af012bad832c58724c958
artifact_path: backlog/ready/2026-05-29-080-decisions-desktop-overlay.md
class: narrow
requested_at: '2026-05-29T08:45:50Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ee81f04f-6fbc-4beb-b419-df8e19d60070
focus_hints: "round 4 \u2014 VERIFY the r2/r3 transparency+always-on-top patch landed\
  \ (spec-r2-patches b3675c45): AC7 smoke check (vii) requires the built app to prove\
  \ the summoned window is actually transparent AND always-on-top and to record the\
  \ chosen-stack config/capabilities in README (incl. the manual-fallback checklist\
  \ path); AC2 requires README record that config. Confirm no scope expansion beyond\
  \ this single smoke check; v0 scope stays tight (no SEE+ACT, no new coord event,\
  \ overlay consumes existing pending_decisions/coord_status, no rebuild)."
---

# What to review

Read `backlog/ready/2026-05-29-080-decisions-desktop-overlay.md` at commit `b3675c45046e84c3fa7af012bad832c58724c958`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

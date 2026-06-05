---
item_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
round: 2
spec_commit_sha: 507b252ceb3372ccb3caac70fee0847dcdcb4f79
artifact_path: backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md
class: narrow
requested_at: '2026-06-05T23:22:33Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: dccaa051-eeb3-4a51-8357-563f68e2155e
focus_hints: "Verify the r1 patches at 8e9dcd81 close the four findings without new\
  \ mechanism: (1) AC4 isolation contract \u2014 fresh temp runtime homes + isolated\
  \ daemon state + env recorded in run log; (2) AC4 binary identity \u2014 absolute\
  \ clean-prefix bin path invoked and recorded; (3) AC2 BLOCKED-escalation framing\
  \ \u2014 escalation handoff explicitly not acceptance-complete. Flag any reframe-gate\
  \ concern if the patches added mechanism beyond the reviewers' asks."
---

# What to review

Read `backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md` at commit `507b252ceb3372ccb3caac70fee0847dcdcb4f79`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

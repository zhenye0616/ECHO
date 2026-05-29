---
item_id: 2026-05-29-080-decisions-desktop-overlay
round: 2
spec_commit_sha: 35755d87e446c44fdeadfdb14900461396b8fde3
artifact_path: backlog/ready/2026-05-29-080-decisions-desktop-overlay.md
class: narrow
requested_at: '2026-05-29T07:59:05Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 19a683cd-ee8b-4e4e-9c9b-75999ee7dcbb
focus_hints: "R2 verify spec @ 35755d87 against r1's 5 accepted patches: (1) AC4 coord_status\
  \ correlation_id->item_id join bounded ONLY to backlog/reviews/<in-flight-item>/r*/request.md\
  \ for ready|claimed|pending_review items (no full ~1000-round history scan); unmatched\
  \ deadlines dropped; AC7(c) fixture named. (2) AC2 tools/echo-overlay excluded from\
  \ root tsconfig + own package scripts so root tsc can't break. (3) AC7 pre-merge\
  \ packaged-app smoke gate (idle no-Dock/menu/hotkey/live-MCP-under-CSP/repo-reads/SEE+JUMP),\
  \ manual fallback only if automation infeasible, distinct from AC8. (4) AC1 repoPath\
  \ absolute-resolution-before-call + distinct invalid-path-vs-daemon-down + AC7(a)\
  \ coverage. (5) AC8 reframed post-merge, not a builder-handoff blocker. J1 stack\
  \ uncontested in r1 \u2014 no stack-split escalation."
---

# What to review

Read `backlog/ready/2026-05-29-080-decisions-desktop-overlay.md` at commit `35755d87e446c44fdeadfdb14900461396b8fde3`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

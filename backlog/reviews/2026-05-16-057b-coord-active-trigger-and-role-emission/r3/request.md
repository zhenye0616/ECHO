---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 3
spec_commit_sha: c38f9ddd40d404438fd5a9a8d0d2470a0dd5a726
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T07:21:28Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r2 produced 5 findings (2H + 3M) \u2014 all operational details on r1-introduced\
  \ mechanism (wrapper-spawn + bind-failure path + motivation text). All accepted;\
  \ spec patched at 3be1ed1. r3 verifies: (1) AC0 step 3 \u2014 explicit Node TS code\
  \ block: import { spawn } from 'node:child_process'; stdio:'ignore'; cwd: REPO_ROOT;\
  \ env: ECHO_REVIEW_QUEUE_REPO_ROOT + ECHO_COORD_REQUEST_PATH + ECHO_COORD_CORRELATION_ID;\
  \ child.unref(); (2) AC0 step 1 \u2014 wrapper path resolved via new URL('../../tools/review-queue/run--reviewer.sh',\
  \ import.meta.url) (same pattern as 057a loadCoordRoles); ECHO_REPO_ROOT env override\
  \ for tests; (3) AC7 Phase 2 \u2014 split into pinned-mode (tick_start BEFORE bind-validate)\
  \ vs launchd-fallback mode (tick_start after candidate selection); matches AC0 step\
  \ 5 verbatim; (4) Why-this-spec L97-98 \u2014 motivation lists review-queue-watch\
  \ + review-pending only; no merge-and-cleanup mention as coord_invoke caller; (5)\
  \ AC8 \u2014 new fixtures coord-invoke-cwd-independent.test.ts (chdir to /) + coord-invoke-fire-and-forget.test.ts\
  \ (wrapper sleep+early-stderr; coord_invoke returns <1s; memory bounded N=100);\
  \ (6) no regression in other ACs. Trend r1\u2192r2: 8\u21925 findings, 6H/2M \u2192\
  \ 2H/3M. r3 should be terminal or 1-2 LOW findings. ops lens: detached subprocess\
  \ on macOS (launchd-spawned daemon vs interactive); import.meta.url resolution under\
  \ bundled vs unbundled daemon entrypoints; ECHO_REVIEW_QUEUE_REPO_ROOT env-var precedence\
  \ (does the wrapper's existing fallback logic accept this override?)."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `c38f9ddd40d404438fd5a9a8d0d2470a0dd5a726`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

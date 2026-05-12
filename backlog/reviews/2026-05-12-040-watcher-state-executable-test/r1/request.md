---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 1
spec_commit_sha: 4c6d98f9b4eab66f3c42a406bb99003a4e24b60e
artifact_path: backlog/ready/2026-05-12-040-watcher-state-executable-test.md
class: narrow
requested_at: '2026-05-12T09:09:58Z'
requested_reviewers:
- codex
- cursor
focus_hints: "AC1 helper-script signature + race-loser parity with request.py \xA7\
  AC2 (idempotent at same SHA, exit 2 at different SHA); AC2 watcher-prose rewrite\
  \ preserves strategist disposition step verbatim (the (a)/(b)/(c) judgment remains\
  \ human); AC3 test fixture (b) load-bearing post-conditions \u2014 assert both r{N+1}/request.md\
  \ exists with correct spec_commit_sha AND next_round=N+1 in prior combined.md AND\
  \ that combined.md schema-validates after the in-place edit; AC6 is OBSERVATIONAL\
  \ not implemented \u2014 confirm we don't accidentally encode it as a vitest assertion\
  \ (it is the live-test verdict on this round, not a code AC). Out-of-scope discipline:\
  \ helper does NOT auto-decide (a)/(b)/(c); strategist still fills Disposition by\
  \ hand. Spec-template question: is the helper-vs-watcher split (helper executes,\
  \ watcher's prose still narrates the strategist's judgment) the right factoring,\
  \ or should the helper also subsume the disposition-narrative step?"
---

# What to review

Read `backlog/ready/2026-05-12-040-watcher-state-executable-test.md` at commit `4c6d98f9b4eab66f3c42a406bb99003a4e24b60e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

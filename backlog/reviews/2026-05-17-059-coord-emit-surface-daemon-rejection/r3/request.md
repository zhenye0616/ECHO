---
item_id: 2026-05-17-059-coord-emit-surface-daemon-rejection
round: 3
spec_commit_sha: d6be1400929e61fc145a9e3addf90d9ee7d5880c
artifact_path: backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md
class: narrow
requested_at: '2026-05-17T08:10:57Z'
requested_reviewers:
- codex
- codex-ops
- claude
correlation_id: de5b6405-45fd-41d2-8b82-81e6dfa3bfb3
focus_hints: 'Verify frontmatter line 13 names all three AC3 cases with locked stderr
  literals + pickClosedPort helper. Verify AC1 has the new Suppress curl''s own stderr
  bullet with 2>/dev/null + rationale citing launchd log flood. Verify AC3 test (ii)
  asserts r.stderr.toString() === '''' (not the older not.toMatch regex). Verify Out
  of Scope #7 forbids curl-native stderr passthrough. Spot-check no contradictory
  leftover language from pre-R2 silent-vs-opt-in deferral. Confirm spec still passes
  057a''s load-bearing exit-0-unconditional invariant.'
---

# What to review

Read `backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md` at commit `d6be1400929e61fc145a9e3addf90d9ee7d5880c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

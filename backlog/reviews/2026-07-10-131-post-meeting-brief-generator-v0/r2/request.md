---
item_id: 2026-07-10-131-post-meeting-brief-generator-v0
round: 2
spec_commit_sha: e304d18bda10b5df2bd6301b5296d04fd207f8f0
artifact_path: backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md
class: narrow
requested_at: '2026-07-10T05:19:06Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 53280c61-a4d9-478e-bb34-dbb80dd5fef4
focus_hints: "Verify 6c790947 closes r1: (1) resolveCurrentGranolaNoteAtoms \u2014\
  \ per-atom-type newest-wins + event-id tie-break sufficient for all note_id consumers\
  \ incl. the poller already-ingested check? (2) mkdir lock \u2014 stale-takeover\
  \ race between two takers? (3) timeout formula \u2014 prompt_chars consistent with\
  \ single-embed? (4) AC8 comparator normalization complete/implementable? (5) watch\
  \ for patch-on-patch. If closed, verdict proceed."
---

# What to review

Read `backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md` at commit `e304d18bda10b5df2bd6301b5296d04fd207f8f0`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

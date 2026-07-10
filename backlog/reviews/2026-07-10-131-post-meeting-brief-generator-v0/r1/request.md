---
item_id: 2026-07-10-131-post-meeting-brief-generator-v0
round: 1
spec_commit_sha: 2b60c695d76ccecdbe6809f35b2bd8b13ef4fe70
artifact_path: backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md
class: narrow
requested_at: '2026-07-10T05:13:50Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 84da2def-eaf7-4173-8b33-e9a36c781e44
focus_hints: "Six root-cause ACs from an adversarially-verified stress test (spec_refs[0])\
  \ \u2014 verify each AC actually closes its root cause and is testable as written.\
  \ Specific seams: (1) AC2 re-ingest \u2014 superseding summary/transcript atoms\
  \ on the SAME note_id: do existing consumers keyed on note_id (signals note-selection,\
  \ item-130 changeset dedupe, search) pick the newest atom deterministically, or\
  \ does the spec need to pin a newest-atom-wins read rule? (2) RC3 scope hole \u2014\
  \ the item-130 bridge ALSO reads derived:granola-signals without filterToCurrentSignalRuns;\
  \ the out-of-scope fence says 130's path is untouched, but AC3 fixing only the brief\
  \ leaves the card path consuming duplicate runs. Flag whether AC3 should cover the\
  \ shared read seam or a rider follow-up is cleaner. (3) AC4 cross-process lock \u2014\
  \ mechanism must work on macOS now and win32 later (first beta tester is Windows);\
  \ flock portability vs lockfile-with-stale-detection. (4) AC5 timeout scaling \u2014\
  \ demand a pinned formula or config key, not 'scales'. (5) AC6 per-action owner\
  \ \u2014 this changes the signal-extraction output contract (new per-signal metadata\
  \ field): confirm append-only compatibility and that old atoms without the field\
  \ render 'unassigned' not crash. (6) AC8 parity \u2014 'matches modulo AC6 fixes'\
  \ needs a crisper diffable definition. (7) estimate 2d realistic given files_to_modify\
  \ spans poller+signals+new CLI?"
---

# What to review

Read `backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md` at commit `2b60c695d76ccecdbe6809f35b2bd8b13ef4fe70`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

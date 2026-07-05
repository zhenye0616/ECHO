---
item_id: 2026-07-04-115-station-2-contract-pinning
round: 4
spec_commit_sha: a7a382adcf00412b03510440e3c343f8929173c5
artifact_path: backlog/proposed/2026-07-04-115-station-2-contract-pinning.md
class: narrow
requested_at: '2026-07-05T00:47:16Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e1ffd727-e04d-4bbc-aed0-0bc827744d7e
focus_hints: "Verify the three r3 patches at 6846a48a: (a) order-preserving helper\
  \ + exact output-id-sequence test; (b) exclusive first-match multi-defect precedence\
  \ (missing_summary \u2192 missing_transcript \u2192 missing_dedupe_key) mirrors\
  \ buildRawGranolaNotes control flow; (c) invalid-granola_atom_type fixture makes\
  \ both malformed paths falsifiable. Spec is at pinning saturation after three rounds\
  \ of code-fact pinning \u2014 flag only contract-breaking gaps or internal inconsistencies."
---

# What to review

Read `backlog/proposed/2026-07-04-115-station-2-contract-pinning.md` at commit `a7a382adcf00412b03510440e3c343f8929173c5`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

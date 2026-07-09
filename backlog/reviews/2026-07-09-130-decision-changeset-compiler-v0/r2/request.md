---
item_id: 2026-07-09-130-decision-changeset-compiler-v0
round: 2
spec_commit_sha: d9d8b5fe8c5a993d3280f8fdc4371eb8d49d8a37
artifact_path: backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md
class: narrow
requested_at: '2026-07-09T18:57:48Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e3ec8afe-7301-44ed-9008-33d1ab1fc21e
focus_hints: "Verify d71b7379 r1 patches: (1) two-phase apply ordering \u2014 line_key\
  \ atom dedupe + per-line resume from 'applying'; is line_key well-defined for add/split\
  \ lines created by human edits after compile time? (2) ChangesetDraft vs DecisionDraft\
  \ coexistence \u2014 any seam where meeting batches could still double-post per-decision\
  \ cards, or where propose_decision regresses? (3) AC8 revision CAS \u2014 stale-confirm\
  \ rejection + applying-no-op: does a crashed 'applying' draft need an operator unlock,\
  \ or does per-line resume make it safe? (4) AC5 close idempotency \u2014 testable\
  \ as written against Linear API semantics? (5) AC2 op set \u2014 are split/add well-specified\
  \ enough to build without guessing?"
---

# What to review

Read `backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md` at commit `d9d8b5fe8c5a993d3280f8fdc4371eb8d49d8a37`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

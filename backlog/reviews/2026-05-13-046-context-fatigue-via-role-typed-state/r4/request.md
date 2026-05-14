---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 4
spec_commit_sha: 3f4e829ed51438d06659e93798bc4c36b5bbe115
artifact_path: backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md
class: structural-reform
requested_at: '2026-05-14T04:07:02Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R3 dispositioned: 2 unique root issues, accept-with-patch.\n\nR4 focused\
  \ re-review (narrow):\n1. AC1 step 6 push-round-state.sh blob-lease semantics. Verify:\n\
  \   (a) `git reset --hard origin/main` is the right discard-mechanism for the local\
  \ commit on CAS-violation abort (alternative: `git reset --soft HEAD~1`; the hard-reset\
  \ matches \"abort and re-synthesize on next tick\" intent but loses the local working-tree\
  \ content \u2014 that's intentional, the queue-errors.md log captures the abort).\n\
  \   (b) Single pull-rebase retry semantics when file blob is unchanged is race-free.\
  \ The intended invariant: if origin/main advanced but origin/main:<path> blob is\
  \ identical to base_blob, the pull-rebase cannot conflict on this file by definition,\
  \ so retry-once is safe.\n   (c) `push-round-state.sh <task-id> <base_blob>` is\
  \ implementable from the current `tools/review-queue/` shape (signature, error-handling,\
  \ exit codes match push-with-retry.sh conventions).\n\n2. AC1 ABSENT sentinel.\n\
  \   (a) Verify the literal string `ABSENT` is unambiguous for both first-write and\
  \ rewrite paths.\n   (b) Verify step 4's both-ABSENT-\u2192-success semantics is\
  \ unambiguous (no race where another writer creates the file between step 3 fetch\
  \ and step 4 rev-parse).\n   (c) Verify mkdir -p at step 2 doesn't interact poorly\
  \ with step 4's path-resolve check (the file may not exist on origin even after\
  \ mkdir locally; rev-parse on origin/main:<path> returns failure \u2192 ABSENT \u2014\
  \ confirmed?).\n\nSpec is at 200+ lines; full re-read NOT needed. Pin to AC1 only.\n\
  \nR4 target: convergence. Decay shape 9\u21925\u21922\u2192? \u2014 projecting 0-1\
  \ findings, both reviewers proceed. If a new HIGH surfaces, we escalate to founder\
  \ rather than continue."
---

# What to review

Read `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at commit `3f4e829ed51438d06659e93798bc4c36b5bbe115`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

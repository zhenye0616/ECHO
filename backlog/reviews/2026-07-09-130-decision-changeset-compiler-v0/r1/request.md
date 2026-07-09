---
item_id: 2026-07-09-130-decision-changeset-compiler-v0
round: 1
spec_commit_sha: d36cf4fc83ca21aa5a1e78d6b22a07de3983de1f
artifact_path: backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md
class: narrow
requested_at: '2026-07-09T18:51:14Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7d9352f8-56a5-4637-83ef-c18df24705e8
focus_hints: "Ordering trap in AC4/AC5: decision_atom_id is minted when the team-decision\
  \ atom is appended at confirm, but the stamp must land on created issues and the\
  \ idempotency key is decision_atom_id+child slug \u2014 is the append-atom-BEFORE-apply-mutations\
  \ ordering pinned tightly enough to survive a crash between the two (AC5 retry)?\
  \ AC3 nothing-before-confirm vs the existing draft-store lifecycle (drafts today\
  \ post per-decision cards with their own pending state) \u2014 does the batch changeset\
  \ draft need a NEW draft record type or does DecisionDraft stretch without breaking\
  \ the existing station-4 confirm leg? AC7 supersedes pointer must respect append-only\
  \ storage (no in-place modify). AC2 natural-language thread-edit loop: is reusing\
  \ the intake-agent conversational machinery in scope creep for 2d, or should v0\
  \ pin a simpler edit grammar? Close path in linear-client is NEW \u2014 check Linear\
  \ API idempotency for closes (closing an already-closed issue must no-op). Out-of-scope\
  \ fence: confirm-leg operational hardening (responder-not-running) is deferred \u2014\
  \ flag if any AC silently depends on the responder being up."
---

# What to review

Read `backlog/proposed/2026-07-09-130-decision-changeset-compiler-v0.md` at commit `d36cf4fc83ca21aa5a1e78d6b22a07de3983de1f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

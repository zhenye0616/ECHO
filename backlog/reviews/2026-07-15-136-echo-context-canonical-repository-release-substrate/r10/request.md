---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 10
spec_commit_sha: 5f052d7d329297815e33d579e476465cacf0bfbb
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T05:34:40Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f0016590-4f0d-409d-b546-2412172b8108
focus_hints: "Verify the r9 correction patches: create-only CAS semantics for the\
  \ prepared AC1 initial main push and the AC6 annotated-tag push (empty-expect force-with-lease,\
  \ porcelain new-ref proof, same-OID pre-existing ref fails instead of adopting,\
  \ interleaved identical-tag fixture); source-mode --source-sha must equal the clone's\
  \ full HEAD before building (wrong-source fixture); exact protected-environment\
  \ policy {name: main, type: branch} with missing/wrong-type fail-closed fixtures;\
  \ byte-exact UTF-8 annotation template oracle incl. final-newline rule with byte-drift\
  \ fixtures; flushed write-ahead attempt markers before every external mutation with\
  \ marker-without-response ambiguity semantics, read-only reconciliation, and marker-before-call\
  \ fixtures under injected timeout/termination \u2014 including whether an Actions\
  \ run log provides a genuinely durable flushed marker across abrupt runner loss\
  \ or the marker mechanism needs founder-directed redesign; exact write-ordering\
  \ trace fixtures (tag-push -> tag-verification readback -> draft-create -> draft-readback\
  \ -> asset uploads -> publish -> post-publish readback) with zero-write guarantees\
  \ after each failure point; Tests bullet alignment for all of the above."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `5f052d7d329297815e33d579e476465cacf0bfbb`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

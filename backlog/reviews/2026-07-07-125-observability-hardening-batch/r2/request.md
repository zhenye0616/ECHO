---
item_id: 2026-07-07-125-observability-hardening-batch
round: 2
spec_commit_sha: b195065d02b242241c08e5ed8218fcbb853f80f2
artifact_path: backlog/proposed/2026-07-07-125-observability-hardening-batch.md
class: narrow
requested_at: '2026-07-07T07:20:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ebe8d866-0b4d-490f-8cbe-56e48cce38c6
focus_hints: Verify AC2 requires both stream directions (downstream client-destroy
  AND upstream-destroy/timeout) with tests/enrich/brain-retrieval-capture.test.ts
  named; AC3 scoped to sequential retry edge, concurrent double-append explicitly
  deferred as documented blind spot (no 123 persisted-contract change / no atomic
  primitive); AC4 enumerates full seed-store set for --note mode with terminal-only
  pre-123 note test; AC5 present-db byte-identity test required+concrete in tests/tools/trace-card.test.ts;
  files_to_modify test paths match ACs and add no capture/schema-side files.
---

# What to review

Read `backlog/proposed/2026-07-07-125-observability-hardening-batch.md` at commit `b195065d02b242241c08e5ed8218fcbb853f80f2`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

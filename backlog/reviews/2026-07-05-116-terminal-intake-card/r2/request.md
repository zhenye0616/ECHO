---
item_id: 2026-07-05-116-terminal-intake-card
round: 2
spec_commit_sha: 1bb4951233c7a3a2c059ccff27a436a520c194aa
artifact_path: backlog/proposed/2026-07-05-116-terminal-intake-card.md
class: narrow
requested_at: '2026-07-05T23:05:13Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 14d5b0c5-8333-46e8-8c88-c5503f30338f
focus_hints: 'Verify: AC3 --watch brain-preflight prints per-tick skip status (bridge
  lazy retry, never spin/crash); AC4 --seed-store <path> flag + fail-fast persistability
  (parent-dir create + write check) BEFORE any card render; AC5 both modes pass resolved
  store into bridge seedStorePath/seedStore (no silent canonical fallback); AC6 tests/tools/intake-terminal.test.ts
  + npm test with assertions 1-5 incl. unwritable-store fail-fast and watch brain-skip
  visibility.'
---

# What to review

Read `backlog/proposed/2026-07-05-116-terminal-intake-card.md` at commit `1bb4951233c7a3a2c059ccff27a436a520c194aa`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-07-04-114-drift-sweep-v0
round: 4
spec_commit_sha: dafbcedf7b49973149a9ae8f7fe169ff53a5aa24
artifact_path: backlog/proposed/2026-07-04-114-drift-sweep-v0.md
class: narrow
requested_at: '2026-07-04T19:47:30Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 960f8004-b11e-49ab-ba10-d753d0c95000
focus_hints: 'Confirm the two r3 nits are closed: (1) delivery-failed is the sole
  delivery-failure literal across AC1/AC5 checkpoint + cursor terminal set + tests;
  (2) DRIFT_JUDGE_MAX_ATTEMPTS (default 3) is the single shared retry budget for AC3
  malformed-verdict and AC4 fabricated-quote terminalization, retryable infra errors
  excluded from the count, tests assert the exact attempt count. No new mechanism
  should be required. Out-of-scope wall holds: no persisted verdict atoms, Granola-only
  supply, no decision-store schema change.'
---

# What to review

Read `backlog/proposed/2026-07-04-114-drift-sweep-v0.md` at commit `dafbcedf7b49973149a9ae8f7fe169ff53a5aa24`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

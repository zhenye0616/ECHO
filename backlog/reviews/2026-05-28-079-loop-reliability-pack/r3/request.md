---
item_id: 2026-05-28-079-loop-reliability-pack
round: 3
spec_commit_sha: 4b47e33732e8cdf5c14d534abadc43ac47e97c58
artifact_path: backlog/ready/2026-05-28-079-loop-reliability-pack.md
class: narrow
requested_at: '2026-05-29T06:03:44Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9a1a7a5e-dee8-46a1-bc01-8ad69d2b388c
focus_hints: 'Verify: (a) AC2 kind=push returns exactly ECHO_EFFECT_NONLIVE_RC=97
  under dry-run/test (all other kinds return 0) and commit-reviewer-response.sh treats
  97 as non-completed (refuse-before-commit or rollback, no false completed tick);
  test asserts exact code through push-with-retry.sh AND commit-reviewer-response.sh.
  (b) AC3 schema/validator/body/AC7 fixture use verbatim ''## Follow-up items (defer,
  do not block merge)'' heading; additive-only still holds (only producer is new).
  (c) AC1/AC7 per-caller observable-invariant fixtures replace byte-identity; no byte-diff
  language remains.'
---

# What to review

Read `backlog/ready/2026-05-28-079-loop-reliability-pack.md` at commit `4b47e33732e8cdf5c14d534abadc43ac47e97c58`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

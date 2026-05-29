---
item_id: 2026-05-28-079-loop-reliability-pack
round: 4
spec_commit_sha: e14cae77f228b56f77098106ef61874cc74ae449
artifact_path: backlog/ready/2026-05-28-079-loop-reliability-pack.md
class: narrow
requested_at: '2026-05-29T06:20:22Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f53d7dfe-ee75-4209-b6d7-e798e816e8d6
focus_hints: "Verify at spec e14cae77f228b56f77098106ef61874cc74ae449: (a) AC2 r3\
  \ codex F1 \u2014 kind=push returns EXACTLY ECHO_EFFECT_NONLIVE_RC=97 under BOTH\
  \ dry-run AND test (no dry-run-push false-success path); every non-push kind returns\
  \ EXACTLY 0 under both non-live modes; the general dry-run-returns-0 statements\
  \ (lines 17, 91) now carve out push; AC7 test-effect-runner.sh asserts exact 97\
  \ for push and exact 0 for non-push through BOTH push-with-retry.sh AND commit-reviewer-response.sh\
  \ under both non-live modes. (b) AC3 r3 codex F2 \u2014 validate-sidecar.py coerces\
  \ a PyYAML-parsed datetime reviewed_at back to ISO-8601 string before jsonschema;\
  \ validator-side coercion (not producer-quoting) keeps additive-only; AC7 test-validate-sidecar.sh\
  \ fixture uses the CURRENT unquoted template (reviewed_at: 2026-04-30T22:30:00Z\
  \ per review-pending.md:175) and MUST validate."
---

# What to review

Read `backlog/ready/2026-05-28-079-loop-reliability-pack.md` at commit `e14cae77f228b56f77098106ef61874cc74ae449`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 2
spec_commit_sha: a3d83d7d8eae4d67854a0c57fe429d7dc808f79c
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-15T22:33:19Z'
requested_reviewers:
- codex
- claude
correlation_id: 73bd8f8a-21e4-40d8-aece-1935f50c316f
focus_hints: "Verify the r1 patches at ad53c6c7: (1) AC6 build-once separation \u2014\
  \ unprivileged build-artifact persists the immutable run-ID/artifact-ID/digest artifact,\
  \ founder approves the full tuple post-build via the source-release protected environment,\
  \ publish-release re-hashes and never rebuilds; (2) release authorization/atomicity\
  \ \u2014 dispatch inputs, SHA==main check, concurrency serialization, pre-publication\
  \ repo identity/visibility re-read, no-clobber, post-upload tag/asset readback;\
  \ (3) AC1 bootstrap gitleaks version+digest pin and AC4 secret-scan equivalence\
  \ contract; (4) named scripts/job IDs/protection fields internally consistent across\
  \ AC3/AC4/Tests; (5) sidecar manifest + deterministic tar format complete and non-self-referential;\
  \ (6) actor bindings leave no reading that permits a builder push to either main."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `a3d83d7d8eae4d67854a0c57fe429d7dc808f79c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

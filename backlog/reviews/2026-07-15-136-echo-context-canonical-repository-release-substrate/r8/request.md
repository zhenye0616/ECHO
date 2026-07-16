---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 8
spec_commit_sha: 2198e9dffb7c70e2ca188bcc530bdf3a161d742c
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T04:37:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ecff03c4-bcf6-43fa-ba7e-4921ff404a3e
focus_hints: "Verify the r7 propagation-completion patches: terminal rerun-sentinel\
  \ (empty permissions, no environment, needs every other executable job, always(),\
  \ succeeds only at run_attempt == 1 \u2014 a dependent not a prerequisite, so full/failed-jobs/single-job\
  \ reruns all schedule it; per-job run_attempt == 1 conditions retained; scheduler-selection\
  \ fixtures); --expected-manifest-hash required by verify:artifact and fresh-clone\
  \ release mode with the approved tuple's migration record as durable carrier (source\
  \ mode self-derives from the just-built manifest; wrong-hash fixture); tools/verify-hosting-controls.mjs\
  \ fail-closed verifier over environment fields (exactly zhenye0616, prevent-self-review\
  \ disabled, no admin bypass, main-only) and branch-protection administrator enforcement\
  \ (enforce_admins or exact ruleset equivalent; absent/false/unsupported/unreadable\
  \ fails); exact-artifact-ID raw-archive download to file (no internal extraction,\
  \ no name/latest retrieval; wrong-name fixture); implicit-tag-at-draft and annotated-tag-message\
  \ fixtures; committed tools/secret-scan-contract.json bound by both bootstrap and\
  \ hosted scan paths with leak-exit and pipeline-masking fixtures; Tests bullet alignment\
  \ for all of the above."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `2198e9dffb7c70e2ca188bcc530bdf3a161d742c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

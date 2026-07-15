---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 3
spec_commit_sha: 9cc29b1493659f8b3cbb433633232448aad3ae2c
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-15T22:49:46Z'
requested_reviewers:
- codex
- claude
correlation_id: 4b152027-299a-4f27-9414-c60227c1fd2a
focus_hints: "Verify the r2 patches at 0f05a7ce: (1) AC6 dispatch guard \u2014 github.ref/github.sha/API-re-read\
  \ main HEAD triple agreement + main-only source-release environment deployment-branch\
  \ policy with readback; (2) tuple handoff \u2014 build-artifact expected-hash mismatch\
  \ failure, run-summary + in-artifact machine-readable tuple record (workflow-only,\
  \ not a fourth asset), tuple-field job outputs, publish-release artifact-ID-bound\
  \ download + full tuple revalidation; (3) publication staging \u2014 pre-first-write\
  \ main-HEAD recheck, draft-stage upload-verify-then-publish ordering, same-run partial\
  \ cleanup + surviving-partial-state founder-disposition stop; (4) fresh-clone two-mode\
  \ argument contract consistent across AC3/AC6/Tests (source mode builds locally,\
  \ release mode takes archive/checksum/manifest paths, no optional skips, test:operator\
  \ never invoked); (5) no new mechanism beyond these completions \u2014 workflow/job/asset\
  \ shape unchanged."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `9cc29b1493659f8b3cbb433633232448aad3ae2c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

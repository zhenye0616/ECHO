---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
round: 2
spec_commit_sha: 50cdb60c55336cbf1ac9904fa27fdcbdc13238da
artifact_path: backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md
class: narrow
requested_at: '2026-06-05T21:05:41Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b75d4d7b-7cfb-4b15-9e87-2a47f0ff889e
focus_hints: "Verify r1 patches at the patched SHA: (AC1) single build job npm-packs\
  \ once, computes SHA-256, uploads tarball+checksum artifact \u2014 no downstream\
  \ rebuild. (AC2) validation jobs download+verify that exact artifact's checksum\
  \ before install/selftest/doctor; publish job runs only after all validation passes\
  \ and consumes the downloaded artifact; version-identity gate asserts ${GITHUB_REF_NAME#v}==package.json\
  \ version; explicit permissions split (validation contents:read, publish contents:write).\
  \ (AC2b) workflow_dispatch path runs build+OS-matrix validate but SKIPS publish;\
  \ only real v* tag publishes. (AC3) in-file mechanism = required/aggregate job needs:\
  \ onboarding/windows-compat; branch-protection toggle explicitly carved out as founder-manual\
  \ follow-up with gh api verification \u2014 confirm no invented required-checks\
  \ surface and the regression-fails-aggregate claim is real. (AC4) inline npm pack\
  \ --dry-run --json sorted files[].path snapshot, files_to_modify unchanged. (AC6)\
  \ lifecycle carve-out allows claim/pending_review/agent_notes/run-log only. Check\
  \ each AC is now builder-executable without guessing and that no patch introduced\
  \ new scope."
---

# What to review

Read `backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md` at commit `50cdb60c55336cbf1ac9904fa27fdcbdc13238da`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

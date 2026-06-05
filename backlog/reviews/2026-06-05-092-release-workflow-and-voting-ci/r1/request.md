---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
round: 1
spec_commit_sha: 374de35bc27f21981bb6c3e148cf3a666b583b45
artifact_path: backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md
class: narrow
requested_at: '2026-06-05T20:53:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a5876ad7-8608-4cb6-845d-daa11e13962c
focus_hints: "Load-bearing decisions to pressure-test: (1) ONE npm-pack tarball tested\
  \ per-OS vs per-OS artifacts \u2014 is the better-sqlite3 'resolves at install via\
  \ prebuild' assumption safe on the Windows matrix runner (AC1/AC2)? (2) AC3 flips\
  \ onboarding CI from non-required to a REQUIRED blocking gate \u2014 confirm 091\
  \ actually made it green and the regression-fails-it check is real, not tautological.\
  \ (3) AC4 packed-manifest snapshot PINS (does not strip) assets/echo-roles/**, assets/echo-workflows/**,\
  \ review-queue config \u2014 verify it matches 076's current files allowlist and\
  \ fails on add/remove. (4) Private/prerelease GitHub Release + retain-prior-for-rollback\
  \ (AC2) \u2014 no prior-release deletion. (5) AC6 drift boundary: NO src/ changes,\
  \ NO files-allowlist edits, NO public channels. Flag any AC that can't be verified\
  \ without a real Windows GH run vs dry-run/workflow_dispatch rehearsal."
---

# What to review

Read `backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md` at commit `374de35bc27f21981bb6c3e148cf3a666b583b45`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

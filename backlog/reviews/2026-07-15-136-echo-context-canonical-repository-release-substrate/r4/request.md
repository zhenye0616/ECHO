---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 4
spec_commit_sha: 9997f07362d9fa7849c4069642019c536657ff77
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-15T23:10:04Z'
requested_reviewers:
- codex
- claude
correlation_id: cc6537c4-ac87-46de-a71f-bb76e31b6e89
focus_hints: "Verify the r3 patches at 9997f073: (1) inner/outer tuple layering \u2014\
  \ pre-upload seven-field inner record inside the workflow artifact, post-upload\
  \ artifact-ID + workflow-artifact-digest capture as run-summary fields and job outputs,\
  \ founder approval over the nine-field combined tuple, publish-release digest-verified\
  \ artifact-ID-bound download + full inner/outer revalidation, still exactly three\
  \ release assets; (2) AC3 command surface \u2014 exactly npm ci + named scripts\
  \ (incl. new build:artifact with --source-sha/--out and package.json version derivation)\
  \ + git fsck --full, unknown/missing/duplicate/wrong-mode argument failures, release\
  \ mode never builds, test:operator never invoked; (3) publication staging \u2014\
  \ non-cancelling concurrency, run-owned identifier logging at creation time, cross-version\
  \ partial-state preflight stopping for founder disposition, same-run cleanup retained\
  \ as best-effort only; (4) hash naming \u2014 source-archive SHA-256 / manifest\
  \ hash / lock hash / workflow-artifact digest used distinctly and consistently across\
  \ AC5/AC6/handoff/Tests, dispatch-input expected-hash producers + exact commands\
  \ defined without violating release-path build-once, wrong expected lock/manifest\
  \ hash negative fixtures; (5) no new mechanism beyond these completions \u2014 workflow/job/asset\
  \ shape unchanged, the only new named surface is the build:artifact npm script wrapping\
  \ the existing AC5 builder."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `9997f07362d9fa7849c4069642019c536657ff77`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

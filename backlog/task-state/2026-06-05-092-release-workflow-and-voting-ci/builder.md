---
role: builder
task_id: 2026-06-05-092-release-workflow-and-voting-ci
last_updated: 2026-06-05T22:00:46Z
lifecycle: claimed
branch: agent/release-workflow-and-voting-ci
head_sha: ""
run_log: ""
---

## current_thesis
Claimed 092 as codex builder. Implement only the tag-triggered release workflow, CI onboarding voting flip, and packed-manifest snapshot, then hand off for review on `agent/release-workflow-and-voting-ci`.

## locked_decisions
- AC1: add a `v*`-tag release workflow that builds exactly one `npm pack` tarball from clean source, computes a SHA-256 checksum, and uploads both as the build artifact.
- AC2: validation jobs download that exact artifact on ubuntu, macOS, and Windows, verify the checksum with a Node `crypto` verifier, install the tarball, run `echoctl selftest` plus `echoctl doctor`, and publish only after validation passes.
- AC2b: add non-publishing rehearsal triggers for pull requests/feature pushes and `workflow_dispatch`; publish remains gated to a real `v*` tag.
- AC3: remove onboarding's non-voting behavior by making the existing CI workflow fail when onboarding regresses; do not modify branch-protection settings.
- AC4: add a self-contained inline-snapshot test for the sorted `npm pack --dry-run --json` manifest; do not change the `files` allowlist.
- AC5: run the specified test/lint/typecheck suite plus local/static release workflow rehearsal checks; full GitHub OS-matrix validation is post-merge/founder-owned.
- AC6: no product drift beyond release workflow, CI voting flip, manifest snapshot, and required builder lifecycle metadata.

## open_questions
- None blocking at claim time. The item's first two `spec_refs` point to `backlog/proposed/`, but both parent specs now live in `backlog/complete/`; builder will read those current item paths by id and note the stale anchors in the run log.

## dont_touch
- Do not add public distribution channels: no `npm publish`, Homebrew tap, winget, or scoop.
- Do not create the thin acceptance/distribution repo.
- Do not decide or implement stripping `assets/echo-roles/**`, `assets/echo-workflows/**`, or review-queue config from the package.
- Do not add telemetry, crash reporting, Windows Scheduled-Task autostart, or Codex-skill upstream work.
- Do not edit `wiki/`, `docs/BACKLOG.md`, or backlog item body content.

## canonical_anchors
- spec: backlog/claimed/2026-06-05-092-release-workflow-and-voting-ci.md
- reviews: backlog/reviews/2026-06-05-092-release-workflow-and-voting-ci/

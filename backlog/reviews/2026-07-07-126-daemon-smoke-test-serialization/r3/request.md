---
item_id: 2026-07-07-126-daemon-smoke-test-serialization
round: 3
spec_commit_sha: 81bf2a187e31859de4dd2141812c329110db431c
artifact_path: backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md
class: narrow
requested_at: '2026-07-07T07:34:28Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1d702eab-25c1-479d-bb09-06317f05daec
focus_hints: Verify AC1 forbids the bind-then-release check-then-use race and requires
  either daemon-binds-port-0-and-reports or a bounded retry loop with cleanup; files_to_modify
  + AC3 name raw/internal/agent-runs/2026-07-07-126-...md consistently as the run-log
  path; all changes remain test-infra only (AC4 escape hatch intact, no product/daemon
  code).
---

# What to review

Read `backlog/proposed/2026-07-07-126-daemon-smoke-test-serialization.md` at commit `81bf2a187e31859de4dd2141812c329110db431c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

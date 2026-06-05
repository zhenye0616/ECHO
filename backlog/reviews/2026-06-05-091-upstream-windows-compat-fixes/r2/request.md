---
item_id: 2026-06-05-091-upstream-windows-compat-fixes
round: 2
spec_commit_sha: f6f581d6c4fc60426d67f44a6f96a59e78509e2c
artifact_path: backlog/proposed/2026-06-05-091-upstream-windows-compat-fixes.md
class: narrow
requested_at: '2026-06-05T20:22:23Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 45ae7043-ee2f-4aee-8d01-4d0cba590b96
focus_hints: 'Verify f6f581d6: AC4 daemon.ts launchctl gated on DaemonDeps.platform
  (zero launchctl on win32) + doctor.ts no-false-fail + tests/cli/{daemon,doctor}.test.ts;
  AC3 pure resolveCommand(cmd,{platform,env,existsSync}) testable on POSIX; AC2 component-aware
  compare w/ Windows case-fold + path-boundary (C:\foo != C:\foobar), coord: untouched;
  AC5 verification-only grep. No drift beyond AC7.'
---

# What to review

Read `backlog/proposed/2026-06-05-091-upstream-windows-compat-fixes.md` at commit `f6f581d6c4fc60426d67f44a6f96a59e78509e2c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.

---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 2
reviewer: "codex-ops"
artifact_sha: "7fcb4b202523cf3e27d032926050d273c86a0a1c"
completed_at: '2026-05-16T07:15:12Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:113-118,133,158-159"
    finding: >-
      `coord_invoke` derives `tools/review-queue/run-<role>-reviewer.sh` as a relative path and the spawn contract does not set either `cwd` or `ECHO_REVIEW_QUEUE_REPO_ROOT` for the child. In production the MCP daemon may be launched from a package directory, a login shell, or launchd with a non-repo cwd; then the wrapper existence check fails before `reviewer_invoked` is written, or the wrapper starts against the wrong checkout. Because the post-push hooks are explicitly best-effort, that failure is swallowed and the active-trigger lane is silently disabled until the launchd fallback happens to pick the request. Resolve the wrapper path from a canonical repo root, set the child cwd/env to that root, and add an integration test that starts the daemon from outside the repo before calling `coord_invoke`.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:118,133"
    finding: >-
      The detached reviewer spawn leaves stdio and process lifetime semantics implicit: `spawn(..., { shell: false, detached: true, env: ... })` does not require `stdio: "ignore"`/explicit log fds or `child.unref()`. Under repeated unattended post-push hooks, the daemon can retain child pipes/process refs, and any wrapper output before its own log redirect can block on an undrained pipe; the caller then observes a bounded-timeout `coord_invoke` failure even though a child may still be running. Make the fire-and-forget contract explicit with ignored or redirected stdio plus `unref()`, and cover it with a test where the wrapper sleeps or writes early stderr while `coord_invoke` returns promptly.
---

# codex-ops review

Verdict: proceed_after_patches.

The r2 patch closes the earlier cross-spec event-shape issues, but the active-trigger path still has two production hardening gaps before it is safe to rely on at 03:00: it needs repo-root-stable wrapper spawning, and it needs explicit detached-child stdio/lifetime handling.

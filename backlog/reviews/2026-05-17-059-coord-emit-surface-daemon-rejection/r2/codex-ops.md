---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 2
reviewer: "codex-ops"
artifact_sha: "033867c910afcdbc1f9e42822b6a5fdccefef215"
completed_at: '2026-05-17T08:00:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:73-75,120-122,141"
    finding: >-
      The daemon-unreachable branch is still not operationally pinned to the quiet production behavior. AC1 says curl_rc != 0 is silent and Out of Scope #7 says the branch produces zero stderr from the wrapper, but AC3 explicitly allows raw curl stderr by forbidding only the `coord-emit.sh:` prefix. A builder can implement the obvious `body=$(curl -sS ... --write-out ...)` shape without redirecting curl stderr; the test would pass, while every daemon restart or launchd race would write `curl: (7) ...` noise into `~/Library/Logs/echo-review-queue-*.log`, reintroducing the exact daemon-down log flood R1 closed. Patch the spec to require curl stderr be captured or redirected away on `curl_rc != 0`, and make the unreachable test assert the spawned wrapper's stderr is empty for this branch.
---

# codex-ops review

Verdict: proceed_after_patches

Findings:

1. [medium] Preserve true quiet-on-unreachable behavior. The current R2 test only blocks wrapper-prefixed stderr, so raw curl diagnostics can still leak into unattended launchd logs while the suite passes. Require the implementation to suppress curl stderr on `curl_rc != 0` and assert empty stderr for that case.

Notes:

- The rejection and HTTP 500 branches are now shaped well for production observability.
- The exit-0 invariant remains correct; this finding is only about daemon-down noise control.

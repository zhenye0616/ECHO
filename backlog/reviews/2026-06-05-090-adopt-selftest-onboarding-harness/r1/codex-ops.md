---
item_id: "2026-06-05-090-adopt-selftest-onboarding-harness"
round: 1
reviewer: "codex-ops"
artifact_sha: "17c714ac1059fe9e84b5992f5ed58a67d2e0a760"
completed_at: '2026-06-05T20:03:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md — AC3/AC4"
    finding: "AC3 puts `echoctl selftest` in the Windows CI matrix while AC5 explicitly defers the Windows no-launchctl/data-dir fixes to 091. That can make the new workflow fail unattended immediately despite the stated green-main quarantine. Patch the spec to define the exact non-voting mechanism for onboarding on Windows until 091, such as `continue-on-error`, or scope onboarding to currently green OSes until the deferred fixes land."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md — AC1/AC2"
    finding: "The selftest starts daemon/MCP flows and creates throwaway HOME/ECHO_HOME/CODEX_HOME state, but the spec does not require cleanup on failure paths. Patch AC2/tests to require terminating child daemon processes and removing temp state on success, failure, and timeout, with an assertion that no selftest daemon remains listening after a failed run."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md — AC2"
    finding: "The ephemeral-port requirement allows a check-then-bind implementation, which is racy for overlapping local selftests or CI retries. Patch AC2 to require atomic port allocation, for example binding port 0 or otherwise reserving the chosen port until the daemon owns it, and add a test that parallel selftest launches do not collide or touch port 38478."
---

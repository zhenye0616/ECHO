---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 2
reviewer: "codex-ops"
artifact_sha: "94f78d887f8f9d2751444c8378c47839273c45e7"
completed_at: '2026-05-27T05:13:34Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:279"
    finding: >-
      AC3.3 still lets `echoctl daemon install` report success after `launchctl bootstrap` only verifies that the job loaded. launchd can return success while the daemon immediately crash-loops or never serves the resolved port because of a dynamic import/runtime error, DB open failure, occupied port, or bad persisted env. AC5's smoke would catch this in the test path, but an unattended production upgrade can bootout the old daemon and then print success for a broken replacement. Patch AC3.3 so install waits for the resolved daemon to answer the same MCP/doctor health probe used by status before printing success; on failure, exit non-zero with the label, port, and log-tail hint instead of treating a merely loaded LaunchAgent as healthy.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:306"
    finding: >-
      AC3.8 says every daemon verb accepts `--label`, `--plist-path`, `--log-dir`, `--home`, and `--port`, but the concrete tests only pin the install path plus the AC5 happy path for start/status/stop/uninstall. The two verbs an operator reaches for during a failed upgrade, `restart` and `logs`, are not test-pinned with non-default label/plist/log values, so a partial implementation can still bounce or tail the production `com.echo.daemon` while the smoke passes. Patch `tests/cli/daemon.test.ts` to drive restart and logs with non-default overrides and assert every launchctl/log-path operation uses the resolved test values, never the production defaults.
---

# codex-ops review

Verdict: `proceed_after_patches`.

## Findings

1. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:279`

   `install` now has useful static preflight, but success is still defined as "launchd loaded the job." That is weaker than "the packaged daemon is actually serving the resolved home and port," and launchd can load a job that immediately exits or crash-loops.

2. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:306`

   The override contract is right, but the test contract does not cover `restart` and `logs` with non-default label/plist/log values. Those are exactly the recovery verbs most likely to hurt the founder's live daemon if defaults leak.

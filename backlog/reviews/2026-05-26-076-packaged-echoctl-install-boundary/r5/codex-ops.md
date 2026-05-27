---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 5
reviewer: "codex-ops"
artifact_sha: "2df181d10a46d8de00e08bf2644b94f88a1142dd"
completed_at: '2026-05-27T05:53:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:284"
    finding: >-
      The post-bootstrap probe-timeout path exits non-zero but does not say to boot out the failed replacement job. Under KeepAlive, a crashing or unhealthy daemon can remain loaded or crash-looping after a failed install/restart; because recovery-load `start` short-circuits when the label is already loaded, the next unattended recovery command can report a no-op rather than repairing the bad job. Require the timeout path to bootout the failed label before returning, or require `start`/status to detect a loaded-but-unhealthy job and refuse the no-op with a clear recovery path.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:280"
    finding: >-
      The install path renders and writes a LaunchAgent plist with arbitrary CLI-provided paths, then bootouts the existing job before any explicit plist atomicity or validation contract. A path containing XML-significant characters, a bad string-substitution bug, or a partial write can leave `launchctl bootstrap` failing only after the working daemon has been stopped, and the persisted plist may stay corrupt for the next tick/operator attempt. Require a structured plist writer or XML escaping, write-temp-and-rename, and `plutil -lint` before bootout/bootstrap.
---

# codex-ops review

Verdict: `proceed_after_patches`.

## Findings

1. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:284`

   AC3.3/AC3.4.1 now correctly wait for a real health probe after `bootstrap`, but the failure branch leaves the newly loaded label in place. With `KeepAlive` enabled, a bad package can keep crash-looping unattended; if it is loaded-but-unhealthy, AC3.4.1's recovery-load `start` path short-circuits before preflight/probe because the label is already loaded. The spec needs one explicit operational outcome: bootout the failed replacement on probe timeout, or make `start`/status detect loaded-but-unhealthy jobs and return a recovery path instead of a no-op.

2. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:280`

   The install path writes the substituted plist and then stops the existing daemon. The spec does not require XML-safe serialization, an atomic temp-file rename, or `plutil -lint` before the bootout. At runtime, a bad path value or partial write can turn an upgrade into an outage: the old daemon is booted out, `bootstrap` rejects the invalid plist, and the persisted LaunchAgent file remains broken. Add a validation/atomic-write boundary before any `bootout`.

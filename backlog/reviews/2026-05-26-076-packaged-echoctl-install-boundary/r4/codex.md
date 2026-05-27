---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 4
reviewer: "codex"
artifact_sha: "348f81eff314baee1d29b43a1b41cc4f506639d5"
completed_at: '2026-05-27T05:39:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:298-310 and backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:345-353"
    finding: >-
      AC5.1/AC5.2 now prove production-data isolation by asserting that `echoctl daemon status $OVERRIDES` reports the test ECHO_HOME, port, data-dir, and db-path, but AC3.5's status contract still defines a single output block with only plist, binary, pid, port, uptime, and health. A builder who implements AC3.5 literally either cannot satisfy the AC5 smoke assertion or has to add undocumented fields. Patch AC3.5 to make the isolation fields part of the status output contract, especially data-dir and db-path, because the r3 conditional-mtime disposition relies on that positive proof when the production daemon is live.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:292-296 and backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:286"
    finding: >-
      AC3.4.1's restart negative-path test is internally inconsistent: a broken `INSTALLED_DAEMON_PATH` is a preflight failure that must abort before bootout/bootstrap/probe, and AC3.3 step 12 says preflight failures exit 2. The test text currently says that case is a "probe-timeout" while also saying bootout did not happen because preflight aborted first. Patch the expected shape to `preflight failure -> exit 2, recovery hint, no bootout, no bootstrap/probe`; keep the separate crash-on-start case as the post-bootstrap probe-timeout test.
---

## Findings

1. Medium - AC5.1 depends on `daemon status` reporting ECHO_HOME, data-dir, and db-path, but AC3.5's status contract omits those fields while calling the sample a single output block. This matters because the r3 fix for live-production sqlite churn relies on positive override proof from status when mtime checks are intentionally deferred.

2. Medium - AC3.4.1's broken-daemon-path restart test says "probe-timeout" even though the same sentence and AC3.3 require preflight to abort before bootout. Split the expectations cleanly: missing/broken path is a preflight exit-2/no-bootout case; preflight-clean crash is the probe-timeout case.

## Convergence Notes

The r3 dispositions are otherwise directionally sound: the coord_invoke smoke now targets a headless `codex` role with a valid payload and wrapper-not-found assertion; AC2.3 is now verification rather than mandatory sqlite churn; and the files_to_modify list no longer conflicts materially with the out-of-scope section. After the two concrete test-contract patches above, I would expect the next round to be terminal unless codex-ops finds an ops-only runtime gap.

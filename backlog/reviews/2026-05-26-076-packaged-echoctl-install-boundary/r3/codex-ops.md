---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 3
reviewer: "codex-ops"
artifact_sha: "2b018839a24c78361060fc7908e032056e85a9cb"
completed_at: '2026-05-27T05:28:46Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:367"
    finding: >-
      AC6 makes the production upgrade path `npm install -g` followed by `echoctl daemon restart`, but the new preflight and post-bootstrap MCP/doctor health wait only exist on `daemon install` in AC3.3. AC3.4 still defines `restart` as only bootout-then-bootstrap, so an unattended upgrade can boot out the working daemon, load a crash-looping replacement, and return success because launchd accepted the plist. Patch AC3.4/AC5 so `restart` (and the stopped-job `start` path used by recovery) shares the same pre-bootout runtime preflight and post-bootstrap health-probe failure semantics as `install`, or change the documented upgrade path to use the verb that has those guarantees.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:344"
    finding: >-
      AC5.1/AC5.2 require the smoke to fail if the production data dir or `echo.db` mtime/size changes, while also allowing the founder's real `com.echo.daemon` to stay loaded and keep the same PID. A live daemon can legitimately append capture events or checkpoint SQLite/WAL files during the smoke, so this safety assertion can fail even when the test daemon used only the isolated `--data-dir`/`--db-path`. Patch the contract to make production-data immutability conditional on a quiesced or absent production daemon, or replace it with an isolation proof that cannot be invalidated by normal background writes.
---

# codex-ops review

Verdict: `pushback`.

## Findings

1. high - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:367`

   The r2 health-probe disposition is present for `daemon install`, but the documented upgrade command is `daemon restart`. As written, the upgrade path can still report launchd success for a broken replacement after the old daemon has been booted out.

2. medium - `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:344`

   The production data-dir mtime/size snapshot is not stable while the real daemon remains live. Normal background ingestion can mutate the production sqlite files independently of the smoke test, turning the safety check into a flaky local gate.

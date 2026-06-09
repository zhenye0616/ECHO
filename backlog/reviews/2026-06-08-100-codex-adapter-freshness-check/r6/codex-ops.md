---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 6
reviewer: "codex-ops"
artifact_sha: "6041ebc826927099b245d8d6dd930fe861ee5ee8"
completed_at: '2026-06-09T18:05:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-100-codex-adapter-freshness-check.md:AC3"
    finding: "AC3 hard-codes remediationCommand as tools/install-echo-codex-skills.sh even though AC1 and AC5 require correct checking for non-default --namespace/--underscore-names installs. A drifted non-default install can remain drifted after the advertised remediation, causing echoctl doctor to keep reporting a degraded state with no effective operator action. Patch the spec so the reported remediation is accurate for the managed install that was actually checked, or add an explicit test proving the advertised command fixes a drifted non-default install."
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-100-codex-adapter-freshness-check.md:AC3"
    finding: "AC3 says DoctorReport.detail carries captured stdout verbatim, but AC1's check-error cases such as mktemp failure, render_skill crash, missing interpreter, or spawn failure commonly surface on stderr or as an exec exception. That can leave an unattended operator with check-error and an empty or non-actionable detail. Patch AC3 and AC5 to require stderr or the exec exception message to be preserved for check-error while keeping drift classification driven only by the exit code."
---

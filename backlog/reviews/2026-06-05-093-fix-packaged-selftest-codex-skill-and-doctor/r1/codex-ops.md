---
item_id: "2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor"
round: 1
reviewer: "codex-ops"
artifact_sha: "da47a231eacdec5670f4c8a30042348f0f836928"
completed_at: '2026-06-05T23:18:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md:AC4"
    finding: "AC4's packaged rehearsal only requires a clean install prefix, so it can still pass by reusing the operator's real HOME, existing Codex skills, existing ECHO home, or already-running daemon. Patch AC4 to require a fresh temp runtime home/codexHome/echoHome and isolated daemon state for the rehearsal, with cleanup, so WIR-06/SKILL-02/DOC-02 cannot be satisfied by preexisting developer machine state."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md:AC4"
    finding: "AC4 says to run the installed echoctl but does not require invoking the installed binary by absolute path or recording that path. In an unattended or shell-varied rehearsal, PATH/npx/npm bin behavior can accidentally exercise the repo/dev CLI instead of the tarball CLI. Patch AC4 to require executing the clean-prefix bin path directly and recording the resolved executable path in the run log."
---

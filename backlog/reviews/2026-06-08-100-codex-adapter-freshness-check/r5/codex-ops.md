---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 5
reviewer: "codex-ops"
artifact_sha: "5a9f37582f05a1122216e8dbd2f323f4c9da1899"
completed_at: '2026-06-09T17:59:42Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — install-echo-codex-skills.sh --check / AC3 — doctor integration"
    finding: "The runtime error contract is underspecified: AC3 says doctor derives status purely from the subprocess exit code and distinguishes drifted from check-error, but AC1 only requires non-zero for drift and does not reserve a separate exit code for internal check failures such as mktemp failure, unreadable temp stage, renderer crash, or shell abort. In unattended doctor runs those failures would be reported as adapter drift, sending the operator to rerun the installer even though the check itself is broken. Patch the spec to reserve explicit exit codes, for example 0 ok, 1 drift/missing managed skill/source, 2 check/runtime error, and require doctor to map them without stdout parsing."
  - severity: "medium"
    where: "AC3 — doctor integration / AC5 — unstubbed doctor test"
    finding: "The spec closes cwd and script-path hazards but not the launchd/minimal-PATH interpreter hazard. Direct execFile of an absolute .sh path can still depend on the script shebang and internal commands resolving through PATH, so an unattended doctor run with a sparse launchd environment can false-degrade or check-error even though the installer path was resolved correctly. Patch AC3 to require doctor or the script to normalize a known safe PATH, or invoke a fixed shell interpreter path, and make AC5's unstubbed minimal-PATH test cover that contract explicitly."
---

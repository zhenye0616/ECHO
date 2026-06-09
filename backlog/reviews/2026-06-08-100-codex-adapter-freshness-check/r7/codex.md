---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 7
reviewer: "codex"
artifact_sha: "0d125e903d8267a27770f347941f667f321a0054"
completed_at: '2026-06-09T18:17:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 - doctor integration / AC5 - tests"
    finding: "The spec requires doctor to resolve the installer by absolute path, but the remediation contract still advertises the bare command tools/install-echo-codex-skills.sh and AC5 requires running the exact advertised command to clear drift. If doctor is run from the non-repo cwd already required by AC5, that exact relative command can fail. Patch AC3/AC5 to require the remediationCommand to be cwd-safe, either the absolute installer path or an explicit cd-to-repo command, and run the remediation-accuracy test from a non-repo cwd."
  - severity: "medium"
    where: "AC3 - doctor integration"
    finding: "AC1 makes --check scan every managed .echo-managed dir namespace-agnostically, but AC3 defines a single codexAdapter.remediationCommand derived from the managed install. If ~/.codex contains multiple managed install families, for example default plus a custom namespace or underscore-name install, one command may not repair every drifted checked skill and doctor cannot know which family drifted from exit code alone while stdout is declared opaque. Patch AC3 to define grouping or multiple remediation commands for mixed managed installs, or explicitly constrain the check to one install family and report check-error/degraded when multiple families are present."
---

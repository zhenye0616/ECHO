---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 2
reviewer: "codex"
artifact_sha: "d6eadbab092ff18775090cbfd92dc439dfc80339"
completed_at: '2026-06-09T17:32:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Locked decisions #2 / AC1"
    finding: "The spec requires namespace-agnostic checking for installs created with --namespace and --underscore-names, while also forbidding new sentinel fields, but AC1 only says to re-render the recorded source. Patch AC1 to state exactly how --check reconstructs the original render options, for example by deriving namespace and underscore style from the managed skill directory basename before rendering, or explicitly state that SKILL.md content is independent of those options and add a non-default namespace/underscore test. Without this, valid non-default installs can false-report drift."
  - severity: "medium"
    where: "AC3 — doctor integration"
    finding: "AC3 requires a structured DoctorReport field and --json output, but does not define the field name or minimum schema. Patch AC3 to name the exact JSON field and required values, reusing the existing doctor status vocabulary, including how stale skill names, remediation command, clean state, no-managed-install state, and shell-error state are represented. Without that, the implementation and tests can satisfy incompatible JSON shapes."
---

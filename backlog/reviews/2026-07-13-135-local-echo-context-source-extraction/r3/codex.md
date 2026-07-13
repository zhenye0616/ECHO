---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 3
reviewer: "codex"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:57:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 and AC7 — parity verification"
    finding: "AC6 requires `npm run check:parity` to regenerate the inventory from source commit objects, while AC7 runs that command with all reads from `Project_echo` denied and requires source independence. No in-repository object archive is specified, so both requirements cannot pass together. Split this into an extraction-time source-object check that emits a canonical hashed inventory and a standalone check that validates the committed inventory and matrix without source access, or explicitly specify a minimal committed object archive and its boundary."
  - severity: "high"
    where: "AC1 and AC8 — publication lifecycle"
    finding: "The publication transition is not crash-recoverable: the final directory is created by rename before the migration record and lock cleanup are complete, but any existing final directory must always be refused and never adopted. A crash immediately after rename therefore strands an otherwise valid run. Name the extractor command and resume flags, define the exact phase/write/rename/report/unlock order, permit reconciliation only when item ID, source SHA, run ID, HEAD, and hashes all match, and add interruption tests immediately after rename and before report and lock completion."
  - severity: "medium"
    where: "AC3 — context-tools.v1.json schema parity"
    finding: "Schema verification is circular because the extracted manifest is the only stated schema oracle and tests compare the registry back to that same manifest. Incorrect request, response, envelope, default, cap, or annotation schemas could therefore pass. Specify the pinned source paths and canonicalization algorithm for all eight source-SHA tool definitions, record per-tool schema digests, and require an extraction-time source comparison plus standalone digest or fixture assertions."
  - severity: "medium"
    where: "AC2 — package and toolchain pinning"
    finding: "The required 'exact runtime/dev dependencies' are not enumerated or tied to a deterministic source oracle, so extra or missing direct dependencies remain untestable. The extraction also depends on Git, sandbox-exec, and a bounded-timeout mechanism, although only Node and npm receive capability checks. Add a canonical direct-dependency set with exact versions and tests, and specify the executable-resolution and capability preflight recorded for every external tool used by extraction and verification."
  - severity: "medium"
    where: "AC8 — network isolation and leak cleanup"
    finding: "Binding the service to loopback does not enforce the stated prohibition on outbound external network access, and AC7's sandbox profile only denies source-file reads. Specify the isolation profile and command that deny non-loopback networking for the service and descendants while allowing loopback, add positive loopback and negative non-loopback capability tests, and define how process-group, socket, and SQLite-handle cleanup is observed after injected startup and request failures."
---

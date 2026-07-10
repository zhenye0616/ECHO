---
item_id: "2026-07-10-132-product-module-carve-out"
round: 1
reviewer: "codex-ops"
artifact_sha: "95a6b58198e66168db8b3f4e768745c5dc176a8f"
completed_at: '2026-07-10T21:06:07Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC2"
    finding: "The product-daemon smoke test can inherit real Granola, Slack, Linear, or ECHO_HOME credentials from an unattended host and start live integrations. Patch AC2 to require a sanitized test environment with external workers mocked or disabled, no network side effects, and a bounded shutdown or kill timeout so CI cannot silently call real services or hang."
  - severity: "medium"
    where: "Acceptance Criteria / AC6"
    finding: "The packaging contract says the tarball file set is identical modulo path prefixes and nothing newly shipped, but the spec also adds src/product/daemon.ts, src/product/index.ts, and src/cli/commands/product.ts. Patch AC6 to enumerate those as allowed new shipped files, require dist/product/** plus the product CLI command file in the packed manifest, and require the packed CLI can resolve echoctl product daemon."
---

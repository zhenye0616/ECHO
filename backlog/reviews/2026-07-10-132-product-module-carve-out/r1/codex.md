---
item_id: "2026-07-10-132-product-module-carve-out"
round: 1
reviewer: "codex"
artifact_sha: "95a6b58198e66168db8b3f4e768745c5dc176a8f"
completed_at: '2026-07-10T21:09:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC1"
    finding: "AC1 says the modules listed in spec_refs relocate under src/product/**, but spec_refs also includes explicit STAYS files and config files such as src/enrich/dispatch.ts, src/enrich/worker-heartbeat.ts, src/normalize/adapters/granola.ts, eslint.config.js, vitest.product.config.ts, package.json, and .github/workflows/ci.yml. Patch AC1 to enumerate the exact source files/directories that move, excluding kernel/config files that must stay."
  - severity: "medium"
    where: "files_to_modify / AC5"
    finding: "AC5 requires adding a pinning comment to vitest.product.config.ts, but files_to_modify does not allow modifying that file. Add vitest.product.config.ts to files_to_modify or remove the required config edit."
  - severity: "medium"
    where: "Acceptance Criteria / AC6"
    finding: "AC6 requires the packed tarball file set to be identical modulo path prefixes and says nothing newly shipped, but AC2 and files_to_modify add new shipped artifacts such as the product daemon, product index, and product CLI command. Patch AC6 to define the expected manifest diff as moved paths plus those deliberate new composition-root/CLI files, or change the CLI/composition-root requirements."
---

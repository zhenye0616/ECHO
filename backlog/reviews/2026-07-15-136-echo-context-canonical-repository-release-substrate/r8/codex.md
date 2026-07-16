---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 8
reviewer: "codex"
artifact_sha: "2198e9dffb7c70e2ca188bcc530bdf3a161d742c"
completed_at: '2026-07-16T04:53:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Frontmatter files_to_modify; AC2; AC3"
    finding: "The scope calls for a regenerated runtime inventory and names the existing provenance/runtime-inventory.v1.json, while AC2 requires all item-135 provenance bytes to remain immutable. Because AC3 adds executable files and requires current inventory validation, overwriting v1 violates the freeze while retaining it risks validating stale data. Name a successor inventory path such as provenance/runtime-inventory.v2.json, require v1 byte identity, and specify that verify:inventory, its generator, and relevant tests consume the successor inventory."
  - severity: "medium"
    where: "AC3 release-mode argument contract; Tests"
    finding: "Release mode requires --source-sha and --version, but verify:artifact's exact CLI cannot receive them and the negative-test contract never proves incorrect values fail. The approved manifest hash authenticates the manifest but otherwise permits these required arguments to be ignored. Require fresh-clone-acceptance.sh to compare both values with the checked-out Git/package identity and authenticated manifest, with wrong-source and wrong-version fixtures, or remove the redundant arguments and derive them exclusively from the authenticated manifest."
---

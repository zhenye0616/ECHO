---
item_id: "2026-07-13-132-product-graduation-foundation"
round: 3
reviewer: "codex-ops"
artifact_sha: "9029abd4ad649d0cd47011c15f1fe50670f36fea"
completed_at: '2026-07-13T09:40:33Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC2 — Product runtime owns only the wedge and fails closed"
    finding: "The mount classifier requires component-aware matching but does not require selecting the most-specific matching mount. Because `/` always matches and macOS commonly lists it before nested mounts, a first-match implementation can classify an SMB/NFS state path as local APFS and allow `run`. Require longest/deepest component-match selection independent of mount-table order, with `/` used only as the fallback, and add fixtures where APFS `/` precedes a nested network mount and the nested mount wins."
  - severity: "high"
    where: "AC4 and AC5 — ci.yml product-suite invocation and packaged-product artifact input"
    finding: "The ordinary `ci.yml` quality job must run all of `test:product`, but the spec only prepares offline dependencies there. `packaged-product.test.ts` may scratch-build only locally and, in CI, requires an already-built `ECHO_PRODUCT_ARTIFACT_DIR`; only the separate qualification workflow currently creates that directory. Require `ci.yml` to build one non-qualification lineage from its checked-out SHA with the pinned full Node runtime, export that directory before `test:product`, and ensure the test consumes it without packing."
---

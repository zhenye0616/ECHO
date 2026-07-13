---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 3
reviewer: "codex-ops"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:53:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 phase lifecycle; AC5 dirty-tree gate; AC8 clean handoff"
    finding: "The repository-owned `.echo-extraction.json` changes through `published`, while artifact building rejects repository dirtiness and AC8 requires a clean final HEAD. Specify the marker as an exact ignored control-plane exception or relocate it outside the candidate tree, and test that every phase transition leaves the recorded candidate HEAD and final porcelain status unchanged."
  - severity: "high"
    where: "AC1 extraction lock; AC5 build-artifact lock; AC7 verification sequence"
    finding: "The extractor holds the extraction lock until publication, but `npm run build:artifact` reacquires that same lock during pre-publication verification, creating a self-deadlock or unsafe implicit lock bypass. Use a separate build lock or define nonce-bound child reentrancy that rejects unrelated processes and remains usable after publication."
  - severity: "high"
    where: "AC1 named-run resume contract"
    finding: "Matching item ID and source SHA is insufficient for safe resume because a second process can name the active run and race the live owner. Require proof that the recorded PID and process-start identity are no longer live, followed by atomic nonce-based ownership transfer, and test concurrent resume against both live and stale owners."
  - severity: "medium"
    where: "AC1 atomic staging-to-final publication"
    finding: "An initial destination check followed later by ordinary directory rename has a target-creation race and can replace an empty foreign `echo-brain` directory on macOS. Require a no-replace publication primitive or equivalent parent-locked compare-and-publish operation, with a test that creates the target immediately before publication and proves neither path is deleted or adopted."
  - severity: "medium"
    where: "AC1 retry lifecycle; AC5 artifact overwrite refusal; AC7 verification"
    finding: "A crash after artifact emission but before the broad verification phase advances leaves an output that `build-artifact` refuses to overwrite, so the explicitly resumable run cannot complete. Add durable per-command checkpoints and exact-hash reuse, or run-scoped outputs with atomic promotion, and test interruption immediately after artifact creation."
---

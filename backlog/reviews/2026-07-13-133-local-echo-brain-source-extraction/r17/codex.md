---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 17
reviewer: "codex"
artifact_sha: "e1115daee4ad389bca1bed9b10a43e76df534c19"
completed_at: '2026-07-14T04:40:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC5 and AC7 — lifecycle sandbox/source-independence contract"
    finding: "The mandated allow-default, deny-network sandbox leaves filesystem access to Project_echo and sibling paths intact, so it cannot prove that B0/B1/B2/R1 run without Project_echo access or that only the operator audit receives source access. Define a non-audit profile that denies reads and writes through canonical and symlinked source/sibling paths, verify those denials with probes, and give only the operator audit a separate narrowly scoped read-only source-object profile."
  - severity: "medium"
    where: "AC5 — offline deny-network effectiveness"
    finding: "A failed DNS or direct-IP probe does not establish that sandbox-exec caused the failure; an offline host, unreachable endpoint, or defective probe also passes. Require one exact wrapper and recorded profile for every lifecycle command, prove a deterministic local TCP control succeeds outside that wrapper and fails inside it with the expected denial, and retain external probes only as supplemental checks."
  - severity: "medium"
    where: "AC5 — isolated cache fill and B0/B1/B2/R1"
    finding: "The spec neither defines the cache-fill command and redirect/admission algorithm nor isolates npm caches per run; distinct output roots still permit a shared mutable cache to make later runs depend on earlier runs, while exact URL/integrity admission remains unproven. Specify an initially absent cache-seed build with exact flags, observed-fetch set equality and SRI verification, hash and seal that seed, then provision distinct B0/B1/B2/R1 cache roots and verify their pre/post manifests."
  - severity: "medium"
    where: "AC8 — independent review-record child commit"
    finding: "The Project_echo child-commit path lacks the hermetic Git and tree-delta controls required elsewhere, and checking out the feature branch in another linked worktree can fail while the builder worktree retains it. Require a sanitized detached worktree at the exact builder OID, clean-state and hook/signing/include suppression, literal addition of only the review-record path, verification of the sole parent and exact one-file tree delta, an explicit child-OID push with the exact expected-old lease, and remote-ref readback."
  - severity: "medium"
    where: "AC2 and AC4 — dependency-edge partition"
    finding: "AC2 permits locked bare npm imports while AC4 rejects imports leaving the repository, and the exhaustive edge partition does not explicitly classify Node built-ins. Limit AC4 escape rejection to repository-local path-like edges, state that locked bare imports and package CLIs are validated by AC2, add a pinned-Node class for node: built-ins, and cover each class with pass/fail fixtures."
  - severity: "medium"
    where: "AC1 source launcher and AC7 Git operations"
    finding: "AC1's sole launcher literally includes --git-dir=<project-git-dir>, but AC7 applies the same envelope to target init/add/commit and clone/checkout operations, for which that repository argument is invalid or dangerous. Separate the common sanitized environment from exact source-object, target-worktree, and clone command wrappers, with explicit repository and work-tree operands and tests proving that no command addresses the wrong repository."
---

---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 4
reviewer: "codex"
artifact_sha: "fa7b3a03ad11e39c0ea89fb252dac52bcf6790ad"
completed_at: '2026-07-13T22:15:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — stale-lock quarantine and resume ownership transfer"
    finding: "The lifecycle contract requires `resume` to receive the stale owner's nonce, but requires that owner to be quarantined before the run continues under a new nonce; it never assigns which command acquires the replacement lock, how the new nonce is returned or supplied, or how quarantine plus replacement acquisition is serialized. Specify the exact flags, outputs, and atomic transition, then test two concurrent quarantiners/resumers and the mkdir-before-owner state to prove only one new owner can execute children."
  - severity: "high"
    where: "AC3 — transactional coordination idempotency"
    finding: "`ON CONFLICT(idempotency_key)` returns the original result without requiring the retry to contain the same operation and payload, so accidental key reuse can silently alias a different coordination command. Persist a canonical request fingerprint with the event, compare it inside the same transaction, return the original result only for an exact match, reject mismatches without changing event or projection state, and add concurrent same-key/different-payload tests."
  - severity: "medium"
    where: "AC2 — source-plan and dependency-set closure"
    finding: "The prescribed closure classifies transitive imports and derives npm dependencies from bare imports, but it does not classify runtime file reads, sourced shell files, package-script executables, or child-process binaries. A standalone candidate can therefore pass both checkers while retaining an undeclared Project_echo path or host-tool dependency. Define and test closure rules for those runtime edges, binding npm-provided executables to exact packages and system executables to the capability preflight or an explicit rewrite/exclusion."
  - severity: "medium"
    where: "AC8 — verify-handoff identity binding"
    finding: "`verify-handoff --record` has no independently supplied or sealed expected run identity, so a stale or substituted record and candidate that agree with each other can satisfy the listed checks. Bind verification to the expected item ID, source SHA, and run ID from trusted orchestrator state or explicit CLI flags, compare those values across the migration record, published state, and committed candidate provenance, and test wrong-run and stale-record rejection."
---

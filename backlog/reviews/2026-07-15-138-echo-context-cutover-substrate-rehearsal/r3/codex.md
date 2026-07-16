---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 3
reviewer: "codex"
artifact_sha: "9c37bd8c9a2b7bc577269e0637f3e515de1da34a"
completed_at: '2026-07-16T03:04:26Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1, AC5, and Tests"
    finding: "The requested command split remains non-executable: `rehearse` has no owning executable or package-script path, candidate build/verify entrypoints are only directory globs, and the Codex skill-render dry run lacks its literal command and flags. Name every command, working directory, input, output directory, and permitted side effects; add byte-reproducibility and extracted-archive checks proving no live flag, override environment variable, or real service adapter ships."
  - severity: "high"
    where: "AC1 — mutation guard and replay contract"
    finding: "The sole mutation command requires a new root even though crash replay must reopen an existing transaction root, and the requirement to persist every guard rejection inside that root is unsafe when the root itself is forbidden, symlinked, raced, existing, or unwritable. Define separate initialize/resume semantics, descriptor-relative no-follow root validation, transaction binding, same-root exclusion, and a safe evidence sink for failures before root trust is established; add table-driven nonzero-exit, redaction, and durable-record tests."
  - severity: "high"
    where: "AC1 and AC2 — phase commit and old-full authority fence"
    finding: "A pre-open authority check is not serialized with controller transitions: old-full can observe absent or rolled_back, pause, then continue to PID, database, or socket mutation after the controller commits prepared or active. Require a shared cross-process lock, lease, or compare-and-swap protocol used by both startup and phase transitions, with the decision rechecked while held, and add barrier-controlled concurrent-start-versus-activation tests for every supported start path."
  - severity: "high"
    where: "AC5 and AC8 — operational preflight, landing, and readback"
    finding: "The gate does not identify exact fetched remote refs, commands, ownership, or rechecks that prevent HEAD or remote movement, and the Project_echo migration record cannot embed its own non-fast-forward landing commit SHA in the commit being landed. Specify the complete ordered protocol and abort conditions, including fresh fetches, exact status and merge-state checks, reviewed head/tree comparisons, target landing/readback, Project source landing/readback, and a distinct evidence-only commit that records the source landing SHA and its own evidence SHA; state which SHA item 139 pins."
  - severity: "high"
    where: "AC3 and AC7 — rollback and recutover W/C cuts"
    finding: "The W/C high-water exports are not atomically coupled to writer quiescence and the authority flip, so a context or coordination write can land after its snapshot but before transition and be absent from both restored authorities. Require a shared writer-freeze or transactional-cut protocol, final under-lock high-water verification, outbox drain/reconciliation rules, and race tests at each rollback and recutover cut/flip boundary."
---

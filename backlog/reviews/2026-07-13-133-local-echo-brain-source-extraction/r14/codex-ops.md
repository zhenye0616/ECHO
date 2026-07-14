---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 14
reviewer: "codex-ops"
artifact_sha: "58870d8c6dca1ed230cd3af8f9262cd36bc1087c"
completed_at: '2026-07-14T02:49:38Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC8 — handoff commit and attempt sealing"
    finding: "The required sequence is cyclic: the migration record is committed before the sole push but must contain the final attempt-seal digest, while that seal covers every descendant and the push must subsequently add intent, result, and stream evidence under AC5. The digest cannot be known when the migration record is committed, and sealing first would prohibit the mandated push-ledger writes. Define a non-cyclic handoff, such as sealing builder evidence before the Project_echo commit and binding push evidence in a separate post-seal root, or permitting a later commit that records the post-push seal."
  - severity: "high"
    where: "AC5 and AC7 — publisher bootstrap"
    finding: "The bootstrap is not implementable as specified: Node core exposes no descriptor-relative openat API, yet bootstrap-publisher.mjs must perform openat publication before the native evidence-publish helper exists. The artifact also leaves the initial creation and authentication of bootstrap-publisher.mjs, evidence-publish.c, and process-watch undefined, while the every-command-through-process-watch rule creates a bootstrap recursion. Specify a finite trusted bootstrap using an already available hash-pinned native helper or an explicit, implementable bootstrap exception, including source creation, verification, modes, command boundaries, and durable failure evidence."
  - severity: "high"
    where: "AC7 and AC8 — retained installs, tool-bin, and attempt seal"
    finding: "The retained attempt cannot satisfy the seal contract. AC7 requires tool-bin links and npm-created package .bin entries, which are normally symlinks on macOS, while AC5 requires clones and installs to remain and AC8 rejects every symlink with no deletion exception for them. Define a sealable representation—such as audited descriptor-contained symlinks included in the seal, or regular hash-verified shims plus an npm installation mode that creates no links—and add a fixture proving the complete retained dependency trees pass final sealing."
  - severity: "high"
    where: "AC5 — all-exit process quiescence"
    finding: "Polling KERN_PROC_ALL tracks only observed descendants and cannot prove all-exit quiescence: a child can fork, create a new session, reparent, and escape between polls while holding no attempt-root writer or network listener. The required hostile fixture covers only escaped children retaining a writer or listener, so a detached sleeper can survive silently after a successful command. Add kernel-enforced lifecycle containment or another race-free termination contract, and require a detached no-FD/no-listener fixture that proves no process survives before a result is accepted."
  - severity: "medium"
    where: "AC5 and AC7 — verification namespace roster"
    finding: "The canonical plan roster is not machine-checkable from the artifact: AC5 lists conceptual checks without stable row IDs, order, kinds, or repetition mappings; AC7's kind enum has no fetch/install kind even though fetch must be the sole online operation; and hostile repeating the target-check roster is ambiguous about fetch. Add an explicit schema-enforced table mapping every stable row to kind, namespace, repetition, network policy, cache/install/output roots, and order, with fixtures proving fetch occurs exactly once online and every later namespace remains offline and isolated."
---

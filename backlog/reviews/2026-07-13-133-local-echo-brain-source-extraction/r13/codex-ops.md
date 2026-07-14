---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 13
reviewer: "codex-ops"
artifact_sha: "69a11b2c6780b759f15ef2944aeb31d0e048793d"
completed_at: '2026-07-14T02:16:10Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC5 evidence-publisher bootstrap / AC8 failure durability"
    finding: "The trust-root publisher is compiled before ledger coverage, but pinned clang has no absolute path/version/hash or hermetic bootstrap envelope, and failure is emitted only to stderr. This can leave an attempt root without a durable terminal cause. Pin the compiler and SDK inputs, run compilation with an explicit minimal environment, timeout, and process cleanup, and write create-once fsynced bootstrap intent, raw streams, and result using primitives independent of the publisher; alternatively provision a prebuilt hash-pinned publisher."
  - severity: "high"
    where: "AC5 command lifecycle / AC1 interrupted-target recovery"
    finding: "Command intent records no PID, PGID, SID, or process-start token, so after a wrapper crash and missing result the operator cannot safely identify the prior process group or exclude PID reuse. A descendant can also call setsid or double-fork and escape group TERM/KILL, while the descendant/listener/open-writer checks have no exact algorithm or pinned implementation. Require a create-once fsynced started record published through a pre-exec barrier, define an exact macOS containment and quiescence procedure run after every exit including exit 0, and add a fixture that detaches, closes its streams, and retains a writer or listener."
  - severity: "high"
    where: "AC5 no-replace publication / AC8 builder-attempt sealing"
    finding: "The publication contract fsyncs the directory before removing the temporary hard link but omits the second directory fsync, conflicts with the later rule that nothing beneath the attempt root is deleted, and does not define how writable evidence becomes read-only. AC8 then asks reviewers to bind an undefined builder-attempt hash. Specify the complete crash-safe state machine, including the narrow temp-removal exception, final inode sealing and writable-descriptor closure, both directory fsyncs, and rejection of leftover temps. Publish a canonical self-excluding attempt-seal manifest covering path, type, mode, and content hash, then define the final-write boundary and recursive sealing procedure that reviewers must recompute."
  - severity: "medium"
    where: "AC7 verification roster / AC1 clean-target requirement"
    finding: "git fsck and git diff-tree inspect committed objects, and clean private clones do not prove that the shared target lacks dirty, untracked, or ignored files. The shared target can therefore violate AC1's clean accepted state while every listed check passes. Add ledgered shared-target index/worktree status plus a filesystem-versus-HEAD enumeration before and after verification, with explicit treatment of .git and ignored paths, and require an untracked nested-file fixture to fail."
  - severity: "high"
    where: "AC8 exact handoff commit and sole push"
    finding: "No machine-enforced index/worktree gate proves that the handoff commit contains only authorized paths, and the absent-ref force-with-lease does not itself bind the pushed source to handoff.intent's exact commit. Require the expected parent SHA, a clean pre-mutation baseline, an exact staged-path/tree-diff allowlist, and a clean post-commit worktree. Push the literal recorded OID as <handoff-sha>:<fully-qualified-destination-ref> to one resolved and hashed remote, disable hooks and config-derived extra refs or push options, parse porcelain output, and accept only that exact SHA/ref update."
  - severity: "medium"
    where: "AC8 independent reviewer evidence"
    finding: "Reviewer roots are only described as create-new mode 0700 and do not inherit AC1's no-follow parent-chain and tuple-stability checks. Their metadata also omits the item, round, request correlation, and artifact SHA, so repeated reviews of the same target cannot be tied unambiguously to the queue request. Require every reviewer to revalidate and record the complete parent chain, create its root descriptor-relatively, bind immutable request identity plus the canonical builder-attempt seal, and use a hash-verified publisher and runner without writing the builder root."
---

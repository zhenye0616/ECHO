---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 3
reviewer: "codex"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:55:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — Create one local echo-loop Git repository with no remote"
    finding: "Publication is not crash-safe as specified. Renaming staging to `echo-loop` and then recording phase `published` cannot be atomic; a crash between those operations leaves an existing target that the stated recovery rules must refuse rather than adopt. The location of `.echo-extraction.json` is also unspecified, and placing it inside the candidate would make the required post-publication phase update dirty the committed repository. Define the marker location outside the candidate, the exact rename/reconciliation sequence, durability steps, and a narrowly scoped recovery rule that recognizes only the locked run's matching target identity and HEAD."
  - severity: "medium"
    where: "files_to_modify and AC1/AC7 extraction lifecycle"
    finding: "The spec repeatedly requires an extractor but names no committed entrypoint, invocation contract, or allowed source-repository path that can implement it. The target repository cannot supply the program that must safely create that repository, and inline operator commands would make the failpoint/resume tests non-reproducible. Add a concrete extractor script path to `files_to_modify` and specify its required arguments, explicit resume flag, failpoint interface, exit codes, state-file paths, and cleanup ownership."
  - severity: "medium"
    where: "AC3 — Split orchestration MCP/coord surfaces from context retrieval"
    finding: "The SQLite atomicity contract does not say whether event insertion and the associated role/deadline projection update occur in one transaction. Separate explicit transactions can expose an immutable event without its state update after a crash, while retrying can duplicate logical work despite unique event IDs. Specify the transaction boundary, stable caller-supplied idempotency key and `ON CONFLICT` result, connection-level PRAGMAs, bounded `SQLITE_BUSY` retry behavior, and assertions proving a retry returns the original sequence without reapplying the projection."
  - severity: "medium"
    where: "AC2 — Give echo-loop accurate orchestration ownership"
    finding: "The requirement for exact runtime/dev dependencies is not falsifiable because the expected package names and versions, or a deterministic rule for deriving them, are absent. The same section leaves the extraction source set to implementer judgment despite requiring protocol-only ownership. Add an explicit dependency allowlist with pinned versions and a source-path/disposition manifest or deterministic classification rule, then require tests to reject undeclared dependencies and source paths."
  - severity: "medium"
    where: "AC8 — Stop before installation or authority transfer"
    finding: "The independent-review handoff relies on a mutable absolute-path repository that is not part of the orchestrator branch, but no reviewer-owned verification command or immutable handoff contract is defined. Specify the command and owner that validate candidate path, object existence, HEAD, tree/provenance hashes, cleanliness, branch, and absence of remotes before review begins, plus the exact blocking behavior when any value differs from the migration record."
---

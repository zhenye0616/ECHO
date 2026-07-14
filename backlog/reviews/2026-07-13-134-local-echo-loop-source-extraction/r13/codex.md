---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 13
reviewer: "codex"
artifact_sha: "69a11b2c6780b759f15ef2944aeb31d0e048793d"
completed_at: '2026-07-14T02:20:19Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3 — invokeRole reservation and publication keys"
    finding: "Distinct invocation keys may share a correlationId, but event deduplication uses (actor, kind, correlationId) while publication is described as keyed by invocationId. Define the persisted event identity and mapping so different role/taskId invocations cannot collide, and add concurrent fixtures sharing one correlationId across different tasks and roles."
  - severity: "high"
    where: "AC3 — PENDING outbox recovery"
    finding: "The reservation and publisher transactions are specified, but no production entrypoint owns draining PENDING rows after a crash, while schedulers are out of scope. Define the synchronous publish attempt and deterministic API or CLI recovery trigger, then prove death-after-reservation recovery solely through that public surface."
  - severity: "medium"
    where: "AC3 — create-new SQLite initialization"
    finding: "Publishing only the main SQLite file with linkat is unsafe unless initialization excludes or drains WAL and rollback sidecars. Require the connection to checkpoint as applicable, close, prove sidecar absence, fsync in a specified order, and reopen-validate the linked database; add crash fixtures around link and directory fsync."
  - severity: "medium"
    where: "AC2 — fixed-point exact-path Git lookup"
    finding: "The prescribed git ls-tree command still treats <exact-path> as a pathspec, so repository names containing glob metacharacters can resolve ambiguously. Require --literal-pathspecs or GIT_LITERAL_PATHSPECS=1 for inventory and edge lookups, with a fixture containing [, ], *, or ? in a path."
  - severity: "medium"
    where: "AC2 — dependency-plan reconciliation"
    finding: "The source-universe resolver does not explicitly cover rewritten destinations or authored/generated target files, which can introduce imports and package CLIs absent from the source closure. Require check:dependencies to resolve the final committed target tree and reconcile every resulting edge to dependency-plan.v1.json, with target-only and rewritten-file fixtures."
  - severity: "medium"
    where: "AC7 — direct and npm verifier command contract"
    finding: "Neither verifier argv pins the detached clone as cwd or supplies npm --prefix, so npm may select the wrong package.json and relative verifier paths may resolve outside the clone. Specify cwd or --prefix for both routes, allocate distinct absent --out paths because EEXIST must fail, and define the exact result schema and comparison between those outputs."
---

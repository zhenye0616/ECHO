---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 7
reviewer: "codex-ops"
artifact_sha: "a4a4e1255143c8338bcfcfa123c0f59d5d7b1582"
completed_at: '2026-07-13T23:26:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 - initialized-directory election"
    finding: "The pre-claim directory name is derived solely from the caller-supplied run ID, but ownership when two invocations use the same ID is unspecified. Require exclusive creation with a durable per-attempt owner token or nonce; an existing path must be preserved and refused as foreign, never initialized or archived by the second invocation. Add a same-run-ID concurrency test."
  - severity: "high"
    where: "AC1 gated external commands and AC7 hard-kill survivor handling"
    finding: "The registered PID/start/executable identity does not prove the complete command process set is quiescent. If the gate runner execs the command, its executable changes and the stated mismatch rule can classify the live command as quiescent; if the group leader exits, an npm descendant can remain alive. Require a stable resident supervisor or equivalent post-exec handshake, durable tracking of the complete process set, and an immediate liveness recheck before whole-claim RENAME_EXCL. Test both exec transition and dead-leader/live-child cases."
  - severity: "high"
    where: "AC1 target publication and PUBLISHED derivation"
    finding: "A crash after target rename but before destination-parent fsync lets read-only status derive PUBLISHED without evidence that the directory entry was durable. Conversely, a recorded fsync error leaves an exact target present while discard is forbidden, with no recovery operation. Add a durable publication phase and an idempotent mutating resume/reconcile path that validates the no-follow target identity and retries parent fsync before PUBLISHED or handoff; cover every rename/fsync/error-persistence boundary with failpoints."
  - severity: "high"
    where: "AC1 publish-record crash recovery"
    finding: "publish-record copies the record into the bound worktree before the ref CAS, but explicit rerun recovery covers only the post-CAS index window. A crash after the copy, temporary-index tree creation, or commit-tree can leave the old ref plus expected dirty record bytes and permanently strand the published run. Specify durable phases and idempotent recovery for every pre-CAS and post-CAS boundary, accepting only the exact record bytes and exact derived commit, with failpoint tests."
  - severity: "high"
    where: "AC1 publish-record index and worktree coordination"
    finding: "The clean-tree check occurs before CAS while the bound index lock is acquired only for the later index update. A concurrent git add can therefore occur after validation and be overwritten when the bound index is replaced. Hold an exclusive per-worktree/index transaction lock across validation, record placement, CAS, and index installation, or revalidate a bound index identity before CAS and refuse replacement after drift. Add concurrent index mutation and ref-update tests."
---

---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 3
reviewer: "codex-ops"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:55:04Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — atomic publication and recovery"
    finding: "A normal rename is not a no-clobber publication primitive: a target created after the preflight check can be replaced if it is an empty directory. A crash after rename but before the published marker or migration record also leaves a valid matching target that every resume must refuse. Require an atomic no-replace operation, fsync ordering, and a reconcile-only recovery path that verifies run ID, item ID, source SHA, HEAD, provenance, cleanliness, and absence of remotes before completing publication; test the competing-target race and every post-verification publication boundary."
  - severity: "high"
    where: "AC1 — extraction lock acquisition"
    finding: "Creating the lock before writing owner.json leaves an unrecoverable ownerless lock when the process dies in that window, because unknown locks may never be adopted or deleted and no recovery marker yet exists. Require atomic visibility of complete owner metadata or a concrete operator-only quarantine/recovery command with durable diagnostics, and inject a crash between lock creation and owner publication."
  - severity: "medium"
    where: "AC1, AC8, and Tests — concrete operator entrypoints and local-review handoff"
    finding: "The spec does not name the extractor, its start/resume/status commands, the location of lifecycle state, or a read-only candidate-verification command. The migration record alone therefore does not give an independent reviewer a deterministic way to validate the unpushed local repository. Name concrete script paths and CLI syntax, define exit codes and stdout/stderr evidence, and require the handoff verifier to compare the recorded HEAD and provenance hash with the clean, remote-free candidate."
  - severity: "medium"
    where: "AC3 — SQLite first-start concurrency and failure evidence"
    finding: "Writer-race coverage assumes usable coordination storage but does not specify simultaneous first-start behavior for a missing ECHO_LOOP_HOME directory, database, and schema. Define fail-closed validation of ECHO_LOOP_HOME, race-safe directory and schema initialization, application of WAL/foreign_keys/busy_timeout on every connection, bounded busy handling, and durable operator-visible diagnostics for busy, corrupt, and migration failures; test two processes opening an absent store concurrently."
  - severity: "medium"
    where: "AC7 — sandboxed verification"
    finding: "Denying reads only below Project_echo does not prevent npm lifecycle scripts or tests from writing elsewhere on the host, so external_projects_mutated:false is not established. Make the sandbox default-deny for writes outside the candidate and declared scratch locations, state the network policy explicitly, and add adversarial checks proving an external write and source read both fail while required candidate and scratch writes succeed."
---

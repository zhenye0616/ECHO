---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 7
reviewer: "codex"
artifact_sha: "a4a4e1255143c8338bcfcfa123c0f59d5d7b1582"
completed_at: '2026-07-13T23:33:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — run-ID-derived staging and archive paths; AC8 — --expected-run-id"
    finding: "Operator-supplied run IDs are interpolated into filesystem paths without a grammar or length bound, permitting traversal components, separators, control characters, or overlong names before AC8's no-symlink verification applies. Define strict bounded ASCII validation before any filesystem access, construct paths relative to verified no-symlink directory descriptors, and test empty, traversal, Unicode, control-character, and overlong IDs."
  - severity: "high"
    where: "AC1 — claim election, whole-claim discard, and target publication renames"
    finding: "Each prescribed RENAME_EXCL operation crosses directories, but the contract requires only singular parent fsync. Durability requires both source and destination parent directories to be fsynced after a successful rename. Specify anchored parent directory descriptors, both fsyncs and their failure recovery, and failpoint tests after rename and after each parent fsync."
  - severity: "high"
    where: "AC1 — child-group identity and quiescence before discard"
    finding: "A recorded group leader can exit while descendants remain alive in the same PGID, so leader PID/start/executable mismatch does not prove whole-group quiescence and PGID reuse is undefined. Specify a race-safe macOS identity and whole-group-empty mechanism, conservatively block discard when emptiness cannot be proven, pin any required helper in files_to_modify and the runtime closure, and test surviving descendants plus PID and PGID reuse."
  - severity: "high"
    where: "AC1 — publish-record expected-old-SHA CAS and post-CAS repair"
    finding: "After update-ref succeeds, the checked-out worktree and index still represent the parent, while the spec describes repairing only the index and does not define a durable exact-child anchor. Require immediate target/candidate revalidation before initial CAS and retry, define exact-child identity, and prescribe crash-recoverable repair of both the record file and owned index with unrelated-dirty refusal. Add concurrent-publisher and kill-barrier tests across commit creation, CAS, worktree write, index replacement, and clean verification."
  - severity: "high"
    where: "AC3 — initialization after schema commit and before intent-marker retirement"
    finding: "A crash after committing the schema but before unlinking and durably fsyncing the O_EXCL intent marker leaves an initialized database with a dead-owner marker, a state not covered by either live-owner waiting or dead-owner/uninitialized-schema conversion. Define validated recovery that rechecks the exact marker and schema, retires the marker without rerunning migration or emitting a false stale-init diagnostic, handles concurrent ENOENT, fsyncs the parent, and tests crashes before and after unlink."
  - severity: "medium"
    where: "AC5 tests/task-state/:1 and AC7 tests/migration/source-independence.test.ts:1"
    finding: "These relative paths resolve inside Project_echo and contradict files_to_modify, while the Tests section identifies the intended files beneath /Users/zhenye/Desktop/echo-loop. Change both acceptance-criterion paths to their absolute echo-loop destinations so implementation ownership and test locations agree."
---

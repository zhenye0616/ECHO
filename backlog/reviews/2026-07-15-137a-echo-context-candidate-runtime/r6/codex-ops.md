---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 6
reviewer: "codex-ops"
artifact_sha: "f067fe199a686727f51048003ec19161baf39cad"
completed_at: '2026-07-17T23:07:34Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC4 — third proof runner and proof-control lifecycle"
    finding: "The third runner is essential but has no exact checked-in entrypoint, command, environment, cwd, FD map, deadline, or durable evidence contract, while EOF and EPIPE behavior on its outer-control and record pipes is undefined. A runner failure after RUN can leave the outer holding the inner/runtime liveness chain, listener, and lease indefinitely. Define the runner, make parent-pipe loss phase-safe, persist redacted failure evidence, and test runner loss before RUN, before ready, and after ready with bounded absence and no retry."
  - severity: "high"
    where: "AC4 — continuous nettop observer"
    finding: "The continuous `nettop -L 0` helper has no explicit owner, bounded stop/reap mechanism, output cap, or cleanup absence criterion, while the blanket ban on `ChildProcess.kill` removes the usual recovery path. Normal completion or either fault path can hang the proof or orphan the observer. Require a self-terminating observation design or narrowly scoped handle-safe shutdown, with capped draining, one deadline, EOF/close proof, and operator-visible failure evidence."
  - severity: "high"
    where: "AC4 — clean checkout and production dependency staging"
    finding: "`git status --porcelain` does not attest ignored dependency directories, yet executable JavaScript and native dependencies are copied from an undefined prepared workspace. A fresh clone has no such closure, and the generated inventory merely blesses whatever bytes were copied. Define an exact fresh dependency producer, absolute tooling and environment, lock/integrity and extraneous-file validation, and an immutable identity-bound handoff that is revalidated through publication and the post-landing proof."
  - severity: "high"
    where: "AC5 — target-main and Project_echo landing"
    finding: "The authorization binds reviewed new heads but does not require an immediately-before-push comparison against exact expected remote-main SHAs or forbid rebase, merge, autostash, force, and mutation-bearing push retries. Upstream movement can invalidate the reviewed operation. Bind both old and new refs, refetch immediately before one fast-forward compare-and-swap push, fail on any movement, and require exact canonical SHA/tree readback before proceeding."
  - severity: "medium"
    where: "AC4 — work/evidence/candidate.sb verification and execution"
    finding: "The sandbox policy remains writable under `work/evidence`, and hashing it before `sandbox-exec -f` leaves a check/use interval in which the pathname can be replaced or rewritten before sandbox-exec reopens it. Assign its generator and provide an identity-bound policy handoff whose consumed bytes are proven equal to the inventory, then test rename and in-place mutation between verification and exec."
---

---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 6
reviewer: "codex"
artifact_sha: "f067fe199a686727f51048003ec19161baf39cad"
completed_at: '2026-07-17T22:44:23Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4 — closed executable surface and sandbox deny probes"
    finding: "The spec permits exactly five candidate launches and rejects every other entrypoint, yet requires same-profile direct and grandchild deny probes without defining an executable, argv, FD map, cwd, environment, or owner for them. Enumerate the exact proof-only probe commands and distinguish them from candidate entrypoints, including their staged members and sandbox permissions, or remove those proof claims."
  - severity: "high"
    where: "AC4 — self-fault mechanism and tests/candidate/lifecycle.test.ts"
    finding: "AC4 requires process.kill(process.pid, SIGKILL) for both private self-faults, but later states that no actor signals a PID and requires tests to prove total absence of PID-directed calls. Scope the prohibition to recorded, child, or non-self PIDs; explicitly permit only the two phase-gated self-SIGKILL sites; and require a source-level test rejecting every other kill or ChildProcess.kill call."
  - severity: "medium"
    where: "AC4 — exact command 4 and inner FD ownership"
    finding: "Command 4 passes --control-fd 3 and --outer-liveness-fd 4, while the ownership contract makes fd 3 the write-only lifecycle-record pipe and fd 4 the read-only outer-control/liveness pipe. Rename the flags to reflect those directions, such as --record-fd 3 and --outer-control-fd 4, or otherwise define an unambiguous mapping and assert it in the observed-argv and byte-routing tests."
  - severity: "high"
    where: "AC4/AC5 — third proof runner and full-smoke invocation"
    finding: "The third proof runner owns outer fds 3 and 4, launches fresh outers, creates candidate inputs, survives source-path removal, and produces evidence, but no implementing path or exact invocation is specified; AC5 likewise says to run the full smoke without naming a command. Add the runner's owning file, exact shell-free command and flags, cwd/environment/FD map, config-token-profile creation ownership, and the precise source-removal transition so the post-landing proof is reproducible."
  - severity: "medium"
    where: "AC2/AC4 — bounded protocol and observer claims"
    finding: "Several falsifiable bounds are undefined: the header-response deadline has no duration, lifecycle and ready records have no maximum encoded length or read deadline, and continuously drained nettop evidence has no retention cap. Supply exact limits, overflow and timeout behavior, associated exit codes, and clock-bounded tests for withheld bodies, oversized or unterminated records, and unbounded observer output."
  - severity: "medium"
    where: "AC5 step 8 and tests/candidate/smoke.test.ts"
    finding: "The claim that the disposable run root is the only mutated path has no observation phase or filesystem boundary and currently includes setup actions that create a verification clone, prepare dependencies, remove the source path, and run system observers. Define the baseline point, watched path set, mutation-attribution method, and exclusions for setup and OS-owned metadata, then make the test assert the resulting precise candidate-write claim."
---

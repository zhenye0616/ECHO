---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 2
reviewer: "codex-ops"
artifact_sha: "55f9adebc54cd77f95265b8da2c6ca6ae7886d07"
completed_at: '2026-07-17T21:18:52Z'
review_protocol: 2
review_mode: "delta"
consumed_task_state: false
verdict: "pushback"
findings:
  - severity: "high"
    mechanism: "candidate entrypoint and execution environment closure"
    origin: "original"
    family_id: "fam-58138afe52e773f2"
    where: "AC4 lines 233–260 and 295–305 — closed executable surface and sandbox boundary"
    finding: "The four-command table contains no command that can create the inner lifecycle owner, and command 4 says the inner directly spawns <node-abs> ... serve while the later contract requires /usr/bin/sandbox-exec at that boundary. Satisfying both requires an unstated script mode or FD discriminator and an unlisted sandbox wrapper, defeating the closed-entrypoint claim or allowing the runtime to bypass the sandbox. Specify the exact shell-free outer-to-inner and inner-to-sandbox-exec-to-runtime executable paths, argv, role discriminator, cwd under <run-root>, FD map, and positive environment; then test observed argv, cwd, and descriptors against that table with every extra mode rejected."
  - severity: "high"
    mechanism: "parent-liveness orphan cleanup and external observation"
    origin: "original"
    family_id: "fam-68977d8ba2d0dabb"
    where: "AC4 lines 262–287 and 316–323 — outer/inner/runtime liveness topology"
    finding: "The only liveness chain is inner-to-runtime. After the one control relay, SIGKILL of the outer closes no descriptor monitored by the inner, so the inner can retain the runtime liveness writer and leave the runtime, listener, and lease alive. Before that relay, inner death also leaves the outer without the runtime start identity required for the specified exact-identity TERM/KILL cleanup. Add an outer-to-inner liveness FD whose EOF forces the inner to close runtime liveness, and relay an identity-bound runtime-spawn record before waiting for readiness. Add third-observer tests that SIGKILL the outer after readiness and the inner before readiness, proving bounded process, listener, database-handle, and lease absence without retry or restart."
---

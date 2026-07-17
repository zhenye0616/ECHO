---
item_id: "2026-07-15-137a-echo-context-candidate-runtime"
round: 2
reviewer: "codex"
artifact_sha: "55f9adebc54cd77f95265b8da2c6ca6ae7886d07"
completed_at: '2026-07-17T21:20:31Z'
review_protocol: 2
review_mode: "delta"
consumed_task_state: false
verdict: "pushback"
findings:
  - severity: "high"
    mechanism: "candidate entrypoint and execution environment closure"
    origin: "original"
    family_id: "fam-58138afe52e773f2"
    where: "AC4 — closed executable-surface list versus the staged smoke-controller lifecycle topology"
    finding: "Define the exact shell-free command, staged executable, arguments, environment, and FD map used to create the inner lifecycle owner, and include it in the closed executable surface. If the inner is another mode of candidate-smoke.mjs, enumerate that mode and its exact flags; otherwise enumerate its staged entrypoint. Reconcile the statement that no other entrypoint, flag, or positional argument is accepted, and extend the stage inventory and tests to prove this exact inner invocation and reject all alternatives."
---
